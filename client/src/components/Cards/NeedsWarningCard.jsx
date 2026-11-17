import React from 'react';
import { ShieldAlert, ArrowLeft, Building2, DoorClosed, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const NeedsWarningCard = ({ title = "Request Unavailable", hostelName = "Not Assigned", roomNo = "Not Assigned" }) => {
    return (
        <div className="w-full my-4">
            <div className="bg-amber-50/80 border-2 border-amber-300/80 rounded-2xl p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                    <div className="p-3 bg-amber-100 rounded-xl text-amber-700 flex-shrink-0">
                        <ShieldAlert size={36} className="text-[#6b0f14]" />
                    </div>

                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200/70 text-amber-900 uppercase tracking-wider">
                                Allocation Required
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-amber-800 font-medium">
                                <Clock size={13} /> Status: Pending
                            </span>
                        </div>

                        <h2 className="text-xl md:text-2xl font-bold text-[#6b0f14]">
                            {title}
                        </h2>

                        <p className="text-sm md:text-base text-gray-700 leading-relaxed font-medium">
                            Request Unavailable: You must be assigned to a hostel room before you can submit needs or maintenance requests. Your current status is Pending.
                        </p>

                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 p-3 bg-white/80 rounded-xl border border-amber-200/60 text-xs text-gray-700">
                                <Building2 size={16} className="text-[#6b0f14]" />
                                <div>
                                    <div className="text-gray-500 font-medium">Assigned Hostel</div>
                                    <div className="font-semibold text-gray-800">{hostelName || 'Pending'}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-white/80 rounded-xl border border-amber-200/60 text-xs text-gray-700">
                                <DoorClosed size={16} className="text-[#6b0f14]" />
                                <div>
                                    <div className="text-gray-500 font-medium">Assigned Room</div>
                                    <div className="font-semibold text-gray-800">{roomNo || 'Pending'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-between">
                            <Link
                                to="/Dashboard/Home"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#6b0f14] hover:bg-[#851319] text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
                            >
                                <ArrowLeft size={16} />
                                Back to Dashboard
                            </Link>

                            <span className="text-xs text-gray-500">
                                University of Peradeniya • HMS
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NeedsWarningCard;

