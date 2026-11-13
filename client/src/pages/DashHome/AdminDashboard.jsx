import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
    Users,
    Building2,
    BedDouble,
    Clock,
    UploadCloud,
    UserPlus,
    FileSpreadsheet,
    BarChart3,
    PieChart as PieChartIcon,
    ArrowUpRight,
    CheckCircle2,
    AlertCircle,
    Calendar,
    RefreshCw,
    Search,
    ShieldCheck,
    Layers,
    DoorOpen,
    Activity,
    ChevronRight
} from 'lucide-react';
import { FaMale, FaFemale, FaUserTie } from 'react-icons/fa';
import { getUserInfoFromToken } from '../../utils/auth';

const AdminDashboard = () => {
    const token = localStorage.getItem('login');
    const userInfo = useMemo(() => getUserInfoFromToken() || {}, []);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Data collections
    const [students, setStudents] = useState([]);
    const [hostels, setHostels] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activityFilter, setActivityFilter] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'UPLOADED' | 'EDITED'

    const fetchAllData = async (isRefresh = false) => {
        if (!token) return;
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const [stdRes, hstRes, roomRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_APP_API}/student/get-all-students-auth`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: { Result: [] } })),

                axios.get(`${import.meta.env.VITE_APP_API}/hostel/get-all-hostels`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: { Result: [] } })),

                axios.get(`${import.meta.env.VITE_APP_API}/room/get-all-rooms`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: { Result: [] } })),
            ]);

            setStudents(Array.isArray(stdRes.data.Result) ? stdRes.data.Result : []);
            setHostels(Array.isArray(hstRes.data.Result) ? hstRes.data.Result : []);
            setRooms(Array.isArray(roomRes.data.Result) ? roomRes.data.Result : []);
        } catch (err) {
            console.error('Error fetching admin dashboard data:', err);
            setError('Failed to load some dashboard statistics. Please refresh.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [token]);

    // Helper to test if a student has an active hostel assignment
    const isAssigned = (s) => {
        if (!s) return false;
        if (s.isAssign === true) return true;
        if (s.hostelName && s.hostelName !== 'Not Assigned') return true;
        if (s.hostelId) return true;
        if (Array.isArray(s.hostelAllocations) && s.hostelAllocations.length > 0) {
            return s.hostelAllocations.some(a => a.status === 'Assigned' || (a.hostelId && a.hostelId !== 'Not Assigned'));
        }
        return false;
    };

    // 1. Top Summary Metrics
    const metrics = useMemo(() => {
        const totalStudents = students.length;
        const totalHostels = hostels.length;

        // Assigned students count
        const assignedStudents = students.filter(isAssigned).length;
        const pendingAllocations = Math.max(0, totalStudents - assignedStudents);

        // Room statistics
        const totalRooms = rooms.length;
        const totalCapacity = rooms.reduce((sum, r) => sum + (Number(r.capasity) || 0), 0);
        const occupiedRooms = rooms.filter(r => {
            const occ = Number(r.currentOccupants) || (Array.isArray(r.students) ? r.students.length : 0);
            return occ > 0;
        }).length;

        return {
            totalStudents,
            totalHostels,
            assignedStudents,
            pendingAllocations,
            totalRooms,
            totalCapacity,
            occupiedRooms,
            allocationRate: totalStudents > 0 ? Math.round((assignedStudents / totalStudents) * 100) : 0
        };
    }, [students, hostels, rooms]);

    // 2. Gender Analytics Data (Pie/Donut Chart)
    const genderData = useMemo(() => {
        let male = 0;
        let female = 0;
        let other = 0;

        students.forEach(s => {
            const g = (s.sex || s.gender || '').toLowerCase();
            if (g.includes('fem') || g === 'f') female++;
            else if (g.includes('mal') || g === 'm') male++;
            else other++;
        });

        const total = male + female + other || 1;
        const femalePct = Math.round((female / total) * 100);
        const malePct = Math.round((male / total) * 100);
        const otherPct = Math.max(0, 100 - femalePct - malePct);

        return { male, female, other, total, femalePct, malePct, otherPct };
    }, [students]);

    // 3. Hostel Occupancy Analytics Data (Bar Chart)
    const hostelOccupancyData = useMemo(() => {
        return hostels.map(h => {
            const hId = String(h._id || h.hostelID || '');
            const hRooms = rooms.filter(r => {
                const rHId = String(r.hostelID?._id || r.hostelID || '');
                return rHId === hId || (r.hostelName && r.hostelName === h.name);
            });

            // Calculate capacity from rooms or fallback to hostel.capacity
            const capacity = hRooms.length > 0
                ? hRooms.reduce((sum, r) => sum + (Number(r.capasity) || 0), 0)
                : (Number(h.capacity) || Number(h.roomCount) * 2 || 40);

            // Calculate occupied beds
            const occupied = hRooms.length > 0
                ? hRooms.reduce((sum, r) => sum + (Number(r.currentOccupants) || (Array.isArray(r.students) ? r.students.length : 0)), 0)
                : students.filter(s => String(s.hostelId) === hId || s.hostelName === h.name).length;

            const percentage = capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0;

            return {
                id: hId,
                name: h.name || h.hostelID || 'Hostel',
                gender: h.gender || 'Any',
                capacity,
                occupied,
                available: Math.max(0, capacity - occupied),
                percentage,
                roomCount: hRooms.length
            };
        }).sort((a, b) => b.percentage - a.percentage);
    }, [hostels, rooms, students]);

    // 4. Activity / Audit Feed
    const activityFeed = useMemo(() => {
        const activities = [];

        students.forEach(s => {
            if (s.lastEditedAt) {
                activities.push({
                    id: `edit-${s._id}`,
                    type: 'EDIT',
                    title: `Student Record Edited`,
                    description: `${s.name || s.enrolmentNo} details updated by ${s.lastEditedBy || 'Admin'}`,
                    enrolmentNo: s.enrolmentNo,
                    target: s.name,
                    timestamp: new Date(s.lastEditedAt),
                    status: 'Updated',
                    tag: 'amber'
                });
            }

            if (s.hostelAssignedDate) {
                activities.push({
                    id: `assign-${s._id}`,
                    type: 'ASSIGNMENT',
                    title: `Hostel Assigned`,
                    description: `${s.enrolmentNo} allocated to ${s.hostelName || 'Hostel'}`,
                    enrolmentNo: s.enrolmentNo,
                    target: s.hostelName || 'Assigned',
                    timestamp: new Date(s.hostelAssignedDate),
                    status: 'Assigned',
                    tag: 'emerald'
                });
            } else if (s.createdAt) {
                activities.push({
                    id: `create-${s._id}`,
                    type: 'REGISTRATION',
                    title: `Student Enrolled`,
                    description: `${s.enrolmentNo || 'New student'} registered in the system`,
                    enrolmentNo: s.enrolmentNo,
                    target: s.name,
                    timestamp: new Date(s.createdAt),
                    status: 'Enrolled',
                    tag: 'blue'
                });
            }
        });

        // Sort descending by timestamp
        activities.sort((a, b) => b.timestamp - a.timestamp);

        // Apply filters
        return activities.filter(act => {
            if (activityFilter === 'ASSIGNED' && act.type !== 'ASSIGNMENT') return false;
            if (activityFilter === 'UPLOADED' && act.type !== 'REGISTRATION') return false;
            if (activityFilter === 'EDITED' && act.type !== 'EDIT') return false;

            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            return (
                act.title.toLowerCase().includes(term) ||
                (act.enrolmentNo && act.enrolmentNo.toLowerCase().includes(term)) ||
                (act.target && act.target.toLowerCase().includes(term))
            );
        });
    }, [students, activityFilter, searchTerm]);

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8 space-y-6">
            {/* Header Greeting Banner */}
            <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
                    <Building2 size={260} />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-3 border border-white/10">
                            <ShieldCheck size={14} className="text-amber-300" />
                            HMS Administrative Console
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            Welcome, {userInfo?.username || 'Administrator'}
                        </h1>
                        <p className="text-white/80 text-sm md:text-base mt-1 max-w-2xl">
                            University of Peradeniya • Hostel Management & Allocation System Overview
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 text-xs text-white/90 flex items-center gap-2">
                            <Calendar size={15} className="text-amber-300" />
                            <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => fetchAllData(true)}
                            disabled={refreshing}
                            className="bg-white/15 hover:bg-white/25 text-white p-2.5 rounded-xl transition-all border border-white/20 flex items-center justify-center disabled:opacity-50 cursor-pointer"
                            title="Refresh Dashboard Data"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </span>
                    <button onClick={() => fetchAllData(true)} className="text-xs font-semibold underline hover:no-underline">
                        Retry
                    </button>
                </div>
            )}

            {/* 1. Top Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {/* Total Students */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Students</p>
                            <h3 className="text-3xl font-extrabold text-gray-900 mt-2">
                                {loading ? '—' : metrics.totalStudents}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                <span className="font-semibold text-emerald-700">{metrics.assignedStudents}</span> assigned ({metrics.allocationRate}%)
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                            <Users size={24} />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Active Enrolments</span>
                        <Link to="/Dashboard/Students" className="text-blue-700 font-semibold hover:underline flex items-center gap-0.5">
                            View all <ChevronRight size={13} />
                        </Link>
                    </div>
                </div>

                {/* Total Hostels */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Hostels</p>
                            <h3 className="text-3xl font-extrabold text-[#6b0f14] mt-2">
                                {loading ? '—' : metrics.totalHostels}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                <span className="font-semibold text-gray-700">{metrics.totalRooms}</span> total rooms
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#6b0f14] flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
                            <Building2 size={24} />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>University Halls</span>
                        <Link to="/Dashboard/Hostels" className="text-[#6b0f14] font-semibold hover:underline flex items-center gap-0.5">
                            Manage <ChevronRight size={13} />
                        </Link>
                    </div>
                </div>

                {/* Assigned Rooms */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Assigned Rooms</p>
                            <h3 className="text-3xl font-extrabold text-emerald-700 mt-2">
                                {loading ? '—' : metrics.occupiedRooms}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                Across <span className="font-semibold text-emerald-700">{metrics.totalRooms}</span> registered rooms
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
                            <BedDouble size={24} />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Total Bed Capacity</span>
                        <span className="font-semibold text-gray-700">{metrics.totalCapacity} Beds</span>
                    </div>
                </div>

                {/* Pending Allocations */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending Allocations</p>
                            <h3 className="text-3xl font-extrabold text-amber-700 mt-2">
                                {loading ? '—' : metrics.pendingAllocations}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                Awaiting hostel/room assign
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
                            <Clock size={24} />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-500">Action required</span>
                        <Link to="/Dashboard/Student-assign" className="text-amber-800 font-semibold hover:underline flex items-center gap-0.5">
                            Assign now <ChevronRight size={13} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* 2. Quick Actions Section */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#6b0f14]" />
                        Administrative Quick Actions
                    </h2>
                    <span className="text-xs text-gray-400">Direct shortcuts to critical workflows</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                    <Link
                        to="/Dashboard/Stundet-upload-sheet"
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-[#fdf6e3] text-gray-700 hover:text-[#6b0f14] border border-gray-200/80 hover:border-amber-300 transition-all group text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#6b0f14] mb-2 group-hover:scale-110 transition-transform">
                            <UploadCloud size={20} />
                        </div>
                        <span className="text-xs font-semibold">Upload Student Sheet</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">Batch Excel import</span>
                    </Link>

                    <Link
                        to="/Dashboard/Student-assign"
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-[#fdf6e3] text-gray-700 hover:text-[#6b0f14] border border-gray-200/80 hover:border-amber-300 transition-all group text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#6b0f14] mb-2 group-hover:scale-110 transition-transform">
                            <DoorOpen size={20} />
                        </div>
                        <span className="text-xs font-semibold">Allocate Hostels</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">Assign by criteria</span>
                    </Link>

                    <Link
                        to="/Dashboard/Rooms"
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-[#fdf6e3] text-gray-700 hover:text-[#6b0f14] border border-gray-200/80 hover:border-amber-300 transition-all group text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#6b0f14] mb-2 group-hover:scale-110 transition-transform">
                            <BedDouble size={20} />
                        </div>
                        <span className="text-xs font-semibold">Manage Rooms</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">Capacity & occupancy</span>
                    </Link>

                    <Link
                        to="/Dashboard/Reports"
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-[#fdf6e3] text-gray-700 hover:text-[#6b0f14] border border-gray-200/80 hover:border-amber-300 transition-all group text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#6b0f14] mb-2 group-hover:scale-110 transition-transform">
                            <FileSpreadsheet size={20} />
                        </div>
                        <span className="text-xs font-semibold">System Reports</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">Excel & payment logs</span>
                    </Link>

                    <Link
                        to="/Dashboard/Student-create-manually"
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-[#fdf6e3] text-gray-700 hover:text-[#6b0f14] border border-gray-200/80 hover:border-amber-300 transition-all group text-center col-span-2 sm:col-span-1"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#6b0f14] mb-2 group-hover:scale-110 transition-transform">
                            <UserPlus size={20} />
                        </div>
                        <span className="text-xs font-semibold">Add Student</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">Manual registration</span>
                    </Link>
                </div>
            </div>

            {/* 3. Visual Analytics Section: Gender Distribution (Pie) & Hostel Occupancy (Bar) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 3A: Gender Distribution Donut / Pie Chart */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <PieChartIcon size={18} className="text-[#6b0f14]" />
                                Gender Distribution
                            </h3>
                            <span className="text-xs text-gray-400">{genderData.total} Students</span>
                        </div>

                        {/* Pure SVG Donut Chart */}
                        <div className="flex flex-col items-center justify-center pt-6 pb-4">
                            <div className="relative w-44 h-44">
                                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                    {/* Background Circle */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        className="text-gray-100 stroke-current"
                                        strokeWidth="14"
                                        fill="transparent"
                                    />
                                    {/* Female Arc (Pink/Rose) */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        stroke="#db2777"
                                        strokeWidth="14"
                                        strokeDasharray={`${genderData.femalePct * 2.387} 238.7`}
                                        strokeDashoffset="0"
                                        fill="transparent"
                                        strokeLinecap="round"
                                        className="transition-all duration-700 ease-out"
                                    />
                                    {/* Male Arc (Blue) */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        stroke="#2563eb"
                                        strokeWidth="14"
                                        strokeDasharray={`${genderData.malePct * 2.387} 238.7`}
                                        strokeDashoffset={`-${genderData.femalePct * 2.387}`}
                                        fill="transparent"
                                        strokeLinecap="round"
                                        className="transition-all duration-700 ease-out"
                                    />
                                    {/* Other Arc (Amber) */}
                                    {genderData.otherPct > 0 && (
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            stroke="#d97706"
                                            strokeWidth="14"
                                            strokeDasharray={`${genderData.otherPct * 2.387} 238.7`}
                                            strokeDashoffset={`-${(genderData.femalePct + genderData.malePct) * 2.387}`}
                                            fill="transparent"
                                            strokeLinecap="round"
                                            className="transition-all duration-700 ease-out"
                                        />
                                    )}
                                </svg>

                                {/* Center Metric Label */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-2xl font-black text-gray-900">{genderData.total}</span>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Students</span>
                                </div>
                            </div>
                        </div>

                        {/* Legend Badges */}
                        <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-gray-100 text-center">
                            <div className="p-2 rounded-xl bg-pink-50/70 border border-pink-100">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-700">
                                    <FaFemale size={12} /> Female
                                </span>
                                <p className="text-base font-extrabold text-pink-900 mt-0.5">{genderData.female}</p>
                                <span className="text-[10px] text-pink-600 font-medium">{genderData.femalePct}%</span>
                            </div>

                            <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                                    <FaMale size={12} /> Male
                                </span>
                                <p className="text-base font-extrabold text-blue-900 mt-0.5">{genderData.male}</p>
                                <span className="text-[10px] text-blue-600 font-medium">{genderData.malePct}%</span>
                            </div>

                            <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                    <FaUserTie size={12} /> Other
                                </span>
                                <p className="text-base font-extrabold text-amber-900 mt-0.5">{genderData.other}</p>
                                <span className="text-[10px] text-amber-600 font-medium">{genderData.otherPct}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                        <Link
                            to="/Dashboard/Students"
                            className="text-xs font-semibold text-[#6b0f14] hover:underline inline-flex items-center gap-1"
                        >
                            Filter by Gender
                            <ArrowUpRight size={13} />
                        </Link>
                    </div>
                </div>

                {/* 3B: Hostel Occupancy Status Bar Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <BarChart3 size={18} className="text-[#6b0f14]" />
                                    Hostel Occupancy Status
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Capacity vs. allocated residents per hall</p>
                            </div>
                            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                                {hostels.length} Hostels Active
                            </span>
                        </div>

                        {/* Bar List */}
                        <div className="mt-4 space-y-3.5 max-h-[290px] overflow-y-auto pr-2">
                            {hostelOccupancyData.length > 0 ? (
                                hostelOccupancyData.map(h => (
                                    <div key={h.id} className="space-y-1 group">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                                                <Building2 size={13} className="text-[#6b0f14]" />
                                                {h.name}
                                                <span className="text-[10px] text-gray-400 font-normal">({h.gender})</span>
                                            </span>
                                            <span className="text-xs text-gray-600 font-mono">
                                                <strong className="text-gray-900">{h.occupied}</strong> / {h.capacity} Beds
                                                <span className={`ml-1.5 font-bold ${h.percentage >= 90 ? 'text-red-600' : h.percentage >= 70 ? 'text-amber-600' : 'text-emerald-700'}`}>
                                                    ({h.percentage}%)
                                                </span>
                                            </span>
                                        </div>

                                        {/* Visual Progress Bar */}
                                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    h.percentage >= 90
                                                        ? 'bg-red-600'
                                                        : h.percentage >= 70
                                                            ? 'bg-amber-500'
                                                            : 'bg-emerald-600'
                                                }`}
                                                style={{ width: `${Math.max(4, h.percentage)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center text-gray-400 text-xs">
                                    No hostel data available yet.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600" /> &lt;70% Vacant</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 70-89% Moderate</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600" /> &gt;90% Near Full</span>
                        </div>
                        <Link to="/Dashboard/Hostels" className="font-semibold text-[#6b0f14] hover:underline inline-flex items-center gap-1">
                            Hall details <ArrowUpRight size={13} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* 4. Recent Activity & Audit Logs Feed */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Activity size={18} className="text-[#6b0f14]" />
                            Recent System Activity & Allocations
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Real-time audit log of student registrations, hostel assignments, and profile updates
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search activity logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6b0f14] focus:bg-white transition-all w-44 md:w-56"
                            />
                        </div>

                        <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium text-gray-600">
                            <button
                                type="button"
                                onClick={() => setActivityFilter('ALL')}
                                className={`px-2.5 py-1 rounded-md transition-colors ${activityFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs font-semibold' : 'hover:text-gray-900'}`}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => setActivityFilter('ASSIGNED')}
                                className={`px-2.5 py-1 rounded-md transition-colors ${activityFilter === 'ASSIGNED' ? 'bg-white text-emerald-800 shadow-xs font-semibold' : 'hover:text-gray-900'}`}
                            >
                                Allocations
                            </button>
                            <button
                                type="button"
                                onClick={() => setActivityFilter('UPLOADED')}
                                className={`px-2.5 py-1 rounded-md transition-colors ${activityFilter === 'UPLOADED' ? 'bg-white text-blue-800 shadow-xs font-semibold' : 'hover:text-gray-900'}`}
                            >
                                Enrolments
                            </button>
                            <button
                                type="button"
                                onClick={() => setActivityFilter('EDITED')}
                                className={`px-2.5 py-1 rounded-md transition-colors ${activityFilter === 'EDITED' ? 'bg-white text-amber-800 shadow-xs font-semibold' : 'hover:text-gray-900'}`}
                            >
                                Edits
                            </button>
                        </div>
                    </div>
                </div>

                {/* Activity Feed Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-600">
                        <thead className="bg-[#fdf6e3] text-[#6b0f14] uppercase text-[11px] font-semibold border-b border-amber-100">
                            <tr>
                                <th className="py-3 px-4">Event Type</th>
                                <th className="py-3 px-4">Enrolment No</th>
                                <th className="py-3 px-4">Subject / Details</th>
                                <th className="py-3 px-4">Timestamp</th>
                                <th className="py-3 px-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-gray-400">
                                        Loading recent activity logs...
                                    </td>
                                </tr>
                            ) : activityFeed.length > 0 ? (
                                activityFeed.slice(0, 10).map((act) => (
                                    <tr key={act.id} className="hover:bg-[#fefaf0]/60 transition-colors">
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {act.type === 'ASSIGNMENT' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                    <CheckCircle2 size={12} /> Allocation
                                                </span>
                                            ) : act.type === 'REGISTRATION' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                                    <UploadCloud size={12} /> Enrolled
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                                    <Activity size={12} /> Record Edit
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-mono font-medium text-gray-900 whitespace-nowrap">
                                            {act.enrolmentNo || '—'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                                            <span className="font-medium text-gray-900">{act.description}</span>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap text-gray-500">
                                            {act.timestamp.toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                                                {act.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-gray-400">
                                        No recent activity records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/40">
                    <span>
                        Showing latest <strong>{Math.min(10, activityFeed.length)}</strong> of <strong>{activityFeed.length}</strong> activity entries
                    </span>
                    <Link to="/Dashboard/Students" className="font-semibold text-[#6b0f14] hover:underline inline-flex items-center gap-1">
                        View All Students Directory <ChevronRight size={13} />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

