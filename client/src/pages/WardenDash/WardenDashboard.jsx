import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
    Users,
    BedDouble,
    DoorOpen,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Building2,
    ChevronRight,
    ArrowUpRight,
    RefreshCw,
    UserCheck,
    CreditCard,
    FileText,
    Wrench,
    Shield,
    Phone,
    MapPin,
    Calendar
} from 'lucide-react';
import { FaMale, FaFemale, FaUserTie } from 'react-icons/fa';
import { getUserInfoFromToken } from '../../utils/auth';
import { getStudentHomeTown } from '../../utils/studentUtils';

const WardenDashboard = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('login');
    const currentUser = useMemo(() => getUserInfoFromToken(), []);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Data states
    const [hostels, setHostels] = useState([]);
    const [selectedHostelId, setSelectedHostelId] = useState('');
    const [rooms, setRooms] = useState([]);
    const [wardenStudents, setWardenStudents] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [processingRequestId, setProcessingRequestId] = useState(null);

    // Table filters
    const [searchTerm, setSearchTerm] = useState('');
    const [residentFilter, setResidentFilter] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'UNASSIGNED'
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;

    const fetchDashboardData = async (isRefresh = false) => {
        if (!token) {
            setError('Unauthorized. Please log in.');
            setLoading(false);
            return;
        }

        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            // 1. Fetch warden students and assigned hostel info
            const studentsPromise = axios.get(
                `${import.meta.env.VITE_APP_API}/hostel/warden-students`,
                { headers: { Authorization: `Bearer ${token}` } }
            ).catch(err => ({ data: { Result: [], hostel: null, hostels: [] } }));

            // 2. Fetch warden rooms
            const roomsPromise = axios.get(
                `${import.meta.env.VITE_APP_API}/room/warden-Rooms`,
                { headers: { Authorization: `Bearer ${token}` } }
            ).catch(err => ({ data: { rooms: [] } }));

            // 3. Fetch student extra needs / pending requests
            const needsPromise = axios.get(
                `${import.meta.env.VITE_APP_API}/warden/std-extra-needs`,
                { headers: { Authorization: `Bearer ${token}` } }
            ).catch(err => ({ data: { Result: [] } }));

            // 4. Fetch current user data (fallback for hostels)
            const userProfilePromise = axios.get(
                `${import.meta.env.VITE_APP_API}/auth/get-currentuser-data`,
                { headers: { Authorization: `Bearer ${token}` } }
            ).catch(err => ({ data: {} }));

            const [studentsRes, roomsRes, needsRes, userProfileRes] = await Promise.all([
                studentsPromise,
                roomsPromise,
                needsPromise,
                userProfilePromise
            ]);

            // Hostels list
            const fetchedHostels =
                (studentsRes.data.hostels && studentsRes.data.hostels.length > 0)
                    ? studentsRes.data.hostels
                    : (userProfileRes.data?.Hostels && userProfileRes.data.Hostels.length > 0)
                        ? userProfileRes.data.Hostels
                        : studentsRes.data.hostel
                            ? [studentsRes.data.hostel]
                            : [];

            setHostels(fetchedHostels);
            if (fetchedHostels.length > 0 && !selectedHostelId) {
                const firstId = fetchedHostels[0]._id || fetchedHostels[0].id || fetchedHostels[0].hostelID;
                setSelectedHostelId(firstId);
            }

            // Students
            const rawStudents = studentsRes.data.Result || [];
            setWardenStudents(rawStudents);

            // Rooms
            const rawRooms = roomsRes.data.rooms || [];
            setRooms(rawRooms);

            // Pending requests
            const rawNeeds = needsRes.data.Result || [];
            setPendingRequests(rawNeeds);

        } catch (err) {
            console.error('Error loading warden dashboard data:', err);
            setError('Failed to load some dashboard metrics. Please refresh.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [token]);

    // Active hostel object
    const activeHostel = useMemo(() => {
        if (!hostels.length) return null;
        if (!selectedHostelId) return hostels[0];
        return hostels.find(h => (h._id === selectedHostelId || h.id === selectedHostelId || h.hostelID === selectedHostelId)) || hostels[0];
    }, [hostels, selectedHostelId]);

    // Filter rooms for selected hostel if multiple
    const activeRooms = useMemo(() => {
        if (!selectedHostelId || hostels.length <= 1) return rooms;
        return rooms.filter(r => {
            const hId = r.hostelID?._id || r.hostelID || '';
            return String(hId) === String(selectedHostelId);
        });
    }, [rooms, selectedHostelId, hostels]);

    // Compute Metrics
    const metrics = useMemo(() => {
        const totalRooms = activeRooms.length;
        const totalCapacity = activeRooms.reduce((sum, r) => sum + (Number(r.capasity) || 0), 0);
        const occupiedBeds = activeRooms.reduce((sum, r) => {
            const occupants = Number(r.currentOccupants) || (Array.isArray(r.students) ? r.students.length : 0);
            return sum + occupants;
        }, 0);
        const availableBeds = Math.max(0, totalCapacity - occupiedBeds);
        const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

        const maintenanceRooms = activeRooms.filter(r => r.status === 'Maintenance').length;
        const fullRooms = activeRooms.filter(r => {
            const occ = Number(r.currentOccupants) || (Array.isArray(r.students) ? r.students.length : 0);
            const cap = Number(r.capasity) || 1;
            return occ >= cap;
        }).length;
        const availableRooms = activeRooms.filter(r => {
            const occ = Number(r.currentOccupants) || (Array.isArray(r.students) ? r.students.length : 0);
            const cap = Number(r.capasity) || 1;
            return r.status !== 'Maintenance' && occ < cap;
        }).length;

        const pendingNeedsCount = pendingRequests.filter(req => req.decision === 'pending' || !req.decision).length;

        return {
            totalRooms,
            totalCapacity,
            occupiedBeds,
            availableBeds,
            occupancyRate,
            maintenanceRooms,
            fullRooms,
            availableRooms,
            pendingNeedsCount,
            totalAllocatedStudents: wardenStudents.length
        };
    }, [activeRooms, pendingRequests, wardenStudents]);

    // Handle approving/rejecting a pending student need directly
    const handleActionRequest = async (id, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
        setProcessingRequestId(id);
        try {
            const url = `${import.meta.env.VITE_APP_API}/warden/${action}-need/${id}`;
            await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });
            // Update local state
            setPendingRequests(prev => prev.map(req => req._id === id ? { ...req, decision: action === 'approve' ? 'approved' : 'rejected' } : req));
        } catch (err) {
            console.error(`Error trying to ${action} request:`, err);
            alert(`Failed to ${action} request. Please try from the Special Needs management page.`);
        } finally {
            setProcessingRequestId(null);
        }
    };

    // Filter resident students for table
    const filteredResidentStudents = useMemo(() => {
        return wardenStudents.filter(item => {
            const st = item.student || item;
            const allocations = item.allocations || [];
            const activeAlloc = allocations.find(a => a.active) || allocations[0];
            const hasRoom = Boolean(activeAlloc && activeAlloc.roomId);

            // Tab filter
            if (residentFilter === 'ASSIGNED' && !hasRoom) return false;
            if (residentFilter === 'UNASSIGNED' && hasRoom) return false;

            // Search filter
            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            const name = (st.name || '').toLowerCase();
            const enrol = (st.enrolmentNo || '').toLowerCase();
            const roomNo = String(activeAlloc?.roomId?.roomNo || activeAlloc?.roomId?.roomID || '').toLowerCase();
            const hometown = getStudentHomeTown(st).toLowerCase();

            return name.includes(term) || enrol.includes(term) || roomNo.includes(term) || hometown.includes(term);
        });
    }, [wardenStudents, residentFilter, searchTerm]);

    const totalPages = Math.ceil(filteredResidentStudents.length / pageSize) || 1;
    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredResidentStudents.slice(start, start + pageSize);
    }, [filteredResidentStudents, currentPage, pageSize]);

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8 space-y-6">
            {/* Top Greeting & Hostel Identity Banner */}
            <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
                    <Building2 size={260} />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-3 border border-white/10">
                            <Shield size={14} className="text-amber-300" />
                            HMS Warden Console
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            Welcome, {currentUser?.username || 'Warden'}
                        </h1>
                        <p className="text-white/80 text-sm md:text-base mt-1 max-w-2xl">
                            {activeHostel ? (
                                <span>
                                    Managing <strong className="text-amber-200">{activeHostel.name || activeHostel.hostelID}</strong>
                                    {activeHostel.gender && <span className="ml-2 uppercase text-xs px-2 py-0.5 rounded bg-black/20">({activeHostel.gender})</span>}
                                </span>
                            ) : (
                                'Oversee hostel rooms, resident student allocations, and daily student needs in one place.'
                            )}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* If multiple hostels assigned to warden */}
                        {hostels.length > 1 && (
                            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs">
                                <label className="block text-white/70 text-[10px] uppercase font-semibold mb-0.5">Switch Hostel</label>
                                <select
                                    value={selectedHostelId}
                                    onChange={(e) => setSelectedHostelId(e.target.value)}
                                    className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                                >
                                    {hostels.map(h => (
                                        <option key={h._id || h.hostelID} value={h._id || h.hostelID} className="text-gray-900">
                                            {h.name || h.hostelID}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 text-xs text-white/90 flex items-center gap-2">
                            <Calendar size={15} className="text-amber-300" />
                            <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => fetchDashboardData(true)}
                            disabled={refreshing}
                            className="bg-white/15 hover:bg-white/25 text-white p-2.5 rounded-xl transition-all border border-white/20 flex items-center justify-center disabled:opacity-50"
                            title="Refresh Dashboard Data"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Error notification if any */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </span>
                    <button onClick={() => fetchDashboardData(true)} className="text-xs font-semibold underline hover:no-underline">
                        Try Again
                    </button>
                </div>
            )}

            {/* Section 1: Hostel Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {/* Total Capacity */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Bed Capacity</p>
                            <h3 className="text-3xl font-extrabold text-gray-900 mt-2">
                                {loading ? '—' : metrics.totalCapacity}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                <span className="font-semibold text-gray-700">{metrics.totalRooms}</span> total rooms
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#6b0f14] flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
                            <BedDouble size={24} />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Hostel limit</span>
                        <span className="font-semibold text-gray-700">{activeHostel?.name || 'Assigned Hostel'}</span>
                    </div>
                </div>

                {/* Currently Allocated */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Resident Students</p>
                            <h3 className="text-3xl font-extrabold text-blue-900 mt-2">
                                {loading ? '—' : metrics.occupiedBeds}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                <span className="font-semibold text-blue-700">{metrics.occupancyRate}%</span> occupancy rate
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                            <Users size={24} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${metrics.occupancyRate > 90 ? 'bg-red-500' : metrics.occupancyRate > 75 ? 'bg-amber-500' : 'bg-blue-600'}`}
                                style={{ width: `${Math.min(100, metrics.occupancyRate)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Available Empty Beds */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Available Beds</p>
                            <h3 className="text-3xl font-extrabold text-emerald-700 mt-2">
                                {loading ? '—' : metrics.availableBeds}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                <span className="font-semibold text-emerald-700">{metrics.availableRooms}</span> rooms with space
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
                            <DoorOpen size={24} />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-500">Full rooms</span>
                        <span className="font-semibold text-gray-700">{metrics.fullRooms}</span>
                    </div>
                </div>

                {/* Maintenance & Pending Attention */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending Requests</p>
                            <h3 className="text-3xl font-extrabold text-amber-700 mt-2">
                                {loading ? '—' : metrics.pendingNeedsCount}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                <span className="font-semibold text-amber-700">{metrics.maintenanceRooms}</span> rooms in repair
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
                            <AlertCircle size={24} />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-500">Needs review</span>
                        <Link to="/Dashboard/StdExtraNeeds" className="text-amber-700 font-semibold hover:underline flex items-center gap-0.5">
                            Review <ChevronRight size={13} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Section 2: Quick Actions */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#6b0f14]" />
                        Warden Quick Actions
                    </h2>
                    <span className="text-xs text-gray-400">Shortcuts for daily hostel operations</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                    <Link
                        to="/Dashboard/WardenStudents"
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-[#fdf6e3] text-gray-700 hover:text-[#6b0f14] border border-gray-200/80 hover:border-amber-300 transition-all group text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#6b0f14] mb-2 group-hover:scale-110 transition-transform">
                            <Users size={20} />
                        </div>
                        <span className="text-xs font-semibold">Resident Students</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">View all residents</span>
                    </Link>

                    <Link
                        to="/Dashboard/WardenRooms"
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-[#fdf6e3] text-gray-700 hover:text-[#6b0f14] border border-gray-200/80 hover:border-amber-300 transition-all group text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#6b0f14] mb-2 group-hover:scale-110 transition-transform">
                            <DoorOpen size={20} />
                        </div>
                        <span className="text-xs font-semibold">Room Statuses</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">Capacity & repairs</span>
                    </Link>

                    <Link
                        to="/Dashboard/StudentdAssignNormal"
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-[#fdf6e3] text-gray-700 hover:text-[#6b0f14] border border-gray-200/80 hover:border-amber-300 transition-all group text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#6b0f14] mb-2 group-hover:scale-110 transition-transform">
                            <UserCheck size={20} />
                        </div>
                        <span className="text-xs font-semibold">Assign Rooms</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">Allocate to rooms</span>
                    </Link>

                    <Link
                        to="/Dashboard/StdExtraNeeds"
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-[#fdf6e3] text-gray-700 hover:text-[#6b0f14] border border-gray-200/80 hover:border-amber-300 transition-all group text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#6b0f14] mb-2 group-hover:scale-110 transition-transform">
                            <FileText size={20} />
                        </div>
                        <span className="text-xs font-semibold">Requests & Needs</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">Approve leave & needs</span>
                    </Link>

                    <Link
                        to="/Dashboard/WardenPayments"
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-[#fdf6e3] text-gray-700 hover:text-[#6b0f14] border border-gray-200/80 hover:border-amber-300 transition-all group text-center col-span-2 sm:col-span-1"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#6b0f14] mb-2 group-hover:scale-110 transition-transform">
                            <CreditCard size={20} />
                        </div>
                        <span className="text-xs font-semibold">Hostel Payments</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">Fee verification</span>
                    </Link>
                </div>
            </div>

            {/* Split Grid: Resident Students Table (Left) & Quick Notifications / Pending Requests (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left (2 cols): Resident Students Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <Users size={18} className="text-[#6b0f14]" />
                                    Resident Students
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Students assigned to {activeHostel?.name || 'this hostel'}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search student or room..."
                                        value={searchTerm}
                                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                        className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6b0f14] focus:bg-white transition-all w-44 md:w-52"
                                    />
                                </div>

                                <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium text-gray-600">
                                    <button
                                        type="button"
                                        onClick={() => { setResidentFilter('ALL'); setCurrentPage(1); }}
                                        className={`px-2.5 py-1 rounded-md transition-colors ${residentFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs font-semibold' : 'hover:text-gray-900'}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setResidentFilter('ASSIGNED'); setCurrentPage(1); }}
                                        className={`px-2.5 py-1 rounded-md transition-colors ${residentFilter === 'ASSIGNED' ? 'bg-white text-emerald-800 shadow-xs font-semibold' : 'hover:text-gray-900'}`}
                                    >
                                        In Room
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setResidentFilter('UNASSIGNED'); setCurrentPage(1); }}
                                        className={`px-2.5 py-1 rounded-md transition-colors ${residentFilter === 'UNASSIGNED' ? 'bg-white text-amber-800 shadow-xs font-semibold' : 'hover:text-gray-900'}`}
                                    >
                                        Pending Room
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-600">
                                <thead className="bg-[#fdf6e3] text-[#6b0f14] uppercase text-[11px] font-semibold border-b border-amber-100">
                                    <tr>
                                        <th className="py-3 px-4">#</th>
                                        <th className="py-3 px-4">Student</th>
                                        <th className="py-3 px-4">Enrolment No</th>
                                        <th className="py-3 px-4">Study Year</th>
                                        <th className="py-3 px-4">Room No</th>
                                        <th className="py-3 px-4">Home Town</th>
                                        <th className="py-3 px-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="py-8 text-center text-gray-400">
                                                Loading resident students...
                                            </td>
                                        </tr>
                                    ) : paginatedStudents.length > 0 ? (
                                        paginatedStudents.map((item, idx) => {
                                            const st = item.student || item;
                                            const allocations = item.allocations || [];
                                            const activeAlloc = allocations.find(a => a.active) || allocations[0];
                                            const roomLabel = activeAlloc?.roomId?.roomNo || activeAlloc?.roomId?.roomID || null;
                                            const hometown = getStudentHomeTown(st);

                                            return (
                                                <tr key={st._id || idx} className="hover:bg-[#fefaf0]/60 transition-colors">
                                                    <td className="py-3 px-4 font-medium text-gray-400">
                                                        {(currentPage - 1) * pageSize + idx + 1}
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            {st.sex === 'Female' ? (
                                                                <FaFemale className="text-pink-600 shrink-0" />
                                                            ) : st.sex === 'Male' ? (
                                                                <FaMale className="text-blue-600 shrink-0" />
                                                            ) : (
                                                                <FaUserTie className="text-gray-500 shrink-0" />
                                                            )}
                                                            <span className="truncate max-w-[150px]">{st.name || 'Unnamed Student'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono whitespace-nowrap text-gray-700">
                                                        {st.enrolmentNo || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                                            {st.studyYear || activeAlloc?.studyYear || '1st Year'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap font-medium">
                                                        {roomLabel ? (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                Room {roomLabel}
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                                                No Room
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                                                        {hometown || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                                        <Link
                                                            to={`/Dashboard/View-Student/${st._id}`}
                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6b0f14] hover:text-[#8d1820] bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200 transition-colors"
                                                        >
                                                            View
                                                            <ArrowUpRight size={12} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="py-8 text-center text-gray-400">
                                                No resident students found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination footer */}
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/40">
                        <span>
                            Showing <strong>{paginatedStudents.length}</strong> of <strong>{filteredResidentStudents.length}</strong> students
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-2.5 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                            >
                                Previous
                            </button>
                            <span className="px-2 text-gray-600 font-semibold">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-2.5 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right (1 col): Quick Notifications & Pending Requests */}
                <div className="space-y-6">
                    {/* Pending Requests Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-amber-600" />
                                    Pending Student Requests
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Special needs, room changes & requests</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                {metrics.pendingNeedsCount} Pending
                            </span>
                        </div>

                        <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
                            {pendingRequests.filter(r => r.decision === 'pending' || !r.decision).length > 0 ? (
                                pendingRequests
                                    .filter(r => r.decision === 'pending' || !r.decision)
                                    .slice(0, 5)
                                    .map(req => (
                                        <div
                                            key={req._id}
                                            className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50/80 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="font-mono text-xs font-bold text-gray-900">
                                                        {req.regNo || 'Student'}
                                                    </span>
                                                    <p className="text-xs text-gray-700 mt-1 font-medium leading-relaxed">
                                                        {req.needs}
                                                    </p>
                                                    {req.createdAt && (
                                                        <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                                            <Clock size={11} />
                                                            {new Date(req.createdAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-2.5 border-t border-amber-200/50 flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    disabled={processingRequestId === req._id}
                                                    onClick={() => handleActionRequest(req._id, 'reject')}
                                                    className="px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 rounded border border-red-200 transition-colors disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={processingRequestId === req._id}
                                                    onClick={() => handleActionRequest(req._id, 'approve')}
                                                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    ))
                            ) : (
                                <div className="py-8 text-center text-gray-400 text-xs">
                                    <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                                    No pending student requests for this hostel right now.
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                            <Link
                                to="/Dashboard/StdExtraNeeds"
                                className="text-xs font-semibold text-[#6b0f14] hover:underline inline-flex items-center gap-1"
                            >
                                Manage All Special Needs
                                <ArrowUpRight size={13} />
                            </Link>
                        </div>
                    </div>

                    {/* Hostel Capacity Distribution Summary */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                            <span>Hostel Occupancy Health</span>
                            <span className="text-xs text-gray-400">{activeRooms.length} Rooms</span>
                        </h3>

                        <div className="space-y-3 text-xs">
                            <div>
                                <div className="flex justify-between text-gray-600 mb-1">
                                    <span>Occupied Beds</span>
                                    <span className="font-semibold text-gray-900">{metrics.occupiedBeds} / {metrics.totalCapacity}</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-full rounded-full transition-all"
                                        style={{ width: `${Math.min(100, metrics.occupancyRate)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                                <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-emerald-900">
                                    <p className="text-[10px] uppercase font-semibold text-emerald-700">Available Beds</p>
                                    <p className="text-lg font-extrabold mt-0.5">{metrics.availableBeds}</p>
                                </div>
                                <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100 text-amber-900">
                                    <p className="text-[10px] uppercase font-semibold text-amber-700">Rooms in Repair</p>
                                    <p className="text-lg font-extrabold mt-0.5">{metrics.maintenanceRooms}</p>
                                </div>
                            </div>

                            <div className="pt-2 text-center">
                                <Link
                                    to="/Dashboard/WardenRooms"
                                    className="text-xs font-semibold text-[#6b0f14] hover:underline inline-flex items-center gap-1"
                                >
                                    Inspect Room Floor Plan
                                    <ArrowUpRight size={13} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WardenDashboard;

