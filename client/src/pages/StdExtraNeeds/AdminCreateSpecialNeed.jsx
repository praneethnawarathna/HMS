import axios from 'axios';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DefaultInput from '../../components/Form/DefaultInput';
import DefaultBtn from '../../components/Buttons/DefaultBtn';
import { getUserInfoFromToken } from '../../utils/auth';
import StudentSpecialNeed from '../StudentDash/StudentSpecialNeed';
import {
    HeartPulse,
    Search,
    CheckCircle2,
    Clock,
    AlertCircle,
    Save,
    RotateCw,
    Building2,
    DoorClosed,
    Filter,
    Shield,
    Activity,
    AlertTriangle,
    PlusCircle
} from 'lucide-react';

const MEDICAL_STATUS_OPTIONS = [
    'Pending Review',
    'Reviewed/Noted',
    'Room Re-allocation Required'
];

const AdminCreateSpecialNeed = ({ hideHeader = false }) => {
    const [enrolmentNo, setEnrolmentNo] = useState('');
    const [category, setCategory] = useState('Special need');
    const [remark, setRemark] = useState('');
    const [addingLoading, setAddingLoading] = useState(false);
    const [existingNeeds, setExistingNeeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [updatingId, setUpdatingId] = useState(null);
    const [statusMap, setStatusMap] = useState({});
    const [feedbackMessage, setFeedbackMessage] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const token = localStorage.getItem('login');

    const userInfo = getUserInfoFromToken();
    const rawRoles = userInfo?.roles || [];
    const roleNames = Array.isArray(rawRoles)
        ? rawRoles.map(r => (typeof r === 'string' ? r : r.name))
        : [typeof rawRoles === 'string' ? rawRoles : rawRoles?.name];
    const isWarden = roleNames.includes('warden');
    const isStudent = roleNames.includes('student');

    // If the logged in user is a student, render the student-facing medical & health requirements view
    if (isStudent) {
        return <StudentSpecialNeed />;
    }

    const normalizeMedicalStatus = (item) => {
        if (item.status && MEDICAL_STATUS_OPTIONS.includes(item.status)) {
            return item.status;
        }
        const dec = (item.decision || '').toLowerCase();
        if (dec.includes('reallocation') || dec.includes('re-allocation')) {
            return 'Room Re-allocation Required';
        }
        if (dec === 'approved' || dec === 'reviewed' || item.isAccpeted) {
            return 'Reviewed/Noted';
        }
        return 'Pending Review';
    };

    const fetchNeeds = useCallback(async () => {
        setLoading(true);
        try {
            // Wardens fetch hostel-specific records; Admins fetch system-wide records
            const endpoint = isWarden ? '/warden/std-extra-needs' : '/admin/student-extra-needs';
            const res = await axios.get(`${import.meta.env.VITE_APP_API}${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && (res.data.Result || res.data.Data)) {
                const rawList = res.data.Result || res.data.Data || [];
                const validCategories = [
                    'Special need',
                    'Medical',
                    'Sports',
                    'Illness/Medical Condition',
                    'Physical Disability',
                    'Allergy',
                    'Other'
                ];

                const medicalRecords = rawList.filter(item => {
                    if (item.conditionType) return true;
                    if (item.issueCategory) return false;
                    const text = item.needs || '';
                    if (text.startsWith('[')) return false;
                    return validCategories.includes(item.needs) || validCategories.some(c => text.toLowerCase().includes(c.toLowerCase()));
                });

                setExistingNeeds(medicalRecords);

                const initialStatuses = {};
                medicalRecords.forEach(item => {
                    initialStatuses[item._id] = normalizeMedicalStatus(item);
                });
                setStatusMap(initialStatuses);
            } else {
                setExistingNeeds([]);
            }
        } catch (err) {
            console.error('Error fetching special needs:', err);
            setFeedbackMessage({ type: 'error', text: 'Failed to load special needs records.' });
        } finally {
            setLoading(false);
        }
    }, [token, isWarden]);

    useEffect(() => {
        fetchNeeds();
    }, [fetchNeeds]);

    const handleStatusDropdownChange = (id, newStatus) => {
        setStatusMap(prev => ({
            ...prev,
            [id]: newStatus
        }));
    };

    const handleUpdateStatus = async (item) => {
        const id = item._id;
        const newStatus = statusMap[id] || normalizeMedicalStatus(item);
        setUpdatingId(id);
        setFeedbackMessage(null);

        try {
            const endpoint = isWarden ? '/warden/update-need-status/' : '/admin/update-need-status/';
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}${endpoint}${id}`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data?.Status === 'Success') {
                const studentIdentifier = item.enrolmentNo || item.regNo?.enrolmentNo || 'student';
                setFeedbackMessage({
                    type: 'success',
                    text: `Status for ${studentIdentifier} updated to "${newStatus}".`
                });

                setExistingNeeds(prev => prev.map(n => n._id === id ? { ...n, status: newStatus, decision: newStatus } : n));
            } else {
                setFeedbackMessage({
                    type: 'error',
                    text: res.data?.Error || 'Failed to update status.'
                });
            }
        } catch (err) {
            console.error('Error updating status:', err);
            setFeedbackMessage({
                type: 'error',
                text: err.response?.data?.Error || err.response?.data?.message || 'Server error while updating status.'
            });
        } finally {
            setUpdatingId(null);
            setTimeout(() => setFeedbackMessage(null), 4000);
        }
    };

    const handleAdminAddSubmit = async (e) => {
        e.preventDefault();

        const cleanEnrol = (enrolmentNo || '').trim();
        if (!cleanEnrol) {
            alert('Enrollment No is required');
            return;
        }

        // University of Peradeniya format requires slashes (e.g. M/20/175, E/21/002, A/19/250)
        if (!cleanEnrol.includes('/') || !/^[A-Za-z]+(?:\/[A-Za-z0-9]+)+\/\d+$/.test(cleanEnrol)) {
            alert('Please enter a valid University of Peradeniya Enrollment Number containing slashes (e.g., M/20/175)');
            return;
        }

        setAddingLoading(true);
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/admin/add-special-need`,
                { enrolmentNo: cleanEnrol, category, remark },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.Status === 'Success') {
                setFeedbackMessage({ type: 'success', text: res.data.Message || 'Special need added successfully.' });
                setEnrolmentNo('');
                setCategory('Special need');
                setRemark('');
                fetchNeeds();
            } else {
                alert(res.data.Error || 'Failed to add special need');
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.Error || 'An error occurred');
        } finally {
            setAddingLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        return existingNeeds.filter(item => {
            const enrol = (item.enrolmentNo || item.regNo?.enrolmentNo || item.email || '').toLowerCase();
            const matchesSearch = enrol.includes(searchTerm.trim().toLowerCase());

            const currentStatus = statusMap[item._id] || normalizeMedicalStatus(item);
            const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [existingNeeds, searchTerm, statusFilter, statusMap]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const stats = useMemo(() => {
        const total = existingNeeds.length;
        let pending = 0;
        let reviewed = 0;
        let reallocation = 0;

        existingNeeds.forEach(item => {
            const st = statusMap[item._id] || normalizeMedicalStatus(item);
            if (st === 'Pending Review') pending++;
            else if (st === 'Reviewed/Noted') reviewed++;
            else if (st === 'Room Re-allocation Required') reallocation++;
        });

        return { total, pending, reviewed, reallocation };
    }, [existingNeeds, statusMap]);

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            {!hideHeader && (
                <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-2 border border-white/10">
                                <Shield size={14} className="text-amber-300" />
                                {isWarden ? 'Warden Medical Portal' : 'Admin Health & Special Needs Management'}
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
                                <HeartPulse className="text-amber-300" size={28} />
                                Special Needs (Medical Records)
                            </h1>
                            <p className="text-white/80 text-sm mt-1">
                                Acknowledge medical conditions, manage accessibility requirements, and flag students requiring ground-floor room re-allocations.
                            </p>
                        </div>

                        <button
                            onClick={fetchNeeds}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold border border-white/15 transition-all self-start md:self-auto cursor-pointer"
                        >
                            <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Records</div>
                    <div className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-sm bg-amber-50/30">
                    <div className="text-xs text-amber-700 font-medium uppercase tracking-wider">Pending Review</div>
                    <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200/60 shadow-sm bg-emerald-50/30">
                    <div className="text-xs text-emerald-700 font-medium uppercase tracking-wider">Reviewed / Noted</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.reviewed}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-purple-200/60 shadow-sm bg-purple-50/30">
                    <div className="text-xs text-purple-700 font-medium uppercase tracking-wider">Re-allocation Needed</div>
                    <div className="text-2xl font-bold text-purple-700 mt-1">{stats.reallocation}</div>
                </div>
            </div>

            {/* Admin Add Special Need Form (Only for Admin/Director) */}
            {!isWarden && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                        <PlusCircle size={20} className="text-[#6b0f14]" />
                        <h2 className="text-lg font-bold text-[#6b0f14]">Add Pre-Approved Special Need Student</h2>
                    </div>

                    <form onSubmit={handleAdminAddSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <DefaultInput
                                label="Student Enrollment No."
                                name="enrolmentNo"
                                value={enrolmentNo}
                                onChange={(e) => setEnrolmentNo(e.target.value)}
                                placeholder="e.g., M/20/175"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Medical Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6b0f14] focus:border-transparent outline-none transition-all text-sm"
                                required
                            >
                                <option value="Special need">Special Need</option>
                                <option value="Medical">Medical</option>
                                <option value="Illness/Medical Condition">Illness/Medical Condition</option>
                                <option value="Physical Disability">Physical Disability</option>
                                <option value="Allergy">Allergy</option>
                                <option value="Sports">Sports</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Remark / Accommodation Notes</label>
                            <input
                                type="text"
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6b0f14] focus:border-transparent outline-none transition-all text-sm"
                                placeholder="e.g. Asthma patient, mobility impaired, ground floor required..."
                            />
                        </div>

                        <div className="md:col-span-3 flex justify-end">
                            <DefaultBtn
                                type="submit"
                                label={addingLoading ? 'Adding...' : 'Add Student to Special Needs'}
                                disabled={addingLoading}
                            />
                        </div>
                    </form>
                </div>
            )}

            {/* Feedback alert */}
            {feedbackMessage && (
                <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${
                    feedbackMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                    {feedbackMessage.type === 'success' ? (
                        <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                        <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">{feedbackMessage.text}</span>
                </div>
            )}

            {/* Controls Bar: Search & Status Filter */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                <div className="flex-1 max-w-md relative">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                        Search by Enrollment No
                    </label>
                    <div className="relative">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search by Enrollment No (e.g., M/20/175)"
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#6b0f14] focus:border-transparent outline-none transition-all placeholder-gray-400"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status:</span>
                    <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200 text-xs font-medium">
                        {['ALL', 'Pending Review', 'Reviewed/Noted', 'Room Re-allocation Required'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => {
                                    setStatusFilter(filter);
                                    setCurrentPage(1);
                                }}
                                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                    statusFilter === filter
                                        ? 'bg-white text-[#6b0f14] font-bold shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {filter === 'Room Re-allocation Required' ? 'Re-allocation' : filter}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Medical Records Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#fefaf0] text-[#6b0f14] text-xs font-bold uppercase tracking-wider border-b border-[#f5e6d3]">
                            <tr>
                                <th className="px-5 py-4 w-12 text-center">#</th>
                                <th className="px-5 py-4">Enrollment No</th>
                                <th className="px-5 py-4">Current Room</th>
                                <th className="px-5 py-4">Medical Category</th>
                                <th className="px-5 py-4 min-w-[220px]">Remark / Description</th>
                                <th className="px-5 py-4 min-w-[190px]">Status</th>
                                <th className="px-5 py-4 text-center w-36">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <div className="w-8 h-8 border-4 border-[#6b0f14] border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-sm font-medium">Loading medical and special needs records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center space-y-1">
                                            <HeartPulse size={32} className="text-gray-300" />
                                            <p className="font-semibold text-gray-700 mt-2">No medical records found</p>
                                            <p className="text-xs text-gray-400">
                                                {searchTerm ? `No records matching "${searchTerm}"` : 'No student special needs submitted.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((item, index) => {
                                    const enrolmentNo = item.enrolmentNo || item.regNo?.enrolmentNo || item.regNo?.email || item.email || 'N/A';
                                    const roomNo = item.roomNo || item.room_no || item.roomId?.roomID || item.roomId?.roomNo || '-';
                                    const categoryLabel = item.conditionType || item.needs || 'Special Need';
                                    const descriptionText = item.remark || item.needs || '-';
                                    const currentStatus = statusMap[item._id] || normalizeMedicalStatus(item);
                                    const isUpdating = updatingId === item._id;
                                    const isReallocation = currentStatus === 'Room Re-allocation Required';

                                    return (
                                        <tr key={item._id} className={`hover:bg-[#fefaf0]/60 transition-colors ${isReallocation ? 'bg-purple-50/20' : ''}`}>
                                            <td className="px-5 py-4 text-center font-medium text-gray-400 text-xs">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="px-5 py-4 font-bold text-gray-800 whitespace-nowrap">
                                                <div>{enrolmentNo}</div>
                                                {item.hostelName && (
                                                    <div className="text-[11px] text-gray-400 font-normal">
                                                        {item.hostelName}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 font-semibold rounded-lg text-xs border border-gray-200">
                                                    <DoorClosed size={12} className="text-gray-500" />
                                                    {roomNo}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-[#6b0f14] border border-red-200 rounded-lg text-xs font-semibold">
                                                    <HeartPulse size={12} className="text-[#6b0f14]" />
                                                    {categoryLabel}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-gray-600 text-xs leading-relaxed max-w-sm">
                                                <div className="line-clamp-2" title={descriptionText}>
                                                    {descriptionText}
                                                </div>
                                                {isReallocation && (
                                                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 mt-1 bg-purple-100 px-2 py-0.5 rounded">
                                                        <AlertTriangle size={11} /> Ground-floor / accessibility room needed
                                                    </div>
                                                )}
                                                <div className="text-[11px] text-gray-400 mt-1">
                                                    Submitted: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <select
                                                    value={currentStatus}
                                                    onChange={(e) => handleStatusDropdownChange(item._id, e.target.value)}
                                                    className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg border outline-none transition-all cursor-pointer ${
                                                        currentStatus === 'Room Re-allocation Required'
                                                            ? 'bg-purple-50 text-purple-900 border-purple-300 focus:ring-purple-500 font-bold'
                                                            : currentStatus === 'Reviewed/Noted'
                                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-500'
                                                            : 'bg-amber-50 text-amber-800 border-amber-300 focus:ring-amber-500'
                                                    }`}
                                                >
                                                    {MEDICAL_STATUS_OPTIONS.map(opt => (
                                                        <option key={opt} value={opt} className="bg-white text-gray-800">
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <button
                                                    onClick={() => handleUpdateStatus(item)}
                                                    disabled={isUpdating}
                                                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-[#6b0f14] hover:bg-[#851319] text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer w-full whitespace-nowrap"
                                                >
                                                    {isUpdating ? (
                                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <>
                                                            <Save size={13} />
                                                            Update Status
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                        <div>
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-all font-medium cursor-pointer"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1.5 font-bold text-[#6b0f14]">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-all font-medium cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminCreateSpecialNeed;
