import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { FileSpreadsheet, Activity, Building, IndianRupee, Users, CreditCard } from 'lucide-react';

const DEPARTMENT_MAP = {
    A: 'Arts',
    LLB: 'Law',
    GIS: 'Geographical Science',
    SW: 'Social Work',
    Mg: 'Management',
    MG: 'Management',
    Mgt: 'Management',
};

const getMainDept = enrolNo => {
    if (!enrolNo) return 'N/A';
    const parts = enrolNo.split('/').filter(Boolean);
    return parts[0] || 'N/A';
};

const getSubDept = enrolNo => {
    if (!enrolNo) return '';
    const parts = enrolNo.split('/').filter(Boolean);
    if (parts.length >= 4) return parts[2] || '';
    if (parts.length === 3) return parts[0] || '';
    return '';
};

const getBatchFromEnrolNo = enrolNo => {
    if (!enrolNo) return '';
    const parts = enrolNo.split('/').filter(Boolean);
    return parts[1] || '';
};

const getBatchPrefixFromEnrolNo = enrolNo => {
    if (!enrolNo) return '';
    const parts = enrolNo.split('/').filter(Boolean);
    if (parts.length < 2) return '';
    return `${parts[0]}/${parts[1]}`.toUpperCase();
};

const getBatchYearFromEnrolNo = enrolNo => {
    const raw = getBatchFromEnrolNo(enrolNo);
    if (!raw) return '';
    if (/^\d{2}$/.test(raw)) return `20${raw}`;
    if (/^\d{4}$/.test(raw)) return raw;
    return raw;
};

const formatDateYmd = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const defaultPaymentFilters = {
    departmentFilter: '',
    hostelId: '',
    batchYear: '',
    batch: '',
    residentDateFrom: '',
    residentDateTo: '',
    hallFee: '',
    reportType: 'normal'
};

// ── Generic nested header-row layout engine ───────────────────────────
// Takes a list of header rows, where each row is an array of
// { label, colSpan?, rowSpan? } cells (spans default to 1), and a total
// leaf-column count. Returns, per row, only the cells that actually need
// to be rendered/added for that row (cells "occupied" by a rowSpan from
// an earlier row are skipped), each annotated with its 0-based colIndex.
// This single layout is shared by both the Excel export and the on-screen
// preview table so the two stay in sync automatically. Used by the
// Hall Wise Summary report's 3-row nested header (Faculty/Batch/Total
// spanning all rows, Male/Female group row, individual hostel leaf row)
// and the Faculty Wise Hostel Summary report's 3-row nested header
// (No/Hostel Name spanning all rows, per-faculty group row, M/F leaf row).
const layoutHeaderRows = (headerRows, totalCols) => {
    const occupied = Array.from({ length: headerRows.length }, () => new Array(totalCols).fill(false));
    const placed = headerRows.map(() => []);

    headerRows.forEach((rowCells, r) => {
        let c = 0;
        rowCells.forEach(cellDef => {
            while (c < totalCols && occupied[r][c]) c++;
            const colSpan = cellDef.colSpan || 1;
            const rowSpan = cellDef.rowSpan || 1;
            for (let rr = r; rr < r + rowSpan && rr < occupied.length; rr++) {
                for (let cc = c; cc < c + colSpan; cc++) {
                    occupied[rr][cc] = true;
                }
            }
            placed[r].push({ ...cellDef, colSpan, rowSpan, colIndex: c });
            c += colSpan;
        });
    });

    return placed;
};

// ── Shared column-width sizing ─────────────────────────────────────────
// Returns the max character length seen in each column: checking the
// header label, every data row, and the total row. Both the on-screen
// preview (px widths) and the Excel export (character-unit widths) derive
// their column widths from this, so narrow columns (e.g. single-letter
// M/F) stay narrow instead of being forced to some large fixed minimum.
const getColumnMaxLengths = (data) => {
    const verticalIndices = data.verticalHeaderIndices || new Set();
    return data.columns.map((col, i) => {
        // Rotated (vertical) headers run top-to-bottom instead of
        // left-to-right, so the label length shouldn't force the column
        // wide — width for these columns comes only from the data/total values.
        let maxLen = verticalIndices.has(i) ? 0 : String(col ?? '').length;
        data.rows.forEach(r => {
            const len = String(r[i] ?? '').length;
            if (len > maxLen) maxLen = len;
        });
        if (data.totalRow) {
            const len = String(data.totalRow[i] ?? '').length;
            if (len > maxLen) maxLen = len;
        }
        return maxLen;
    });
};

const DepartmentTreeSelect = ({ options, value, onChange }) => {
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const rootRef = useRef(null);

    const getLabelForValue = (val) => {
        if (!val) return 'All Departments';
        if (val.startsWith('MAIN:')) {
            const code = val.slice(5);
            return DEPARTMENT_MAP[code] || code;
        }
        if (val.startsWith('SUB:')) return val.slice(4);
        return val;
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (open && rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
                setExpanded(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [open]);

    return (
        <div className="relative" ref={rootRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <button
                type="button"
                onClick={() => setOpen(prev => !prev)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-left text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500 flex items-center justify-between"
            >
                <span className="truncate">{getLabelForValue(value)}</span>
                <span className="text-gray-400">▾</span>
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                    <button
                        type="button"
                        onClick={() => {
                            onChange('');
                            setOpen(false);
                            setExpanded(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                        All Departments
                    </button>

                    {options.map((entry) => (
                        <div key={entry.main} className="border-t border-gray-100">
                            <div className="flex items-center justify-between px-3 py-2">
                                <button
                                    type="button"
                                    className={`text-left text-sm ${value === `MAIN:${entry.main}` ? 'font-semibold text-gray-900' : 'text-gray-800'}`}
                                    onClick={() => {
                                        onChange(`MAIN:${entry.main}`);
                                    }}
                                >
                                    {DEPARTMENT_MAP[entry.main] || entry.main}
                                </button>
                                {entry.subs.length > 0 && (
                                    <button
                                        type="button"
                                        className="text-gray-400 hover:text-gray-600"
                                        onClick={() => setExpanded(prev => (prev === entry.main ? null : entry.main))}
                                    >
                                        {expanded === entry.main ? '▾' : '▸'}
                                    </button>
                                )}
                            </div>

                            {expanded === entry.main && entry.subs.length > 0 && (
                                <div className="bg-gray-50 border-t border-gray-100">
                                    {entry.subs.map((subCode) => (
                                        <button
                                            key={`${entry.main}-${subCode}`}
                                            type="button"
                                            onClick={() => {
                                                onChange(`SUB:${subCode}`);
                                                setOpen(false);
                                                setExpanded(null);
                                            }}
                                            className={`w-full px-6 py-2 text-left text-sm ${value === `SUB:${subCode}` ? 'font-semibold text-gray-900' : 'text-gray-700'} hover:bg-gray-100`}
                                        >
                                            {subCode}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Shared styling helpers ────────────────────────────────────────────
// headerRowStart/headerRowEnd are 1-indexed worksheet row numbers marking
// the (possibly multi-row) column header block, so this works whether a
// report has a flat 1-row header, a 2-row grouped header, or a 3-row
// nested header.
const applyStylesToWorksheet = (worksheet, headerRowStart = 3, headerRowEnd = 4) => {
    const isHallList = worksheet.name === 'Hall List';

    worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
            // Apply borders to all cells
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            if (isHallList) {
                if (rowNumber >= headerRowStart && rowNumber <= headerRowEnd) {
                    cell.font = { name: 'Calibri', size: 11, bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    return;
                }
                if (row.getCell(1).value === 'Grand Total') {
                    cell.font = { name: 'Calibri', size: 11, bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                } else if (rowNumber > headerRowEnd) {
                    // Data rows
                    cell.font = { name: 'Calibri', size: 11 };
                    if (typeof cell.value === 'number') {
                        cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    } else {
                        cell.alignment = { vertical: 'middle', horizontal: 'left' };
                    }
                }
                return;
            }

            if (rowNumber === 1) {
                cell.font = { name: 'Calibri', size: 14, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                return;
            }

            if (rowNumber >= headerRowStart && rowNumber <= headerRowEnd) {
                cell.font = { name: 'Calibri', size: 11, bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                return;
            }

            if (rowNumber === worksheet.rowCount) {
                cell.font = { name: 'Calibri', size: 11, bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
            } else {
                cell.font = { name: 'Calibri', size: 11 };
            }

            if (rowNumber > headerRowEnd) {
                if (typeof cell.value === 'number') {
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                }
            }
        });
    });
};

const Reports = () => {
    const [loadingReport, setLoadingReport] = useState(null);
    const [showPaymentFilterModal, setShowPaymentFilterModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [paymentFilterLoading, setPaymentFilterLoading] = useState(false);
    const [paymentFilters, setPaymentFilters] = useState(defaultPaymentFilters);
    const [paymentFilterOptions, setPaymentFilterOptions] = useState({
        departments: [],
        batchYears: [],
        batches: [],
        hostels: []
    });
    const token = localStorage.getItem('login');

    const fetchStudents = async () => {
        const res = await axios.get(import.meta.env.VITE_APP_API + '/student/get-all-students-auth', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data.Result || [];
    };

    const fetchHostels = async () => {
        const res = await axios.get(import.meta.env.VITE_APP_API + '/hostel/get-all-hostels', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data.Result || [];
    };

    const collectPaymentFilterOptions = async () => {
        const [students, hostels] = await Promise.all([fetchStudents(), fetchHostels()]);

        const deptMap = new Map();
        const batchYearSet = new Set();
        const batchSet = new Set();

        students.forEach((std) => {
            const enrol = std.enrolmentNo || '';
            const main = getMainDept(enrol);
            const sub = getSubDept(enrol);
            const batch = getBatchPrefixFromEnrolNo(enrol);
            const batchYear = String(std.batchYear || getBatchYearFromEnrolNo(enrol) || '').trim();

            if (main && main !== 'N/A') {
                if (!deptMap.has(main)) deptMap.set(main, new Set());

                if (sub && sub !== main) {
                    deptMap.get(main).add(sub);
                }

                const parts = enrol.split('/').filter(Boolean);
                if (parts.length === 3) {
                    deptMap.get(main).add(main);
                }
            }

            if (batchYear) batchYearSet.add(batchYear);
            if (batch) batchSet.add(batch);
        });

        const departments = Array.from(deptMap.entries())
            .map(([mainCode, subSet]) => ({
                main: mainCode,
                subs: Array.from(subSet).sort()
            }))
            .sort((a, b) => (DEPARTMENT_MAP[a.main] || a.main).localeCompare(DEPARTMENT_MAP[b.main] || b.main));

        return {
            departments,
            batchYears: Array.from(batchYearSet).sort(),
            batches: Array.from(batchSet).sort(),
            hostels: [...hostels].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
        };
    };

    const openPaymentFilterModal = async () => {
        try {
            setPaymentFilterLoading(true);
            const options = await collectPaymentFilterOptions();
            setPaymentFilterOptions(options);
            setPaymentFilters(defaultPaymentFilters);
            setShowPaymentFilterModal(true);
        } catch (error) {
            console.error('Failed to load payment filters', error);
            alert('Failed to load payment filters.');
        } finally {
            setPaymentFilterLoading(false);
        }
    };

    const handlePaymentFilterChange = (field, value) => {
        setPaymentFilters(prev => ({ ...prev, [field]: value }));
    };

    const handlePaymentPreviewWithFilters = async () => {
        try {
            setPaymentFilterLoading(true);
            const selectedHostel = paymentFilterOptions.hostels.find(h => h._id === paymentFilters.hostelId);

            const filters = {
                departmentFilter: paymentFilters.departmentFilter,
                hostelId: paymentFilters.hostelId,
                batchYear: paymentFilters.batchYear,
                batch: paymentFilters.batch,
                residentDateFrom: paymentFilters.residentDateFrom,
                hallFee: paymentFilters.hallFee,
                selectedHostelName: selectedHostel?.name || '',
            };

            const url = import.meta.env.VITE_APP_API + '/admin/payments';
            const params = { ...filters };

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });
            let payments = res.data.Result || res.data.result || [];

            if (paymentFilters.reportType === 'certified') {
                payments = payments.filter(p => p.roomNo && p.roomNo.trim() !== '' && p.roomNo !== '-');
            }

            const deptCode = filters.departmentFilter ? filters.departmentFilter.replace('MAIN:', '') : '';
            const deptFullName = deptCode ? (DEPARTMENT_MAP[deptCode] || deptCode) : 'ALL';

            const headers = [
                'UNIVERSITY OF PERADENIYA',
                `FACULTY OF ${deptFullName.toUpperCase()}`,
                `ACADEMIC YEAR - ${(filters.batchYear || 'ALL ACADEMIC YEARS').toUpperCase()}`,
                `BATCH - ${(filters.batch || 'ALL STUDY YEARS').toUpperCase()}`,
                `HALLS OF RESIDENCE - ${(selectedHostel?.name || 'ALL HALLS').toUpperCase()}`,
                `DATE OF RESIDENCE - ${filters.residentDateFrom ? filters.residentDateFrom.replace(/-/g, '.') : 'ALL DATES'}                                                                    Hall Fee Rs. ${filters.hallFee || '..........'}`,
            ];

            const headerRows = [
                [
                    { label: 'No', rowSpan: 2 },
                    { label: 'Enrolment No', rowSpan: 2 },
                    { label: 'Name', rowSpan: 2 },
                    { label: 'Room No', rowSpan: 2 },
                    { label: 'Payments', colSpan: 2 }
                ],
                [
                    { label: 'Hall fee' },
                    { label: 'Date' }
                ]
            ];

            const columns = ['No', 'Enrolment No', 'Name', 'Room No', 'Hall fee', 'Date'];
            const rows = payments.map((p, idx) => [
                idx + 1,
                p.studentId?.enrolmentNo || '-',
                p.studentId?.fullName || p.studentId?.name || '-',
                p.roomNo || '-',
                Number(p.amount) || 0,
                formatDateYmd(p.paidDate) || '-'
            ]);

            setPreviewData({
                reportId: 'payments',
                reportType: paymentFilters.reportType,
                title: paymentFilters.reportType === 'certified' ? 'Certified List' : 'Hall List',
                headers, columns, headerRows, rows,
                fileName: paymentFilters.reportType === 'certified' ? 'Certified_List' : 'Hall_List',
                facultyName: deptFullName !== 'ALL' ? deptFullName : '',
            });
            setShowPaymentFilterModal(false);
            setShowPreviewModal(true);
        } catch (error) {
            console.error("Failed to load preview", error);
            alert("Failed to load preview.");
        } finally {
            setPaymentFilterLoading(false);
        }
    };

    const handlePreviewHeaderEdit = (index, value) => {
        setPreviewData(prev => {
            const newHeaders = [...prev.headers];
            newHeaders[index] = value;
            return { ...prev, headers: newHeaders };
        });
    };

    const handlePreviewCellEdit = (rowIdx, colIdx, value) => {
        setPreviewData(prev => {
            const newRows = prev.rows.map(r => [...r]);
            newRows[rowIdx][colIdx] = value;
            return { ...prev, rows: newRows };
        });
    };

    const handlePreviewTotalEdit = (colIdx, value) => {
        setPreviewData(prev => {
            const newTotal = [...prev.totalRow];
            newTotal[colIdx] = value;
            return { ...prev, totalRow: newTotal };
        });
    };

    // ── Column widths for the preview table ──────────────────────────
    // Sized from the longest actual value in each column (header, rows,
    // total row) so long names like hostel names get enough room and
    // short numeric columns stay compact.
    const columnWidths = useMemo(() => {
        if (!previewData) return [];
        // ~7px per character plus modest padding, floored low (30px) so
        // narrow columns like single-letter M/F headers stay compact,
        // and capped at 260px so long text columns don't run away.
        return getColumnMaxLengths(previewData).map((maxLen, i) => {
            if (previewData.reportId === 'distribution') {
                if (previewData.verticalHeaderIndices?.has(i)) {
                    return 45; // Fixed narrow width for rotated headers to avoid excess spacing
                }
                if (i === 0) return Math.max(maxLen * 8 + 40, 100); // Faculty
                if (i === 1) return Math.max(maxLen * 8 + 40, 120); // Batch
                if (i === previewData.columns.length - 1) return Math.max(maxLen * 8 + 40, 100); // Total
            }
            return Math.min(Math.max(maxLen * 7 + 16, 30), 260);
        });
    }, [previewData]);

    // ── Generic preview openers ──────────────────────────────────────
    const prepareDistributionPreview = async () => {
        const students = await fetchStudents();
        const hostels = await fetchHostels();
        const assignedStudents = students.filter(s => s.hostelId || s.hostelName || s.isAssign);
        const maleHostels = hostels.filter(h => h.gender === 'Male').sort((a, b) => a.name.localeCompare(b.name));
        const femaleHostels = hostels.filter(h => h.gender === 'Female').sort((a, b) => a.name.localeCompare(b.name));
        const allHostelCols = [...maleHostels, ...femaleHostels];
        const groups = {};
        assignedStudents.forEach(std => {
            const deptCode = getMainDept(std.enrolmentNo);
            const department = DEPARTMENT_MAP[deptCode] || deptCode;
            let batch = 'N/A';
            if (std.enrolmentNo) { const parts = std.enrolmentNo.split('/'); if (parts.length >= 2) batch = `${parts[0]}/${parts[1]}`; }
            const key = `${department}_${batch}`;
            if (!groups[key]) { groups[key] = { department, batch, hostelCounts: {} }; allHostelCols.forEach(h => groups[key].hostelCounts[h.name] = 0); }
            let assignedHostelName = std.hostelName;
            if (!assignedHostelName && std.hostelId) { const h = hostels.find(x => x._id === std.hostelId); if (h) assignedHostelName = h.name; }
            if (assignedHostelName && groups[key].hostelCounts[assignedHostelName] !== undefined) groups[key].hostelCounts[assignedHostelName]++;
        });
        const columns = ['Faculty', 'Batch', ...allHostelCols.map(h => h.name), 'Total'];
        const rows = Object.values(groups).sort((a, b) => a.department.localeCompare(b.department)).map(g => {
            const row = [g.department, g.batch]; let total = 0;
            allHostelCols.forEach(h => { const c = g.hostelCounts[h.name]; row.push(c); total += c; });
            row.push(total); return row;
        });

        // 3-row nested header:
        // Row 1: Faculty | Batch | "Name of Halls" (spans every hostel column) | Total
        // Row 2: (skipped for Faculty/Batch/Total via rowSpan) | "Male Hostels" (spans male cols) | "Female Hostels" (spans female cols)
        // Row 3: (skipped) | individual hostel name per leaf column
        const maleColCount = maleHostels.length;
        const femaleColCount = femaleHostels.length;
        const genderGroupRow = [];
        if (maleColCount > 0) genderGroupRow.push({ label: 'Male Hostels', colSpan: maleColCount });
        if (femaleColCount > 0) genderGroupRow.push({ label: 'Female Hostels', colSpan: femaleColCount });

        // Hostel name leaf cells are rendered rotated 90° (vertical text) in
        // both the preview and the Excel export, so they take up much less
        // column width than the full hostel name would horizontally.
        const headerRows = allHostelCols.length > 0
            ? [
                [
                    { label: 'Faculty', rowSpan: 3 },
                    { label: 'Batch', rowSpan: 3 },
                    { label: 'Name of Halls', colSpan: allHostelCols.length },
                    { label: 'Total', rowSpan: 3 },
                ],
                genderGroupRow,
                allHostelCols.map(h => ({ label: h.name, vertical: true })),
            ]
            : null; // no hostels found: fall back to a flat single-row header

        // Column indices (0-based, matching `columns` above) occupied by the
        // rotated hostel-name headers: Faculty (0) and Batch (1) come first,
        // then one column per hostel.
        const verticalHeaderIndices = new Set(allHostelCols.map((_, idx) => idx + 2));

        return {
            reportId: 'distribution',
            title: 'Hall Wise Summary',
            headers: [`Hall Wise Summary Report - Generated ${new Date().toLocaleDateString()}`],
            columns,
            headerRows,
            verticalHeaderIndices,
            rows,
            totalRow: null,
            fileName: 'Hall_Wise_Summery_Report'
        };
    };

    const prepareCapacityPreview = async () => {
        const hostels = await fetchHostels();
        const rows = []; let grandRooms = 0, grandMale = 0, grandFemale = 0, grandRev = 0, grandTotal = 0;
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
        return {
            reportId: 'capacity',
            title: 'Hostel Details & Capacity',
            headers: [`Hostel Details & Capacity Report - Generated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`],
            columns: ['No', 'Hostel Name', 'No of Rooms', 'Male', 'Female', 'Rev', 'Total'],
            // Groups the last 4 leaf columns under one spanning header.
            // span === 1 entries are auto-filled with their own column name
            // and rendered as a single cell spanning both header rows.
            columnGroups: [
                { span: 1 },
                { span: 1 },
                { span: 1 },
                { label: 'No. Can Be Accommodated', span: 4 },
            ],
            rows,
            totalRow: ['Grand Total', '', grandRooms, grandMale, grandFemale, grandRev, grandTotal],
            fileName: 'Hostel_Details_Capacity_Report'
        };
    };

    const prepareFinancialPreview = async () => {
        const students = await fetchStudents();
        const hostels = await fetchHostels();
        const assignedStudents = students.filter(s => s.hostelId || s.hostelName || s.isAssign);
        const deptsSet = new Set();
        assignedStudents.forEach(std => { const deptCode = getMainDept(std.enrolmentNo); deptsSet.add(DEPARTMENT_MAP[deptCode] || deptCode); });
        const departments = Array.from(deptsSet).sort();

        const groups = {};
        hostels.forEach(h => { groups[h.name] = { hostelName: h.name, deptCounts: {} }; departments.forEach(d => { groups[h.name].deptCounts[d] = { M: 0, F: 0 }; }); });
        assignedStudents.forEach(std => {
            let hn = std.hostelName; if (!hn && std.hostelId) { const h = hostels.find(x => x._id === std.hostelId); if (h) hn = h.name; }
            if (!hn || !groups[hn]) return;
            const dept = DEPARTMENT_MAP[getMainDept(std.enrolmentNo)] || getMainDept(std.enrolmentNo);
            const gender = std.sex === 'Male' ? 'M' : 'F';
            if (groups[hn].deptCounts[dept]) groups[hn].deptCounts[dept][gender]++;
        });

        // Leaf columns: No, Hostel Name, then M/F per department, then Total, Fee/Student
        const columns = ['No', 'Hostel Name'];
        departments.forEach(d => columns.push(`${d} (M)`, `${d} (F)`));
        columns.push('Total', 'Fee/Student');

        const sortedGroups = Object.values(groups).sort((a, b) => a.hostelName.localeCompare(b.hostelName));
        const rows = sortedGroups.map((g, index) => {
            const row = [index + 1, g.hostelName];
            let total = 0;
            departments.forEach(d => {
                row.push(g.deptCounts[d].M, g.deptCounts[d].F);
                total += g.deptCounts[d].M + g.deptCounts[d].F;
            });
            row.push(total, '');
            return row;
        });

        // 3-row nested header:
        // Row 1: No | Hostel Name | "No. of Occupied" (spans every dept's M/F cols) | Total | Fee/Student
        // Row 2:  (skipped for No/Hostel/Total/Fee via rowSpan)  | per-department label spanning M & F
        // Row 3:  (skipped)                                      | M | F  for each department
        const deptColCount = departments.length * 2;
        const headerRows = deptColCount > 0
            ? [
                [
                    { label: 'No', rowSpan: 3 },
                    { label: 'Hostel Name', rowSpan: 3 },
                    { label: 'No. of Occupied', colSpan: deptColCount },
                    { label: 'Total', rowSpan: 3 },
                    { label: 'Fee/Student', rowSpan: 3 },
                ],
                departments.map(d => ({ label: d, colSpan: 2 })),
                departments.flatMap(() => [{ label: 'M' }, { label: 'F' }]),
            ]
            : null; // no departments found: fall back to a flat single-row header

        return {
            reportId: 'financial',
            title: 'Faculty Wise Hostel Summary',
            headers: [`Faculty Wise Hostel Summary - Generated ${new Date().toLocaleDateString()}`],
            columns,
            headerRows,
            rows,
            totalRow: null,
            fileName: 'Faculty_Wise_Hostel_Summery_Report'
        };
    };

    const prepareEligibilityPreview = async () => {
        const students = await fetchStudents();
        const groups = {};
        let gR = 0, gE = 0, gM = 0, gF = 0, gRev = 0, gT = 0;
        students.forEach(std => {
            const deptCode = getMainDept(std.enrolmentNo);
            const department = DEPARTMENT_MAP[deptCode] || deptCode || 'Unknown';
            let batchYear = 'Unknown';
            if (std.enrolmentNo) { const parts = std.enrolmentNo.split('/'); if (parts.length >= 2 && parts[1]) batchYear = parts[1].length === 2 ? `20${parts[1]}` : parts[1]; }
            let studyYear = ''; if (std.dateOfEnrolment) studyYear = String((new Date().getFullYear() - new Date(std.dateOfEnrolment).getFullYear()) + 1);
            const studyYearLabel = studyYear ? `Year ${studyYear}` : 'Unknown';
            const key = `${department}_${batchYear}_${studyYear}`;
            if (!groups[key]) groups[key] = { department, batchYear, studyYearLabel, registered: 0, eligible: 0, maleAssigned: 0, femaleAssigned: 0 };
            groups[key].registered++;
            const isAssigned = !!(std.isAssign || std.hostelId || std.hostelName);
            const isEligible = isAssigned || std.eligibilityStatus === 'Eligible' || std.eligibilityStatus === true;
            if (isEligible) groups[key].eligible++;
            if (isAssigned) { const g = (std.sex || '').toLowerCase(); if (g === 'male') groups[key].maleAssigned++; else if (g === 'female') groups[key].femaleAssigned++; }
        });
        const rows = Object.values(groups).sort((a, b) => a.department.localeCompare(b.department)).map(g => {
            const rev = 0; const total = g.maleAssigned + g.femaleAssigned + rev;
            gR += g.registered; gE += g.eligible; gM += g.maleAssigned; gF += g.femaleAssigned; gRev += rev; gT += total;
            return [g.department, g.batchYear, g.studyYearLabel, g.registered, g.eligible, g.maleAssigned, g.femaleAssigned, rev, total];
        });
        return { reportId: 'eligibility', title: 'Hostel Facility Allocation & Student Satisfaction', headers: ['HOSTEL Facility Allocation and Student Satisfaction'], columns: ['Faculty', 'Batch Year', 'Year of Intake', 'Registered', 'Eligible', 'Male', 'Female', 'Rev', 'Total'], rows, totalRow: ['Grand Total', '', '', gR, gE, gM, gF, gRev, gT], fileName: 'HOSTEL_Facillity_Allocation_Report' };
    };

    const openReportPreview = async (reportId) => {
        if (reportId === 'payments') { openPaymentFilterModal(); return; }
        try {
            setLoadingReport(reportId);
            let data;
            if (reportId === 'distribution') data = await prepareDistributionPreview();
            else if (reportId === 'capacity') data = await prepareCapacityPreview();
            else if (reportId === 'financial') data = await prepareFinancialPreview();
            else if (reportId === 'eligibility') data = await prepareEligibilityPreview();
            else return;
            setPreviewData(data);
            setShowPreviewModal(true);
        } catch (err) { console.error('Preview failed', err); alert('Failed to prepare report preview.'); }
        finally { setLoadingReport(null); }
    };

    const exportGenericExcel = async (data) => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(data.title);
        data.headers.forEach(line => worksheet.addRow([line]));
        worksheet.addRow([]);

        const colCount = data.columns.length;
        const headerRowStart = worksheet.rowCount + 1;
        let headerRowCount = 1;

        // Positions of rotated (vertical-text) header cells, collected below
        // when headerRows are used, so their rotation can be (re-)applied
        // after the generic style pass and their row can be made taller.
        let verticalCellPositions = [];

        if (data.headerRows) {
            // Generic nested header (e.g. 3-row: label spanning all rows,
            // group row, leaf row) — used by the Hall Wise Summary and
            // Faculty Wise Hostel Summary reports.
            const placedRows = layoutHeaderRows(data.headerRows, colCount);

            placedRows.forEach(rowCells => {
                const rowArr = new Array(colCount).fill('');
                rowCells.forEach(cell => { rowArr[cell.colIndex] = cell.label; });
                worksheet.addRow(rowArr);
            });

            placedRows.forEach((rowCells, rIdx) => {
                rowCells.forEach(cell => {
                    if (cell.colSpan > 1 || cell.rowSpan > 1) {
                        const startRow = headerRowStart + rIdx;
                        const endRow = startRow + cell.rowSpan - 1;
                        const startCol = cell.colIndex + 1;
                        const endCol = startCol + cell.colSpan - 1;
                        worksheet.mergeCells(startRow, startCol, endRow, endCol);
                    }
                    if (cell.vertical) {
                        verticalCellPositions.push({
                            row: headerRowStart + rIdx,
                            col: cell.colIndex + 1,
                            labelLen: String(cell.label ?? '').length,
                        });
                    }
                });
            });

            // Rotated text needs a taller row to fit — size it off the
            // longest label rotated into that row (e.g. longest hostel name).
            const rowsNeedingHeight = new Set(verticalCellPositions.map(v => v.row));
            rowsNeedingHeight.forEach(rowNum => {
                const maxLabelLen = Math.max(...verticalCellPositions.filter(v => v.row === rowNum).map(v => v.labelLen));
                worksheet.getRow(rowNum).height = Math.min(Math.max(maxLabelLen * 5.5, 60), 150);
            });

            headerRowCount = placedRows.length;
        } else if (data.columnGroups) {
            const groupRow = [];
            let li = 0;
            data.columnGroups.forEach(g => {
                groupRow.push(g.span === 1 ? (g.label || data.columns[li]) : g.label);
                for (let i = 1; i < g.span; i++) groupRow.push('');
                li += g.span;
            });
            worksheet.addRow(groupRow);

            const subRow = [];
            li = 0;
            data.columnGroups.forEach(g => {
                if (g.span === 1) {
                    subRow.push('');
                    li += 1;
                } else {
                    for (let i = 0; i < g.span; i++) {
                        subRow.push(data.columns[li]);
                        li += 1;
                    }
                }
            });
            worksheet.addRow(subRow);

            const groupHeaderRowNum = worksheet.rowCount - 1;
            const subHeaderRowNum = worksheet.rowCount;
            let cIdx = 1;
            data.columnGroups.forEach(g => {
                if (g.span === 1) {
                    worksheet.mergeCells(groupHeaderRowNum, cIdx, subHeaderRowNum, cIdx);
                } else {
                    worksheet.mergeCells(groupHeaderRowNum, cIdx, groupHeaderRowNum, cIdx + g.span - 1);
                }
                cIdx += g.span;
            });

            headerRowCount = 2;
        } else {
            worksheet.addRow(data.columns);
            headerRowCount = 1;
        }

        const headerRowEnd = headerRowStart + headerRowCount - 1;

        data.rows.forEach(row => worksheet.addRow(row));
        if (data.totalRow) worksheet.addRow(data.totalRow);

        if (data.reportId === 'payments') {
            worksheet.addRow([]);
            worksheet.addRow([]);

            if (data.reportType === 'certified') {
                worksheet.addRow(['I Certified that the above students are accomadated at ........................................................ Hall for the acadamic year.......................']);
                worksheet.addRow([]);
                worksheet.addRow([]);

                const signRow1 = new Array(colCount).fill('');
                signRow1[0] = '...........................................';
                signRow1[colCount - 1] = '.................';
                worksheet.addRow(signRow1);

                const signRow2 = new Array(colCount).fill('');
                signRow2[0] = 'sub warden';
                signRow2[colCount - 1] = 'Date';
                worksheet.addRow(signRow2);

                const lastRow = worksheet.rowCount;
                for (let i = lastRow - 5; i <= lastRow; i++) {
                    const r = worksheet.getRow(i);
                    r.font = { name: 'Calibri', size: 11 };
                    r.getCell(1).alignment = { horizontal: 'left' };
                    r.getCell(colCount).alignment = { horizontal: 'right' };
                }
            } else {
                worksheet.addRow(['Prepared By..........................']);
                worksheet.addRow([]);
                worksheet.addRow([]);
                worksheet.addRow(['......................................................']);
                worksheet.addRow(['DIRECTOR']);
                worksheet.addRow(['STUDENT ACCOMMODATION DIVISION']);

                const lastRow = worksheet.rowCount;
                for (let i = lastRow - 5; i <= lastRow; i++) {
                    const r = worksheet.getRow(i);
                    r.font = { name: 'Calibri', size: 11 };
                    r.getCell(1).alignment = { horizontal: 'left' };
                }
            }

            // Cc. section — common for both normal and certified reports
            worksheet.addRow([]);
            worksheet.addRow([]);
            const facultyLabel = data.facultyName ? `Dean/ Faculty of ${data.facultyName}` : 'Dean/ Faculty of .....................';
            worksheet.addRow([`Cc.-    1. ${facultyLabel}`]);
            worksheet.addRow(['           2. Chief Medical Officer']);
            worksheet.addRow(['           3. Chief Marshal']);
            worksheet.addRow(['           4. Chief Security Officer']);
            worksheet.addRow(['           5. AB/ Student Service Account Branch']);

            const ccStartRow = worksheet.rowCount - 4;
            for (let i = ccStartRow; i <= worksheet.rowCount; i++) {
                const r = worksheet.getRow(i);
                r.font = { name: 'Calibri', size: 11 };
                r.getCell(1).alignment = { horizontal: 'left' };
            }
        }

        data.headers.forEach((_, i) => worksheet.mergeCells(i + 1, 1, i + 1, colCount));
        // Character-unit width from actual content (header/rows/total), floored
        // low (4) so narrow columns like single-letter M/F stay narrow, capped
        // at 30 so long text columns (e.g. hostel names) don't run away.
        const maxLengths = getColumnMaxLengths(data);
        data.columns.forEach((col, i) => {
            if (data.reportId === 'distribution') {
                if (data.verticalHeaderIndices?.has(i)) {
                    worksheet.getColumn(i + 1).width = 4.5; // Tighter column width for Excel
                } else if (i === 0) {
                    worksheet.getColumn(i + 1).width = Math.max(maxLengths[i] + 5, 25); // Faculty
                } else if (i === 1) {
                    worksheet.getColumn(i + 1).width = Math.max(maxLengths[i] + 5, 15); // Batch
                } else if (i === data.columns.length - 1) {
                    worksheet.getColumn(i + 1).width = Math.max(maxLengths[i] + 5, 12); // Total
                }
            } else {
                worksheet.getColumn(i + 1).width = Math.min(Math.max(maxLengths[i] + 2, 4), 30);
            }
        });
        applyStylesToWorksheet(worksheet, headerRowStart, headerRowEnd);

        if (verticalCellPositions && verticalCellPositions.length > 0) {
            verticalCellPositions.forEach(v => {
                const cell = worksheet.getCell(v.row, v.col);
                cell.alignment = { ...cell.alignment, textRotation: 90 };
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `${data.fileName}.xlsx`);
    };


    const handleDownload = async (type, generatorFn) => {
        try {
            setLoadingReport(type);
            await generatorFn();
        } catch (error) {
            console.error('Failed to generate report', error);
            alert('Failed to generate report.');
        } finally {
            setLoadingReport(null);
        }
    };

    const reportOptions = [
        {
            id: 'distribution',
            title: 'Hall Wise Summery',
            description: 'Shows the distribution of students across hostels grouped by their academic department and batch year.',
            icon: Activity,
            color: 'bg-blue-50 text-blue-600'
        },
        {
            id: 'capacity',
            title: 'Hostel Details & Capacity',
            description: 'A comprehensive summary of room availability and overall accommodation capacity separated by gender.',
            icon: Building,
            color: 'bg-emerald-50 text-emerald-600'
        },
        {
            id: 'financial',
            title: 'Faculty Wise Hostel Summery',
            description: 'Breakdown of allocated students by department inside each hostel, intended for fee and academic analysis.',
            icon: IndianRupee,
            color: 'bg-purple-50 text-purple-600'
        },
        {
            id: 'eligibility',
            title: 'Hostel Facillity Allocation and Student Satisfaction',
            description: 'Detailed view of student registrations versus actual hostel eligibility and final room assignments.',
            icon: Users,
            color: 'bg-amber-50 text-amber-600'
        },
        {
            id: 'payments',
            title: 'Hall List',
            description: 'Complete export of all recorded hostel hall fee payments made by assigned students.',
            icon: CreditCard,
            color: 'bg-indigo-50 text-indigo-600'
        }
    ];

    return (
        <>
            <div className={`p-8 max-w-7xl mx-auto min-h-screen ${showPreviewModal ? 'print:hidden' : ''}`}>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">System Reports</h1>
                    <p className="text-gray-500">Generate and download comprehensive data exports for hostel management.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reportOptions.map((report) => {
                        const Icon = report.icon;
                        const isLoading = loadingReport === report.id;

                        return (
                            <div key={report.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`p-3 rounded-xl ${report.color}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-800">{report.title}</h3>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed mb-8">
                                        {report.description}
                                    </p>
                                </div>

                                <button
                                    onClick={() => openReportPreview(report.id)}
                                    disabled={!!loadingReport || paymentFilterLoading}
                                    className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all
                                    ${isLoading
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : loadingReport || paymentFilterLoading
                                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                : 'bg-[#6b0f14] text-white hover:bg-[#4f0a0f] active:scale-[0.98]'
                                        }
                                `}
                                >
                                    {isLoading || (paymentFilterLoading && report.id === 'payments') ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                            {paymentFilterLoading && report.id === 'payments' ? 'Loading filters...' : 'Generating...'}
                                        </>
                                    ) : (
                                        <>
                                            <FileSpreadsheet className="w-5 h-5" />
                                            Preview Report
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {showPaymentFilterModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
                        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
                            <h2 className="text-xl font-semibold text-gray-800 mb-1">Hall List Filters</h2>
                            <p className="text-sm text-gray-500 mb-6">Select filters for department, hostel, batch year, batch, and resident date.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                                    <select
                                        value={paymentFilters.reportType}
                                        onChange={(e) => handlePaymentFilterChange('reportType', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                    >
                                        <option value="normal">Normal Report</option>
                                        <option value="certified">Certified List</option>
                                    </select>
                                </div>

                                <DepartmentTreeSelect
                                    options={paymentFilterOptions.departments}
                                    value={paymentFilters.departmentFilter}
                                    onChange={(val) => handlePaymentFilterChange('departmentFilter', val)}
                                />

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hostel</label>
                                    <select
                                        value={paymentFilters.hostelId}
                                        onChange={(e) => handlePaymentFilterChange('hostelId', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                    >
                                        <option value="">All Hostels</option>
                                        {paymentFilterOptions.hostels.map(h => (
                                            <option key={h._id} value={h._id}>{h.name || 'Hostel'}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch Year</label>
                                    <select
                                        value={paymentFilters.batchYear}
                                        onChange={(e) => handlePaymentFilterChange('batchYear', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                    >
                                        <option value="">All Batch Years</option>
                                        {paymentFilterOptions.batchYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                                    <select
                                        value={paymentFilters.batch}
                                        onChange={(e) => handlePaymentFilterChange('batch', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                    >
                                        <option value="">All Batches</option>
                                        {paymentFilterOptions.batches.map(batch => (
                                            <option key={batch} value={batch}>{batch}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Resident Date</label>
                                    <input
                                        type="date"
                                        value={paymentFilters.residentDateFrom}
                                        onChange={(e) => handlePaymentFilterChange('residentDateFrom', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hall Fee (Rs.)</label>
                                    <input
                                        type="number"
                                        value={paymentFilters.hallFee}
                                        onChange={(e) => handlePaymentFilterChange('hallFee', e.target.value)}
                                        placeholder="e.g. 5000"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentFilterModal(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePaymentPreviewWithFilters}
                                    className="rounded-lg bg-[#6b0f14] px-4 py-2 text-sm font-medium text-white hover:bg-[#4f0a0f]"
                                >
                                    Preview Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showPreviewModal && previewData && (
                <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 print-modal-overlay">
                    <style>
                        {`
                            @media print {
                                @page {
                                    size: ${['payments', 'eligibility'].includes(previewData.reportId) ? 'portrait' : 'landscape'};
                                }
                            }
                        `}
                    </style>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden print-modal-container">
                        {/* Action Bar */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:p-6 border-b bg-gray-50 print-hide">
                            <h2 className="text-xl font-bold text-gray-800">Preview: {previewData.title}</h2>
                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                <button onClick={() => setShowPreviewModal(false)} className="flex-1 md:flex-none px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium whitespace-nowrap text-sm md:text-base">Close</button>
                                {previewData.reportId === 'payments' && (
                                    <button onClick={() => { setShowPreviewModal(false); setShowPaymentFilterModal(true); }} className="flex-1 md:flex-none px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium whitespace-nowrap text-sm md:text-base">Edit Filters</button>
                                )}
                                <button onClick={() => window.print()} className="flex-1 md:flex-none px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium whitespace-nowrap text-sm md:text-base">Export PDF</button>
                                <button onClick={() => handleDownload(previewData.reportId, () => exportGenericExcel(previewData))} className="flex-1 md:flex-none px-4 py-2 bg-[#6b0f14] text-white rounded-lg hover:bg-[#4f0a0f] font-medium whitespace-nowrap text-sm md:text-base">Export Excel</button>
                            </div>
                        </div>

                        {/* Printable Content */}
                        <div className="flex-1 overflow-auto p-8 bg-white print-report-area">
                            <div className="mb-6 font-bold text-lg leading-snug">
                                {previewData.headers.map((line, i) => (
                                    <div key={i}>
                                        <input
                                            type="text"
                                            value={line}
                                            onChange={(e) => handlePreviewHeaderEdit(i, e.target.value)}
                                            className="w-full outline-none bg-transparent font-bold text-lg"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="overflow-x-auto">
                                <table className={`border-collapse border border-gray-400 text-sm table-fixed ${previewData.reportId === 'distribution' ? 'w-max' : 'w-full'}`}>
                                    <colgroup>
                                        {columnWidths.map((w, i) => (
                                            <col key={i} style={{ width: `${w}px` }} />
                                        ))}
                                    </colgroup>
                                    <thead>
                                        {previewData.headerRows ? (
                                            <>
                                                {layoutHeaderRows(previewData.headerRows, previewData.columns.length).map((rowCells, rIdx) => (
                                                    <tr key={rIdx}>
                                                        {rowCells.map((cell, cIdx) => (
                                                            <th
                                                                key={cIdx}
                                                                colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                                                                rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                                                                className={`border border-gray-400 p-1 font-bold break-words ${cell.colSpan > 1 ? 'text-center' : 'text-left'} ${cell.vertical ? 'align-middle' : ''}`}
                                                                style={cell.vertical ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } : {}}
                                                            >
                                                                {cell.label}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </>
                                        ) : previewData.columnGroups ? (
                                            <>
                                                <tr>
                                                    {(() => {
                                                        let li = 0;
                                                        return previewData.columnGroups.map((g, i) => {
                                                            const label = g.span === 1 ? (g.label || previewData.columns[li]) : g.label;
                                                            const th = (
                                                                <th
                                                                    key={i}
                                                                    colSpan={g.span > 1 ? g.span : undefined}
                                                                    rowSpan={g.span === 1 ? 2 : undefined}
                                                                    className={`border border-gray-400 p-1 font-bold break-words ${g.span > 1 ? 'text-center' : 'text-left'}`}
                                                                >
                                                                    {label}
                                                                </th>
                                                            );
                                                            li += g.span;
                                                            return th;
                                                        });
                                                    })()}
                                                </tr>
                                                <tr>
                                                    {(() => {
                                                        let li = 0;
                                                        const ths = [];
                                                        previewData.columnGroups.forEach((g, gi) => {
                                                            if (g.span > 1) {
                                                                for (let i = 0; i < g.span; i++) {
                                                                    ths.push(
                                                                        <th key={`${gi}-${i}`} className="border border-gray-400 p-1 font-bold text-left break-words">
                                                                            {previewData.columns[li]}
                                                                        </th>
                                                                    );
                                                                    li += 1;
                                                                }
                                                            } else {
                                                                li += 1;
                                                            }
                                                        });
                                                        return ths;
                                                    })()}
                                                </tr>
                                            </>
                                        ) : (
                                            <tr>
                                                {previewData.columns.map((col, i) => (
                                                    <th key={i} className="border border-gray-400 p-1 font-bold text-left break-words">{col}</th>
                                                ))}
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody>
                                        {previewData.rows.map((row, rIdx) => (
                                            <tr key={rIdx}>
                                                {row.map((cell, cIdx) => (
                                                    <td key={cIdx} className="border border-gray-400 p-0">
                                                        <input
                                                            type="text"
                                                            value={cell ?? ''}
                                                            onChange={(e) => handlePreviewCellEdit(rIdx, cIdx, e.target.value)}
                                                            title={String(cell ?? '')}
                                                            className="w-full h-full p-1 outline-none bg-transparent"
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {previewData.totalRow && (
                                            <tr className="font-bold bg-gray-50">
                                                {previewData.totalRow.map((cell, cIdx) => (
                                                    <td key={cIdx} className="border border-gray-400 p-0">
                                                        <input
                                                            type="text"
                                                            value={cell ?? ''}
                                                            onChange={(e) => handlePreviewTotalEdit(cIdx, e.target.value)}
                                                            title={String(cell ?? '')}
                                                            className="w-full h-full p-1 outline-none bg-transparent font-bold"
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {previewData.reportId === 'payments' && previewData.reportType !== 'certified' && (
                                <div className="mt-12 text-sm flex flex-col gap-10">
                                    <div>Prepared By..........................</div>
                                    <div>
                                        ......................................................<br />
                                        DIRECTOR<br />
                                        STUDENT ACCOMMODATION DIVISION
                                    </div>
                                </div>
                            )}

                            {previewData.reportId === 'payments' && previewData.reportType === 'certified' && (
                                <div className="mt-12 text-sm flex flex-col gap-10">
                                    <div>I Certified that the above students are accomadated at ........................................................ Hall for the acadamic year</div>
                                    <div className="flex justify-between mt-4 pr-12">
                                        <div>
                                            ............................<br />
                                            sub warden
                                        </div>
                                        <div>
                                            ..........<br />
                                            Date
                                        </div>
                                    </div>
                                </div>
                            )}

                            {previewData.reportId === 'payments' && (
                                <div className="mt-14 text-sm leading-relaxed">
                                    <div>Cc.-&nbsp;&nbsp;&nbsp;&nbsp;1. Dean/ Faculty of {previewData.facultyName || '.....................'}</div>
                                    <div className="ml-12">2. Chief Medical Officer</div>
                                    <div className="ml-12">3. Chief Marshal</div>
                                    <div className="ml-12">4. Chief Security Officer</div>
                                    <div className="ml-12">5. AB/ Student Service Account Branch</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Reports;