const Student = require('../model/Student');
const Allocation = require('../model/Allocation');
const Hostel = require('../model/Hostel');
const ExcelImportList = require('../model/ExcelImportList');

const EligibilityController = {
    // ─── Eligible Students Page ───
    // Returns students where eligibilityStatus is Not Evaluated or Not Eligible
    getNotEligibleStudents: async (req, res) => {
        try {
            const students = await Student.find({
                eligibilityStatus: { $in: ['Not Eligible', false, null, undefined] }
            }).lean();
            return res.json({ Result: students });
        } catch (err) {
            console.error("Error in getNotEligibleStudents:", err);
            return res.status(500).json({ Error: "Internal server error" });
        }
    },

    // Mark selected students as eligible (eligibilityStatus = 'Eligible', isAssign stays false)
    markEligible: async (req, res) => {
        try {
            const { studentIds } = req.body;
            if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
                return res.status(400).json({ Error: 'studentIds array is required' });
            }

            await Student.updateMany(
                { _id: { $in: studentIds } },
                { $set: { eligibilityStatus: 'Eligible', isAssign: false } }
            );

            return res.json({
                Status: 'Success',
                Message: `${studentIds.length} student(s) marked as eligible.`
            });
        } catch (err) {
            console.error('Error in markEligible:', err);
            return res.status(500).json({ Error: 'Internal server error' });
        }
    },

    // Mark selected students as NOT eligible (eligibilityStatus = 'Not Eligible')
    markNotEligible: async (req, res) => {
        try {
            const { studentIds } = req.body;
            if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
                return res.status(400).json({ Error: 'studentIds array is required' });
            }

            const activeAllocations = await Allocation.find({
                studentId: { $in: studentIds },
                active: true
            }).select('studentId').lean();
            const assignedStudentIds = activeAllocations.map(allocation => allocation.studentId);

            // Only allow un-marking students who are not currently assigned.
            await Student.updateMany(
                { _id: { $in: studentIds, $nin: assignedStudentIds } },
                { $set: { eligibilityStatus: 'Not Eligible' } }
            );

            return res.json({
                Status: 'Success',
                Message: `Student(s) marked as not eligible.`
            });
        } catch (err) {
            console.error('Error in markNotEligible:', err);
            return res.status(500).json({ Error: 'Internal server error' });
        }
    },

    // ─── Hostel Assignment Page ───
    // Returns eligible students with their current allocation state.
    getEligibleForAssignment: async (req, res) => {
        try {
            const students = await Student.find({
                eligibilityStatus: { $in: ['Eligible', 'Assigned', true] }
            }).lean();

            const activeAllocations = await Allocation.find({
                studentId: { $in: students.map(student => student._id) },
                active: true
            }).populate('hostelID', 'name hostelID').sort({ inDate: -1 }).lean();

            const allocationByStudent = new Map();
            for (const allocation of activeAllocations) {
                const studentId = allocation.studentId?.toString();
                if (studentId && !allocationByStudent.has(studentId)) {
                    allocationByStudent.set(studentId, allocation);
                }
            }

            const result = students.map(student => {
                const allocation = allocationByStudent.get(student._id.toString());
                return {
                    ...student,
                    assignmentStatus: allocation ? 'Assigned' : 'Not Assigned',
                    currentHostel: allocation?.hostelID?.name || '-',
                    activeAllocationId: allocation?._id || null,
                };
            });

            return res.json({ Result: result });
        } catch (err) {
            console.error("Error in getEligibleForAssignment:", err);
            return res.status(500).json({ Error: "Internal server error" });
        }
    },

    // ─── Assigned Students Page ───
    // Enriched with hostel, room, and allocation details by querying Allocation directly
    getAssignedStudents: async (req, res) => {
        try {
            // Fetch active allocations first
            const allocations = await Allocation.find({ active: true })
                .populate('hostelID', 'name hostelID')
                .populate('roomId', 'roomID')
                .lean();

            if (!allocations.length) {
                return res.json({ Result: [] });
            }

            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            const objectIds = new Set();
            const enrolmentNos = new Set();

            allocations.forEach(allocation => {
                if (allocation.studentId) {
                    objectIds.add(allocation.studentId.toString());
                }

                if (allocation.regNo) {
                    const regNoStr = String(allocation.regNo);
                    if (objectIdPattern.test(regNoStr)) {
                        objectIds.add(regNoStr);
                    } else {
                        enrolmentNos.add(regNoStr);
                        enrolmentNos.add(regNoStr.toUpperCase());
                    }
                }
            });

            // Fetch corresponding students
            const students = await Student.find({
                $or: [
                    { _id: { $in: Array.from(objectIds) } },
                    { enrolmentNo: { $in: Array.from(enrolmentNos) } }
                ]
            }).lean();

            // Build student map for quick lookup
            const studentMap = new Map();
            for (const s of students) {
                if (s._id) studentMap.set(s._id.toString(), s);
                if (s.enrolmentNo) {
                    studentMap.set(s.enrolmentNo, s);
                    studentMap.set(s.enrolmentNo.toUpperCase(), s);
                }
            }

            // Identify and clean up orphaned allocations
            const orphanedAllocationIds = [];

            // Enrich allocations with student data
            const enriched = allocations.map(alloc => {
                let s = null;
                if (alloc.studentId && studentMap.has(alloc.studentId.toString())) {
                    s = studentMap.get(alloc.studentId.toString());
                } 
                
                if (!s && alloc.regNo) {
                    const regNoStr = String(alloc.regNo);
                    if (objectIdPattern.test(regNoStr) && studentMap.has(regNoStr)) {
                        s = studentMap.get(regNoStr);
                    } else if (studentMap.has(regNoStr.toUpperCase())) {
                        s = studentMap.get(regNoStr.toUpperCase());
                    } else if (studentMap.has(regNoStr)) {
                        s = studentMap.get(regNoStr);
                    }
                }
                
                // If student record not found, still provide fallback info from allocation
                if (!s || Object.keys(s).length === 0) {
                    return {
                        _id: alloc.studentId || alloc._id,
                        allocationId: alloc._id,
                        enrolmentNo: alloc.regNo || 'Unknown',
                        name: 'Unknown Student',
                        hostelName: alloc.hostelID?.name || null,
                        hostelCode: alloc.hostelID?.hostelID || null,
                        roomNumber: alloc.roomId?.roomID || null,
                        assignmentDate: alloc.inDate || null,
                        allocationActive: alloc.active || false,
                    };
                }
                
                return {
                    ...s,
                    _id: s._id || alloc._id,
                    allocationId: alloc._id,
                    enrolmentNo: s.enrolmentNo || alloc.regNo || 'Unknown',
                    name: s.name || 'Unknown Student',
                    hostelName: alloc.hostelID?.name || null,
                    hostelCode: alloc.hostelID?.hostelID || null,
                    roomNumber: alloc.roomId?.roomID || null,
                    assignmentDate: alloc.inDate || s.hostelAssignedDate || null,
                    allocationActive: alloc.active || false,
                };
            }).filter(Boolean);

            // Ensure unique students in case of duplicate active allocations
            const uniqueStudents = [];
            const seenIds = new Set();
            for (const item of enriched) {
                const id = item._id ? item._id.toString() : null;
                if (id && !seenIds.has(id)) {
                    seenIds.add(id);
                    uniqueStudents.push(item);
                }
            }

            return res.json({ Result: uniqueStudents });
        } catch (err) {
            console.error("Error in getAssignedStudents:", err);
            return res.status(500).json({ Error: "Internal server error" });
        }
    },

    // Unassign selected students from hostels
    unassignStudents: async (req, res) => {
        try {
            const { allocationIds, note, changeDate } = req.body;
            if (!allocationIds || !Array.isArray(allocationIds) || allocationIds.length === 0) {
                return res.status(400).json({ Error: 'allocationIds array is required' });
            }

            // Clean the incoming IDs (remove nulls/undefined)
            const cleanIds = allocationIds.filter(Boolean);
            if (cleanIds.length === 0) {
                return res.status(400).json({ Error: 'No valid IDs provided' });
            }

            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            const validObjectIds = cleanIds.filter(id => objectIdPattern.test(String(id)));
            const nonObjectIds = cleanIds.filter(id => !objectIdPattern.test(String(id)));

            const orConditions = [];
            if (validObjectIds.length > 0) {
                orConditions.push({ _id: { $in: validObjectIds } });
                orConditions.push({ studentId: { $in: validObjectIds } });
                orConditions.push({ regNo: { $in: validObjectIds } });
            }
            if (nonObjectIds.length > 0) {
                orConditions.push({ regNo: { $in: nonObjectIds } });
            }

            if (orConditions.length === 0) {
                return res.status(400).json({ Error: 'No valid IDs provided to query' });
            }

            // 1. Find the initial targeted allocations
            const initialAllocations = await Allocation.find({
                $or: orConditions,
                active: true
            });

            if (!initialAllocations.length) {
                return res.json({
                    Status: 'Success',
                    Message: 'No active allocations found to unassign.'
                });
            }
            
            // Extract the unique student identifiers to find ALL of their duplicate allocations
            const studentIds = initialAllocations.map(a => a.studentId).filter(Boolean);
            const regNos = initialAllocations.map(a => a.regNo).filter(Boolean);
            
            const studentIdStrings = new Set(studentIds.map(id => id.toString()));
            const regNoStrings = new Set(regNos.map(r => String(r)));

            // 2. Fetch ALL active allocations for these specific students (cleaning up duplicates)
            const allStudentConditions = [];
            if (studentIdStrings.size > 0) {
                allStudentConditions.push({ studentId: { $in: Array.from(studentIdStrings) } });
                allStudentConditions.push({ regNo: { $in: Array.from(studentIdStrings) } }); // Handle legacy regNo
            }
            if (regNoStrings.size > 0) {
                allStudentConditions.push({ regNo: { $in: Array.from(regNoStrings) } });
            }

            const allTargetAllocations = await Allocation.find({
                $or: allStudentConditions,
                active: true
            });

            const actualAllocationIds = allTargetAllocations.map(a => a._id);
            const Room = require('../model/Room'); // Assuming Room is in the same directory

            // 3. Deactivate ALL found allocations
            if (actualAllocationIds.length > 0) {
                const outDateVal = changeDate ? new Date(changeDate) : new Date();
                const noteVal = note || "Unassigned by Admin";

                await Allocation.updateMany(
                    { _id: { $in: actualAllocationIds } },
                    { $set: { active: false, outDate: outDateVal, note: noteVal } }
                );

                // 4. Also remove them from their assigned Rooms
                const roomOccupancyDecrements = {};
                const studentObjectIdsToRemove = [];

                allTargetAllocations.forEach(alloc => {
                    if (alloc.roomId) {
                        const rId = alloc.roomId.toString();
                        roomOccupancyDecrements[rId] = (roomOccupancyDecrements[rId] || 0) + 1;
                    }
                    if (alloc.studentId) studentObjectIdsToRemove.push(alloc.studentId);
                    else if (objectIdPattern.test(String(alloc.regNo))) studentObjectIdsToRemove.push(alloc.regNo);
                });

                // Apply room decrements and student array removals
                for (const [roomId, count] of Object.entries(roomOccupancyDecrements)) {
                    await Room.updateOne(
                        { _id: roomId },
                        { 
                            $inc: { currentOccupants: -count },
                            $pullAll: { students: studentObjectIdsToRemove }
                        }
                    );
                    
                    // Re-evaluate Room status if it was Full
                    await Room.updateOne(
                        { _id: roomId, currentOccupants: { $lt: 4 } }, // $lt capacity, ideally dynamic but safe fallback
                        { $set: { status: 'Availabe' } }
                    );
                }
            }

            const HostelAllocationHistory = require('../model/HostelAllocationHistory');
            const historyDocs = [];
            
            const missingStudentIds = allTargetAllocations.filter(a => !a.studentId && a.regNo).map(a => a.regNo);
            let legacyStudentsMap = new Map();
            if(missingStudentIds.length) {
                const ls = await Student.find({ enrolmentNo: { $in: missingStudentIds }});
                ls.forEach(s => legacyStudentsMap.set(s.enrolmentNo, s._id));
            }

            allTargetAllocations.forEach(alloc => {
                const sId = alloc.studentId || legacyStudentsMap.get(alloc.regNo) || (objectIdPattern.test(String(alloc.regNo)) ? alloc.regNo : null);
                if (sId) {
                    historyDocs.push({
                        studentId: sId,
                        previousHostelId: alloc.hostelID,
                        previousRoomId: alloc.roomId,
                        newHostelId: null,
                        newRoomId: null,
                        actionType: 'UNASSIGN_HOSTEL',
                        actionDate: outDateVal,
                        remark: noteVal,
                        changedBy: req.user?.id || req.user?._id
                    });
                }
            });

            if(historyDocs.length > 0) {
                await HostelAllocationHistory.insertMany(historyDocs);
            }

            // 5. Update the students' status back to Eligible
            const enrolmentNos = new Set();
            regNoStrings.forEach(r => {
                if (!objectIdPattern.test(r)) {
                    enrolmentNos.add(r);
                    enrolmentNos.add(r.toUpperCase());
                }
            });

            const studentOrConditions = [];
            if (studentIdStrings.size > 0) {
                studentOrConditions.push({ _id: { $in: Array.from(studentIdStrings) } });
            }
            if (enrolmentNos.size > 0) {
                studentOrConditions.push({ enrolmentNo: { $in: Array.from(enrolmentNos) } });
            }

            if (studentOrConditions.length > 0) {
                await Student.updateMany(
                    { $or: studentOrConditions },
                    { $set: { isAssign: false, eligibilityStatus: 'Eligible', hostelAssignedDate: null } }
                );
            }

            return res.json({
                Status: 'Success',
                Message: `${actualAllocationIds.length} allocation(s) for ${initialAllocations.length} student(s) unassigned successfully.`
            });
        } catch (err) {
            console.error('Error in unassignStudents:', err);
            return res.status(500).json({ Error: 'Internal server error' });
        }
    },

    // Change students' hostel
    changeHostel: async (req, res) => {
        try {
            const { allocationIds, newHostelId, note, changeDate } = req.body;
            if (!allocationIds || !newHostelId) {
                return res.status(400).json({ Error: 'allocationIds and newHostelId are required' });
            }

            const cleanIds = allocationIds.filter(Boolean);
            if (cleanIds.length === 0) {
                return res.status(400).json({ Error: 'No valid IDs provided' });
            }

            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            const validObjectIds = cleanIds.filter(id => objectIdPattern.test(String(id)));
            const nonObjectIds = cleanIds.filter(id => !objectIdPattern.test(String(id)));

            const orConditions = [];
            if (validObjectIds.length > 0) {
                orConditions.push({ _id: { $in: validObjectIds } });
                orConditions.push({ studentId: { $in: validObjectIds } });
                orConditions.push({ regNo: { $in: validObjectIds } });
            }
            if (nonObjectIds.length > 0) {
                orConditions.push({ regNo: { $in: nonObjectIds } });
            }

            if (orConditions.length === 0) return res.status(400).json({ Error: 'No valid IDs provided to query' });

            const initialAllocations = await Allocation.find({
                $or: orConditions,
                active: true
            });

            if (!initialAllocations.length) {
                return res.json({ Status: 'Error', Message: 'No active allocations found to change.' });
            }

            const studentIds = initialAllocations.map(a => a.studentId).filter(Boolean);
            const regNos = initialAllocations.map(a => a.regNo).filter(Boolean);
            
            const studentIdStrings = new Set(studentIds.map(id => id.toString()));
            const regNoStrings = new Set(regNos.map(r => String(r)));

            const allStudentConditions = [];
            if (studentIdStrings.size > 0) {
                allStudentConditions.push({ studentId: { $in: Array.from(studentIdStrings) } });
                allStudentConditions.push({ regNo: { $in: Array.from(studentIdStrings) } }); 
            }
            if (regNoStrings.size > 0) {
                allStudentConditions.push({ regNo: { $in: Array.from(regNoStrings) } });
            }

            const allTargetAllocations = await Allocation.find({
                $or: allStudentConditions,
                active: true
            });

            const actualAllocationIds = allTargetAllocations.map(a => a._id);
            const Room = require('../model/Room'); 

            const outDateVal = changeDate ? new Date(changeDate) : new Date();
            const noteVal = note || "Transferred to another hostel";

            if (actualAllocationIds.length > 0) {
                await Allocation.updateMany(
                    { _id: { $in: actualAllocationIds } },
                    { $set: { active: false, outDate: outDateVal, note: noteVal } }
                );

                const roomOccupancyDecrements = {};
                const studentObjectIdsToRemove = [];

                allTargetAllocations.forEach(alloc => {
                    if (alloc.roomId) {
                        const rId = alloc.roomId.toString();
                        roomOccupancyDecrements[rId] = (roomOccupancyDecrements[rId] || 0) + 1;
                    }
                    if (alloc.studentId) studentObjectIdsToRemove.push(alloc.studentId);
                    else if (objectIdPattern.test(String(alloc.regNo))) studentObjectIdsToRemove.push(alloc.regNo);
                });

                for (const [roomId, count] of Object.entries(roomOccupancyDecrements)) {
                    await Room.updateOne(
                        { _id: roomId },
                        { $inc: { currentOccupants: -count }, $pullAll: { students: studentObjectIdsToRemove } }
                    );
                    await Room.updateOne(
                        { _id: roomId, currentOccupants: { $lt: 4 } },
                        { $set: { status: 'Availabe' } }
                    );
                }
            }

            const HostelAllocationHistory = require('../model/HostelAllocationHistory');
            const historyDocs = [];
            
            const missingStudentIds = allTargetAllocations.filter(a => !a.studentId && a.regNo).map(a => a.regNo);
            let legacyStudentsMap = new Map();
            if(missingStudentIds.length) {
                const ls = await Student.find({ enrolmentNo: { $in: missingStudentIds }});
                ls.forEach(s => legacyStudentsMap.set(s.enrolmentNo, s._id));
            }

            allTargetAllocations.forEach(alloc => {
                const sId = alloc.studentId || legacyStudentsMap.get(alloc.regNo) || (objectIdPattern.test(String(alloc.regNo)) ? alloc.regNo : null);
                if (sId) {
                    historyDocs.push({
                        studentId: sId,
                        previousHostelId: alloc.hostelID,
                        previousRoomId: alloc.roomId,
                        newHostelId: newHostelId,
                        newRoomId: null,
                        actionType: 'HOSTEL_CHANGE',
                        actionDate: outDateVal,
                        remark: noteVal,
                        changedBy: req.user?.id || req.user?._id
                    });
                }
            });

            if(historyDocs.length > 0) {
                await HostelAllocationHistory.insertMany(historyDocs);
            }

            const newAllocations = [];
            const uniqueStudentsToAssign = new Map();
            allTargetAllocations.forEach(alloc => {
                 const key = alloc.studentId ? alloc.studentId.toString() : alloc.regNo;
                 if(!uniqueStudentsToAssign.has(key)) {
                     uniqueStudentsToAssign.set(key, { studentId: alloc.studentId, regNo: alloc.regNo });
                 }
            });

            uniqueStudentsToAssign.forEach(info => {
                 newAllocations.push({
                     regNo: info.regNo || info.studentId,
                     studentId: info.studentId,
                     hostelID: newHostelId,
                     academicYear: new Date().getFullYear().toString(),
                     inDate: outDateVal,
                     active: true,
                 });
            });

            await Allocation.insertMany(newAllocations);

            return res.json({ Status: 'Success', Message: `Successfully transferred students to the new hostel.` });
        } catch (err) {
            console.error('Error in changeHostel:', err);
            return res.status(500).json({ Error: 'Internal server error' });
        }
    },
    // ─── Excel Import List ───
    // Save imported enrolment numbers (replaces or appends to previous import)
    saveExcelImportList: async (req, res) => {
        try {
            const { enrolmentNumbers, label, append } = req.body;
            if (!enrolmentNumbers || !Array.isArray(enrolmentNumbers) || enrolmentNumbers.length === 0) {
                return res.status(400).json({ Error: 'enrolmentNumbers array is required' });
            }

            let finalEnrolmentNumbers = [...enrolmentNumbers];

            if (append) {
                const existing = await ExcelImportList.findOne().sort({ importedAt: -1 }).lean();
                if (existing) {
                    finalEnrolmentNumbers = [...new Set([...existing.enrolmentNumbers, ...enrolmentNumbers])];
                }
            }

            // Cross-check with eligible students to count eligibleCount
            const eligible = await Student.find({
                enrolmentNo: { $in: finalEnrolmentNumbers },
                eligibilityStatus: { $in: ['Eligible', true] },
                isAssign: false
            }).lean();

            // Delete all previous imports (keep only the latest)
            await ExcelImportList.deleteMany({});

            const newList = await ExcelImportList.create({
                enrolmentNumbers: finalEnrolmentNumbers,
                importedBy: req.user?._id || req.user?.id || null,
                totalImported: finalEnrolmentNumbers.length,
                eligibleCount: eligible.length,
                label: append ? `Appended to List` : (label || ''),
            });

            return res.json({
                Status: 'Success',
                Message: `Import saved. ${eligible.length} eligible students found from ${finalEnrolmentNumbers.length} total imported.`,
                data: newList
            });
        } catch (err) {
            console.error('Error in saveExcelImportList:', err);
            return res.status(500).json({ Error: 'Internal server error' });
        }
    },

    // Get the currently saved Excel import list
    getExcelImportList: async (req, res) => {
        try {
            const list = await ExcelImportList.findOne().sort({ importedAt: -1 }).lean();
            if (!list) return res.json({ Result: null });
            return res.json({ Result: list });
        } catch (err) {
            console.error('Error in getExcelImportList:', err);
            return res.status(500).json({ Error: 'Internal server error' });
        }
    },

    // Clear the Excel import list
    clearExcelImportList: async (req, res) => {
        try {
            await ExcelImportList.deleteMany({});
            return res.json({ Status: 'Success', Message: 'Import list cleared.' });
        } catch (err) {
            console.error('Error in clearExcelImportList:', err);
            return res.status(500).json({ Error: 'Internal server error' });
        }
    },

    // Get allocation history for a specific student
    getStudentAllocationHistory: async (req, res) => {
        try {
            const { studentId } = req.params;
            const HostelAllocationHistory = require('../model/HostelAllocationHistory');
            const mongoose = require('mongoose');

            const orConditions = [];

            // Search by ObjectId if valid
            if (mongoose.Types.ObjectId.isValid(studentId)) {
                orConditions.push({ studentId: studentId });
            }

            // Also try to find student by enrolmentNo to get their _id
            const student = await Student.findOne({
                $or: [
                    ...(mongoose.Types.ObjectId.isValid(studentId) ? [{ _id: studentId }] : []),
                    { enrolmentNo: studentId }
                ]
            });

            if (student && !orConditions.some(c => c.studentId?.toString() === student._id.toString())) {
                orConditions.push({ studentId: student._id });
            }

            if (orConditions.length === 0) {
                return res.json({ Result: [] });
            }

            const history = await HostelAllocationHistory.find({ $or: orConditions })
                .populate('previousHostelId', 'name hostelID')
                .populate('previousRoomId', 'roomID roomNo')
                .populate('newHostelId', 'name hostelID')
                .populate('newRoomId', 'roomID roomNo')
                .populate('changedBy', 'username email')
                .sort({ actionDate: -1, createdAt: -1 });

            return res.json({ Result: history });
        } catch (err) {
            console.error('Error in getStudentAllocationHistory:', err);
            return res.status(500).json({ Error: 'Internal server error' });
        }
    },
};

module.exports = EligibilityController;
