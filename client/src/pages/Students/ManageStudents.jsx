import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    GraduationCap,
    Home,
    Upload,
    UserPlus,
    Layers,
    Wrench,
    HeartPulse,
    HeartHandshake
} from 'lucide-react';
import { FaUserGraduate, FaHouseUser, FaUserCheck, FaFileExcel } from 'react-icons/fa6';
import StdData from './StdData';
import AllStudents from './AllStudents';
import EligibleStudents from './EligibleStudents';
import AssignedStudents from './AssignedStudents';
import AdminExtraNeeds from '../StdExtraNeeds/AdminExtraNeeds';
import AdminCreateSpecialNeed from '../StdExtraNeeds/AdminCreateSpecialNeed';
import AssignViaExcel from './AssignViaExcel';

const ManageStudents = () => {
    const location = useLocation();

    // Determine initial tab & sub-need view from pathname
    const initialConfig = useMemo(() => {
        const path = location.pathname.toLowerCase();
        if (path.includes('eligiblestudents') || path.includes('eligible')) {
            return { tab: 'eligible', needView: 'extra' };
        }
        if (path.includes('assignedstudents') || path.includes('assigned')) {
            return { tab: 'assigned', needView: 'extra' };
        }
        if (path.includes('admincreatespecialneed') || path.includes('specialneed')) {
            return { tab: 'needs', needView: 'special' };
        }
        if (path.includes('adminextraneeds') || path.includes('stdextraneeds') || path.includes('extraneeds')) {
            return { tab: 'needs', needView: 'extra' };
        }
        if (path.includes('assign-via-excel') || path.includes('assign-excel') || path.includes('excel')) {
            return { tab: 'excel', needView: 'extra' };
        }
        return { tab: 'all', needView: 'extra' };
    }, [location.pathname]);

    const [activeTab, setActiveTab] = useState(initialConfig.tab);
    const [activeNeedView, setActiveNeedView] = useState(initialConfig.needView); // 'extra' | 'special'

    // Sync active tab & sub-view if URL changes
    useEffect(() => {
        const path = location.pathname.toLowerCase();
        if (path.includes('eligiblestudents') || path.includes('eligible')) {
            setActiveTab('eligible');
        } else if (path.includes('assignedstudents') || path.includes('assigned')) {
            setActiveTab('assigned');
        } else if (path.includes('admincreatespecialneed') || path.includes('specialneed')) {
            setActiveTab('needs');
            setActiveNeedView('special');
        } else if (path.includes('adminextraneeds') || path.includes('stdextraneeds') || path.includes('extraneeds')) {
            setActiveTab('needs');
            setActiveNeedView('extra');
        } else if (path.includes('assign-via-excel') || path.includes('assign-excel') || path.includes('excel')) {
            setActiveTab('excel');
        }
    }, [location.pathname]);

    // Consolidate main tabs down to 5 core items
    const tabs = [
        {
            id: 'all',
            label: 'All Students',
            icon: FaUserGraduate,
            badge: 'Registry',
        },
        {
            id: 'eligible',
            label: 'Eligible Students',
            icon: FaUserCheck,
            badge: 'Criteria',
        },
        {
            id: 'assigned',
            label: 'Assigned Students',
            icon: FaHouseUser,
            badge: 'Allocated',
        },
        {
            id: 'needs',
            label: 'Student Needs',
            icon: HeartHandshake,
            badge: 'Support',
        },
        {
            id: 'excel',
            label: 'Assign via Excel',
            icon: FaFileExcel,
            badge: 'Queue',
        },
    ];

    return (
        <div className="w-full min-w-0 space-y-6 overflow-hidden">
            {/* Header / Hero Section with Responsive Wrapping */}
            <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-5 md:p-7 shadow-md relative overflow-hidden w-full">
                <div className="relative z-10 flex flex-col md:flex-row flex-wrap justify-between items-start md:items-center gap-4">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-2 border border-white/10">
                            <Layers size={13} className="text-amber-300" />
                            Unified Student Operations Hub
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2.5">
                            <GraduationCap className="text-amber-300" size={28} />
                            Manage Students
                        </h1>
                        <p className="text-white/80 text-xs sm:text-sm mt-1">
                            Consolidated registry for student profiles, eligibility criteria, hostel allocations, maintenance repair requests, medical records, and batch Excel queues.
                        </p>
                    </div>

                    {/* Quick Shortcuts (Gracefully Wraps on Narrow / 100% Zoom Screens) */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
                        <Link to="/Dashboard/Stundet-upload-sheet" className="grow sm:grow-0">
                            <button
                                type="button"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#6b0f14] rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
                            >
                                <Upload size={14} />
                                Batch Excel Import
                            </button>
                        </Link>
                        <Link to="/Dashboard/Student-create-manually" className="grow sm:grow-0">
                            <button
                                type="button"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold border border-white/20 transition-all cursor-pointer whitespace-nowrap"
                            >
                                <UserPlus size={14} />
                                Add Student Manually
                            </button>
                        </Link>
                        <Link to="/Dashboard/Student-assign" className="grow sm:grow-0">
                            <button
                                type="button"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold border border-white/20 transition-all cursor-pointer whitespace-nowrap"
                            >
                                <Home size={14} />
                                Allocate Hostels
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Quick Stat Summary Cards (Responsive 4-Col Grid: 1 col on mobile, 2 on tablet, 4 on desktop) */}
            <div className="w-full min-w-0">
                <StdData />
            </div>

            {/* Unified Card with Strict Horizontal Overflow Protection */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden w-full min-w-0">
                {/* Responsive Tab Navigation Container */}
                <div className="border-b border-gray-200 bg-gray-50/70 overflow-x-auto whitespace-nowrap scrollbar-hide w-full">
                    <div className="flex flex-nowrap min-w-full">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    type="button"
                                    className={`flex items-center gap-2.5 px-4 md:px-6 py-3.5 font-bold text-xs sm:text-sm transition-all whitespace-nowrap border-b-2 cursor-pointer shrink-0 ${
                                        isActive
                                            ? 'border-[#6b0f14] text-[#6b0f14] bg-white shadow-xs'
                                            : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                                    }`}
                                >
                                    <div
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                                            isActive
                                                ? 'bg-[#6b0f14] text-white shadow-xs'
                                                : 'bg-gray-200/70 text-gray-500'
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <span>{tab.label}</span>
                                        <span
                                            className={`text-[10px] uppercase tracking-wider font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full border ${
                                                isActive
                                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                                            }`}
                                        >
                                            {tab.badge}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content Panels (Wrapped with w-full min-w-0 overflow-x-auto to prevent layout blowout) */}
                <div className="p-3 sm:p-5 md:p-6 bg-white min-h-[500px] w-full min-w-0 overflow-x-auto">
                    {/* Tab 1: All Students */}
                    <div className={activeTab === 'all' ? 'block w-full min-w-0 overflow-x-auto' : 'hidden'}>
                        <AllStudents />
                    </div>

                    {/* Tab 2: Eligible Students */}
                    <div className={activeTab === 'eligible' ? 'block w-full min-w-0 overflow-x-auto' : 'hidden'}>
                        <EligibleStudents />
                    </div>

                    {/* Tab 3: Assigned Students */}
                    <div className={activeTab === 'assigned' ? 'block w-full min-w-0 overflow-x-auto' : 'hidden'}>
                        <AssignedStudents />
                    </div>

                    {/* Tab 4: Student Needs (Consolidated with Sub-Navigation) */}
                    <div className={activeTab === 'needs' ? 'block w-full min-w-0 space-y-4' : 'hidden'}>
                        {/* Sub-Navigation Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
                            <div>
                                <h2 className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-2">
                                    <HeartHandshake className="text-[#6b0f14]" size={18} />
                                    Student Needs & Support Services
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Manage facility maintenance requests and track student medical or health accommodations
                                </p>
                            </div>

                            {/* Pill-shaped Sub-Navigation Toggle Buttons */}
                            <div className="bg-gray-100/80 p-1 rounded-xl inline-flex items-center gap-1 border border-gray-200/80 self-start sm:self-auto shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setActiveNeedView('extra')}
                                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        activeNeedView === 'extra'
                                            ? 'bg-[#6b0f14] text-white shadow-xs'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                    }`}
                                >
                                    <Wrench size={13} />
                                    <span>Extra Needs (Maintenance)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveNeedView('special')}
                                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        activeNeedView === 'special'
                                            ? 'bg-[#6b0f14] text-white shadow-xs'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                    }`}
                                >
                                    <HeartPulse size={13} />
                                    <span>Special Needs (Medical)</span>
                                </button>
                            </div>
                        </div>

                        {/* Nested Sub-Views with Horizontal Scroll Protection */}
                        <div className={activeNeedView === 'extra' ? 'block w-full min-w-0 overflow-x-auto' : 'hidden'}>
                            <AdminExtraNeeds />
                        </div>

                        <div className={activeNeedView === 'special' ? 'block w-full min-w-0 overflow-x-auto' : 'hidden'}>
                            <AdminCreateSpecialNeed />
                        </div>
                    </div>

                    {/* Tab 5: Assign via Excel */}
                    <div className={activeTab === 'excel' ? 'block w-full min-w-0 overflow-x-auto' : 'hidden'}>
                        <AssignViaExcel />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageStudents;
