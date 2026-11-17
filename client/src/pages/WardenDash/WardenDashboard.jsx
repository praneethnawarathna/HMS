import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
    Users,
    BedDouble,
    DoorOpen,
    AlertCircle,
    CheckCircle2,
    Clock,
    Search,
    Building2,
    ChevronRight,
    ArrowUpRight,
    RefreshCw,
    Wrench,
    Shield,
    Calendar,
    HeartPulse,
    CreditCard,
    ArrowRight,
    UserCheck,
    Layers
} from 'lucide-react';
import { FaMale, FaFemale, FaUserTie, FaMoneyBillWave, FaBed, FaTools, FaHeartbeat } from 'react-icons/fa';
import { getUserInfoFromToken } from '../../utils/auth';
import { getStudentHomeTown } from '../../utils/studentUtils';

// Helper to safely render primitives and prevent object-rendering crashes
const safeText = (val, fallback = '—') => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'object') {
        return val.enrolmentNo || val.name || val.fullName || val.roomID || val.roomNo || fallback;
    }
    const str = String(val).trim();
    return str.length > 0 ? str : fallback;
};

const safeNumber = (val, fallback = 0) => {
    const num = Number(val);
    return isNaN(num) ? fallback : num;
};

const safeArray = (val) => {
    return Array.isArray(val) ? val : [];
};

const getSafeHometown = (st) => {
    try {
        if (!st) return '—';
        if (typeof getStudentHomeTown === 'function') {
            const res = getStudentHomeTown(st);
            if (typeof res === 'string' && res.trim()) return res;
        }
        return safeText(st.address3 || st.address2 || st.alDistrict || '—');
    } catch {
        return '—';
    }
};

const WardenDashboard = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('login');
    const currentUser = useMemo(() => getUserInfoFromToken() || {}, []);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Data states
    const [hostels, setHostels] = useState([]);
    const [selectedHostelId, setSelectedHostelId] = useState('');
    const [rooms, setRooms] = useState([]);
    const [wardenStudents, setWardenStudents] = useState([]);
    const [extraNeedsList, setExtraNeedsList] = useState([]);

    // Table filters
    const [searchTerm, setSearchTerm] = useState('');
    const [residentFilter, setResidentFilter] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'UNASSIGNED'
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;

    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        if (!token) {
            setError('Unauthorized access. Please log in.');
            setLoading(false);
            return;
        }

        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            // Run all dashboard requests with safety catches so a single failure never crashes the board
            const [studentsRes, roomsRes, needsRes, userProfileRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_APP_API}/hostel/warden-students`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(err => {
                    console.warn('Warden students fetch notice:', err?.message);
                    return { data: { Result: [], hostel: null, hostels: [] } };
                }),

                axios.get(`${import.meta.env.VITE_APP_API}/room/warden-Rooms`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(err => {
                    console.warn('Warden rooms fetch notice:', err?.message);
                    return { data: { rooms: [] } };
                }),

                axios.get(`${import.meta.env.VITE_APP_API}/warden/std-extra-needs`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(err => {
                    console.warn('Warden extra needs fetch notice:', err?.message);
                    return { data: { Result: [] } };
                }),

                axios.get(`${import.meta.env.VITE_APP_API}/auth/get-currentuser-data`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(err => {
                    console.warn('User profile fetch notice:', err?.message);
                    return { data: {} };
                })
            ]);

            // Hostels resolution
            const sHostels = safeArray(studentsRes?.data?.hostels);
            const uHostels = safeArray(userProfileRes?.data?.Hostels);
            const singleHostel = studentsRes?.data?.hostel ? [studentsRes.data.hostel] : [];

            const resolvedHostels = sHostels.length > 0
                ? sHostels
                : uHostels.length > 0
                    ? uHostels
                    : singleHostel;

            setHostels(resolvedHostels);

            if (resolvedHostels.length > 0 && !selectedHostelId) {
                const firstId = resolvedHostels[0]?._id || resolvedHostels[0]?.id || resolvedHostels[0]?.hostelID || '';
                setSelectedHostelId(firstId);
            }

            // Students
            const rawStudents = safeArray(studentsRes?.data?.Result);
            setWardenStudents(rawStudents);

            // Rooms
            const rawRooms = safeArray(roomsRes?.data?.rooms);
            setRooms(rawRooms);

            // Needs
            const rawNeeds = safeArray(needsRes?.data?.Result);
            setExtraNeedsList(rawNeeds);

        } catch (err) {
            console.error('Critical dashboard load error:', err);
            setError('Could not refresh some dashboard stats. Showing available data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, selectedHostelId]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Active hostel object
    const activeHostel = useMemo(() => {
        if (!hostels.length) return null;
        if (!selectedHostelId) return hostels[0] || null;
        return hostels.find(h => {
            const hid = h?._id || h?.id || h?.hostelID || '';
            return String(hid) === String(selectedHostelId);
        }) || hostels[0] || null;
    }, [hostels, selectedHostelId]);

    // Active rooms for managed hostel
    const activeRooms = useMemo(() => {
        const roomArr = safeArray(rooms);
        if (!selectedHostelId || hostels.length <= 1) return roomArr;

        return roomArr.filter(r => {
            if (!r) return false;
            const hId = r.hostelID?._id || r.hostelID || '';
            return String(hId) === String(selectedHostelId);
        });
    }, [rooms, selectedHostelId, hostels.length]);

    // Compute Metrics safely
    const metrics = useMemo(() => {
        const totalRooms = activeRooms.length;
        const totalCapacity = activeRooms.reduce((sum, r) => sum + safeNumber(r?.capasity), 0);

        const occupiedBeds = activeRooms.reduce((sum, r) => {
            if (!r) return sum;
            const currentOcc = safeNumber(r.currentOccupants);
            const studentCount = safeArray(r.students).length;
            const occupants = currentOcc > 0 ? currentOcc : studentCount;
            return sum + occupants;
        }, 0);

        const availableBeds = Math.max(0, totalCapacity - occupiedBeds);
        const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

        const availableRooms = activeRooms.filter(r => {
            if (!r) return false;
            if (r.status === 'Maintenance') return false;
            const occ = safeNumber(r.currentOccupants) || safeArray(r.students).length;
            const cap = safeNumber(r.capasity, 1);
            return occ < cap;
        }).length;

        const fullRooms = activeRooms.filter(r => {
            if (!r) return false;
            const occ = safeNumber(r.currentOccupants) || safeArray(r.students).length;
            const cap = safeNumber(r.capasity, 1);
            return occ >= cap;
        }).length;

        // Categorize pending requests into Maintenance vs Medical
        const specialCategories = ['Special need', 'Medical', 'Sports', 'Illness/Medical Condition', 'Physical Disability', 'Allergy', 'Other'];

        let pendingMaintenance = 0;
        let pendingMedical = 0;

        safeArray(extraNeedsList).forEach(req => {
            if (!req) return;
            const status = (req.status || req.decision || '').toLowerCase();
            const isUnresolved = status === 'pending' || status === 'pending review' || status === 'in progress' || !status;

            if (isUnresolved) {
                const text = String(req.needs || '');
                const isMed = req.conditionType || (!req.issueCategory && !text.startsWith('[') && specialCategories.some(c => text.toLowerCase().includes(c.toLowerCase())));

                if (isMed) {
                    pendingMedical++;
                } else {
                    pendingMaintenance++;
                }
            }
        });

        return {
            totalRooms,
            totalCapacity,
            occupiedBeds,
            availableBeds,
            occupancyRate,
            availableRooms,
            fullRooms,
            pendingMaintenance,
            pendingMedical,
            totalPending: pendingMaintenance + pendingMedical,
            totalAllocatedResidents: safeArray(wardenStudents).length
        };
    }, [activeRooms, extraNeedsList, wardenStudents]);

    // Filter resident students safely
    const filteredResidentStudents = useMemo(() => {
        const studentList = safeArray(wardenStudents);

        return studentList.filter(item => {
            if (!item) return false;
            const st = item.student || item;
            const allocations = safeArray(item.allocations);
            const activeAlloc = allocations.find(a => a?.active) || allocations[0] || null;
            const hasRoom = Boolean(activeAlloc && activeAlloc.roomId);

            // Tab filter
            if (residentFilter === 'ASSIGNED' && !hasRoom) return false;
            if (residentFilter === 'UNASSIGNED' && hasRoom) return false;

            // Search filter
            if (!searchTerm.trim()) return true;
            const term = searchTerm.trim().toLowerCase();
            const name = safeText(st?.fullName || st?.name, '').toLowerCase();
            const enrol = safeText(st?.enrolmentNo, '').toLowerCase();
            const roomNo = safeText(activeAlloc?.roomId?.roomNo || activeAlloc?.roomId?.roomID, '').toLowerCase();
            const hometown = getSafeHometown(st).toLowerCase();

            return name.includes(term) || enrol.includes(term) || roomNo.includes(term) || hometown.includes(term);
        });
    }, [wardenStudents, residentFilter, searchTerm]);

    const totalPages = Math.ceil(filteredResidentStudents.length / pageSize) || 1;
    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredResidentStudents.slice(start, start + pageSize);
    }, [filteredResidentStudents, currentPage, pageSize]);

    // Loading State
    if (loading && !refreshing) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 space-y-4">
                <div className="w-12 h-12 border-4 border-[#6b0f14] border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                    <p className="text-base font-bold text-[#6b0f14]">Loading Warden Dashboard...</p>
                    <p className="text-xs text-gray-500 mt-1">Retrieving hostel capacity, room allocations, and resident records</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8 space-y-6">
            {/* 1. Top Welcome Banner */}
            <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
                    <Building2 size={260} />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-3 border border-white/10">
                            <Shield size={14} className="text-amber-300" />
                            HMS Warden Portal
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            Welcome, {safeText(currentUser?.username || currentUser?.name, 'Warden')}
                        </h1>
                        <p className="text-white/80 text-sm md:text-base mt-1 max-w-2xl">
                            Managing <strong className="text-amber-200 underline decoration-amber-300/40">{safeText(activeHostel?.name || activeHostel?.hostelID, 'Assigned Hostel')}</strong>
                            {activeHostel?.gender && (
                                <span className="ml-2 uppercase text-xs px-2 py-0.5 rounded-full bg-black/20 text-white/90 border border-white/10 font-bold">
                                    {safeText(activeHostel.gender)}
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {hostels.length > 1 && (
                            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs">
                                <label className="block text-white/70 text-[10px] uppercase font-semibold mb-0.5">Switch Hostel</label>
                                <select
                                    value={selectedHostelId}
                                    onChange={(e) => setSelectedHostelId(e.target.value)}
                                    className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                                >
                                    {hostels.map(h => (
                                        <option key={h?._id || h?.hostelID} value={h?._id || h?.hostelID} className="text-gray-900">
                                            {safeText(h?.name || h?.hostelID)}
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
                            className="bg-white/15 hover:bg-white/25 text-white p-2.5 rounded-xl transition-all border border-white/20 flex items-center justify-center disabled:opacity-50 cursor-pointer"
                            title="Refresh Dashboard Data"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Notification if any */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between shadow-xs">
                    <span className="flex items-center gap-2 font-medium">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </span>
                    <button
                        onClick={() => fetchDashboardData(true)}
                        className="text-xs font-bold underline hover:no-underline cursor-pointer"
                    >
                        Retry Fetch
                    </button>
                </div>
            )}

            {/* 2. Warden-Specific Summary Cards (Top Row) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. My Hostel Capacity */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">My Hostel Capacity</p>
                            <h3 className="text-3xl lg:text-4xl font-extrabold text-[#6b0f14] mt-2">
                                {metrics.totalCapacity} <span className="text-lg font-semibold text-gray-600">Beds</span>
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                                <span className="font-bold text-gray-800">{metrics.totalRooms}</span> total student rooms
                            </p>
                        </div>
                        <div className="w-13 h-13 rounded-2xl bg-amber-50 text-[#6b0f14] flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform shadow-xs">
                            <BedDouble size={26} />
                        </div>
                    </div>
                    <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Assigned Residence</span>
                        <span className="font-bold text-gray-800 truncate max-w-[160px]">{safeText(activeHostel?.name, 'Hall')}</span>
                    </div>
                </div>

                {/* 2. Occupied Beds */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Occupied Beds</p>
                            <h3 className="text-3xl lg:text-4xl font-extrabold text-blue-900 mt-2">
                                {metrics.occupiedBeds} <span className="text-lg font-semibold text-gray-600">Residents</span>
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                                <span className="font-bold text-blue-700">{metrics.occupancyRate}%</span> bed occupancy rate
                            </p>
                        </div>
                        <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform shadow-xs">
                            <Users size={26} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    metrics.occupancyRate > 90
                                        ? 'bg-rose-600'
                                        : metrics.occupancyRate > 75
                                        ? 'bg-amber-500'
                                        : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(100, metrics.occupancyRate)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Available Beds */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Available Beds</p>
                            <h3 className="text-3xl lg:text-4xl font-extrabold text-emerald-700 mt-2">
                                {metrics.availableBeds} <span className="text-lg font-semibold text-gray-600">Vacant</span>
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                                <span className="font-bold text-emerald-700">{metrics.availableRooms}</span> rooms with space available
                            </p>
                        </div>
                        <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform shadow-xs">
                            <DoorOpen size={26} />
                        </div>
                    </div>
                    <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Fully Occupied Rooms</span>
                        <span className="font-bold text-gray-800">{metrics.fullRooms} Rooms</span>
                    </div>
                </div>
            </div>

            {/* 3. Pending Actions / Alerts Section */}
            <div className="bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 rounded-2xl p-6 border border-amber-200/80 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-3 border-b border-amber-200/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <AlertCircle size={20} className="text-[#6b0f14]" />
                            <h2 className="text-lg font-bold text-gray-900">Pending Actions & Student Alerts</h2>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                            Unresolved student issues requiring warden acknowledgment or room adjustments.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#6b0f14] text-white">
                            {metrics.totalPending} Action Items
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Maintenance Counter Card */}
                    <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200/80">
                                    <Wrench size={22} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Pending Maintenance
                                    </div>
                                    <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
                                        {metrics.pendingMaintenance} <span className="text-sm font-medium text-gray-500">Extra Needs</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                            Room repairs, furniture damages, and plumbing/electrical faults reported by residents.
                        </p>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[11px] text-gray-500 font-medium">Room Maintenance Portal</span>
                            <Link
                                to="/Dashboard/StdExtraNeeds"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6b0f14] hover:bg-[#851319] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                            >
                                Review Maintenance
                                <ArrowRight size={13} />
                            </Link>
                        </div>
                    </div>

                    {/* Medical / Special Needs Counter Card */}
                    <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-red-50 text-[#6b0f14] flex items-center justify-center border border-red-100">
                                    <HeartPulse size={22} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Pending Medical
                                    </div>
                                    <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
                                        {metrics.pendingMedical} <span className="text-sm font-medium text-gray-500">Special Needs</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                            Medical requirements, physical disability accommodations, and ground-floor re-allocations.
                        </p>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[11px] text-gray-500 font-medium">Medical Records Portal</span>
                            <Link
                                to="/Dashboard/AdminCreateSpecialNeed"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6b0f14] hover:bg-[#851319] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                            >
                                Review Medical
                                <ArrowRight size={13} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Quick Action Shortcuts */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Layers size={18} className="text-[#6b0f14]" />
                            Warden Quick Actions
                        </h2>
                        <p className="text-xs text-gray-500">Essential shortcuts for hostel management tasks</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Shortcut 1: Manage Rooms */}
                    <Link
                        to="/Dashboard/WardenRooms"
                        className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-[#fefaf0] border border-gray-200/80 hover:border-amber-300 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#6b0f14] group-hover:scale-110 transition-transform">
                            <DoorOpen size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 group-hover:text-[#6b0f14] transition-colors">
                                Manage Rooms
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                                Inspect floor plans, capacities & repairs
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    {/* Shortcut 2: View Resident Students */}
                    <Link
                        to="/Dashboard/WardenStudents"
                        className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-[#fefaf0] border border-gray-200/80 hover:border-amber-300 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#6b0f14] group-hover:scale-110 transition-transform">
                            <Users size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 group-hover:text-[#6b0f14] transition-colors">
                                View Resident Students
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                                Full directory of allocated residents
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    {/* Shortcut 3: Manage Payments */}
                    <Link
                        to="/Dashboard/WardenPayments"
                        className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-[#fefaf0] border border-gray-200/80 hover:border-amber-300 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#6b0f14] group-hover:scale-110 transition-transform">
                            <CreditCard size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 group-hover:text-[#6b0f14] transition-colors">
                                Manage Payments
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                                Verify hall fees and collection logs
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>

            {/* 5. Resident Students Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                    <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Users size={18} className="text-[#6b0f14]" />
                                Resident Students Directory
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Students assigned to {safeText(activeHostel?.name, 'your hostel')}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Name, Enrollment No, Room..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6b0f14] focus:bg-white transition-all w-52 md:w-64"
                                />
                            </div>

                            <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium text-gray-600">
                                <button
                                    type="button"
                                    onClick={() => { setResidentFilter('ALL'); setCurrentPage(1); }}
                                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                                        residentFilter === 'ALL'
                                            ? 'bg-white text-gray-900 shadow-xs font-semibold'
                                            : 'hover:text-gray-900'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setResidentFilter('ASSIGNED'); setCurrentPage(1); }}
                                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                                        residentFilter === 'ASSIGNED'
                                            ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                                            : 'hover:text-gray-900'
                                    }`}
                                >
                                    In Room
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setResidentFilter('UNASSIGNED'); setCurrentPage(1); }}
                                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                                        residentFilter === 'UNASSIGNED'
                                            ? 'bg-white text-amber-800 shadow-xs font-semibold'
                                            : 'hover:text-gray-900'
                                    }`}
                                >
                                    Pending Room
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-600">
                            <thead className="bg-[#fefaf0] text-[#6b0f14] uppercase text-[11px] font-bold border-b border-amber-100">
                                <tr>
                                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                                    <th className="py-3.5 px-4">Student</th>
                                    <th className="py-3.5 px-4">Enrollment No</th>
                                    <th className="py-3.5 px-4">Room No</th>
                                    <th className="py-3.5 px-4">Study Year</th>
                                    <th className="py-3.5 px-4">Home Town</th>
                                    <th className="py-3.5 px-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-10 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center space-y-1">
                                                <Users size={32} className="text-gray-300" />
                                                <p className="font-semibold text-gray-700 mt-2">No resident students found</p>
                                                <p className="text-xs text-gray-400">
                                                    {searchTerm ? `No records matching "${searchTerm}"` : 'No resident records assigned to this hostel.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedStudents.map((item, idx) => {
                                        const st = item?.student || item || {};
                                        const allocations = safeArray(item?.allocations);
                                        const activeAlloc = allocations.find(a => a?.active) || allocations[0] || null;
                                        const roomLabel = safeText(activeAlloc?.roomId?.roomNo || activeAlloc?.roomId?.roomID, null);
                                        const hometown = getSafeHometown(st);
                                        const studentId = st?._id || '';

                                        return (
                                            <tr key={studentId || idx} className="hover:bg-[#fefaf0]/60 transition-colors">
                                                <td className="py-3.5 px-4 text-center font-medium text-gray-400">
                                                    {(currentPage - 1) * pageSize + idx + 1}
                                                </td>
                                                <td className="py-3.5 px-4 font-semibold text-gray-900 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        {st.sex === 'Female' ? (
                                                            <FaFemale className="text-pink-600 shrink-0 text-sm" />
                                                        ) : st.sex === 'Male' ? (
                                                            <FaMale className="text-blue-600 shrink-0 text-sm" />
                                                        ) : (
                                                            <FaUserTie className="text-gray-500 shrink-0 text-sm" />
                                                        )}
                                                        <span className="truncate max-w-[170px]">
                                                            {safeText(st.name || st.fullName, 'Unnamed Student')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap text-gray-800">
                                                    {safeText(st.enrolmentNo)}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap font-medium">
                                                    {roomLabel ? (
                                                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                            Room {roomLabel}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                                            Pending Room
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                                                        {safeText(st.studyYear || activeAlloc?.studyYear, '1st Year')}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 font-medium">
                                                    {hometown}
                                                </td>
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    {studentId ? (
                                                        <Link
                                                            to={`/Dashboard/View-Student/${studentId}`}
                                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6b0f14] hover:text-[#8d1820] bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                                                        >
                                                            View
                                                            <ArrowUpRight size={12} />
                                                        </Link>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination footer */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
                        <span>
                            Showing <strong>{paginatedStudents.length}</strong> of <strong>{filteredResidentStudents.length}</strong> residents
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all cursor-pointer"
                            >
                                Previous
                            </button>
                            <span className="px-2 text-gray-700 font-bold">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-3 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all cursor-pointer"
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

export default WardenDashboard;
