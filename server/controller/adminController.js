const Payment = require("../model/Payment");
const Allocation = require("../model/Allocation");
const Student = require("../model/Student");
const SpecialNeeds = require("../model/SpecialNeeds");
const XLSX = require('xlsx');

const parseEnrolParts = (enrolmentNo) => String(enrolmentNo || '').split('/').filter(Boolean);

const getMainDeptFromEnrol = (enrolmentNo) => {
    const parts = parseEnrolParts(enrolmentNo);
    return parts[0] || '';
};

const getSubDeptFromEnrol = (enrolmentNo) => {
    const parts = parseEnrolParts(enrolmentNo);
    if (parts.length >= 4) return parts[2] || '';
    if (parts.length === 3) return parts[0] || '';
    return '';
};

const getBatchFromEnrol = (enrolmentNo) => {
    const parts = parseEnrolParts(enrolmentNo);
    return parts[1] || '';
};

const getBatchPrefixFromEnrol = (enrolmentNo) => {
    const parts = parseEnrolParts(enrolmentNo);
    if (parts.length < 2) return '';
    return `${parts[0]}/${parts[1]}`.toUpperCase();
};

const normalizeBatchYear = (value) => {
    const val = String(value || '').trim();
    if (!val) return '';
    if (/^\d{2}$/.test(val)) return `20${val}`;
    return val;
};

const normalizeDate = (value, isEndOfDay = false) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    if (isEndOfDay) {
        date.setHours(23, 59, 59, 999);
    } else {
        date.setHours(0, 0, 0, 0);
    }
    return date;
};

const AdminController = {
    // Admin: Get all students in hostel(s) with their payment status
    getPayments: async (req, res) => {
        try {
            const { hostelId, departmentFilter, batch, batchYear, residentDateFrom, residentDateTo } = req.query;

            const residentFrom = normalizeDate(residentDateFrom, false);
            const residentTo = normalizeDate(residentDateTo, true);

            // Build allocation query — filter by hostel if provided
            const allocQuery = { active: true };
            if (hostelId) {
                allocQuery.hostelID = hostelId;
            }

            // Fetch ALL active allocations with student, room and hostel details
            const allocs = await Allocation.find(allocQuery)
                .populate('roomId')
                .populate('hostelID')
                .populate('studentId', 'fullName enrolmentNo name nic no _id hostelAssignedDate department batchYear');

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
                promises.push(Student.find({ enrolmentNo: { $in: enrolmentNos } }).select('fullName enrolmentNo name nic no _id hostelAssignedDate department batchYear'));
            }
            if (objectIdsFromRegNo.length > 0) {
                promises.push(Student.find({ _id: { $in: objectIdsFromRegNo } }).select('fullName enrolmentNo name nic no _id hostelAssignedDate department batchYear'));
            }
            
            const studentResults = await Promise.all(promises);
            const flatStudents = studentResults.flat();
            
            flatStudents.forEach(s => {
                if (s.enrolmentNo) studentMap[s.enrolmentNo] = s;
                studentMap[s._id.toString()] = s;
            });

            // Collect student IDs from allocations to look up payments
            const studentIdsToFetch = allocs.map(a => {
                if (a.studentId && a.studentId._id) return a.studentId._id.toString();
                if (!a.studentId && a.regNo) {
                    const val = String(a.regNo);
                    if (studentMap[val]) return studentMap[val]._id.toString();
                    if (objectIdPattern.test(val) && studentMap[val]) return studentMap[val]._id.toString();
                }
                return null;
            }).filter(Boolean);

            // Fetch all existing payments for these students
            let payments = [];
            if (studentIdsToFetch.length > 0) {
                payments = await Payment.find({ studentId: { $in: studentIdsToFetch } });
            }

            // Build a map of studentId -> payment for quick lookup
            const paymentsMap = {};
            payments.forEach(p => {
                const sid = p.studentId ? p.studentId.toString() : null;
                if (sid) paymentsMap[sid] = p;
            });

            // Build result: one row per allocation, merged with payment data
            const results = [];
            const seenStudentIds = new Set(); // Deduplicate by student ID
            for (const a of allocs) {
                // Determine the student object
                let studentObj = null;
                let sidStr = null;
                
                if (a.studentId && a.studentId._id) {
                    studentObj = a.studentId;
                    sidStr = a.studentId._id.toString();
                } else if (!a.studentId && a.regNo) {
                    const val = String(a.regNo);
                    studentObj = studentMap[val] || { enrolmentNo: val, no: val, _id: val };
                    if (studentMap[val]) {
                        sidStr = studentMap[val]._id.toString();
                    } else {
                        sidStr = val;
                    }
                }

                // Skip if we already added this student (prevents duplicates)
                if (!studentObj || !sidStr || seenStudentIds.has(sidStr)) continue;
                // Skip entries where enrolmentNo looks like a raw ObjectId (24‑hex chars)
                if (studentObj.enrolmentNo && /^[0-9a-fA-F]{24}$/.test(studentObj.enrolmentNo)) continue;
                seenStudentIds.add(sidStr);

                const p = paymentsMap[sidStr] || null;

                const enrolmentNo = String(studentObj.enrolmentNo || '');
                const mainDept = getMainDeptFromEnrol(enrolmentNo);
                const subDept = getSubDeptFromEnrol(enrolmentNo);
                const enrolBatch = getBatchFromEnrol(enrolmentNo);
                const enrolBatchYear = normalizeBatchYear(enrolBatch);
                const enrolBatchPrefix = getBatchPrefixFromEnrol(enrolmentNo);
                const studentBatch = String(studentObj.batchYear || '').trim();
                const normalizedBatch = String(batch || '').trim();
                const normalizedBatchYear = normalizeBatchYear(batchYear);
                const residentDate = a.inDate || studentObj.hostelAssignedDate || null;

                if (departmentFilter) {
                    const filterValue = String(departmentFilter).trim();
                    if (filterValue.startsWith('MAIN:')) {
                        const code = filterValue.slice(5).toUpperCase();
                        if (mainDept.toUpperCase() !== code) continue;
                    } else if (filterValue.startsWith('SUB:')) {
                        const code = filterValue.slice(4).toUpperCase();
                        if (subDept.toUpperCase() !== code) continue;
                    } else {
                        const code = filterValue.toUpperCase();
                        if (mainDept.toUpperCase() !== code && subDept.toUpperCase() !== code) continue;
                    }
                }

                if (normalizedBatchYear) {
                    const studentBatchYear = normalizeBatchYear(studentBatch);
                    const batchYearMatch = enrolBatchYear === normalizedBatchYear || studentBatchYear === normalizedBatchYear;
                    if (!batchYearMatch) continue;
                }

                if (normalizedBatch) {
                    const requestedBatch = normalizedBatch.toUpperCase();
                    const batchMatch = enrolBatchPrefix === requestedBatch;
                    if (!batchMatch) continue;
                }

                if (residentFrom || residentTo) {
                    if (!residentDate) continue;
                    const residentDateObj = new Date(residentDate);
                    if (Number.isNaN(residentDateObj.getTime())) continue;
                    if (residentFrom && residentDateObj < residentFrom) continue;
                    if (residentTo && residentDateObj > residentTo) continue;
                }

                results.push({
                    _id: p ? p._id : a._id,
                    studentId: studentObj,
                    hostelName: a.hostelID ? a.hostelID.name : null,
                    roomNo: a.roomId ? a.roomId.roomID : null,
                    residentDate,
                    amount: p ? p.amount : 0,
                    paidDate: p ? p.paidDate : null,
                    paymentStatus: p ? (p.paymentStatus || 'Paid') : 'Pending'
                });
            }

            const total = results.reduce((s, x) => s + (x.paymentStatus === 'Paid' ? (x.amount || 0) : 0), 0);

            return res.json({ Status: 'Success', Result: results, total });
        } catch (err) {
            console.error('admin getPayments error:', err);
            return res.status(500).json({ Error: 'Server error', details: err.message });
        }
    }
    ,
    exportPayments: async (req, res) => {
        try {
            const { hostelId } = req.query;

            // Use exact same logic as getPayments to ensure consistency
            let payments;

            if (hostelId) {
                // Find active allocations for the hostel
                const allocations = await Allocation.find({ hostelID: hostelId, active: true });

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

                payments = await Payment.find({ studentId: { $in: studentIds } })
                    .populate('studentId', 'fullName enrolmentNo nic no _id')
                    .sort({ paidDate: -1 });
            } else {
                // Return all payments when no hostel filter provided
                payments = await Payment.find()
                    .populate('studentId', 'fullName enrolmentNo nic no _id')
                    .sort({ paidDate: -1 });
            }

            // Map allocations to room numbers for the returned payments
            const studentIdsForLookup = payments.map(p => (p.studentId && p.studentId._id) ? p.studentId._id.toString() : (p.studentId ? p.studentId.toString() : null)).filter(Boolean);

            const allocs = await Allocation.find({
                $or: [ { regNo: { $in: studentIdsForLookup } }, { studentId: { $in: studentIdsForLookup } } ],
                active: true
            }).populate('roomId');

            const allocMap = {};
            allocs.forEach(a => {
                const sid = a.studentId ? (a.studentId.toString ? a.studentId.toString() : a.studentId) : (a.regNo ? a.regNo.toString() : null);
                if (!sid) return;
                allocMap[sid] = a.roomId && a.roomId.roomID ? a.roomId.roomID : null;
            });

            const paymentsWithRoom = payments.map(p => {
                const pObj = p.toObject ? p.toObject() : p;
                let roomNo = null;
                
                // Try to find room using studentId first
                if (pObj.studentId && pObj.studentId._id) {
                    const studentIdStr = pObj.studentId._id.toString();
                    roomNo = allocMap[studentIdStr] || null;
                }
                
                // Fallback: try using enrollment number if studentId lookup failed
                if (!roomNo && pObj.studentId && pObj.studentId.enrolmentNo) {
                    roomNo = allocMap[pObj.studentId.enrolmentNo] || null;
                }
                
                pObj.roomNo = roomNo;
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

            res.setHeader('Content-Disposition', `attachment; filename=payments${hostelId ? `-${hostelId}` : ''}.xlsx`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return res.send(buf);
        } catch (err) {
            console.error('admin exportPayments error:', err);
            return res.status(500).json({ Error: 'Server error', details: err.message });
        }
    },
    
    // Admin: Get all student extra needs with enrollment info, email, hostel, and room
    getStudentExtraNeeds: async (req, res) => {
        try {
            const specialNeeds = await SpecialNeeds.find({})
                .populate('regNo', 'enrolmentNo email fullName _id')
                .sort({ createdAt: -1 });

            if (!specialNeeds || specialNeeds.length === 0) {
                return res.json({ Status: 'Success', Result: [] });
            }

            // Extract all student IDs from special needs
            const studentIds = specialNeeds
                .filter(sn => sn.regNo)
                .map(sn => sn.regNo._id.toString());

            // Fetch allocations for these students to get hostel and room info.
            // Some datasets store student ObjectId in Allocation.regNo instead of Allocation.studentId.
            const allocations = await Allocation.find({
                active: true,
                $or: [
                    { studentId: { $in: studentIds } },
                    { regNo: { $in: studentIds } }
                ]
            })
                .populate('hostelID', 'name _id')
                .populate('roomId', 'roomID _id')
                .lean();

            // Create a map of student ID to allocation info
            const allocMap = {};
            allocations.forEach(a => {
                const sid = (a.studentId || a.regNo)?.toString();
                if (!sid) return;
                if (!allocMap[sid]) {  // Keep first (latest) allocation
                    allocMap[sid] = {
                        hostelName: a.hostelID?.name || null,
                        hostelId: a.hostelID?._id || null,
                        roomId: a.roomId?._id || null,
                        roomNo: a.roomId?.roomID || null
                    };
                }
            });

            // Enrich special needs with allocation info
            const enrichedNeeds = specialNeeds.map(sn => {
                const studentId = sn.regNo?._id?.toString() || null;
                const allocInfo = studentId ? allocMap[studentId] : null;

                return {
                    _id: sn._id,
                    enrolmentNo: sn.regNo?.enrolmentNo || null,
                    email: sn.regNo?.email || null,
                    fullName: sn.regNo?.fullName || null,
                    needs: sn.needs,
                    remark: sn.remark || null,
                    isAccpeted: sn.isAccpeted,
                    decision: sn.decision || (sn.isAccpeted ? 'approved' : 'pending'),
                    hostelName: allocInfo?.hostelName || null,
                    hostelId: allocInfo?.hostelId || null,
                    roomNo: allocInfo?.roomNo || null,
                    roomId: allocInfo?.roomId || null,
                    createdAt: sn.createdAt,
                    updatedAt: sn.updatedAt
                };
            });

            return res.json({ Status: 'Success', Result: enrichedNeeds });
        } catch (err) {
            console.error('admin getStudentExtraNeeds error:', err);
            return res.status(500).json({ Status: 'Fail', Error: 'Server error', details: err.message });
        }
    },

    // Admin: directly add a student to special needs, making them eligible and appending to excel queue
    addSpecialNeed: async (req, res) => {
        try {
            const { enrolmentNo, category, remark } = req.body;
            if (!enrolmentNo || !category) {
                return res.status(400).json({ Error: 'enrolmentNo and category are required' });
            }

            const Student = require('../model/Student');
            const SpecialNeeds = require('../model/SpecialNeeds');
            const ExcelImportList = require('../model/ExcelImportList');

            // 1. Find the student
            const student = await Student.findOne({ 
                $or: [
                    { enrolmentNo: enrolmentNo },
                    { enrolmentNo: enrolmentNo.toUpperCase() }
                ]
            });

            if (!student) {
                return res.status(404).json({ Error: 'Student not found with this Enrollment No' });
            }

            // 2. Create the Special Needs record
            const newNeed = await SpecialNeeds.create({
                regNo: student._id,
                needs: category,
                remark: remark || '',
                isAccpeted: true,
                decision: 'approved'
            });

            // 3. Mark student as eligible
            student.eligibilityStatus = 'Eligible';
            student.isAssign = false;
            await student.save();

            // 4. Append to Excel Import List
            const existingList = await ExcelImportList.findOne().sort({ importedAt: -1 }).lean();
            let finalEnrolmentNumbers = [student.enrolmentNo];
            
            if (existingList && existingList.enrolmentNumbers) {
                finalEnrolmentNumbers = [...new Set([...existingList.enrolmentNumbers, student.enrolmentNo])];
            }

            // Cross-check with eligible students to update eligibleCount accurately
            const eligible = await Student.find({
                enrolmentNo: { $in: finalEnrolmentNumbers },
                eligibilityStatus: { $in: ['Eligible', true] },
                isAssign: false
            }).lean();

            await ExcelImportList.deleteMany({});
            await ExcelImportList.create({
                enrolmentNumbers: finalEnrolmentNumbers,
                importedBy: req.user?._id || req.user?.id || null,
                totalImported: finalEnrolmentNumbers.length,
                eligibleCount: eligible.length,
                label: 'Appended Special Need Student',
            });

            return res.json({
                Status: 'Success',
                Message: 'Student added to Special Needs, marked eligible, and added to assignment queue successfully.'
            });

        } catch (err) {
            console.error('admin addSpecialNeed error:', err);
            return res.status(500).json({ Error: 'Server error', details: err.message });
        }
    }
};

module.exports = AdminController;
