import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { getUserInfoFromToken } from '../../utils/auth';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const formatDateYmd = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

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
    if (!enrolNo) return '';
    const parts = enrolNo.split('/').filter(Boolean);
    const code = parts[0] || '';
    return DEPARTMENT_MAP[code.toUpperCase()] || code;
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

const getColumnMaxLengths = (data) => {
    return data.columns.map((col, i) => {
        let maxLen = String(col ?? '').length;
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

const applyStylesToWorksheet = (worksheet, headerRowStart = 3, headerRowEnd = 4) => {
    const isHallList = worksheet.name === 'Hall List';
    worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (isHallList) {
                if (rowNumber === worksheet.rowCount) {
                    cell.font = { name: 'Calibri', size: 11, bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                } else if (rowNumber > 9) {
                    cell.font = { name: 'Calibri', size: 11 };
                    cell.alignment = { vertical: 'middle', horizontal: typeof cell.value === 'number' ? 'right' : 'left' };
                } else if (rowNumber === 8) {
                    // Manually added styling for Hall List table headers
                    cell.font = { name: 'Calibri', size: 11, bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                }
                return;
            }
            if (rowNumber === 1) { cell.font = { name: 'Calibri', size: 14, bold: true }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; return; }
            if (rowNumber >= headerRowStart && rowNumber <= headerRowEnd) { cell.font = { name: 'Calibri', size: 11, bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }; cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; return; }
            if (rowNumber === worksheet.rowCount) { cell.font = { name: 'Calibri', size: 11, bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }; } else { cell.font = { name: 'Calibri', size: 11 }; }
            if (rowNumber > headerRowEnd) { cell.alignment = { vertical: 'middle', horizontal: typeof cell.value === 'number' ? 'right' : 'left' }; }
        });
    });
};

const WardenPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [customFees, setCustomFees] = useState({});

    const token = localStorage.getItem('login');
    const currentUser = useMemo(() => getUserInfoFromToken(), []);
    const roles = currentUser?.roles;

    const roleNames = useMemo(() => {
        const raw = Array.isArray(roles)
            ? roles.map(r => (typeof r === 'string' ? r : r?.name))
            : [typeof roles === 'string' ? roles : roles?.name];

        return raw.filter(Boolean).map(r => String(r).toLowerCase());
    }, [roles]);

    const isWarden = roleNames.includes('warden');
    const isPrivilegedViewer = roleNames.includes('admin') || roleNames.includes('director');
    const [hostels, setHostels] = useState([]);
    const [selectedHostelId, setSelectedHostelId] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!token) {
                setError('Unauthorized: missing token');
                setLoading(false);
                return;
            }


            const apiBase = import.meta.env.VITE_APP_API;
            const paymentsUrl = isWarden
                ? `${apiBase}/warden/payments`
                : isPrivilegedViewer
                    ? `${apiBase}/admin/payments${selectedHostelId ? `?hostelId=${selectedHostelId}` : ''}`
                    : null;

            if (!paymentsUrl) {
                setError('Forbidden: you do not have access to payments');
                setLoading(false);
                return;
            }

            if (isPrivilegedViewer && !isWarden && !selectedHostelId) {
                setPayments([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);



                const payRes = await axios.get(paymentsUrl, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const paymentData = payRes.data.Result || payRes.data.result || [];
                setPayments(paymentData);
            } catch (err) {
                // Provide detailed error information to the UI for troubleshooting
                const serverMsg = err?.response?.data?.Error || err?.response?.data?.message || JSON.stringify(err?.response?.data) || err.message;
                console.error('WardenPayments fetch error', err?.response?.data || err.message);
                setError(`Failed to load payments or students: ${serverMsg}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token, currentUser, isWarden, isPrivilegedViewer, selectedHostelId]);

    // Fetch hostels list for privileged viewers (admin/director) so they can filter payments by hostel
    useEffect(() => {
        if (!isPrivilegedViewer) return;
        const apiBase = import.meta.env.VITE_APP_API;
        const fetchHostels = async () => {
            try {
                const res = await axios.get(`${apiBase}/hostel/get-all-hostels`, { headers: { Authorization: `Bearer ${token}` } });
                const fetchedHostels = res.data.Result || res.data.result || [];
                setHostels(fetchedHostels);
                if (fetchedHostels.length > 0) {
                    setSelectedHostelId(fetchedHostels[0]._id);
                }
            } catch (err) {
                console.error('fetch hostels error', err?.response?.data || err.message);
            }
        };

        fetchHostels();
    }, [isPrivilegedViewer, token]);

    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    const [reportFilters, setReportFilters] = useState({
        departmentFilter: '',
        hostelFilter: '',
        batchYear: '',
        batch: '',
        residentDateFrom: '',
        hallFee: '',
        reportType: 'normal'
    });

    const [filterOptions, setFilterOptions] = useState({
        departments: [],
        hostels: [],
        batchYears: [],
        batches: []
    });

    useEffect(() => {
        if (payments.length > 0) {
            const depts = new Set();
            const hosts = new Set();
            const bYears = new Set();
            const bchs = new Set();

            payments.forEach(p => {
                const s = p.studentId;
                if (s) {
                    const dept = getMainDept(s.enrolmentNo);
                    const bYear = getBatchYearFromEnrolNo(s.enrolmentNo);
                    const batchPrefix = getBatchPrefixFromEnrolNo(s.enrolmentNo);

                    if (dept) depts.add(dept);
                    if (bYear) bYears.add(bYear);
                    if (batchPrefix) bchs.add(batchPrefix);
                }
                if (p.hostelName) hosts.add(p.hostelName);
            });

            setFilterOptions({
                departments: [...depts].sort(),
                hostels: [...hosts].sort(),
                batchYears: [...bYears].sort(),
                batches: [...bchs].sort()
            });
        }
    }, [payments]);

    const generatePreviewData = (filteredPayments, filters) => {
        let hName = filters.hostelFilter || 'ALL HALLS';
        if (!filters.hostelFilter) {
            if (selectedHostelId) {
                const h = hostels.find(x => x._id === selectedHostelId);
                if (h) hName = h.name;
            } else if (isWarden && payments.length > 0) {
                hName = payments[0].hostelName || 'ALL HALLS';
            }
        }
        const deptName = filters.departmentFilter || 'ALL';
        const batchYr = filters.batchYear || 'ALL ACADEMIC YEARS';
        const batch = filters.batch || 'ALL STUDY YEARS';
        const resDate = filters.residentDateFrom ? filters.residentDateFrom.replace(/-/g, '.') : 'ALL DATES';

        const headers = [
            'UNIVERSITY OF PERADENIYA',
            `FACULTY OF ${deptName.toUpperCase()}`,
            `ACADEMIC YEAR - ${batchYr.toUpperCase()}`,
            `BATCH - ${batch.toUpperCase()}`,
            `HALLS OF RESIDENCE - ${hName.toUpperCase()}`,
            `DATE OF RESIDENCE - ${resDate}                                                                      Hall Fee  RS. ${filters.hallFee || '..........'}`,
        ];

        const columns = ['No', 'Enrolment No', 'Name', 'Room No', 'Hall fee', 'Date'];
        const rows = filteredPayments.map((p, idx) => [
            idx + 1,
            p.studentId?.enrolmentNo || '-',
            p.studentId?.fullName || p.studentId?.name || '-',
            p.roomNo || '-',
            Number(p.amount) || 0,
            formatDateYmd(p.paidDate) || '-'
        ]);
        return {
            reportId: 'payments',
            reportType: filters.reportType,
            title: filters.reportType === 'certified' ? 'Certified List' : 'Hall List',
            headers, columns, rows,
            fileName: filters.reportType === 'certified' ? 'Certified_List' : 'Hall_List',
        };
    };

    // removed unused handlePreparePreview





    const handleFilteredPreview = () => {
        let filtered = payments;

        if (reportFilters.reportType === 'certified') {
            filtered = filtered.filter(p => p.roomNo && p.roomNo.trim() !== '' && p.roomNo !== '-');
        }

        if (reportFilters.departmentFilter) {
            filtered = filtered.filter(p => getMainDept(p.studentId?.enrolmentNo) === reportFilters.departmentFilter);
        }
        if (reportFilters.hostelFilter) {
            filtered = filtered.filter(p => p.hostelName === reportFilters.hostelFilter);
        }
        if (reportFilters.batchYear) {
            filtered = filtered.filter(p => getBatchYearFromEnrolNo(p.studentId?.enrolmentNo) === reportFilters.batchYear);
        }
        if (reportFilters.batch) {
            filtered = filtered.filter(p => getBatchPrefixFromEnrolNo(p.studentId?.enrolmentNo) === reportFilters.batch);
        }

        const data = generatePreviewData(filtered, reportFilters);
        setPreviewData(data);
        setShowPreviewModal(true);
        setShowFilterModal(false);
    };

    const exportGenericExcel = async (data) => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(data.title);
        data.headers.forEach(line => worksheet.addRow([line]));
        worksheet.addRow([]); // Empty row after headers

        const colCount = data.columns.length;
        const headerRowStart = worksheet.rowCount + 1;
        let headerRowCount = 1;

        worksheet.addRow(data.columns);
        const headerRowEnd = headerRowStart + headerRowCount - 1;

        data.rows.forEach(row => worksheet.addRow(row));

        if (data.reportId === 'payments') {
            worksheet.addRow([]);
            worksheet.addRow([]);

            if (data.reportType === 'certified') {
                worksheet.addRow(['I Certified that the above students are accomadated at .................................................................................. Hall for the acadamic year']);
                worksheet.addRow([]);
                worksheet.addRow([]);

                const signRow1 = new Array(colCount).fill('');
                signRow1[0] = '............................................................................................';
                signRow1[colCount - 1] = '..............................................................................';
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
        }
        if (data.totalRow) worksheet.addRow(data.totalRow);

        // Merge header rows
        data.headers.forEach((_, i) => worksheet.mergeCells(i + 1, 1, i + 1, colCount));

        const maxLengths = getColumnMaxLengths(data);
        data.columns.forEach((col, i) => {
            worksheet.getColumn(i + 1).width = Math.min(Math.max(maxLengths[i] + 2, 4), 30);
        });

        applyStylesToWorksheet(worksheet, headerRowStart, headerRowEnd);

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `${data.fileName}.xlsx`);
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

    const handleMarkAsPaid = async (studentId) => {
        const studentRow = payments.find(p => p.studentId?._id === studentId);
        let fee = customFees[studentId];
        if (fee === undefined) {
            fee = studentRow?.amount || 0;
        }

        if (!fee || String(fee).trim() === '' || Number(fee) <= 0) {
            setError('Please enter a valid Hall Fee amount greater than 0 before marking as paid.');
            return;
        }

        if (!window.confirm("Are you sure you want to mark this hall fee payment as paid?")) return;

        setProcessingId(studentId);
        setError(null);
        setSuccessMsg(null);
        try {
            const res = await axios.put(`${import.meta.env.VITE_APP_API}/warden/payments/${studentId}/mark-paid`, { amount: fee }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.Status === 'Success') {
                setSuccessMsg("Payment marked as paid successfully.");
                // Update local state without refetching to be fast
                setPayments(prev => prev.map(p => {
                    if (p.studentId?._id === studentId) {
                        return { ...p, paymentStatus: 'Paid', paidDate: new Date().toISOString(), amount: fee };
                    }
                    return p;
                }));

                // Clear success message after 3 seconds
                setTimeout(() => setSuccessMsg(null), 3000);
            } else {
                setError(res.data.Error || 'Failed to mark as paid');
            }
        } catch (err) {
            console.error('mark paid error', err);
            setError(err.response?.data?.Error || 'Failed to mark as paid');
        } finally {
            setProcessingId(null);
        }
    };



    const formatDateOnly = (val) => {
        if (!val) return '-';
        const d = new Date(val);
        if (isNaN(d)) return '-';
        return d.toISOString().split('T')[0];
    };

    if (loading) return <div className="p-4 text-center">Loading...</div>;

    return (
        <>
            <div className={`mt-8 relative ${showPreviewModal ? 'print:hidden' : ''}`}>
                <div className="mb-4 font-semibold text-gray-700 text-2xl">Manage Payments</div>
                {error && <div className="mb-4 p-4 text-red-600 bg-red-50 rounded-lg border border-red-100">{error}</div>}
                {successMsg && <div className="mb-4 p-4 text-green-600 bg-green-50 rounded-lg border border-green-100">{successMsg}</div>}



                {isPrivilegedViewer && (
                    <div className="mb-4 flex items-center gap-3">
                        <label className="block text-sm font-medium">Filter by Hostel</label>
                        <select value={selectedHostelId} onChange={e => setSelectedHostelId(e.target.value)} className="px-3 py-2 border rounded">
                            <option value="" disabled>Select a hostel...</option>
                            {hostels.map(h => (
                                <option key={h._id} value={h._id}>{h.name || h.hostelID || h._id}</option>
                            ))}
                        </select>
                    </div>
                )}

                {(isWarden || isPrivilegedViewer) && (
                    <div className="mb-3 flex justify-end">
                        <button onClick={() => setShowFilterModal(true)} className="px-4 py-2 bg-[#6b0f14] text-white rounded hover:bg-[#4f0a0f] shadow-sm">
                            Preview Report
                        </button>
                    </div>
                )}

                <div className="overflow-x-auto rounded-2xl shadow-lg bg-white">
                    <table className="min-w-full text-sm text-left text-gray-600">
                        <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                            <tr>
                                <th className="px-6 py-3">No</th>
                                <th className="px-6 py-3">Enrollment No</th>
                                <th className="px-6 py-3">Hostel</th>
                                <th className="px-6 py-3">Room No</th>
                                <th className="px-6 py-3">Hall Fee</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Date</th>
                                {isWarden && <th className="px-6 py-3">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                                        No payment records found
                                    </td>
                                </tr>
                            ) : (
                                payments.map((p, idx) => {
                                    const isPaid = p.paymentStatus === 'Paid';
                                    const sId = p.studentId?._id;

                                    return (
                                        <tr key={p._id || idx} className="hover:bg-[#fefaf0]">
                                            <td className="px-6 py-4">{idx + 1}</td>
                                            <td className="px-6 py-4 font-medium">{p.studentId?.enrolmentNo || '-'}</td>
                                            <td className="px-6 py-4">{p.hostelName || '-'}</td>
                                            <td className="px-6 py-4">{p.roomNo || '-'}</td>
                                            <td className="px-6 py-4">
                                                {!isPaid && isWarden ? (
                                                    <input
                                                        type="number"
                                                        className="w-24 px-2 py-1 border rounded"
                                                        placeholder="Amount"
                                                        value={customFees[sId] !== undefined ? customFees[sId] : (isPaid ? p.amount : 0)}
                                                        onChange={(e) => setCustomFees(prev => ({ ...prev, [sId]: e.target.value }))}
                                                    />
                                                ) : (
                                                    `LKR ${p.amount}`
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${isPaid ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                                                    {isPaid ? 'Paid' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{formatDateOnly(p.paidDate)}</td>
                                            {isWarden && (
                                                <td className="px-6 py-4">
                                                    {!isPaid ? (
                                                        <button
                                                            onClick={() => handleMarkAsPaid(sId)}
                                                            disabled={processingId === sId}
                                                            className={`px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors shadow-sm
                                                        ${processingId === sId ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#6b0f14] hover:bg-[#4f0a0f]'}`}
                                                        >
                                                            {processingId === sId ? 'Processing...' : 'Mark as Paid'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm italic">Paid</span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Filter Modal */}
            {showFilterModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-xl font-semibold text-gray-800 mb-1">Hall List Filters</h2>
                        <p className="text-sm text-gray-500 mb-6">Select filters for department, hostel, batch year, batch, and resident date.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                                <select
                                    value={reportFilters.reportType}
                                    onChange={(e) => setReportFilters(prev => ({ ...prev, reportType: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                >
                                    <option value="normal">Normal Report</option>
                                    <option value="certified">Certified List</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <select
                                    value={reportFilters.departmentFilter}
                                    onChange={(e) => setReportFilters(prev => ({ ...prev, departmentFilter: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                >
                                    <option value="">All Departments</option>
                                    {filterOptions.departments.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            {isPrivilegedViewer && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hostel</label>
                                    <select
                                        value={reportFilters.hostelFilter}
                                        onChange={(e) => setReportFilters(prev => ({ ...prev, hostelFilter: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                    >
                                        <option value="">All Hostels</option>
                                        {filterOptions.hostels.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Year</label>
                                <select
                                    value={reportFilters.batchYear}
                                    onChange={(e) => setReportFilters(prev => ({ ...prev, batchYear: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                >
                                    <option value="">All Batch Years</option>
                                    {filterOptions.batchYears.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                                <select
                                    value={reportFilters.batch}
                                    onChange={(e) => setReportFilters(prev => ({ ...prev, batch: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                >
                                    <option value="">All Batches</option>
                                    {filterOptions.batches.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Resident Date</label>
                                <input
                                    type="date"
                                    value={reportFilters.residentDateFrom}
                                    onChange={(e) => setReportFilters(prev => ({ ...prev, residentDateFrom: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hall Fee (Rs.)</label>
                                <input
                                    type="number"
                                    value={reportFilters.hallFee}
                                    onChange={(e) => setReportFilters(prev => ({ ...prev, hallFee: e.target.value }))}
                                    placeholder="e.g. 5000"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowFilterModal(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleFilteredPreview}
                                className="rounded-lg bg-[#6b0f14] px-4 py-2 text-sm font-medium text-white hover:bg-[#4f0a0f]"
                            >
                                Preview Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal — outside the main div so print CSS can find it */}
            {showPreviewModal && previewData && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print-modal-overlay">
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
                        <div className="flex flex-wrap justify-between items-center p-6 border-b bg-gray-50 print-hide">
                            <h2 className="text-xl font-bold text-gray-800">Preview: {previewData.title}</h2>
                            <div className="flex gap-3">
                                <button onClick={() => setShowPreviewModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium">Close</button>
                                <button onClick={() => { setShowPreviewModal(false); setShowFilterModal(true); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium">Edit Filters</button>
                                <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium">Export PDF</button>
                                <button onClick={() => exportGenericExcel(previewData)} className="px-4 py-2 bg-[#6b0f14] text-white rounded-lg hover:bg-[#4f0a0f] font-medium">Export Excel</button>
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
                                <table className="border-collapse border border-gray-400 text-sm table-fixed w-full">
                                    <thead>
                                        <tr>
                                            {previewData.columns.map((col, i) => (
                                                <th key={i} className="border border-gray-400 p-1 font-bold text-left break-words">{col}</th>
                                            ))}
                                        </tr>
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
                                            ..................................<br />
                                            Date
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Add fadeIn keyframes for dropdown animation
const style = document.createElement('style');
style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px);} to { opacity: 1; transform: translateY(0);} }`;
document.head.appendChild(style);

export default WardenPayments;
