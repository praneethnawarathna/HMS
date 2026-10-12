import React, { useState } from 'react';
import axios from 'axios';
import XLSX from 'xlsx-js-style';

const DEPARTMENT_MAP = {
    A: 'Arts',
    LLB: 'Law',
    GIS: 'Geographical Science',
    SW: 'Social Work',
};

const getMainDept = enrolNo => {
    if (!enrolNo) return 'N/A';
    const parts = enrolNo.split('/').filter(Boolean);
    return parts[0] || 'N/A';
};

// ── Shared styling helpers ────────────────────────────────────────────
const BORDER_THIN = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
};

const FONT_DEFAULT = { name: 'Calibri', sz: 11 };
const FONT_BOLD = { ...FONT_DEFAULT, bold: true };
const FONT_TITLE = { name: 'Calibri', sz: 14, bold: true };
const ALIGN_CENTER = { vertical: 'center', horizontal: 'center', wrapText: true };
const ALIGN_LEFT = { vertical: 'center', horizontal: 'left', wrapText: true };

const FILL_HEADER = { fgColor: { rgb: 'DCE6F1' } };  // light blue-grey
const FILL_TOTAL = { fgColor: { rgb: 'F2F2F2' } };  // light grey

/**
 * Apply a style to every cell in the sheet.
 * @param {object}  ws        – worksheet
 * @param {object}  wsData    – the original AOA (to know row count)
 * @param {Set}     headerSet – row indices that should be styled as headers
 * @param {number}  titleRow  – row index for the title (gets larger font), -1 to skip
 * @param {number}  totalRow  – row index for the grand-total row, -1 to skip
 */
const applyStyles = (ws, wsData, headerSet, titleRow = 0, totalRow = -1) => {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
            const addr = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[addr]) ws[addr] = { t: 's', v: '' };

            const isTitle = R === titleRow;
            const isHeader = headerSet.has(R);
            const isTotal = R === totalRow;

            ws[addr].s = {
                font: isTitle ? FONT_TITLE : (isHeader || isTotal) ? FONT_BOLD : FONT_DEFAULT,
                alignment: (isHeader || isTitle) ? ALIGN_CENTER : ALIGN_LEFT,
                border: BORDER_THIN,
                fill: isHeader ? FILL_HEADER : isTotal ? FILL_TOTAL : undefined,
            };

            // Right-align numbers for readability
            if (!isHeader && !isTitle && ws[addr].t === 'n') {
                ws[addr].s.alignment = { vertical: 'center', horizontal: 'right' };
            }
        }
    }
};

const HostelReportsModal = ({ isOpen, onClose, allHostels }) => {
    const [reportType, setReportType] = useState('distribution');
    const [loading, setLoading] = useState(false);
    const token = localStorage.getItem('login');

    if (!isOpen) return null;

    const fetchStudents = async () => {
        const res = await axios.get(import.meta.env.VITE_APP_API + '/student/get-all-students-auth', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data.Result || [];
    };

    // ── 1. Distribution Report ────────────────────────────────────────
    const generateDistributionReport = (students, hostels) => {
        const maleHostels = hostels.filter(h => h.gender === 'Male').sort((a, b) => a.name.localeCompare(b.name));
        const femaleHostels = hostels.filter(h => h.gender === 'Female').sort((a, b) => a.name.localeCompare(b.name));
        const allHostelCols = [...maleHostels, ...femaleHostels];

        const groups = {};
        students.forEach(std => {
            const deptCode = getMainDept(std.enrolmentNo);
            const department = DEPARTMENT_MAP[deptCode] || deptCode;
            let batch = 'N/A';
            if (std.enrolmentNo) {
                const parts = std.enrolmentNo.split('/');
                if (parts.length >= 2) batch = `${parts[0]}/${parts[1]}`;
            }
            const key = `${department}_${batch}`;
            if (!groups[key]) {
                groups[key] = { department, batch, hostelCounts: {} };
                allHostelCols.forEach(h => groups[key].hostelCounts[h.name] = 0);
            }
            let assignedHostelName = std.hostelName;
            if (!assignedHostelName && std.hostelId) {
                const h = hostels.find(x => x._id === std.hostelId);
                if (h) assignedHostelName = h.name;
            }
            if (assignedHostelName && groups[key].hostelCounts[assignedHostelName] !== undefined) {
                groups[key].hostelCounts[assignedHostelName]++;
            }
        });

        // Row 1 (main header)
        const row1 = ['Faculty', 'Batch'];
        if (maleHostels.length > 0) { row1.push('Male Hostels'); for (let i = 1; i < maleHostels.length; i++)   row1.push(''); }
        if (femaleHostels.length > 0) { row1.push('Female Hostels'); for (let i = 1; i < femaleHostels.length; i++) row1.push(''); }
        row1.push('Total');

        // Row 2 (sub header)
        const row2 = ['', ''];
        maleHostels.forEach(h => row2.push(h.name));
        femaleHostels.forEach(h => row2.push(h.name));
        row2.push('');

        const wsData = [
            [`Hostel Distribution Report - Generated ${new Date().toLocaleDateString()}`],
            [],
            row1,
            row2,
        ];

        // Merges
        const merges = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: row1.length - 1 } },   // Title
            { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },                   // Faculty
            { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },                   // Batch
        ];
        let colIdx = 2;
        if (maleHostels.length > 0) { merges.push({ s: { r: 2, c: colIdx }, e: { r: 2, c: colIdx + maleHostels.length - 1 } }); colIdx += maleHostels.length; }
        if (femaleHostels.length > 0) { merges.push({ s: { r: 2, c: colIdx }, e: { r: 2, c: colIdx + femaleHostels.length - 1 } }); colIdx += femaleHostels.length; }
        merges.push({ s: { r: 2, c: colIdx }, e: { r: 3, c: colIdx } }); // Total

        // Data rows
        Object.values(groups).sort((a, b) => a.department.localeCompare(b.department)).forEach(g => {
            const row = [g.department, g.batch];
            let total = 0;
            allHostelCols.forEach(h => { const c = g.hostelCounts[h.name]; row.push(c); total += c; });
            row.push(total);
            wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!merges'] = merges;
        ws['!cols'] = [{ wch: 25 }, { wch: 12 }, ...allHostelCols.map(() => ({ wch: 15 })), { wch: 10 }];

        applyStyles(ws, wsData, new Set([2, 3]), 0, -1);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Hostel Distribution');
        XLSX.writeFile(wb, 'Hostel_Distribution_Report.xlsx');
    };

    // ── 2. Capacity Report ────────────────────────────────────────────
    const generateCapacityReport = (hostels) => {
        const rows = [];
        let grandRooms = 0, grandMale = 0, grandFemale = 0, grandRev = 0, grandTotal = 0;
        hostels.forEach((h, index) => {
            const rooms = h.roomCount || 0;
            const cap = h.totalCapacity || 0;
            const maleCap = h.gender === 'Male' ? cap : 0;
            const femaleCap = h.gender === 'Female' ? cap : 0;
            const revCap = (h.gender === 'REV' || h.gender === 'Rev') ? cap : 0;
            const total = maleCap + femaleCap + revCap;
            rows.push([index + 1, h.name || 'Unnamed', rooms, maleCap, femaleCap, revCap, total]);
            grandRooms += rooms; grandMale += maleCap; grandFemale += femaleCap; grandRev += revCap; grandTotal += total;
        });

        const wsData = [
            [`Hostel Capacity Summary Report - Generated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`],
            [],
            ['No', 'Hostel Name', 'No of Rooms', 'Capacity', '', '', ''],
            ['', '', '', 'Male', 'Female', 'Rev', 'Total'],
            ...rows,
            ['Grand Total', '', grandRooms, grandMale, grandFemale, grandRev, grandTotal],
        ];

        const merges = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },   // Title
            { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },     // No
            { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },     // Hostel Name
            { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },     // No of Rooms
            { s: { r: 2, c: 3 }, e: { r: 2, c: 6 } },     // Capacity
            { s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 1 } }, // Grand Total
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!merges'] = merges;
        ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];

        applyStyles(ws, wsData, new Set([2, 3]), 0, wsData.length - 1);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Capacity Summary');
        XLSX.writeFile(wb, 'Hostel_Capacity_Summary_Report.xlsx');
    };

    // ── 3. Financial Report ───────────────────────────────────────────
    const generateFinancialReport = (students, hostels) => {
        const deptsSet = new Set();
        students.forEach(std => {
            const deptCode = getMainDept(std.enrolmentNo);
            const department = DEPARTMENT_MAP[deptCode] || deptCode;
            deptsSet.add(department);
        });
        const departments = Array.from(deptsSet).sort();

        const groups = {};
        hostels.forEach(h => {
            groups[h.name] = { hostelName: h.name, deptCounts: {} };
            departments.forEach(d => { groups[h.name].deptCounts[d] = { M: 0, F: 0 }; });
        });

        students.forEach(std => {
            let assignedHostelName = std.hostelName;
            if (!assignedHostelName && std.hostelId) {
                const h = hostels.find(x => x._id === std.hostelId);
                if (h) assignedHostelName = h.name;
            }
            if (!assignedHostelName || !groups[assignedHostelName]) return;
            const deptCode = getMainDept(std.enrolmentNo);
            const department = DEPARTMENT_MAP[deptCode] || deptCode;
            const gender = std.sex === 'Male' ? 'M' : 'F';
            if (groups[assignedHostelName].deptCounts[department]) {
                groups[assignedHostelName].deptCounts[department][gender]++;
            }
        });

        const row1 = ['Hostel Name'];
        departments.forEach(d => { row1.push(d); row1.push(''); });
        row1.push('Total Students', 'Fee/Student');

        const row2 = [''];
        departments.forEach(() => row2.push('M', 'F'));
        row2.push('', '');

        const wsData = [
            [`Hostel Academic & Financial Breakdown - Generated ${new Date().toLocaleDateString()}`],
            [],
            row1,
            row2,
        ];

        const merges = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: row1.length - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
        ];
        let colIdx = 1;
        departments.forEach(() => {
            merges.push({ s: { r: 2, c: colIdx }, e: { r: 2, c: colIdx + 1 } });
            colIdx += 2;
        });
        merges.push({ s: { r: 2, c: colIdx }, e: { r: 3, c: colIdx } });
        merges.push({ s: { r: 2, c: colIdx + 1 }, e: { r: 3, c: colIdx + 1 } });

        Object.values(groups).sort((a, b) => a.hostelName.localeCompare(b.hostelName)).forEach(g => {
            const row = [g.hostelName];
            let total = 0;
            departments.forEach(d => {
                const mCount = g.deptCounts[d].M;
                const fCount = g.deptCounts[d].F;
                row.push(mCount, fCount);
                total += mCount + fCount;
            });
            row.push(total, '');
            wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!merges'] = merges;
        ws['!cols'] = [
            { wch: 25 },
            ...departments.flatMap(() => [{ wch: 8 }, { wch: 8 }]),
            { wch: 15 },
            { wch: 15 },
        ];

        applyStyles(ws, wsData, new Set([2, 3]), 0, -1);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Financial Breakdown');
        XLSX.writeFile(wb, 'Hostel_Financial_Report.xlsx');
    };

    // ── 4. Eligibility & Allocation Report ────────────────────────────
    const generateEligibilityReport = (students) => {
        const groups = {};
        let grandRegistered = 0, grandEligible = 0, grandMale = 0, grandFemale = 0, grandTotal = 0;

        students.forEach(std => {
            const deptCode = getMainDept(std.enrolmentNo);
            const department = DEPARTMENT_MAP[deptCode] || deptCode || 'Unknown';

            let batchYear = 'Unknown';
            if (std.enrolmentNo) {
                const parts = std.enrolmentNo.split('/');
                if (parts.length >= 2 && parts[1]) {
                    batchYear = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
                }
            }

            let studyYear = '';
            if (std.dateOfEnrolment) {
                studyYear = String((new Date().getFullYear() - new Date(std.dateOfEnrolment).getFullYear()) + 1);
            }

            const studyYearLabel = studyYear ? `Year ${studyYear}` : 'Unknown';

            const key = `${department}_${batchYear}_${studyYear}`;
            if (!groups[key]) {
                groups[key] = { department, batchYear, studyYearLabel, registered: 0, eligible: 0, maleAssigned: 0, femaleAssigned: 0 };
            }

            groups[key].registered++;

            const isAssigned = !!(std.isAssign || std.hostelId || std.hostelName);
            const isEligible = isAssigned || std.eligibilityStatus === 'Eligible' || std.eligibilityStatus === true;

            if (isEligible) groups[key].eligible++;

            if (isAssigned) {
                const gender = (std.sex || '').toLowerCase();
                if (gender === 'male') groups[key].maleAssigned++;
                else if (gender === 'female') groups[key].femaleAssigned++;
            }
        });

        const rows = [];
        Object.values(groups).sort((a, b) => a.department.localeCompare(b.department)).forEach(g => {
            const total = g.maleAssigned + g.femaleAssigned;
            rows.push([g.department, g.batchYear, g.studyYearLabel, g.registered, g.eligible, g.maleAssigned, g.femaleAssigned, total]);

            grandRegistered += g.registered;
            grandEligible += g.eligible;
            grandMale += g.maleAssigned;
            grandFemale += g.femaleAssigned;
            grandTotal += total;
        });

        const wsData = [
            ['HOSTEL ELIGIBILITY AND ALLOCATION SUMMARY REPORT'],
            [],
            ['Faculty', 'Batch Year', 'Year of Intake', 'Student Registered', 'No. of Students Eligible for Hostel', 'No. of Students Who Received Hostel', '', ''],
            ['', '', '', '', '', 'Male', 'Female', 'Total'],
            ...rows,
            ['Grand Total', '', '', grandRegistered, grandEligible, grandMale, grandFemale, grandTotal],
        ];

        const merges = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },   // Title
            { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },     // Faculty
            { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },     // Batch Year
            { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },     // Year of Intake
            { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },     // Student Registered
            { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } },     // Eligible
            { s: { r: 2, c: 5 }, e: { r: 2, c: 7 } },     // Received Hostel (merged)
            { s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 2 } }, // Grand Total
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!merges'] = merges;
        ws['!cols'] = [
            { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        ];

        applyStyles(ws, wsData, new Set([2, 3]), 0, wsData.length - 1);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Eligibility & Allocation');
        XLSX.writeFile(wb, 'Hostel_Eligibility_Allocation_Report.xlsx');
    };

    // ── Download handler ──────────────────────────────────────────────
    const handleDownload = async () => {
        try {
            setLoading(true);
            const students = await fetchStudents();
            const assignedStudents = students.filter(s => s.hostelId || s.hostelName || s.isAssign);

            if (reportType === 'distribution') generateDistributionReport(assignedStudents, allHostels);
            else if (reportType === 'financial') generateFinancialReport(assignedStudents, allHostels);
            else if (reportType === 'capacity') generateCapacityReport(allHostels);
            else if (reportType === 'eligibility') generateEligibilityReport(students);
        } catch (error) {
            console.error('Failed to generate report', error);
            alert('Failed to generate report.');
        } finally {
            setLoading(false);
            onClose();
        }
    };

    // ── UI ────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl w-[400px] overflow-hidden">
                <div className="bg-[#6b0f14] px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-semibold text-lg">Export Reports</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-300">✕</button>
                </div>
                <div className="p-6">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Report Type</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6b0f14]"
                        >
                            <option value="distribution">Hostel Distribution by Department &amp; Batch</option>
                            <option value="capacity">Hostel Capacity Summary Report</option>
                            <option value="financial">Hostel Academic &amp; Financial Breakdown</option>
                            <option value="eligibility">Hostel Eligibility and Allocation Summary</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={loading}
                            className={`px-4 py-2 text-white bg-[#6b0f14] hover:bg-[#4f0a0f] rounded-md transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Generating...' : 'Download Excel'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HostelReportsModal;