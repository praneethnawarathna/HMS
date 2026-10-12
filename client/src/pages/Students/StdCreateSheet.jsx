import axios from 'axios';
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Link, useNavigate } from 'react-router-dom';
;
import FileInput from '../../components/Form/FileInput';
import DefaultBtn from '../../components/Buttons/DefaultBtn';


const StdCreateSheet = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('login');

    const [showPreview, setShowPreview] = useState(false);

    const [sheet, setsheet] = useState({
        file: null
    });

    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(null);
    const [validation, setValidation] = useState(null);
    const [allowUploadDespiteErrors, setAllowUploadDespiteErrors] = useState(false);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setsheet((prevData) => ({
                ...prevData,
                file: file,
            }));
            // validate immediately
            validateSheetFile(file).then(res => setValidation(res)).catch(err => setValidation({ ok: false, error: String(err) }));
        }
    };

    const handleDownloadTemplate = () => {
        const headers = [
            ["No", "Enrolment No.", "Name", "A/L District", "Sex", "ADD1", "ADD2", "ADD3", "Address", "Date of Enrollment"]
        ];

        const ws = XLSX.utils.aoa_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Student Template");
        XLSX.writeFile(wb, "Student_Upload_Template.xlsx");
    };

    const normalizeHeader = (h) => (h || '').toString().toLowerCase().replace(/\W/g, '');

    const validateRow = (rowObj, rowIndex) => {
        const errors = [];
        const get = key => rowObj[key] ?? '';

        if (!String(get('enrolmentno') || get('enrollmentno')).trim()) errors.push({ row: rowIndex, col: 'Enrolment No', reason: 'missing' });

        const sex = String(get('sex')).trim().toLowerCase();
        if (sex && !['m', 'male', 'f', 'female', 'rev', 'reverend'].includes(sex)) errors.push({ row: rowIndex, col: 'Sex', reason: `invalid value: "${get('sex')}". Accepted: M, Male, F, Female, REV, Reverend` });

        const nic = String(get('nic')).trim();
        if (nic && !/^[A-Za-z0-9]{5,}$/i.test(nic)) errors.push({ row: rowIndex, col: 'NIC', reason: 'unexpected format' });

        const d = get('dateofenrolment') || get('dateofenrollment');
        if (d) {
            const parsed = new Date(d);
            if (isNaN(parsed.getTime())) errors.push({ row: rowIndex, col: 'Date of Enrolment', reason: 'invalid date' });
        }

        const dist = get('distancekm') || get('distance');
        if (dist !== undefined && dist !== '') {
            const n = Number(dist);
            if (isNaN(n) || n < 0) errors.push({ row: rowIndex, col: 'Distance (Km)', reason: 'invalid number' });
        }

        return errors;
    };

    const validateSheetFile = async (file) => {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!rows || rows.length === 0) return { ok: false, error: 'empty sheet' };

        const rawHeaders = rows[0].map(h => h === null || h === undefined ? '' : String(h));
        const headerMap = {};
        rawHeaders.forEach((h, i) => headerMap[normalizeHeader(h)] = i);

        const hasEnrolmentHeader = ('enrolmentno' in headerMap) || ('enrollmentno' in headerMap);
        if (!hasEnrolmentHeader) {
            return { ok: false, error: 'missing required headers', missingHeaders: ['Enrolment No'] };
        }

        const rowErrors = [];
        for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            const rowObj = {};
            for (const [norm, idx] of Object.entries(headerMap)) {
                rowObj[norm] = row[idx];
            }
            const errs = validateRow(rowObj, r + 1);
            if (errs.length) rowErrors.push(...errs);
        }

        const badCols = [...new Set(rowErrors.map(e => e.col))];
        return { ok: rowErrors.length === 0, rowErrors, badCols, totalRows: rows.length - 1 };
    };

    const headleUploadSheet = async () => {
        if (!sheet.file) {
            alert('Please select a file to upload.');
            return;
        }
        // ensure validation ran
        if (!validation) {
            setLoading(true);
            try {
                const resVal = await validateSheetFile(sheet.file);
                setValidation(resVal);
            } catch (err) {
                setValidation({ ok: false, error: String(err) });
            } finally {
                setLoading(false);
            }
        }

        if (validation && !validation.ok && !allowUploadDespiteErrors) {
            const proceed = window.confirm('Validation found issues in the sheet. Check message panel. Do you want to upload anyway?');
            if (!proceed) return;
        }

        const uploadId = Math.random().toString(36).substring(2, 15);
        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('file', sheet.file);

        setLoading(true);
        setProgress({ current: 0, total: 0 });

        let intervalId = setInterval(async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_APP_API}/student/upload-progress/${uploadId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.data.progress) {
                    setProgress(res.data.progress);
                }
            } catch (err) {
                console.log(err);
                // ignore polling errors
            }
        }, 1000);

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/student/create-student-sheet`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (res.data.Status === "Success") {
                const inserted = res.data.insertedCount ?? 0;
                const duplicated = res.data.duplicateCount ?? 0;
                alert(`${res.data.Message}\n\n- Successfully imported: ${inserted} students\n- Skipped (already exist): ${duplicated} students`);
                navigate('/Dashboard/Students');
            } else {
                alert(res.data.Error || "Upload failed");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred while uploading the sheet.");
        } finally {
            clearInterval(intervalId);
            setLoading(false);
            setProgress(null);
        }
    };

    return (
        <div className="p-6 mx-auto bg-white rounded-xl shadow-md">
            <div className="-mt-4 mb-4">
                <Link to={'/Dashboard/Students'}>
                    <DefaultBtn
                        type='button'
                        label='Back'
                    />
                </Link>
            </div>
            <h1 className="font-bold text-[#6b0f14] text-xl mb-4">Upload Student Sheet</h1>
            <div className="my-8">
                <p className="uppercase text-red-500 font-bold">important</p>

                <p className="">Please be Kind to wait when you uploading Student Sheet, </p>
                <p className="">After you Click Upload Button wait until Get "Upload Complete"</p>
                <p className="">The Uploading time will depend on your size of Sheet</p>
                <p className="text-red-500 font-bold">only 2000 recodes can upload via Sheet per Day</p>
            </div>

            <div className="mb-8 p-4 bg-gray-50 border rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Template Sheet</h2>
                        <p className="text-sm text-gray-600">Download the template or preview the required columns.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            className="px-4 py-2 text-sm font-medium text-[#6b0f14] bg-white border border-[#6b0f14] rounded hover:bg-[#6b0f14] hover:text-white transition"
                        >
                            {showPreview ? 'Hide Preview' : 'Preview Template'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="px-4 py-2 text-sm font-medium text-white bg-[#6b0f14] rounded hover:bg-[#4f0a0f] transition flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            Download Template
                        </button>
                    </div>
                </div>

                {showPreview && (
                    <div className="overflow-x-auto bg-white border rounded shadow-inner p-2">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                    <th className="px-3 py-2 border-b">No</th>
                                    <th className="px-3 py-2 border-b">Enrolment No.*</th>
                                    <th className="px-3 py-2 border-b">Name</th>
                                    <th className="px-3 py-2 border-b">A/L District</th>
                                    <th className="px-3 py-2 border-b">Sex</th>
                                    <th className="px-3 py-2 border-b">ADD1</th>
                                    <th className="px-3 py-2 border-b">ADD2</th>
                                    <th className="px-3 py-2 border-b">ADD3</th>
                                    <th className="px-3 py-2 border-b">Address</th>
                                    <th className="px-3 py-2 border-b">Date of Enrollment</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan="10" className="px-3 py-4 border-b text-center text-gray-500 italic">No data to display. Please populate this structure in your Excel file.</td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="mt-2 text-xs text-gray-500 italic">* Required field. Sex must be M, Male, F, Female, REV, or Reverend.</p>
                    </div>
                )}
            </div>

            <FileInput
                label="Select Excel File"
                name="studentSheet"
                onChange={handleImageChange}
                accept=".xlsx,.xls"
                required
            />

            {validation && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                    {!validation.ok && validation.error && (
                        <div className="text-sm text-red-700">Validation error: {validation.error}</div>
                    )}

                    {validation.missingHeaders && validation.missingHeaders.length > 0 && (
                        <div className="text-sm text-red-700">Missing required headers: {validation.missingHeaders.join(', ')}</div>
                    )}

                    {validation.badCols && validation.badCols.length > 0 && (
                        <div className="text-sm">Columns with invalid data: <strong>{validation.badCols.join(', ')}</strong></div>
                    )}

                    {validation.rowErrors && validation.rowErrors.length > 0 && (
                        <div className="mt-2 text-sm text-gray-700">
                            <div>Sample row errors (showing up to 10):</div>
                            <ul className="list-disc ml-5">
                                {validation.rowErrors.slice(0, 10).map((e, i) => (
                                    <li key={i}>Row {e.row} — {e.col}: {e.reason}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {!validation.ok && (
                        <div className="mt-2">
                            <label className="inline-flex items-center gap-2">
                                <input type="checkbox" checked={allowUploadDespiteErrors} onChange={e => setAllowUploadDespiteErrors(e.target.checked)} />
                                <span className="text-sm">I understand the risks and want to upload anyway</span>
                            </label>
                        </div>
                    )}
                </div>
            )}

            {loading && progress && progress.total > 0 && (
                <div className="mt-4 w-full">
                    <div className="flex justify-between text-sm font-medium mb-1 text-gray-700">
                        <span>Processing rows...</span>
                        <span>{progress.current} / {progress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                        ></div>
                    </div>
                </div>
            )}

            <button
                onClick={headleUploadSheet}
                disabled={loading}
                className="mt-3 w-full px-4 py-2 bg-[#6b0f14] text-white font-semibold rounded hover:bg-[#4f0a0f] transition disabled:opacity-50"
            >
                {loading ? (
                    <span className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        Uploading...
                    </span>
                ) : (
                    'Upload Sheet'
                )}
            </button>
        </div>
    );
};

export default StdCreateSheet;
