import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
    Wrench,
    Search,
    CheckCircle2,
    Clock,
    AlertCircle,
    Save,
    RotateCw,
    Building2,
    DoorClosed,
    Filter,
    Shield
} from 'lucide-react';
import { getUserInfoFromToken } from '../../utils/auth';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Resolved'];

const StdExtraNeeds = () => {
    const [extraNeeds, setExtraNeeds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState(null);
    const [statusMap, setStatusMap] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const token = localStorage.getItem('login');
    const userInfo = useMemo(() => getUserInfoFromToken() || {}, []);

    // Normalize initial status to one of the 3 maintenance options
    const normalizeMaintenanceStatus = (item) => {
        if (item.status && STATUS_OPTIONS.includes(item.status)) {
            return item.status;
        }
        const dec = (item.decision || '').toLowerCase();
        if (dec === 'resolved' || dec === 'approved') return 'In Progress';
        if (dec === 'rejected') return 'Resolved';
        return 'Pending';
    };

    const fetchNeeds = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_APP_API}/warden/std-extra-needs`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.Result) {
                // Filter maintenance requests (exclude medical / special needs)
                const specialCategories = ['Special need', 'Medical', 'Sports', 'Illness/Medical Condition', 'Physical Disability', 'Allergy', 'Other'];
                const maintenanceOnly = res.data.Result.filter(item => {
                    if (item.issueCategory) return true;
                    if (item.conditionType) return false;
                    const text = item.needs || '';
                    if (text.startsWith('[')) return true;
                    return !specialCategories.includes(item.needs);
                });

                setExtraNeeds(maintenanceOnly);

                // Initialize local status state for each row
                const initialStatuses = {};
                maintenanceOnly.forEach(item => {
                    initialStatuses[item._id] = normalizeMaintenanceStatus(item);
                });
                setStatusMap(initialStatuses);
            } else {
                setExtraNeeds([]);
            }
        } catch (err) {
            console.error('Error fetching student extra needs:', err);
            setFeedbackMessage({ type: 'error', text: 'Failed to load maintenance requests.' });
        } finally {
            setLoading(false);
        }
    }, [token]);

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
        const newStatus = statusMap[id] || normalizeMaintenanceStatus(item);
        setUpdatingId(id);
        setFeedbackMessage(null);

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/warden/update-need-status/${id}`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data?.Status === 'Success') {
                setFeedbackMessage({
                    type: 'success',
                    text: `Status for ${item.enrolmentNo || item.regNo?.enrolmentNo || 'student'} updated to "${newStatus}".`
                });

                // Update the local item
                setExtraNeeds(prev => prev.map(n => n._id === id ? { ...n, status: newStatus, decision: newStatus } : n));
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

    // Helper to parse Issue Category and Description cleanly
    const parseIssueDetails = (item) => {
        let category = item.issueCategory;
        let description = item.remark || '';
        const rawNeeds = item.needs || '';

        if (!category) {
            const match = rawNeeds.match(/^\[(.*?)\]\s*(.*)$/);
            if (match) {
                category = match[1];
                if (!description) description = match[2];
            } else {
                category = 'General Hostel Issue';
                if (!description) description = rawNeeds;
            }
        }

        if (!description) description = rawNeeds;
        return { category, description };
    };

    // Filter by Enrollment Number and Status
    const filteredData = useMemo(() => {
        return extraNeeds.filter(item => {
            const enrol = (item.enrolmentNo || item.regNo?.enrolmentNo || '').toLowerCase();
            const matchesSearch = enrol.includes(searchTerm.trim().toLowerCase());

            const currentStatus = statusMap[item._id] || normalizeMaintenanceStatus(item);
            const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [extraNeeds, searchTerm, statusFilter, statusMap]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    // Quick stats
    const stats = useMemo(() => {
        const total = extraNeeds.length;
        let pending = 0;
        let inProgress = 0;
        let resolved = 0;

        extraNeeds.forEach(item => {
            const st = statusMap[item._id] || normalizeMaintenanceStatus(item);
            if (st === 'Pending') pending++;
            else if (st === 'In Progress') inProgress++;
            else if (st === 'Resolved') resolved++;
        });

        return { total, pending, inProgress, resolved };
    }, [extraNeeds, statusMap]);

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-2 border border-white/10">
                            <Shield size={14} className="text-amber-300" />
                            Warden Management Console
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
                            <Wrench className="text-amber-300" size={28} />
                            Extra Needs (Maintenance Requests)
                        </h1>
                        <p className="text-white/80 text-sm mt-1">
                            Review room maintenance tickets, update repair progress, and mark issues resolved for your hostel.
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

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Requests</div>
                    <div className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-sm bg-amber-50/30">
                    <div className="text-xs text-amber-700 font-medium uppercase tracking-wider">Pending</div>
                    <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-200/60 shadow-sm bg-blue-50/30">
                    <div className="text-xs text-blue-700 font-medium uppercase tracking-wider">In Progress</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200/60 shadow-sm bg-emerald-50/30">
                    <div className="text-xs text-emerald-700 font-medium uppercase tracking-wider">Resolved</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.resolved}</div>
                </div>
            </div>

            {/* Feedback notification */}
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
                        {['ALL', 'Pending', 'In Progress', 'Resolved'].map(filter => (
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
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#fefaf0] text-[#6b0f14] text-xs font-bold uppercase tracking-wider border-b border-[#f5e6d3]">
                            <tr>
                                <th className="px-5 py-4 w-12 text-center">#</th>
                                <th className="px-5 py-4">Enrollment No</th>
                                <th className="px-5 py-4">Room No</th>
                                <th className="px-5 py-4">Issue Category</th>
                                <th className="px-5 py-4 min-w-[220px]">Description</th>
                                <th className="px-5 py-4 min-w-[150px]">Status</th>
                                <th className="px-5 py-4 text-center w-28">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <div className="w-8 h-8 border-4 border-[#6b0f14] border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-sm font-medium">Loading maintenance requests...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center space-y-1">
                                            <Wrench size={32} className="text-gray-300" />
                                            <p className="font-semibold text-gray-700 mt-2">No maintenance requests found</p>
                                            <p className="text-xs text-gray-400">
                                                {searchTerm ? `No results matching "${searchTerm}"` : 'No submitted student requests.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((item, index) => {
                                    const { category, description } = parseIssueDetails(item);
                                    const enrolmentNo = item.enrolmentNo || item.regNo?.enrolmentNo || item.regNo?.email || 'N/A';
                                    const roomNo = item.roomNo || item.room_no || item.roomId?.roomID || item.roomId?.roomNo || '-';
                                    const currentStatus = statusMap[item._id] || normalizeMaintenanceStatus(item);
                                    const isUpdating = updatingId === item._id;

                                    return (
                                        <tr key={item._id} className="hover:bg-[#fefaf0]/60 transition-colors">
                                            <td className="px-5 py-4 text-center font-medium text-gray-400 text-xs">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="px-5 py-4 font-bold text-gray-800 whitespace-nowrap">
                                                {enrolmentNo}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 font-semibold rounded-lg text-xs border border-gray-200">
                                                    <DoorClosed size={12} className="text-gray-500" />
                                                    {roomNo}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold">
                                                    {category}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-gray-600 text-xs leading-relaxed max-w-sm">
                                                <div className="line-clamp-2" title={description}>
                                                    {description || '-'}
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-1">
                                                    Submitted: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <select
                                                    value={currentStatus}
                                                    onChange={(e) => handleStatusDropdownChange(item._id, e.target.value)}
                                                    className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg border outline-none transition-all cursor-pointer ${
                                                        currentStatus === 'Resolved'
                                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-500'
                                                            : currentStatus === 'In Progress'
                                                            ? 'bg-blue-50 text-blue-800 border-blue-300 focus:ring-blue-500'
                                                            : 'bg-amber-50 text-amber-800 border-amber-300 focus:ring-amber-500'
                                                    }`}
                                                >
                                                    {STATUS_OPTIONS.map(opt => (
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
                                                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-[#6b0f14] hover:bg-[#851319] text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer w-full"
                                                >
                                                    {isUpdating ? (
                                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <>
                                                            <Save size={13} />
                                                            Update
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

export default StdExtraNeeds;
