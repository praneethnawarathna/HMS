import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
    Building2,
    BedDouble,
    DoorOpen,
    Users,
    Phone,
    Mail,
    Shield,
    ShieldAlert,
    Calendar,
    RefreshCw,
    Clock,
    CheckCircle2,
    AlertCircle,
    UserCheck,
    MapPin,
    HelpCircle,
    ExternalLink
} from 'lucide-react';
import { getUserInfoFromToken } from '../../utils/auth';

const StudentDashboard = () => {
    const token = localStorage.getItem('login');
    const userInfo = useMemo(() => getUserInfoFromToken() || {}, []);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [studentData, setStudentData] = useState(null);

    const fetchStudentData = async (isRefresh = false) => {
        if (!token) {
            setLoading(false);
            return;
        }

        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const res = await axios.get(`${import.meta.env.VITE_APP_API}/auth/get-currentuser-data`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.Status === 'Success') {
                setStudentData(res.data.StudentDetails || null);
            }
        } catch (err) {
            console.error('Error fetching student dashboard data:', err);
            setError('Could not refresh hostel allocation details. Showing cached data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStudentData();
    }, [token]);

    const studentProfile = studentData?.profile;
    const allocation = studentData?.allocation;
    const hostel = studentData?.hostel;
    const room = studentData?.room;
    const warden = studentData?.warden;
    const roommates = studentData?.roommates || [];

    // Allocation status calculation
    const isAssigned = Boolean(
        (allocation && allocation.active !== false && (allocation.hostelID || allocation.roomId)) ||
        (studentProfile?.isAssign === true) ||
        (studentProfile?.hostelName && studentProfile.hostelName !== 'Not Assigned')
    );

    const hostelName = hostel?.name || studentProfile?.hostelName || (isAssigned ? 'Assigned Hall' : 'Not Assigned / Pending');
    const roomNo = room?.roomID || room?.roomNo || (isAssigned ? 'Room Pending Allocation' : 'Not Assigned / Pending');

    // Room Type label
    const roomType = useMemo(() => {
        if (!room) return 'Not Assigned / Pending';
        const cap = Number(room.capasity) || 0;
        if (cap === 1) return 'Single Occupancy Room';
        if (cap === 2) return 'Double Sharing Room';
        if (cap === 3) return 'Triple Sharing Room';
        if (cap >= 4) return `${cap}-Person Shared Room`;
        return 'Standard Student Room';
    }, [room]);

    // Warden display info
    const wardenName = warden?.name || warden?.username || 'Warden Office';
    const wardenContact = warden?.phone || warden?.contact || warden?.email || '+94 81 239 2301';

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8 space-y-6">
            {/* Top Maroon Welcome Banner */}
            <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
                    <Building2 size={240} />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-3 border border-white/10">
                            <Shield size={14} className="text-amber-300" />
                            HMS Student Portal
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            Welcome, {userInfo?.username || studentProfile?.enrolmentNo || 'Student'}
                        </h1>
                        <p className="text-white/80 text-sm md:text-base mt-1 max-w-2xl">
                            University of Peradeniya • Student Residence & Allocation Overview
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 text-xs text-white/90 flex items-center gap-2">
                            <Calendar size={15} className="text-amber-300" />
                            <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => fetchStudentData(true)}
                            disabled={refreshing}
                            className="bg-white/15 hover:bg-white/25 text-white p-2.5 rounded-xl transition-all border border-white/20 flex items-center justify-center disabled:opacity-50 cursor-pointer"
                            title="Refresh Allocation Details"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Notification (if any) */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </span>
                    <button onClick={() => fetchStudentData(true)} className="text-xs font-semibold underline hover:no-underline">
                        Retry
                    </button>
                </div>
            )}

            {/* Main Student Cards: Two Clean Width-Spanning Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* CARD 1: My Allocation & Hostel Details */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#6b0f14] flex items-center justify-center border border-amber-100">
                                <Building2 size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    My Allocation & Hostel Details
                                </h2>
                                <p className="text-xs text-gray-500">Your current hall residency and room placement</p>
                            </div>
                        </div>

                        {/* Status Badge */}
                        {isAssigned ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                Allocated
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock size={13} className="text-amber-600" />
                                Not Assigned / Pending
                            </span>
                        )}
                    </div>

                    {/* Allocation Fields */}
                    <div className="divide-y divide-gray-100 mt-2">
                        {/* 1. Hostel Name */}
                        <div className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                <Building2 size={14} className="text-[#6b0f14]" />
                                Hostel Name
                            </span>
                            <span className="text-sm font-bold text-gray-900 sm:text-right">
                                {hostelName}
                            </span>
                        </div>

                        {/* 2. Room No */}
                        <div className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                <DoorOpen size={14} className="text-[#6b0f14]" />
                                Room Number
                            </span>
                            <span className="text-sm font-bold sm:text-right">
                                {roomNo === 'Not Assigned / Pending' ? (
                                    <span className="text-gray-500 font-medium">Not Assigned / Pending</span>
                                ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        {roomNo}
                                    </span>
                                )}
                            </span>
                        </div>

                        {/* 3. Room Type */}
                        <div className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                <BedDouble size={14} className="text-[#6b0f14]" />
                                Room Type
                            </span>
                            <span className="text-sm font-semibold text-gray-800 sm:text-right">
                                {roomType}
                            </span>
                        </div>

                        {/* 4. Warden Name & Contact */}
                        <div className="py-3.5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2 pt-0.5">
                                <UserCheck size={14} className="text-[#6b0f14]" />
                                Warden Name & Contact
                            </span>
                            <div className="sm:text-right">
                                <p className="text-sm font-bold text-gray-900">{wardenName}</p>
                                <p className="text-xs text-gray-600 mt-0.5 flex items-center sm:justify-end gap-1.5">
                                    <Phone size={11} className="text-gray-400" />
                                    <span>{wardenContact}</span>
                                </p>
                            </div>
                        </div>

                        {/* 5. Roommates */}
                        <div className="py-3.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                    <Users size={14} className="text-[#6b0f14]" />
                                    Roommates
                                </span>
                                <span className="text-xs text-gray-400">
                                    {roommates.length > 0 ? `${roommates.length} resident(s)` : ''}
                                </span>
                            </div>

                            {roommates.length > 0 ? (
                                <div className="space-y-1.5 pl-5 pt-1">
                                    {roommates.map((rm, idx) => (
                                        <div
                                            key={rm._id || idx}
                                            className="flex items-center justify-between text-xs bg-gray-50 px-3 py-2 rounded-lg border border-gray-100"
                                        >
                                            <span className="font-semibold text-gray-800">{rm.name || 'Roommate'}</span>
                                            <span className="font-mono text-gray-500">{rm.enrolmentNo || ''}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 font-medium pl-5">
                                    Not Assigned / Pending
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Bottom Helper Notice */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Need room assistance or medical relocation?</span>
                        <Link
                            to="/Dashboard/ExtraNeeds"
                            className="font-semibold text-[#6b0f14] hover:underline inline-flex items-center gap-1"
                        >
                            Submit Request <ExternalLink size={12} />
                        </Link>
                    </div>
                </div>

                {/* CARD 2: Key Contacts */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#6b0f14] flex items-center justify-center border border-amber-100">
                                <Phone size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Key Contacts
                                </h2>
                                <p className="text-xs text-gray-500">Essential university student services & emergency help</p>
                            </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            Helpdesk
                        </span>
                    </div>

                    {/* Contact Listings */}
                    <div className="space-y-3.5 mt-4">
                        {/* 1. Student Welfare & Accommodation Office */}
                        <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <Building2 size={15} className="text-[#6b0f14]" />
                                        Student Services & Accommodation Division
                                    </h3>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Hostel registrations, appeals, and general accommodation inquiries.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                                <a
                                    href="tel:+94812392011"
                                    className="font-semibold text-[#6b0f14] hover:underline flex items-center gap-1.5"
                                >
                                    <Phone size={13} />
                                    +94 81 239 2011 / 2300
                                </a>
                                <a
                                    href="mailto:accomm@pdn.ac.lk"
                                    className="text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
                                >
                                    <Mail size={13} />
                                    accomm@pdn.ac.lk
                                </a>
                            </div>
                        </div>

                        {/* 2. University Security Division (24/7) */}
                        <div className="p-3.5 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50/80 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert size={16} className="text-red-700" />
                                        <h3 className="text-sm font-bold text-red-900">
                                            University Security & Marshals (24/7 Hotline)
                                        </h3>
                                    </div>
                                    <p className="text-xs text-red-800/80 mt-1">
                                        Emergency response, campus safety, security patrol, and incident reporting.
                                    </p>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-200/80 text-red-800 shrink-0">
                                    24/7 Hotline
                                </span>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-red-200/60 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                                <a
                                    href="tel:+94812388303"
                                    className="font-bold text-red-800 hover:underline flex items-center gap-1.5"
                                >
                                    <Phone size={13} />
                                    +94 81 238 8303
                                </a>
                                <span className="text-red-700/80 flex items-center gap-1.5">
                                    <Phone size={13} />
                                    +94 81 239 2133
                                </span>
                                <span className="text-red-700/80 flex items-center gap-1.5">
                                    <MapPin size={13} />
                                    Senate Building Ground Floor
                                </span>
                            </div>
                        </div>

                        {/* 3. Hostel Warden & Sub-Warden Contact */}
                        <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50/80 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <UserCheck size={15} className="text-amber-800" />
                                        Hostel Warden & Hall Office
                                    </h3>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Hostel gate passes, room maintenance, discipline, and resident assistance.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                                <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                                    <Phone size={13} className="text-amber-800" />
                                    {wardenContact}
                                </span>
                                <span className="text-gray-600 flex items-center gap-1.5">
                                    <Building2 size={13} className="text-gray-400" />
                                    {hostelName}
                                </span>
                            </div>
                        </div>

                        {/* 4. University Health Center */}
                        <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <HelpCircle size={15} className="text-[#6b0f14]" />
                                        University Health Centre (Medical Emergency)
                                    </h3>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Outpatient services, student medical emergency consultation and ambulance.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                                <a
                                    href="tel:+94812388152"
                                    className="font-semibold text-[#6b0f14] hover:underline flex items-center gap-1.5"
                                >
                                    <Phone size={13} />
                                    +94 81 238 8152 / +94 81 239 2024
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;

