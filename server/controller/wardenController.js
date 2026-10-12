const Allocation = require("../model/Allocation");
const SpecialNeeds = require("../model/SpecialNeeds");
const Student = require("../model/Student");
const User = require("../model/User");
const Warden = require("../model/Warden");
const Payment = require("../model/Payment");
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const { jwtDecode } = require('jwt-decode');
const { getoneHostel } = require("./hostelController");
const Hostel = require("../model/Hostel");
const Room = require("../model/Room");
const { getActiveWardenAssignments, getActiveWardenHostelIds } = require('../utils/wardenAssignments');

const WardenController = {
    getstdextraneeds: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const assignments = await getActiveWardenAssignments(userId);
            const hostelIds = getActiveWardenHostelIds(assignments);
            if (!hostelIds.length) {
                return res.status(404).json({ message: 'Warden record not found' });
            }

            // Get allocated students in all hostel(s) managed by the warden.
            // NOTE: Allocation.studentId is the intended field, but some datasets store the student ObjectId in Allocation.regNo.
            const allocations = await Allocation.find({ hostelID: { $in: hostelIds }, active: true })
                .select('studentId regNo')
                .lean();

            if (!allocations.length) {
                return res.json({ Result: [] });
            }

            const studentIdSet = new Set();
            const enrolmentNos = [];
            for (const a of allocations) {
                if (a.studentId) studentIdSet.add(a.studentId.toString());
                if (a.regNo && mongoose.Types.ObjectId.isValid(a.regNo)) {
                    studentIdSet.add(a.regNo.toString());
                } else if (a.regNo && !a.studentId) {
                    enrolmentNos.push(a.regNo);
                }
            }

            if (enrolmentNos.length) {
                const resolvedStudents = await Student.find({ enrolmentNo: { $in: enrolmentNos } }).select('_id').lean();
                for (const s of resolvedStudents) {
                    if (s?._id) studentIdSet.add(s._id.toString());
                }
            }

            const studentIds = Array.from(studentIdSet);
            const needs = await SpecialNeeds.find({ regNo: { $in: studentIds } })
                .populate('regNo')
                .sort({ createdAt: -1 });

            return res.json({ Result: needs });
        }
        catch (err) {
            console.error("Error occurred:", err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
    },


    approveneeds: async (req, res) => {
        try {
            const userId = req.user?.id;
            const { id } = req.params;

            if (!userId) {
                return res.status(401).json({ Status: 'Fail', Error: 'Unauthorized' });
            }

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ Status: 'Fail', Error: 'Invalid special need id' });
            }

            const need = await SpecialNeeds.findById(id);
            if (!need) {
                return res.status(404).json({ Status: 'Fail', Error: 'SpecialNeed not found' });
            }

            const assignments = await getActiveWardenAssignments(userId);
            const hostelIds = getActiveWardenHostelIds(assignments);
            if (!hostelIds.length) {
                return res.status(403).json({ Status: 'Fail', Error: 'Warden hostel not found' });
            }

            const allocations = await Allocation.find({ hostelID: { $in: hostelIds }, active: true })
                .select('studentId regNo')
                .lean();

            const allowedStudentIdSet = new Set();
            const enrolmentNos = [];
            for (const a of allocations) {
                if (a.studentId) allowedStudentIdSet.add(a.studentId.toString());
                if (a.regNo && mongoose.Types.ObjectId.isValid(a.regNo)) {
                    allowedStudentIdSet.add(a.regNo.toString());
                } else if (a.regNo && !a.studentId) {
                    enrolmentNos.push(a.regNo);
                }
            }

            if (enrolmentNos.length) {
                const resolvedStudents = await Student.find({ enrolmentNo: { $in: enrolmentNos } }).select('_id').lean();
                for (const s of resolvedStudents) {
                    if (s?._id) allowedStudentIdSet.add(s._id.toString());
                }
            }

            const needStudentId = need.regNo?.toString();
            if (!needStudentId || !allowedStudentIdSet.has(needStudentId)) {
                return res.status(403).json({ Status: 'Fail', Error: 'Forbidden: not a student in your hostel' });
            }

            const currentDecision = need.decision || (need.isAccpeted ? 'approved' : 'pending');
            if (currentDecision !== 'pending') {
                return res.status(400).json({ Status: 'Fail', Error: `This request is already ${currentDecision}` });
            }

            need.isAccpeted = true;
            need.decision = 'approved';
            await need.save();

            return res.json({ Status: 'Success', data: need });

        }
        catch (err) {
            console.log(err)
            return res.status(500).json({ Status: 'Fail', Error: 'Server error', details: err.message });
        }
    },

    rejectneeds: async (req, res) => {
        try {
            const userId = req.user?.id;
            const { id } = req.params;

            if (!userId) {
                return res.status(401).json({ Status: 'Fail', Error: 'Unauthorized' });
            }

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ Status: 'Fail', Error: 'Invalid special need id' });
            }

            const need = await SpecialNeeds.findById(id);
            if (!need) {
                return res.status(404).json({ Status: 'Fail', Error: 'SpecialNeed not found' });
            }

            const assignments = await getActiveWardenAssignments(userId);
            const hostelIds = getActiveWardenHostelIds(assignments);
            if (!hostelIds.length) {
                return res.status(403).json({ Status: 'Fail', Error: 'Warden hostel not found' });
            }

            const allocations = await Allocation.find({ hostelID: { $in: hostelIds }, active: true })
                .select('studentId regNo')
                .lean();

            const allowedStudentIdSet = new Set();
            const enrolmentNos = [];
            for (const a of allocations) {
                if (a.studentId) allowedStudentIdSet.add(a.studentId.toString());
                if (a.regNo && mongoose.Types.ObjectId.isValid(a.regNo)) {
                    allowedStudentIdSet.add(a.regNo.toString());
                } else if (a.regNo && !a.studentId) {
                    enrolmentNos.push(a.regNo);
                }
            }

            if (enrolmentNos.length) {
                const resolvedStudents = await Student.find({ enrolmentNo: { $in: enrolmentNos } }).select('_id').lean();
                for (const s of resolvedStudents) {
                    if (s?._id) allowedStudentIdSet.add(s._id.toString());
                }
            }

            const needStudentId = need.regNo?.toString();
            if (!needStudentId || !allowedStudentIdSet.has(needStudentId)) {
                return res.status(403).json({ Status: 'Fail', Error: 'Forbidden: not a student in your hostel' });
            }

            const currentDecision = need.decision || (need.isAccpeted ? 'approved' : 'pending');
            if (currentDecision !== 'pending') {
                return res.status(400).json({ Status: 'Fail', Error: `This request is already ${currentDecision}` });
            }

            need.isAccpeted = false;
            need.decision = 'rejected';
            await need.save();

            return res.json({ Status: 'Success', data: need });
        }
        catch (err) {
            console.log(err)
            return res.status(500).json({ Status: 'Fail', Error: 'Server error', details: err.message });
        }
    },

    getallwardenrooms: async (req, res) => {
        try {
            const authHeader = req.headers.authorization || '';
            const token = authHeader.replace('Bearer ', '');
            if (!token) return res.json({ message: 'Unauthorized: No token provided' });

            const decoded = jwtDecode(token);
            const email = decoded.email || decoded.user?.email;

            const getwardendata = await User.findOne({ email });
            if (!getwardendata) return res.json({ message: 'Warden not found' });

            const gethostels = await Hostel.find({ warden: getwardendata._id });
            if (!gethostels.length) return res.json({ message: 'Hostel not assigned to this warden' });

            const hostelIds = gethostels.map(hostel => hostel._id);
            const rooms = await Room.find({ hostelID: { $in: hostelIds } });

            // console.log(rooms)

            return res.json({ Result: rooms });
        }
        catch (err) {
            console.log(err)
        }
    },

    assignstdtorooms_via_sp: async (req, res) => {
        try {
            const { studentId, roomId } = req.body;

            const gethostel = await Room.findById(roomId);
            const getstudent = await Student.findById(studentId);

            if (!getstudent || !gethostel) {
                return res.json({ error: "Invalid student or room ID" });
            }

            const getid = getstudent.enrolmentNo;
            const parts = getid.split('/');
            const yearofenroll = parseInt(parts[1], 10);

            if (yearofenroll >= 22 && yearofenroll <= 40) {
                const fullyear = 2000 + yearofenroll;

                // Allocation.regNo is sometimes stored as the student ObjectId or as enrolmentNo string.
                // Try to find the allocation by multiple possible keys.
                let allocation = await Allocation.findOne({
                    $or: [
                        { regNo: studentId },
                        { regNo: getstudent.enrolmentNo },
                        { studentId: studentId }
                    ]
                });

                if (!allocation) {
                    return res.json({ Error: "No existing allocation found for this student" });
                }

                allocation.roomId = roomId;
                allocation.studentId = allocation.studentId || getstudent._id;
                allocation.academicYear = fullyear;
                allocation.inDate = new Date();
                allocation.active = true;
                await allocation.save();

                await Room.findByIdAndUpdate(
                    roomId,
                    { $inc: { currentOccupants: 1 } },
                    { new: true }
                );

                return res.json({ Status: "Success", Message: "Allocation updated successfully" });
            } else {
                return res.json({ Error: "Invalid enrolment year in student ID" });
            }
        } catch (err) {
            console.log(err);
            return res.json({ Error: "Something went wrong" });
        }
    },


    assigned_students: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ Error: 'Unauthorized' });
            }

            const assignments = await getActiveWardenAssignments(userId);
            const hostelIds = getActiveWardenHostelIds(assignments);
            if (!hostelIds.length) {
                return res.status(403).json({ Error: 'Warden hostel not found' });
            }

            const getallstds = await Allocation.find({
                hostelID: { $in: hostelIds },
                active: true
            })
                .populate('regNo')
                .populate('roomId')
                .populate('hostelID')

            // console.log(getallstds)
            return res.json({ Result: getallstds })
        }
        catch (err) {
            console.log(err)
        }
    },

    unassign_student: async (req, res) => {
        try {
            const { id } = req.params; // allocation id
            const userId = req.user?.id;

            if (!id) return res.json({ Error: 'Allocation id required' });

            const allocation = await Allocation.findById(id);
            if (!allocation) return res.json({ Error: 'Allocation not found' });

            if (userId) {
                const assignments = await getActiveWardenAssignments(userId);
                const hostelIds = getActiveWardenHostelIds(assignments);
                if (hostelIds.length && !hostelIds.includes(allocation.hostelID?.toString())) {
                    return res.status(403).json({ Error: 'Forbidden' });
                }
            }

            const regNo = allocation.regNo;
            const roomId = allocation.roomId;

            if (!roomId) return res.json({ Error: 'Student is not assigned to a room' });

            // Remove student from room
            const room = await Room.findById(roomId);
            if (room) {
                // remove student id from students array
                room.students = (room.students || []).filter(s => s.toString() !== regNo.toString());
                room.currentOccupants = Math.max(0, (room.currentOccupants || 0) - 1);
                if (room.currentOccupants < (room.capasity || 0)) {
                    room.status = 'Availabe';
                }
                await room.save();
            }

            // Update allocation to mark as unassigned from room, but keep it active in the hostel
            allocation.roomId = null;
            // allocation.active = false; // Intentionally left true so they stay in Warden's queue
            await allocation.save();

            // Update student isAssign flag if possible
            let student = null;
            try {
                if (mongoose.Types.ObjectId.isValid(regNo)) {
                    student = await Student.findById(regNo);
                }
            } catch (e) {
                // ignore
            }

            if (!student && typeof regNo === 'string') {
                student = await Student.findOne({ enrolmentNo: regNo });
            }

            if (student) {
                // student.isAssign = false; // Intentionally skipped to prevent Admin from re-assigning them to another hostel
                // We keep the student 'assigned' at the hostel level
                await student.save();
            }

            const HostelAllocationHistory = require('../model/HostelAllocationHistory');
            const targetStudentId = student ? student._id : (allocation.studentId || null);
            
            if (targetStudentId) {
                await HostelAllocationHistory.create({
                    studentId: targetStudentId,
                    previousHostelId: allocation.hostelID,
                    previousRoomId: roomId,
                    newHostelId: allocation.hostelID,
                    newRoomId: null,
                    actionType: 'UNASSIGN_ROOM',
                    remark: req.body.remark || "Unassigned from room by Warden",
                    changedBy: userId
                });
            }

            return res.json({ Status: 'Success', Message: 'Student unassigned successfully' });
        } catch (err) {
            console.error('unassign_student error:', err);
            return res.json({ Error: 'An error occurred while unassigning student' });
        }
    },


    assign_students_room: async (req, res) => {
        try {
            const selectedStudentIds = req.body; // Array of Student IDs
            const userId = req.user?.id;

            const assignments = await getActiveWardenAssignments(userId);
            const hostelIds = getActiveWardenHostelIds(assignments);

            if (!Array.isArray(selectedStudentIds) || selectedStudentIds.length === 0) {
                return res.json({ Error: 'No student IDs provided' });
            }

            for (let i = 0; i < selectedStudentIds.length; i++) {
                const studentId = selectedStudentIds[i];

                // Find the student's allocation record
                const allocation = await Allocation.findOne({ regNo: studentId });
                if (!allocation) {
                    console.log(`No allocation found for student: ${studentId}`);
                    continue;
                }

                if (hostelIds.length && !hostelIds.includes(allocation.hostelID?.toString())) {
                    console.log(`Student ${studentId} is not in an assigned hostel`);
                    continue;
                }

                const hostelID = allocation.hostelID;
                if (!hostelID) {
                    console.log(`No hostelID in allocation for student: ${studentId}`);
                    continue;
                }

                // Find all available rooms in the same hostel
                const rooms = await Room.find({
                    hostelID: hostelID,
                    status: 'Availabe'
                });

                let assigned = false;

                for (let j = 0; j < rooms.length; j++) {
                    const room = rooms[j];

                    if (room.currentOccupants < room.capasity) {

                        allocation.roomId = room._id;
                        await allocation.save();

                        room.students.push(studentId);
                        room.currentOccupants += 1;
                        if (room.currentOccupants >= room.capasity) {
                            room.status = 'Full';
                        }

                        await room.save();
                        console.log(`Assigned student ${studentId} to room ${room.roomID}`);
                        assigned = true;
                        break;
                    }
                }

                if (!assigned) {
                    console.log(`No available room in hostel ${hostelID} for student ${studentId}`);
                }
            }

            return res.json({ Status: 'Success', message: 'All possible students assigned to rooms' });

        } catch (error) {
            console.error('assign_students_room error:', error);
            return res.json({ Error: 'An error occurred while assigning rooms' });
        }
    },

    // Assign selected students to a specific room
    assign_students_to_room_specific: async (req, res) => {
        try {
            const { studentIds, roomId } = req.body;
            const userId = req.user?.id;

            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                return res.json({ Error: 'No student IDs provided' });
            }

            if (!roomId) {
                return res.json({ Error: 'roomId is required' });
            }

            const room = await Room.findById(roomId);
            if (!room) return res.json({ Error: 'Room not found' });

            const assignments = await getActiveWardenAssignments(userId);
            const hostelIds = getActiveWardenHostelIds(assignments);
            if (hostelIds.length && !hostelIds.includes(room.hostelID?.toString())) {
                return res.status(403).json({ Error: 'Forbidden' });
            }

            const capacity = room.capasity || 0;
            const available = capacity - (room.currentOccupants || 0);
            if (available <= 0) return res.json({ Error: 'Room is full' });

            const results = { assigned: [], failed: [] };

            for (const studentId of studentIds) {
                if (results.assigned.length >= available) {
                    results.failed.push({ studentId, reason: 'No space available' });
                    continue;
                }

                const student = await Student.findById(studentId) || await Student.findOne({ enrolmentNo: studentId });

                // Find allocation robustly
                let allocation = await Allocation.findOne({
                    $or: [
                        { regNo: studentId },
                        { studentId: studentId },
                        { regNo: student?.enrolmentNo }
                    ]
                });

                if (!allocation) {
                    results.failed.push({ studentId, reason: 'No allocation found' });
                    continue;
                }

                if (allocation.roomId) {
                    results.failed.push({ studentId, reason: 'Already assigned' });
                    continue;
                }

                allocation.roomId = roomId;
                allocation.hostelID = allocation.hostelID || room.hostelID;
                allocation.inDate = new Date();
                allocation.active = true;
                await allocation.save();

                room.students = room.students || [];
                if (!room.students.some(s => s.toString() === String(studentId))) {
                    room.students.push(studentId);
                }
                room.currentOccupants = (room.currentOccupants || 0) + 1;
                if (room.currentOccupants >= capacity) room.status = 'Full';
                await room.save();

                if (student) {
                    student.isAssign = true;
                    student.hostelAssignedDate = new Date();
                    await student.save();
                }

                results.assigned.push(studentId);
            }

            return res.json({ Status: 'Success', Result: results });
        } catch (err) {
            console.error('assign_students_to_room_specific error:', err);
            return res.json({ Error: 'An error occurred while assigning students to room' });
        }
    },

    // Get all wardens with user and hostel details
    getAllWardens: async (req, res) => {
        try {
            const wardens = await Warden.find()
                .populate('userId', 'username email active')
                .populate('hostelId', 'name gender hostelID');

            console.log('🛎️ getAllWardens called – returning', wardens.length, 'records');
            return res.json({ Status: 'Success', Result: wardens });
        } catch (err) {
            console.error('Error getting wardens:', err);
            return res.json({ Error: 'Failed to fetch wardens' });
        }
    },

    // Get single warden by ID
    getWardenById: async (req, res) => {
        try {
            const { id } = req.params;
            const warden = await Warden.findById(id)
                .populate('userId', 'username email active')
                .populate('hostelId', 'name gender hostelID');

            if (!warden) {
                return res.json({ Error: 'Warden not found' });
            }
            return res.json({ Status: 'Success', Result: warden });
        } catch (err) {
            console.error('Error getting warden:', err);
            return res.json({ Error: 'Failed to fetch warden' });
        }
    },

    // Create new warden
    createWarden: async (req, res) => {
        try {
            const { userId, hostelId, startDate, active } = req.body;

            // Validate user exists
            const user = await User.findById(userId);
            if (!user) {
                return res.json({ Error: 'User not found' });
            }

            // Validate hostel exists
            const hostel = await Hostel.findById(hostelId);
            if (!hostel) {
                return res.json({ Error: 'Hostel not found' });
            }

            const existingAssignments = await Warden.find({ userId, active: true });
            const alreadyAssignedToHostel = existingAssignments.some(assignment =>
                assignment.hostelId && assignment.hostelId.toString() === hostelId.toString()
            );

            if (alreadyAssignedToHostel) {
                return res.json({ Error: 'User is already assigned to this hostel' });
            }

            if (existingAssignments.length >= 2) {
                return res.json({ Error: 'User can manage at most two hostels' });
            }

            // Create new warden
            const newWarden = new Warden({
                userId,
                hostelId,
                startDate: startDate || new Date(),
                active: active !== undefined ? active : true
            });

            await newWarden.save();

            // Update hostel with warden reference
            await Hostel.findByIdAndUpdate(hostelId, { warden: userId });

            const populatedWarden = await newWarden.populate('userId', 'username email')
                .populate('hostelId', 'name gender hostelID');

            return res.json({ Status: 'Success', message: 'Warden created successfully', Result: populatedWarden });
        } catch (err) {
            console.error('Error creating warden:', err);
            return res.json({ Error: 'Failed to create warden', details: err.message });
        }
    },

    // Update warden
    updateWarden: async (req, res) => {
        try {
            const { id } = req.params;
            const { hostelId, active, note } = req.body;

            const warden = await Warden.findById(id);
            if (!warden) {
                return res.json({ Error: 'Warden not found' });
            }

            // If hostel is being changed, validate new hostel
            if (hostelId && hostelId !== warden.hostelId.toString()) {
                const hostel = await Hostel.findById(hostelId);
                if (!hostel) {
                    return res.json({ Error: 'Hostel not found' });
                }

                const otherAssignments = await Warden.countDocuments({
                    userId: warden.userId,
                    active: true,
                    _id: { $ne: warden._id }
                });

                if (otherAssignments >= 2) {
                    return res.json({ Error: 'User can manage at most two hostels' });
                }

                // Update hostel references
                await Hostel.findByIdAndUpdate(warden.hostelId, { warden: null });
                await Hostel.findByIdAndUpdate(hostelId, { warden: warden.userId });
                warden.hostelId = hostelId;
            }

            if (active !== undefined) warden.active = active;
            if (note) warden.note = note;

            await warden.save();

            const updatedWarden = await Warden.findById(id)
                .populate('userId', 'username email active')
                .populate('hostelId', 'name gender hostelID');

            return res.json({ Status: 'Success', message: 'Warden updated successfully', Result: updatedWarden });
        } catch (err) {
            console.error('Error updating warden:', err);
            return res.json({ Error: 'Failed to update warden' });
        }
    },

    // Delete warden
    deleteWarden: async (req, res) => {
        try {
            const { id } = req.params;

            const warden = await Warden.findById(id);
            if (!warden) {
                return res.json({ Error: 'Warden not found' });
            }

            // Remove warden from hostel
            await Hostel.findByIdAndUpdate(warden.hostelId, { warden: null });

            // Delete warden record
            await Warden.findByIdAndDelete(id);

            return res.json({ Status: 'Success', message: 'Warden deleted successfully' });
        } catch (err) {
            console.error('Error deleting warden:', err);
            return res.json({ Error: 'Failed to delete warden' });
        }
    }

    ,
    // Collect payment for a student by the logged-in warden
    collect_payment: async (req, res) => {
        try {
            const { studentId, amount, type, note, academicYear, paidDate } = req.body;

            if (!studentId || amount === undefined) {
                return res.status(400).json({ Error: 'studentId and amount are required' });
            }

            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ Error: 'Unauthorized' });

            const assignments = await getActiveWardenAssignments(userId);
            const hostelIds = getActiveWardenHostelIds(assignments);
            if (!hostelIds.length) return res.status(403).json({ Error: 'Warden record not found' });

            // Find allocation for the student (regNo may be studentId or student object id stored in regNo)
            const allocation = await Allocation.findOne({
                $or: [
                    { regNo: studentId },
                    { studentId: studentId }
                ]
            });

            if (!allocation) return res.status(404).json({ Error: 'Allocation not found for student' });

            // Ensure student belongs to the warden's hostel
            if (!allocation.hostelID || !hostelIds.includes(allocation.hostelID.toString())) {
                return res.status(403).json({ Error: 'Student is not in your hostel' });
            }

            const payment = new Payment({
                studentId: allocation.studentId || studentId,
                academicYear: academicYear || allocation.academicYear || new Date().getFullYear().toString(),
                amount: Number(amount),
                type: type || 'hostel-fee',
                note: note || '',
                paidDate: paidDate ? new Date(paidDate) : new Date()
            });

            await payment.save();

            return res.json({ Status: 'Success', Result: payment });
        } catch (err) {
            console.error('collect_payment error:', err);
            return res.status(500).json({ Error: 'Server error', details: err.message });
        }
    },

    // Mark a student's hall fee as paid (creates or updates payment)
    markPaid: async (req, res) => {
        try {
            const userId = req.user?.id;
            const studentId = req.params.id; // student ID or allocation regNo

            if (!userId) return res.status(401).json({ Error: 'Unauthorized' });

            const assignments = await getActiveWardenAssignments(userId);
            const hostelIds = getActiveWardenHostelIds(assignments);
            if (!hostelIds.length) return res.status(403).json({ Error: 'Warden record not found' });

            const allocation = await Allocation.findOne({
                $or: [
                    { regNo: studentId },
                    { studentId: studentId }
                ],
                active: true
            });

            if (!allocation) return res.status(404).json({ Error: 'Allocation not found for student' });

            if (!allocation.hostelID || !hostelIds.includes(allocation.hostelID.toString())) {
                return res.status(403).json({ Error: 'Student is not in your hostel' });
            }

            const actualStudentId = allocation.studentId || studentId;
            const academicYear = allocation.academicYear || new Date().getFullYear().toString();

            let payment = await Payment.findOne({
                studentId: actualStudentId,
                academicYear: academicYear
            });

            const { amount } = req.body;
            const feeAmount = amount ? Number(amount) : 1500;

            if (payment) {
                payment.paymentStatus = 'Paid';
                payment.paidDate = new Date();
                payment.paidBy = userId;
                payment.amount = feeAmount;
                payment.hallFee = feeAmount;
                await payment.save();
            } else {
                payment = new Payment({
                    studentId: actualStudentId,
                    hostelId: allocation.hostelID,
                    roomId: allocation.roomId,
                    academicYear: academicYear,
                    hallFee: feeAmount,
                    amount: feeAmount,
                    type: 'hostel-fee',
                    paymentStatus: 'Paid',
                    paidDate: new Date(),
                    paidBy: userId
                });
                await payment.save();
            }

            return res.json({ Status: 'Success', Result: payment });
        } catch (err) {
            console.error('markPaid error:', err);
            return res.status(500).json({ Error: 'Server error', details: err.message });
        }
    },

    // Get payments for students in this warden's hostel
    getPayments: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ Error: 'Unauthorized' });

            const assignments = await getActiveWardenAssignments(userId);
            const rawHostelIds = getActiveWardenHostelIds(assignments);
            // Deduplicate hostel IDs in case warden has multiple assignments to the same hostel
            const hostelIds = [...new Set(rawHostelIds)];
            if (!hostelIds.length) return res.status(403).json({ Error: 'Warden record not found' });

            console.log('[getPayments] userId:', userId);
            console.log('[getPayments] warden assignments:', assignments.map(a => ({ hostelId: a.hostelId?._id || a.hostelId, hostelName: a.hostelId?.name, active: a.active })));
            console.log('[getPayments] resolved hostelIds (deduped):', hostelIds);

            // Fetch ONLY active allocations for the warden's specific hostel(s)
            const allocs = await Allocation.find({ hostelID: { $in: hostelIds }, active: true })
                .populate('roomId')
                .populate('hostelID')
                .populate('studentId', 'fullName enrolmentNo name nic no _id department batchYear studyYear');

            console.log('[getPayments] allocations found:', allocs.length);

            // Collect student ObjectIds and Enrolment Numbers
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            const enrolmentNos = [];
            const objectIdsFromRegNo = [];

            allocs.forEach(a => {
                if (!a.studentId && a.regNo) {
                    const val = String(a.regNo);
                    if (objectIdPattern.test(val)) {
                        objectIdsFromRegNo.push(val);
                    } else {
                        enrolmentNos.push(val);
                    }
                }
            });

            // Resolve legacy string regNos to Student objects
            const studentMap = {};

            const promises = [];
            if (enrolmentNos.length > 0) {
                promises.push(Student.find({ enrolmentNo: { $in: enrolmentNos } }).select('fullName enrolmentNo name nic no _id department batchYear studyYear'));
            }
            if (objectIdsFromRegNo.length > 0) {
                promises.push(Student.find({ _id: { $in: objectIdsFromRegNo } }).select('fullName enrolmentNo name nic no _id department batchYear studyYear'));
            }

            const studentResults = await Promise.all(promises);
            const flatStudents = studentResults.flat();

            flatStudents.forEach(s => {
                if (s.enrolmentNo) studentMap[s.enrolmentNo] = s;
                studentMap[s._id.toString()] = s;
            });

            // Collect unique ObjectIds to fetch payments
            const studentIdsToFetch = allocs.map(a => {
                if (a.studentId && a.studentId._id) return a.studentId._id.toString();
                if (!a.studentId && a.regNo) {
                    const val = String(a.regNo);
                    if (studentMap[val]) return studentMap[val]._id.toString();
                }
                return null;
            }).filter(Boolean);

            let payments = [];
            if (studentIdsToFetch.length > 0) {
                payments = await Payment.find({ studentId: { $in: studentIdsToFetch } });
            }

            const paymentsMap = {};
            payments.forEach(p => {
                const sid = p.studentId ? p.studentId.toString() : null;
                if (sid) paymentsMap[sid] = p;
            });

            const results = [];
            const seenStudentIds = new Set(); // Deduplicate by student ID
            for (let a of allocs) {
                // Determine the student object
                let studentObj = null;
                let sidStr = null;

                if (a.studentId && a.studentId._id) {
                    studentObj = a.studentId;
                    sidStr = a.studentId._id.toString();
                } else if (!a.studentId && a.regNo) {
                    // Ensure we use string key for lookup
                    const regKey = String(a.regNo);
                    if (studentMap[regKey]) {
                        studentObj = studentMap[regKey];
                        sidStr = studentMap[regKey]._id.toString();
                    } else {
                        // If no matching student, skip this allocation
                        studentObj = null;
                        sidStr = null;
                    }
                }

                // Skip if we already added this student (prevents duplicates)
                if (!studentObj || !sidStr || seenStudentIds.has(sidStr)) continue;
                // Skip entries where enrolmentNo looks like a raw ObjectId (24‑hex chars)
                if (/^[0-9a-fA-F]{24}$/.test(studentObj.enrolmentNo)) continue;
                seenStudentIds.add(sidStr);

                let p = paymentsMap[sidStr] || null;

                results.push({
                    _id: p ? p._id : a._id,
                    studentId: studentObj,
                    hostelName: a.hostelID ? a.hostelID.name : null,
                    roomNo: a.roomId ? a.roomId.roomID : null,
                    amount: p ? p.amount : 0,
                    paidDate: p ? p.paidDate : null,
                    paymentStatus: p ? (p.paymentStatus || 'Paid') : 'Pending'
                });
            }

            console.log('[getPayments] final results count (deduped):', results.length);

            return res.json({ Status: 'Success', Result: results, total: results.reduce((s, x) => s + (x.paymentStatus === 'Paid' ? (x.amount || 0) : 0), 0) });
        } catch (err) {
            console.error('warden getPayments error:', err);
            return res.status(500).json({ Error: 'Server error', details: err.message });
        }
    },

    // Export payments for this warden's hostel as Excel
    exportPayments: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ Error: 'Unauthorized' });

            const assignments = await getActiveWardenAssignments(userId);
            const hostelIds = getActiveWardenHostelIds(assignments);
            if (!hostelIds.length) return res.status(403).json({ Error: 'Warden record not found' });

            // Get allocations for the hostel
            const allocations = await Allocation.find({ hostelID: { $in: hostelIds } });

            // Collect student ObjectIds from allocations (if stored) and regNos otherwise.
            // NOTE: Some legacy data stores Student _id (24-hex) as a string in Allocation.regNo.
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;

            const objectIds = allocations
                .filter(a => a.studentId)
                .map(a => (a.studentId.toString ? a.studentId.toString() : String(a.studentId)));

            const regNosRaw = allocations
                .filter(a => !a.studentId && a.regNo)
                .map(a => String(a.regNo));

            const regNoObjectIds = regNosRaw.filter(v => objectIdPattern.test(v));
            const enrolmentNos = regNosRaw.filter(v => !objectIdPattern.test(v));

            // Resolve enrolmentNos to Student _id where possible
            let resolvedIds = [];
            if (enrolmentNos.length) {
                const students = await Student.find({ enrolmentNo: { $in: enrolmentNos } }).select('_id enrolmentNo');
                const map = {};
                students.forEach(s => { map[s.enrolmentNo] = s._id; });
                resolvedIds = enrolmentNos.map(r => map[r]).filter(Boolean);
            }

            const studentIds = Array.from(new Set([
                ...objectIds,
                ...regNoObjectIds,
                ...resolvedIds.map(id => id.toString())
            ]));

            const payments = await Payment.find({ studentId: { $in: studentIds } })
                .populate('studentId', 'fullName enrolmentNo nic no _id')
                .sort({ paidDate: -1 });

            // Map allocations to room numbers for the returned payments
            const studentIdsForLookup = payments.map(p => (p.studentId && p.studentId._id) ? p.studentId._id.toString() : (p.studentId ? p.studentId.toString() : null)).filter(Boolean);

            const allocs = await Allocation.find({
                $or: [{ regNo: { $in: studentIdsForLookup } }, { studentId: { $in: studentIdsForLookup } }],
                active: true
            }).populate('roomId').populate('hostelID');

            const allocMap = {};
            allocs.forEach(a => {
                const sid = a.studentId ? (a.studentId.toString ? a.studentId.toString() : a.studentId) : (a.regNo ? a.regNo.toString() : null);
                if (!sid) return;
                allocMap[sid] = {
                    roomNo: a.roomId && a.roomId.roomID ? a.roomId.roomID : null,
                    hostelName: a.hostelID && a.hostelID.name ? a.hostelID.name : null
                };
            });

            const paymentsWithRoom = payments.map(p => {
                const pObj = p.toObject ? p.toObject() : p;
                let roomNo = null;
                let hostelName = null;

                // Try to find room and hostel using studentId first
                if (pObj.studentId && pObj.studentId._id) {
                    const studentIdStr = pObj.studentId._id.toString();
                    if (allocMap[studentIdStr]) {
                        roomNo = allocMap[studentIdStr].roomNo || null;
                        hostelName = allocMap[studentIdStr].hostelName || null;
                    }
                }

                // Fallback: try using enrollment number if studentId lookup failed
                if (!roomNo && pObj.studentId && pObj.studentId.enrolmentNo) {
                    if (allocMap[pObj.studentId.enrolmentNo]) {
                        roomNo = allocMap[pObj.studentId.enrolmentNo].roomNo || null;
                        hostelName = allocMap[pObj.studentId.enrolmentNo].hostelName || null;
                    }
                }

                pObj.roomNo = roomNo;
                pObj.hostelName = hostelName;
                return pObj;
            });

            // Prepare rows for Excel; format date properly to avoid timezone issues
            const rows = paymentsWithRoom.map((p, idx) => {
                // Convert date to YYYY-MM-DD string format to avoid timezone shifts
                let paidDateStr = '';
                if (p.paidDate) {
                    const date = new Date(p.paidDate);
                    paidDateStr = date.toISOString().split('T')[0]; // Gets YYYY-MM-DD
                }

                return {
                    '#': idx + 1,
                    'Reg No': p.studentId?.no || '',
                    'Enrollment No': p.studentId?.enrolmentNo || '',
                    'Full Name': p.studentId?.fullName || '',
                    'Hostel': p.hostelName || '',
                    'Room No': p.roomNo || '',
                    'Amount': p.amount || 0,
                    'Paid Date': paidDateStr,
                    'Type': p.type || '',
                    'Note': p.note || ''
                };
            });

            const ws = XLSX.utils.json_to_sheet(rows);

            // Adjust column widths for better readability
            const colWidths = [
                { wch: 5 },   // #
                { wch: 15 },  // Reg No
                { wch: 18 },  // Enrollment No
                { wch: 25 },  // Full Name
                { wch: 20 },  // Hostel
                { wch: 10 },  // Room No
                { wch: 12 },  // Amount
                { wch: 12 },  // Paid Date
                { wch: 15 },  // Type
                { wch: 20 }   // Note
            ];
            ws['!cols'] = colWidths;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Payments');

            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer', cellDates: true });

            res.setHeader('Content-Disposition', `attachment; filename=payments-warden.xlsx`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return res.send(buf);
        } catch (err) {
            console.error('warden exportPayments error:', err);
            return res.status(500).json({ Error: 'Server error', details: err.message });
        }
    }

};

module.exports = WardenController;