import React from 'react';
import RoomData from './RoomData';
import AllRooms from './AllRooms';
import { Link } from 'react-router-dom';
import { BedDouble, Building2, Home, GraduationCap, Layers } from 'lucide-react';

const Rooms = () => {
    return (
        <div className="w-full min-w-0 space-y-6">
            {/* Header / Hero Section with Responsive Wrapping */}
            <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-5 md:p-7 shadow-md relative overflow-hidden w-full">
                <div className="relative z-10 flex flex-col md:flex-row flex-wrap justify-between items-start md:items-center gap-4">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-2 border border-white/10">
                            <Layers size={13} className="text-amber-300" />
                            Room Inventory & Allocation Hub
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2.5">
                            <BedDouble className="text-amber-300" size={28} />
                            Manage Rooms
                        </h1>
                        <p className="text-white/80 text-xs sm:text-sm mt-1">
                            Real-time room occupancy, bed capacities, allocation status, and resident tracking across all university halls.
                        </p>
                    </div>

                    {/* Quick Shortcuts */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
                        <Link to="/Dashboard/Hostels" className="grow sm:grow-0">
                            <button
                                type="button"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#6b0f14] rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
                            >
                                <Building2 size={14} />
                                Manage Hostels
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
                        <Link to="/Dashboard/Students" className="grow sm:grow-0">
                            <button
                                type="button"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold border border-white/20 transition-all cursor-pointer whitespace-nowrap"
                            >
                                <GraduationCap size={14} />
                                Manage Students
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="w-full min-w-0">
                <RoomData />
            </div>

            <div className="w-full min-w-0">
                <AllRooms />
            </div>
        </div>
    );
};

export default Rooms;
