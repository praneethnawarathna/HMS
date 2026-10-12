const Allocation = require("../model/Allocation");
const Room = require("../model/Room");
const SpecialNeeds = require("../model/SpecialNeeds");
const Student = require("../model/Student");
const User = require("../model/User");
const Warden = require("../model/Warden");
const mongoose = require('mongoose');
const { getActiveWardenAssignments, getActiveWardenHostelIds } = require('../utils/wardenAssignments');

function getCompatibleRoomFilter(id) {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) return null;

    const candidates = [normalizedId];
    if (mongoose.Types.ObjectId.isValid(normalizedId)) {
        candidates.unshift(new mongoose.Types.ObjectId(normalizedId));
    }

    return {
        _id: candidates.length === 1
            ? candidates[0]
            : { $in: candidates }
    };
}

async function findRoomByIdCompatible(id) {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) return null;

    try {
        const found = await Room.findById(normalizedId);
        if (found) return found;
    } catch (e) {}

    const filter = getCompatibleRoomFilter(normalizedId);
    if (filter) {
        const rawDoc = await Room.collection.findOne(filter);
        if (rawDoc) {
            return Room.hydrate(rawDoc);
        }
    }
    return null;
}

const RoomController = {
    getallrooms: async (req, res) => {
        try {
            const getAllRooms = await Room.find()
                .populate('students')
                .populate('hostelID');

            return res.json({ Result: getAllRooms })

        }
        catch (err) {
            console.error('Error fetching rooms:', err)
            return res.status(500).json({ Error: 'Server error fetching rooms' })
        }
    },

    getoneRoom: async (req, res) => {
        try {
            const { id } = req.params

            const getroomdata = await findRoomByIdCompatible(id);

            if (!getroomdata) {
                return res.status(404).json({ Error: 'Room not found' })
            }

            try {
                await getroomdata.populate('students');
                await getroomdata.populate('hostelID');
            } catch (popErr) {
                console.warn('Populate warning:', popErr.message);
            }

            return res.json({ Result: getroomdata })
        }
        catch (err) {
            console.error('Error fetching room:', err)
            return res.status(500).json({ Error: 'Server error fetching room' })
        }
    },

    updateRoomCapasity: async (req, res) => {
        try {
            const {
                _id,
                roomID,
                newRoomID,
                capasity,
                gender,
                status,
                currentOccupants,
                studentIds,
            } = req.body;

            const lookupKey = _id || roomID;
            if (!lookupKey) {
                return res.json({ Error: "Room identifier is required" });
            }

            let checkroom = await findRoomByIdCompatible(lookupKey);
            if (!checkroom) {
                checkroom = await Room.findOne({ roomID: lookupKey });
            }
            if (!checkroom) {
                return res.json({ Error: "Room not found" });
            }

            const updateData = {};

            // Update Room ID / Name if changed
            const targetRoomID = (newRoomID !== undefined && newRoomID !== null) ? newRoomID.trim() : (roomID !== undefined && roomID !== null ? roomID.trim() : null);
            if (targetRoomID && targetRoomID !== checkroom.roomID) {
                const duplicateRoom = await Room.findOne({ roomID: targetRoomID, _id: { $ne: checkroom._id } });
                if (duplicateRoom) {
                    return res.json({ Error: `Room ID '${targetRoomID}' already exists` });
                }
                updateData.roomID = targetRoomID;
            }

            // Update Capacity
            if (capasity !== undefined && capasity !== null && capasity !== '') {
                const parsedCapasity = Number(capasity);
                if (Number.isNaN(parsedCapasity) || parsedCapasity < 1) {
                    return res.json({ Error: "Invalid room capacity" });
                }
                if (parsedCapasity > 10) {
                    return res.json({ Error: "Maximum capacity is 10" });
                }
                updateData.capasity = parsedCapasity;
            }

            // Update Gender
            if (gender !== undefined && gender !== null && gender !== '') {
                const allowedGenders = ['Male', 'Female', 'REV'];
                if (!allowedGenders.includes(gender)) {
                    return res.json({ Error: "Invalid room gender" });
                }
                updateData.gender = gender;
            }

            // Update Status
            if (status) {
                updateData.status = status;
            }

            // Handle Students assignment / unassignment
            if (studentIds !== undefined && Array.isArray(studentIds)) {
                const currentStudentIds = (checkroom.students || []).map(s => (s?._id || s).toString());
                const newStudentIds = studentIds.map(s => String(s?._id || s)).filter(Boolean);

                const studentsToRemove = currentStudentIds.filter(id => !newStudentIds.includes(id));
                const studentsToAdd = newStudentIds.filter(id => !currentStudentIds.includes(id));

                // Process removals
                for (const stId of studentsToRemove) {
                    let student = null;
                    try {
                        if (mongoose.Types.ObjectId.isValid(stId)) {
                            student = await Student.findById(stId);
                        }
                    } catch (e) {}
                    if (!student) student = await Student.findOne({ enrolmentNo: stId });

                    // Clear room allocation
                    await Allocation.updateMany(
                        {
                            roomId: checkroom._id,
                            $or: [
                                { studentId: stId },
                                { regNo: stId },
                                ...(student ? [{ regNo: student.enrolmentNo }, { studentId: student._id }] : [])
                            ]
                        },
                        { $set: { roomId: null } }
                    );

                    // Check if student is assigned to any other room
                    if (student) {
                        const otherActiveAlloc = await Allocation.findOne({
                            $or: [{ studentId: student._id }, { regNo: student.enrolmentNo }],
                            roomId: { $ne: null }
                        });
                        if (!otherActiveAlloc) {
                            student.isAssign = false;
                            await student.save();
                        }
                    }
                }

                // Process additions
                for (const stId of studentsToAdd) {
                    let student = null;
                    try {
                        if (mongoose.Types.ObjectId.isValid(stId)) {
                            student = await Student.findById(stId);
                        }
                    } catch (e) {}
                    if (!student) student = await Student.findOne({ enrolmentNo: stId });

                    let alloc = await Allocation.findOne({
                        active: true,
                        $or: [
                            { studentId: stId },
                            { regNo: stId },
                            ...(student ? [{ regNo: student.enrolmentNo }, { studentId: student._id }] : [])
                        ]
                    });

                    if (alloc) {
                        alloc.roomId = checkroom._id;
                        alloc.hostelID = alloc.hostelID || checkroom.hostelID;
                        alloc.inDate = new Date();
                        await alloc.save();
                    } else {
                        await Allocation.create({
                            studentId: student ? student._id : stId,
                            regNo: student ? student.enrolmentNo : stId,
                            roomId: checkroom._id,
                            hostelID: checkroom.hostelID,
                            active: true,
                            inDate: new Date()
                        });
                    }

                    if (student) {
                        student.isAssign = true;
                        student.hostelAssignedDate = new Date();
                        await student.save();
                    }
                }

                updateData.students = newStudentIds;

                // Sync occupants if not explicitly given
                if (currentOccupants === undefined || currentOccupants === null || currentOccupants === '') {
                    updateData.currentOccupants = newStudentIds.length;
                }
            }

            // Update Current Occupants override if given
            if (currentOccupants !== undefined && currentOccupants !== null && currentOccupants !== '') {
                const parsedOccupants = Number(currentOccupants);
                if (!Number.isNaN(parsedOccupants) && parsedOccupants >= 0) {
                    updateData.currentOccupants = parsedOccupants;
                }
            }

            // Auto-adjust status if not explicitly set
            const effectiveCapacity = updateData.capasity !== undefined ? updateData.capasity : checkroom.capasity;
            const effectiveOccupants = updateData.currentOccupants !== undefined ? updateData.currentOccupants : checkroom.currentOccupants;

            if (!status) {
                if (effectiveOccupants >= effectiveCapacity) {
                    updateData.status = 'Full';
                } else if (checkroom.status === 'Full' && effectiveOccupants < effectiveCapacity) {
                    updateData.status = 'Availabe';
                }
            }

            if (Object.keys(updateData).length === 0) {
                return res.json({ Error: "No data provided for update" });
            }

            // Update document
            let updatedRoom = await Room.findByIdAndUpdate(
                checkroom._id,
                { $set: updateData },
                { new: true }
            );

            if (!updatedRoom) {
                const roomFilter = getCompatibleRoomFilter(checkroom._id);
                if (roomFilter) {
                    await Room.collection.updateOne(roomFilter, { $set: updateData });
                }
            }

            const populatedRoom = await Room.findById(checkroom._id).populate('students').populate('hostelID');

            if (populatedRoom) {
                return res.json({
                    Status: "Success",
                    Message: "Room details updated successfully",
                    Result: populatedRoom
                });
            } else {
                return res.json({ Error: "Internal server error while updating room" });
            }
        }
        catch (err) {
            console.error("updateRoomCapasity error:", err);
            return res.status(500).json({ Error: "Internal Server Error" });
        }
    },

    wardenRooms: async (req, res) => {
        try {
            const userId = req.user.id;

            const assignments = await getActiveWardenAssignments(userId);
            const hostelIds = getActiveWardenHostelIds(assignments);
            if (!hostelIds.length) {
                return res.json({ rooms: [] });
            }

            const rooms = await Room.find({ hostelID: { $in: hostelIds } }).populate('students').populate('hostelID');

            return res.json({ rooms });
        } catch (err) {
            console.log(err);
        }
    },

    stundetassigntoroom: async (req, res) => {
        try {
            // 1. Get current warden's email from req.user or token middleware
            const wardenEmail = req.user?.email;
            if (!wardenEmail) {
                return res.status(401).json({ message: 'Unauthorized: Warden email not found' });
            }

            // 2. Find the warden's hostel
            const warden = await Warden.findOne({ email: wardenEmail });
            if (!warden) {
                return res.status(404).json({ message: 'Warden not found' });
            }
            const wardenHostelId = warden.hostelID;

            // 3. Find all rooms in the warden's hostel that are available
            const rooms = await Room.find({
                hostelID: wardenHostelId,
                status: 'Available' // Correct the spelling if needed
            });

            if (rooms.length === 0) {
                return res.json({ message: 'No available rooms in your hostel.' });
            }

            // 4. Get all students who are unassigned (isAssign !== true) and have active allocation in Allocation table (assuming active:true)
            // Also ensure allocation is for current academic year if needed
            const unassignedAllocations = await Allocation.find({
                active: true,
                regNo: { $exists: true }, // just to ensure regNo exists
                roomId: { $exists: false }, // Not assigned a room yet
            }).populate('regNo'); // Populate student info from regNo

            const unassignedStudents = unassignedAllocations
                .map(allocation => allocation.regNo)
                .filter(student => student && student.isAssign !== true);

            if (unassignedStudents.length === 0) {
                return res.json({ message: 'No unassigned students with active allocations found.' });
            }

            // 5. Organize rooms by gender
            const roomsByGender = {
                male: rooms.filter(r => r.gender.toLowerCase() === 'male'),
                female: rooms.filter(r => r.gender.toLowerCase() === 'female')
            };

            // 6. Helper to assign student to a room
            const assignStudentToRoom = async (student, allocation) => {
                const gender = (student.sex || '').toLowerCase();
                const availableRooms = roomsByGender[gender];

                if (!availableRooms || availableRooms.length === 0) {
                    return false;
                }

                for (let room of availableRooms) {
                    if (room.currentOccupants < room.capasity) {
                        room.students.push(student._id);
                        room.currentOccupants += 1;

                        if (room.currentOccupants >= room.capasity) {
                            room.status = 'Full';
                        }

                        await room.save();

                        student.isAssign = true;
                        student.hostelAssignedDate = new Date();
                        await student.save();

                        allocation.roomId = room._id;  // Assign room to allocation
                        allocation.hostelID = room.hostelID;
                        allocation.inDate = new Date();
                        allocation.note = 'Auto assigned by system';
                        await allocation.save();

                        return true;
                    }
                }

                return false;
            };

            // 7. Assign each unassigned student
            let assignedCount = 0;
            for (const allocation of unassignedAllocations) {
                const student = allocation.regNo;
                if (!student || student.isAssign === true) continue;

                const assigned = await assignStudentToRoom(student, allocation);
                if (assigned) assignedCount++;
                else console.log(`No available room for student: ${student._id}`);
            }

            res.json({ message: `Assigned ${assignedCount} students to rooms in your hostel.` });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error during student assignment' });
        }
    },


    // studentAssignNeed: async (req, res) => {
    //     try {
    //         // Get email from query params (adjust as per your frontend)
    //         const userEmail = req.query.email || req.params.email;
    //         console.log('Logged in user email:', userEmail);

    //         if (!userEmail) {
    //             return res.json({ message: 'Unauthorized: user email missing', students: [] });
    //         }

    //         // Find user by email
    //         const user = await User.findOne({ email: userEmail });
    //         if (!user) {
    //             console.log('User not found for email:', userEmail);
    //             return res.json({ message: 'User not found', students: [] });
    //         }

    //         // Find active warden linked to user
    //         const warden = await Warden.findOne({ userId: user._id, active: true });
    //         if (!warden) {
    //             console.log('Warden not found or inactive for user:', user._id);
    //             return res.json({ message: 'Warden not found or inactive', students: [] });
    //         }

    //         console.log('Warden found:', warden._id, 'hostelId:', warden.hostelId);

    //         // Get active allocations for the warden's hostel
    //         const allocations = await Allocation.find({ hostelID: warden.hostelId, active: true });
    //         if (!allocations.length) {
    //             console.log('No allocations found for hostel:', warden.hostelId);
    //             return res.json({ students: [] });
    //         }

    //         console.log(`Found ${allocations.length} allocations`);

    //         // Collect regNos from allocations
    //         const regNos = allocations.map(a => a.regNo);
    //         console.log('Registration numbers in allocations:', regNos);

    //         // Get special needs entries for these regNos
    //         const specialNeedsList = await SpecialNeeds.find({ regNo: { $in: regNos } }).sort({ createdAt: -1 });
    //         console.log(`Found ${specialNeedsList.length} special needs records`);

    //         // Map specialNeeds by regNo for quick access
    //         const specialNeedsMap = {};
    //         specialNeedsList.forEach(sn => {
    //             specialNeedsMap[sn.regNo] = sn;
    //         });

    //         // Get student details for those regNos
    //         const students = await Student.find({ regNo: { $in: regNos } });
    //         console.log(`Found ${students.length} students`);

    //         // Prepare the final combined data array
    //         const result = students.map(s => {
    //             const sn = specialNeedsMap[s.regNo];
    //             return {
    //                 regNo: s.regNo,
    //                 needs: sn ? sn.needs : 'None',
    //                 isAccepted: sn ? sn.isAccpeted : false,
    //                 student: {
    //                     name: s.name,
    //                     faculty: s.faculty,
    //                     course: s.course,
    //                 },
    //                 createdAt: sn ? sn.createdAt : null,
    //             };
    //         });

    //         console.log("Results to send:", result);

    //         return res.json({ students: result });
    //     } catch (err) {
    //         console.error('Error in studentAssignNeed:', err);
    //         return res.json({ message: 'Server error', students: [] });
    //     }
    // }

    getAvailableStudentsForRoom: async (req, res) => {
        try {
            const { id } = req.params;
            let room = await findRoomByIdCompatible(id);
            if (!room) {
                room = await Room.findOne({ roomID: id });
            }
            if (!room) {
                return res.status(404).json({ Error: "Room not found" });
            }

            // Find unassigned active allocations for this hostel
            const allocations = await Allocation.find({
                hostelID: room.hostelID,
                active: true,
                $or: [{ roomId: null }, { roomId: { $exists: false } }]
            });

            if (!allocations.length) {
                return res.json({ Result: [] });
            }

            const objectIds = [];
            const enrolmentNos = [];
            allocations.forEach(a => {
                if (a.studentId) objectIds.push(a.studentId.toString());
                if (a.regNo) {
                    const reg = String(a.regNo);
                    if (mongoose.Types.ObjectId.isValid(reg)) {
                        objectIds.push(reg);
                    } else {
                        enrolmentNos.push(reg);
                    }
                }
            });

            const queryConditions = [];
            if (objectIds.length) queryConditions.push({ _id: { $in: objectIds } });
            if (enrolmentNos.length) queryConditions.push({ enrolmentNo: { $in: enrolmentNos } });

            if (!queryConditions.length) {
                return res.json({ Result: [] });
            }

            const studentQuery = { $or: queryConditions };
            if (room.gender && room.gender !== 'REV') {
                studentQuery.sex = new RegExp(`^${room.gender}$`, 'i');
            }

            const students = await Student.find(studentQuery).select('_id name enrolmentNo sex alDistrict faculty course');

            // Exclude students currently in the room
            const currentRoomStudents = (room.students || []).map(s => String(s?._id || s));
            const availableStudents = students.filter(s => !currentRoomStudents.includes(String(s._id)));

            return res.json({ Result: availableStudents });
        } catch (err) {
            console.error("Error in getAvailableStudentsForRoom:", err);
            return res.status(500).json({ Error: "Server error fetching available students" });
        }
    },

    deleteRoom: async (req, res) => {
        try {
            const { id } = req.params;
            const room = await findRoomByIdCompatible(id);
            if (!room) {
                return res.status(404).json({ Error: "Room not found" });
            }

            if (room.currentOccupants > 0 || (room.students && room.students.length > 0)) {
                return res.status(400).json({ Error: "Cannot delete room with assigned occupants. Please unassign students first." });
            }

            // Decrement hostel room count if linked
            if (room.hostelID) {
                const Hostel = require('../model/Hostel');
                const hostelFilter = {
                    $or: [
                        { _id: String(room.hostelID) },
                        ...(mongoose.Types.ObjectId.isValid(String(room.hostelID)) ? [{ _id: new mongoose.Types.ObjectId(String(room.hostelID)) }] : [])
                    ]
                };
                await Hostel.collection.updateOne(hostelFilter, { $inc: { roomCount: -1 } });
            }

            // Remove any allocations for this room just in case
            await Allocation.deleteMany({ roomId: room._id });

            const delFilter = getCompatibleRoomFilter(room._id || id);
            if (delFilter) {
                await Room.collection.deleteOne(delFilter);
            } else {
                await Room.findByIdAndDelete(id);
            }

            return res.json({ Status: "Success", Message: "Room deleted successfully" });
        } catch (err) {
            console.error("Error deleting room:", err);
            return res.status(500).json({ Error: "Failed to delete room" });
        }
    }
};

module.exports = RoomController;