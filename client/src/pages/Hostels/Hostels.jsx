import React from 'react';
import HostelData from './HostelData';
import { Link } from 'react-router-dom';
import AllHostelData from './AllHostelData';
import { Building2, Plus, BedDouble, Home, Layers } from 'lucide-react';

const Hostels = () => {
    return (
        <div className="w-full min-w-0 space-y-6">
            {/* Header / Hero Section with Responsive Wrapping */}
            <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-5 md:p-7 shadow-md relative overflow-hidden w-full">
                <div className="relative z-10 flex flex-col md:flex-row flex-wrap justify-between items-start md:items-center gap-4">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-2 border border-white/10">
                            <Layers size={13} className="text-amber-300" />
                            Hostel Operations & Facilities Hub
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2.5">
                            <Building2 className="text-amber-300" size={28} />
                            Manage Hostels
                        </h1>
                        <p className="text-white/80 text-xs sm:text-sm mt-1">
                            Comprehensive directory for university halls, warden assignments, gender capacities, and overall student residency.
                        </p>
                    </div>

                    {/* Quick Shortcuts */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
                        <Link to="/Dashboard/Create-hostel" className="grow sm:grow-0">
                            <button
                                type="button"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#6b0f14] rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
                            >
                                <Plus size={14} />
                                Create New Hostel
                            </button>
                        </Link>
                        <Link to="/Dashboard/Rooms" className="grow sm:grow-0">
                            <button
                                type="button"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold border border-white/20 transition-all cursor-pointer whitespace-nowrap"
                            >
                                <BedDouble size={14} />
                                Manage Rooms
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

            <div className="w-full min-w-0">
                <HostelData />
            </div>

            <div className="w-full min-w-0">
                <AllHostelData />
            </div>
        </div>
    );
};

export default Hostels;
