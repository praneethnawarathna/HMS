import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { FaMale, FaFemale, FaBed, FaUsers, FaUser } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const AllHostelData = () => {
    const [allhostels, setAllHostels] = useState([]);
    const token = localStorage.getItem('login');
    const hostels = Array.isArray(allhostels) ? allhostels : [];

    const maleHostelCount = hostels.filter(h => h.gender === 'Male').length;

    // Delete a hostel and refresh the list
    const handleDeleteHostel = async (hostelId) => {
        if (!window.confirm('Delete this hostel? This will remove all related allocations, rooms, and warden assignments.')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_APP_API}/hostel/delete-hostel/${hostelId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Refresh hostels after deletion
            const res = await axios.get(import.meta.env.VITE_APP_API + '/hostel/get-all-hostels', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllHostels(Array.isArray(res.data?.Result) ? res.data.Result : []);
        } catch (err) {
            console.error('Failed to delete hostel:', err);
        }
    };
    const femaleHostelCount = hostels.filter(h => h.gender === 'Female').length;
    const revHostelCount = hostels.filter(h => h.gender === 'REV' || h.gender === 'Rev').length;

    const totalCapacity = hostels.reduce((sum, h) => sum + (h.totalCapacity || 0), 0);
    const totalAssigned = hostels.reduce((sum, h) => sum + (h.assignedStudents || 0), 0);
    const overallOccupancy = totalCapacity > 0 ? Math.min((totalAssigned / totalCapacity) * 100, 100).toFixed(1) : 0;

    useEffect(() => {
        if (!token) {
            setAllHostels([]);
            return;
        }

        axios.get(import.meta.env.VITE_APP_API + '/hostel/get-all-hostels', {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })
            .then(res => {
                setAllHostels(Array.isArray(res.data?.Result) ? res.data.Result : []);
            })
            .catch(err => {
                setAllHostels([]);
                if (err.response?.status !== 401) {
                    console.error("Failed to fetch hostels:", err);
                }
            });
    }, [token]);

    const hostelStats = [
        {
            id: 1,
            name: 'Male Hostels',
            icon: FaMale,
            value: maleHostelCount,
            bgColor: 'bg-[#6b0f14]',
        },
        {
            id: 2,
            name: 'Female Hostels',
            icon: FaFemale,
            value: femaleHostelCount,
            bgColor: 'bg-[#d4af37]',
        },
        {
            id: 5,
            name: 'REV Hostels',
            icon: FaUser,
            value: revHostelCount,
            bgColor: 'bg-[#7e57c2]',
        },
        {
            id: 3,
            name: 'Total Capacity',
            icon: FaBed,
            value: totalCapacity,
            bgColor: 'bg-[#2d6a4f]',
        },
        {
            id: 4,
            name: 'Total Assigned',
            icon: FaUsers,
            value: `${totalAssigned} / ${totalCapacity}`,
            subtitle: `${overallOccupancy}% Occupancy`,
            bgColor: 'bg-[#1b4965]',
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-[#6b0f14]">Hostels</h2>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                {hostelStats.map((stat) => (
                    <div key={stat.id} className={`relative ${stat.bgColor} text-white p-3 sm:p-4 rounded-xl shadow-md overflow-hidden hover:scale-[1.02] transition-transform duration-300`}>
                        {/* Icon in background */}
                        {stat.icon && (
                            <div className="absolute right-3 top-3 opacity-20 text-white text-3xl sm:text-4xl">
                                <stat.icon />
                            </div>
                        )}

                        {/* Content */}
                        <div className="relative z-10">
                            <div className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-[#fdf6e3]">
                                {stat.name}
                            </div>
                            <div className="mt-1 text-xl sm:text-2xl font-bold">{stat.value}</div>
                            {stat.subtitle && <div className="text-[10px] mt-0.5 opacity-80">{stat.subtitle}</div>}
                        </div>
                    </div>
                ))}
            </div>
            <div className="overflow-x-auto rounded-xl shadow-md">
                <table className="min-w-full text-xs sm:text-sm text-left text-gray-600 bg-white">
                    <thead className="text-[10px] sm:text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                        <tr>
                            <th className="px-3 py-2.5 font-semibold">#</th>
                            <th className="px-3 py-2.5 font-semibold">Hostel ID</th>
                            <th className="px-3 py-2.5 font-semibold">Name</th>
                            <th className="px-3 py-2.5 font-semibold">Location</th>
                            <th className="px-3 py-2.5 font-semibold">Warden</th>
                            <th className="px-3 py-2.5 font-semibold">Rooms</th>
                            <th className="px-3 py-2.5 font-semibold">Total Capacity</th>
                            <th className="px-3 py-2.5 font-semibold">Gender</th>
                            <th className="px-3 py-2.5 font-semibold">Assigned</th>
                            <th className="px-3 py-2.5 font-semibold">Available</th>

                            <th className="px-3 py-2.5 font-semibold">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {
                            hostels.length > 0 ? (
                                hostels.map((data, index) => (
                                    <tr key={index} className="hover:bg-[#fefaf0] transition-all duration-150">
                                        <td className="px-3 py-2.5 font-medium text-gray-800 align-top">{index + 1}</td>
                                        <td className="px-3 py-2.5 max-w-[110px] break-words whitespace-normal align-top">{data.hostelID}</td>
                                        <td className="px-3 py-2.5 max-w-[140px] break-words whitespace-normal align-top">{data.name}</td>
                                        <td className="px-3 py-2.5 align-top">
                                            <a href={`${data.location}`} target='_blank' className='text-[#6b0f14] font-medium hover:underline'>
                                                View
                                            </a>
                                        </td>
                                        <td className="px-3 py-2.5 max-w-[120px] break-words whitespace-normal align-top">
                                            {data.warden?.username || 'Not Assigned'}
                                        </td>
                                        <td className="px-3 py-2.5 align-top">{data.roomCount}</td>
                                        <td className="px-3 py-2.5 font-medium text-gray-800 text-center align-top">{data.totalCapacity || 0}</td>
                                        <td className="px-3 py-2.5 align-top">
                                            {data.gender === 'Male' ? (
                                                <span className="flex items-center gap-1 bg-[#fdf6e3] text-[#6b0f14] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                                                    <FaMale /> Male
                                                </span>
                                            ) : data.gender === 'Female' ? (
                                                <span className="flex items-center gap-1 bg-pink-100 text-pink-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                                                    <FaFemale /> Female
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 bg-purple-100 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                                                    <FaUser /> {data.gender}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-gray-800 text-center align-top">{data.assignedStudents || 0}</td>
                                        <td className="px-3 py-2.5 font-medium text-center align-top">
                                            {data.isFull ? (
                                                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">FULL</span>
                                            ) : (
                                                <span className="text-green-700">{data.availableCapacity ?? 0}</span>
                                            )}
                                        </td>

                                        <td className="px-3 py-2.5 flex gap-2 min-w-[100px] align-top">
                                            <Link
                                                to={`/Dashboard/View-Hostel/${data._id}`}
                                                className="text-[#6b0f14] font-medium hover:underline"
                                            >
                                                View
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteHostel(data._id)}
                                                className="text-red-600 hover:text-red-800 font-medium"
                                            >Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="12" className="px-3 py-3 text-center text-gray-500">
                                        No matching records found.
                                    </td>
                                </tr>
                            )
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AllHostelData;
