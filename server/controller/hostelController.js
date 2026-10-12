const Allocation = require("../model/Allocation");
const Hostel = require("../model/Hostel");
const Role = require("../model/Role");
const Room = require("../model/Room");
const User = require("../model/User");
const Warden = require("../model/Warden");
const Student = require("../model/Student")
const { jwtDecode } = require('jwt-decode');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { getActiveWardenAssignments, getActiveWardenHostelIds } = require('../utils/wardenAssignments');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

function normalizeRoom(room) {
    if (!room) return null;

    return {
        _id: room._id,
        roomID: room.roomID,
        roomNo: room.roomNo || room.roomID,
        currentOccupants: room.currentOccupants,
        capacity: room.capasity,
        status: room.status,
    };
}

function normalizeHostel(hostel) {
    if (!hostel) return null;

    return {
        _id: hostel._id,
        hostelID: hostel.hostelID,
        name: hostel.name,
        gender: hostel.gender,
    };
}


const HostelController = {
    GetallWarden: async (req, res) => {
        try {
            const wardenRole = await Role.findOne({ name: 'warden' });

            if (!wardenRole) {
                return res.json({ error: "Warden role not found" });
            }

            const allWardenUsers = await User.find({ roles: wardenRole._id })
                .select("-password")
                .populate("roles", "name");

            const activeAssignments = await Warden.find({ active: true }).select('userId');
            const assignmentCounts = new Map();

            for (const assignment of activeAssignments) {
                const userId = assignment.userId?.toString();
                if (!userId) continue;
                assignmentCounts.set(userId, (assignmentCounts.get(userId) || 0) + 1);
            }

            const unassignedWardens = allWardenUsers.filter(user => {
                const userId = user._id.toString();
                return (assignmentCounts.get(userId) || 0) < 2;
            });

            return res.json({ result: unassignedWardens });
        } catch (err) {
            console.error("Error fetching unassigned wardens:", err);
            return res.status(500).json({ error: "Server error" });
        }
    },

    CreateHostel: async (req, res) => {
        try {
            const {
                hostelID,
                name,
                location,
                gender,
                roomCount,
                warden
            } = req.body;

            const checkhostel = await Hostel.findOne({
                $or: [
                    { hostelID },
                    { name },
                ]
            });

            if (checkhostel) {
                return res.json({ error: "The hostel already exists" });
            }

            const parsedRoomCount = parseInt(roomCount);
            if (isNaN(parsedRoomCount) || parsedRoomCount <= 0) {
                return res.json({ error: "Invalid room count" });
            }

            if (warden) {
                const activeAssignments = await Warden.countDocuments({ userId: warden, active: true });
                if (activeAssignments >= 2) {
                    return res.json({ error: "This warden already manages two hostels" });
                }
            }

            // Create and save hostel
            const newHostel = new Hostel({
                hostelID,
                name,
                location,
                gender,
                roomCount: parsedRoomCount,
                warden
            });

            const savedHostel = await newHostel.save();

            // Create and save rooms
            const roomDocs = [];
            for (let i = 1; i <= parsedRoomCount; i++) {
                const room = new Room({
                    roomID: `${hostelID}/${i}`,
                    gender: gender,
                    hostelID: savedHostel._id
                });
                roomDocs.push(room);
            }

            await Room.insertMany(roomDocs);

            let savedWarden = null;
            if (warden) {
                const newWarden = new Warden({
                    userId: warden,
                    hostelId: savedHostel._id,
                    startDate: new Date(),
                    note: "Assigned during hostel creation",
                    active: true
                });
                savedWarden = await newWarden.save();
            }

            return res.json({
                Status: "Success",
                Message: "Hostel, rooms, and warden assigned successfully",
                hostel: savedHostel,
                rooms: roomDocs,
                warden: savedWarden
            });

        } catch (err) {
            console.error("Error creating hostel:", err);
            return res.json({ error: "Server error while creating hostel" });
        }
    },

    getAllhostel: async (req, res) => {
        try {
            const getallhostel = await Hostel.find().populate('warden').lean();

            const allRooms = await Room.find({});

            const result = await Promise.all(getallhostel.map(async hostel => {
                const hostelRooms = allRooms.filter(r => r.hostelID?.toString() === hostel._id.toString());
                const totalCapacity = hostelRooms.reduce((sum, room) => sum + (room.capasity || 4), 0);
                const assignedStudents = await Allocation.countDocuments({
                    hostelID: hostel._id,
                    active: true
                });

                return {
                    ...hostel,
                    totalCapacity,
                    assignedStudents,
                    availableCapacity: Math.max(totalCapacity - assignedStudents, 0),
                    isFull: assignedStudents >= totalCapacity,
                    occupancyPercentage: totalCapacity > 0 ? Math.min((assignedStudents / totalCapacity) * 100, 100).toFixed(1) : 0
                };
            }));

            return res.json({ Result: result });
        }
        catch (err) {
            console.log(err);
            return res.status(500).json({ error: "Server error" });
        }
    },

    getoneHostel: async (req, res) => {
        try {
            const { id } = req.params

            const gethostel = await Hostel.findById(id).populate('warden')

            return res.json({ Result: gethostel })
        }
        catch (err) {
            console.log(err)
        }
    },

    updateRoomCount: async (req, res) => {
        try {
            const { id } = req.params;
            const { newRoomCount } = req.body;

            const hostel = await Hostel.findById(id);
            if (!hostel) {
                return res.json({ error: 'Hostel not found' });
            }

            const currentCount = hostel.roomCount;

            if (newRoomCount === currentCount) {
                return res.json({ message: 'Room count is already up to date.' });
            }

            if (newRoomCount > currentCount) {
                const roomsToAdd = [];
                for (let i = currentCount + 1; i <= newRoomCount; i++) {
                    roomsToAdd.push({
                        roomID: `${hostel.hostelID}/${i}`,
                        gender: hostel.gender,
                        hostelID: hostel._id
                    });
                }

                await Room.insertMany(roomsToAdd);
            }

            if (newRoomCount < currentCount) {
                const roomsToRemove = await Room.find({
                    hostelID: hostel._id
                }).sort({ roomID: -1 }).limit(currentCount - newRoomCount);

                const roomIDsToDelete = roomsToRemove.map(room => room._id);

                await Room.deleteMany({ _id: { $in: roomIDsToDelete } });
            }

            hostel.roomCount = newRoomCount;
            await hostel.save();

            return res.json({
                Status: "Success",
                Message: `Room count updated from ${currentCount} to ${newRoomCount}`
            });

        } catch (err) {
            console.error("Error updating room count:", err);
            return res.json({ error: "Server error while updating room count" });
        }
    },

    updateHostelGender: async (req, res) => {
        try {
            const { id } = req.params;
            const { gender } = req.body;

            const allowedGenders = ['Male', 'Female', 'REV'];
            if (!allowedGenders.includes(gender)) {
                return res.json({ error: 'Invalid hostel gender' });
            }

            const hostel = await Hostel.findById(id);
            if (!hostel) {
                return res.json({ error: 'Hostel not found' });
            }

            if (hostel.gender === gender) {
                return res.json({ Status: 'Success', Message: 'Hostel gender is already up to date.' });
            }

            hostel.gender = gender;
            await hostel.save();

            await Room.updateMany({ hostelID: hostel._id }, { $set: { gender } });

            return res.json({
                Status: 'Success',
                Message: `Hostel gender updated to ${gender}`,
            });
        } catch (err) {
            console.error('Error updating hostel gender:', err);
            return res.json({ error: 'Server error while updating hostel gender' });
        }
    },

    assignNewWarden: async (req, res) => {
        try {
            const { hostelId, newWardenId } = req.body;

            // Remove existing active wardens for this hostel
            await Warden.deleteMany({ hostelId, active: true });

            // Create new active warden
            const newWarden = new Warden({
                userId: newWardenId,
                hostelId: hostelId,
                startDate: new Date(),
                note: "Reassigned as new warden",
                active: true,
            });

            const savedWarden = await newWarden.save();

            // Update Hostel document with new warden reference
            await Hostel.findByIdAndUpdate(hostelId, { warden: newWardenId });

            return res.json({
                Status: "Success",
                Message: "New warden assigned successfully",
                newWarden: savedWarden,
            });
        } catch (err) {
            console.error("Error assigning new warden:", err);
            res.json({ error: "Internal server error while assigning new warden" });
        }
    },

    assignStudents: async (req, res) => {
        try {
            const { hostelId, studentIds } = req.body;

            const hostel = await Hostel.findById(hostelId);
            if (!hostel) {
                return res.json({ Status: "Error", Message: "Hostel not found" });
            }

            // Fetch students before proceeding
            const students = await Student.find({ _id: { $in: studentIds } });

            // Eligibility is stored on Student; current assignment is determined by active allocations.
            const ineligibleStudent = students.find(s => s.eligibilityStatus !== 'Eligible' && s.eligibilityStatus !== 'Assigned' && s.eligibilityStatus !== true);
            if (ineligibleStudent) {
                return res.json({
                    Status: "Error",
                    Message: `Student ${ineligibleStudent.name || ineligibleStudent.enrolmentNo || 'Unknown'} is not eligible for hostel assignment.`
                });
            }

            // Check gender match
            const mismatch = students.find(
                student => (student.sex || '').toLowerCase() !== (hostel.gender || '').toLowerCase()
            );

            if (mismatch) {
                return res.json({
                    Status: "Error",
                    Message: `Gender mismatch: Student ${mismatch.fullName || mismatch.nic || 'Unknown'} (${mismatch.sex}) does not match hostel gender (${hostel.gender})`
                });
            }

            // Calculate actual capacity from rooms
            const rooms = await Room.find({ hostelID: hostelId });
            const totalCapacity = rooms.reduce((sum, room) => sum + (room.capasity || 4), 0);

            const currentAllocations = await Allocation.find({
                studentId: { $in: studentIds },
                active: true
            });
            const currentAllocationIds = currentAllocations.map(allocation => allocation._id);

            const existingAllocations = await Allocation.find({
                hostelID: hostelId,
                active: true,
                _id: { $nin: currentAllocationIds }
            });
            const uniqueExistingStudents = new Set(existingAllocations.map(a => {
                if (a.studentId) return a.studentId.toString();
                if (a.regNo) return a.regNo.toString().toLowerCase();
                return null;
            }).filter(Boolean));
            const existingAllocationsCount = uniqueExistingStudents.size;

            const uniqueStudentIds = [...new Set(studentIds.map(studentId => studentId.toString()))];
            const newAllocationsCount = uniqueStudentIds.length;

            if (existingAllocationsCount + newAllocationsCount > totalCapacity) {
                return res.json({ Status: "Error", Message: "Hostel Capacity Exceeded" });
            }

            // Retain allocation history while ensuring one active allocation per student.
            if (currentAllocationIds.length > 0) {
                await Allocation.updateMany(
                    { _id: { $in: currentAllocationIds } },
                    { $set: { active: false, outDate: new Date(), note: 'Reassigned to another hostel' } }
                );
            }

            const allocations = uniqueStudentIds.map(studentId => ({
                regNo: studentId,
                studentId: studentId,
                hostelID: hostelId,
                academicYear: new Date().getFullYear().toString(),
                inDate: new Date(),
                active: true,
            }));

            await Allocation.insertMany(allocations);

            // Mark students as assigned
            await Student.updateMany(
                { _id: { $in: studentIds } },
                { $set: { isAssign: true, hostelAssignedDate: new Date(), eligibilityStatus: 'Assigned' } }
            );

            // Get role document for 'student'
            const studentRole = await Role.findOne({ name: 'student' });
            if (!studentRole) {
                return res.json({ Status: "Error", Message: "Student role not found" });
            }

            for (const student of students) {
                const usernameVal = student.enrolmentNo || student.nic;
                if (!usernameVal) continue;

                const existingUser = await User.findOne({ username: usernameVal });
                if (!existingUser) {
                    const hashedPassword = await bcrypt.hash('12345678', 10);

                    const syntheticEmail = `${usernameVal.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@student.hms.local`;

                    const newUser = new User({
                        username: usernameVal,
                        email: student.email || syntheticEmail,
                        emailVerified: true,
                        password: hashedPassword,
                        roles: [studentRole._id],
                        active: true,
                    });

                    await newUser.save();
                }
            }

            res.json({ Status: "Success", Message: "Students assigned and user accounts created successfully" });

        } catch (err) {
            console.error(err);
            res.json({ Status: "Error", Message: "An error occurred while assigning students" });
        }
    },


    getWardenStudents: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const assignments = await getActiveWardenAssignments(userId);
            const hostelIds = getActiveWardenHostelIds(assignments);
            if (!hostelIds.length) {
                return res.status(403).json({ message: 'Warden hostel not found' });
            }

            const hostels = assignments.map(assignment => normalizeHostel(assignment.hostelId)).filter(Boolean);

            const allocations = await Allocation.find({
                hostelID: { $in: hostelIds },
                active: true,
            })
                .populate('roomId')
                .populate('hostelID', 'hostelID name gender');

            if (!allocations.length) {
                return res.json({ Result: [], hostel: hostels[0] || null, hostels });
            }

            const objectIds = new Set();
            const enrolmentNos = new Set();

            allocations.forEach(allocation => {
                if (allocation.studentId) {
                    objectIds.add(allocation.studentId.toString());
                }

                if (allocation.regNo) {
                    const regNo = String(allocation.regNo);
                    if (objectIdPattern.test(regNo)) {
                        objectIds.add(regNo);
                    } else {
                        enrolmentNos.add(regNo);
                    }
                }
            });

            const students = await Student.find({
                $or: [
                    { _id: { $in: Array.from(objectIds) } },
                    { enrolmentNo: { $in: Array.from(enrolmentNos) } }
                ]
            });

            const studentsById = new Map();
            const studentsByEnrolment = new Map();

            students.forEach(student => {
                studentsById.set(student._id.toString(), student);
                if (student.enrolmentNo) {
                    studentsByEnrolment.set(student.enrolmentNo, student);
                }
            });

            const groupedStudents = new Map();

            allocations.forEach(allocation => {
                let student = null;
                let studentKey = null;

                if (allocation.studentId) {
                    const studentId = allocation.studentId.toString();
                    student = studentsById.get(studentId) || null;
                    studentKey = studentId;
                }

                if (!student && allocation.regNo) {
                    const regNo = String(allocation.regNo);
                    if (objectIdPattern.test(regNo)) {
                        student = studentsById.get(regNo) || null;
                        studentKey = regNo;
                    }

                    if (!student) {
                        student = studentsByEnrolment.get(regNo) || null;
                        studentKey = student ? student._id.toString() : studentKey;
                    }
                }

                if (!student || !studentKey) {
                    return;
                }

                if (!groupedStudents.has(studentKey)) {
                    groupedStudents.set(studentKey, {
                        student,
                        allocations: []
                    });
                }

                groupedStudents.get(studentKey).allocations.push({
                    allocationId: allocation._id,
                    roomId: normalizeRoom(allocation.roomId),
                    hostelID: allocation.hostelID?._id || allocation.hostelID || null,
                    hostelName: allocation.hostelID?.name || null,
                    academicYear: allocation.academicYear,
                    inDate: allocation.inDate,
                    outDate: allocation.outDate,
                    note: allocation.note,
                    active: allocation.active,
                });
            });

            const result = Array.from(groupedStudents.values()).sort((a, b) => {
                const aName = (a.student?.fullName || a.student?.name || a.student?.enrolmentNo || '').toString();
                const bName = (b.student?.fullName || b.student?.name || b.student?.enrolmentNo || '').toString();
                return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
            });

            return res.json({
                Result: result,
                hostel: hostels[0] || null,
                hostels,
            });

        } catch (err) {
            console.error('Error in getWardenStudents:', err);
            res.json({ message: 'Server error', error: err.message });
        }
    },
    // Delete hostel and cascade related data
    deleteHostel: async (req, res) => {
        try {
            const { id } = req.params;
            const hostel = await Hostel.findById(id);
            if (!hostel) return res.status(404).json({ error: 'Hostel not found' });
            // Remove allocations linked to this hostel
            await Allocation.deleteMany({ hostelID: hostel._id });
            // Remove rooms belonging to this hostel
            await Room.deleteMany({ hostelID: hostel._id });
            // Remove warden assignments for this hostel
            await Warden.deleteMany({ hostelId: hostel._id });
            // Finally delete the hostel record
            await Hostel.findByIdAndDelete(hostel._id);
            return res.json({ Status: 'Success', Message: 'Hostel and related records removed' });
        } catch (err) {
            console.error('Error deleting hostel:', err);
            return res.status(500).json({ Error: 'Failed to delete hostel' });
        }
    }
};

module.exports = HostelController;