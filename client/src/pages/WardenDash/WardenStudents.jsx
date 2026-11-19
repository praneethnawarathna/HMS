import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaFemale, FaGraduationCap, FaMale, FaBed, FaUserClock } from 'react-icons/fa';
import { Shield, RotateCw, GraduationCap } from 'lucide-react';
import DefaultInput from '../../components/Form/DefaultInput';
import DefaultBtn from '../../components/Buttons/DefaultBtn';
import { getUserInfoFromToken } from '../../utils/auth';

const WardenStudents = () => {
    const [students, setStudents] = useState([]); // Array of { student, allocations }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const recordsPerPage = 15;

    const token = localStorage.getItem('login');
    const currentUser = useMemo(() => getUserInfoFromToken(), []);

    const fetchStudents = useCallback(async () => {
        if (!token) {
            setError('Unauthorized: Missing token.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const url = `${import.meta.env.VITE_APP_API}/hostel/warden-students`;
            const res = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.data.message) {
                setError(res.data.message);
                setStudents([]);
            } else {
                setStudents(res.data.Result || []);
                setError(null);
            }
<<<<<<< Updated upstream

            try {
                setLoading(true);
                const url = `${import.meta.env.VITE_APP_API}/hostel/warden-students`;
                console.log('Fetching warden students from:', url);
                
                const res = await axios.get(url, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log('API Response:', res.data);
                
                if (res.data.message) {
                    setError(res.data.message);
                    setStudents([]);
                } else {
                    setStudents(res.data.Result || []);
                }
            } catch (err) {
                console.error('Error fetching students:', err);
                setError('Failed to fetch student data: ' + (err.response?.data?.message || err.message));
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
=======
        } catch (err) {
            console.error('Error fetching students:', err);
            setError('Failed to fetch student data: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
>>>>>>> Stashed changes
    }, [token]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const filteredStudents = students.filter(({ student }) => {
        const term = searchTerm.toLowerCase();
        return (
            student.nic?.toLowerCase().includes(term) ||
            student.enrolmentNo?.toLowerCase().includes(term)
        );
    });

    const totalPages = Math.ceil(filteredStudents.length / recordsPerPage);
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * recordsPerPage,
        currentPage * recordsPerPage
    );

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [currentPage, searchTerm, totalPages]);

    // Calculate statistics
    const stats = useMemo(() => {
        const assigned = students.filter(({ allocations }) => 
            allocations?.some(a => a.active && a.roomId)
        ).length;
        const unassigned = students.length - assigned;
        return { assigned, unassigned };
    }, [students]);

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-2 border border-white/10">
                            <Shield size={14} className="text-amber-300" />
                            Warden Student Operations
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
                            <GraduationCap className="text-amber-300" size={28} />
                            Manage Students
                        </h1>
                        <p className="text-white/80 text-sm mt-1">
                            View registered residents, check room allocation statuses, and assign incoming students to available rooms.
                        </p>
                        <div className="text-xs text-white/70 mt-2 font-medium">
                            Logged in as: <span className="text-amber-200 font-semibold">{currentUser?.email || 'Warden'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 text-sm font-medium text-red-700 bg-red-50 rounded-xl border border-red-200">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
                <div className="relative bg-[#6b0f14] text-white p-6 rounded-2xl shadow-lg overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute right-4 top-4 opacity-20 text-white text-6xl">
                        <FaGraduationCap />
                    </div>

                    <div className="relative z-10">
                        <div className="text-sm font-medium uppercase tracking-wide text-[#fdf6e3]">
                            Total Students
                        </div>
                        <div className="mt-2 text-3xl font-bold">{students.length}</div>
                    </div>
                </div>

                <div className="relative bg-green-600 text-white p-6 rounded-2xl shadow-lg overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute right-4 top-4 opacity-20 text-white text-6xl">
                        <FaBed />
                    </div>

                    <div className="relative z-10">
                        <div className="text-sm font-medium uppercase tracking-wide text-green-100">
                            Assigned to Rooms
                        </div>
                        <div className="mt-2 text-3xl font-bold">{stats.assigned}</div>
                    </div>
                </div>

                <div className="relative bg-orange-600 text-white p-6 rounded-2xl shadow-lg overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute right-4 top-4 opacity-20 text-white text-6xl">
                        <FaUserClock />
                    </div>

                    <div className="relative z-10">
                        <div className="text-sm font-medium uppercase tracking-wide text-orange-100">
                            Pending Assign
                        </div>
                        <div className="mt-2 text-3xl font-bold">{stats.unassigned}</div>
                    </div>
                </div>
            </div>

            <DefaultInput
                label="Search by NIC or Enrolment No"
                name="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type NIC or Enrolment No"
            />

            <div className="-mt-4 mb-4 flex">
                <div>
                    <Link to={'/Dashboard/AssignStudentViaNeeds'}>
                        <DefaultBtn type="button" label="Assign Student Via Needs" />
                    </Link>
                </div>

                <div className="ml-4">
                    <Link to={'/Dashboard/StudentdAssignNormal'}>
                        <DefaultBtn type="button" label="Assign Students" />
                    </Link>
                </div>

                <div className="ml-4">
                    <Link to={'/Dashboard/AlreadyAssigned'}>
                        <DefaultBtn type="button" label="Already Assigned Students" />
                    </Link>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl shadow-lg">
                <table className="min-w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                        <tr>
                            <th className="px-6 py-4 font-semibold">#</th>
                            <th className="px-6 py-4 font-semibold">Enrolment No</th>
                            
                            <th className="px-6 py-4 font-semibold">NIC</th>
                            <th className="px-6 py-4 font-semibold">Gender</th>
                            <th className="px-6 py-4 font-semibold">Home Town</th>
                            <th className="px-6 py-4 font-semibold">Distance</th>
                            <th className="px-6 py-4 font-semibold">Room</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
<<<<<<< Updated upstream
                        {paginatedStudents.map(({ student, allocations }, idx) => {
                            const gender = (student.sex || '').toLowerCase();
                            const activeAllocation = allocations?.find(a => a.active && a.roomId);
                            const hasRoom = !!activeAllocation;
                            
                            return (
                                <tr
                                    key={student._id || idx}
                                    className="hover:bg-[#fefaf0] transition-all duration-150"
                                >
                                    <td className="px-6 py-4 font-medium text-gray-800">
                                        {(currentPage - 1) * recordsPerPage + idx + 1}
                                    </td>
                                    <td className="px-6 py-4">{student.enrolmentNo || '-'}</td>
                                    
                                    <td className="px-6 py-4">{student.nic || '-'}</td>
                                    <td className="px-6 py-4">
                                        {gender === 'male' ? (
                                            <span className="flex uppercase bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-3 py-1 rounded-full gap-1 items-center">
                                                <FaMale className="h-4 w-auto" />
                                                Male
                                            </span>
                                        ) : gender === 'female' ? (
                                            <span className="flex uppercase bg-pink-100 text-pink-700 text-xs font-semibold px-3 py-1 rounded-full gap-1 items-center">
                                                <FaFemale className="h-4 w-auto" />
                                                Female
                                            </span>
                                        ) : (
                                            <span className="uppercase bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                                                Unknown
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">{student.address3 || '-'}</td>
                                    <td className="px-6 py-4">{student.distance ?? '-'} km</td>
                                    <td className="px-6 py-4">
                                        {hasRoom ? (
                                            <span className="font-medium text-gray-800">
                                                {activeAllocation.roomId?.roomNo || activeAllocation.roomId?.roomID || '-'}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {hasRoom ? (
                                            <span className="uppercase bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                                                Assigned
                                            </span>
                                        ) : (
                                            <span className="uppercase bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
                                                Not Assigned
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
=======
                        {loading && students.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-10 text-center text-gray-500 text-sm">
                                    <RotateCw size={18} className="animate-spin inline-block mr-2 text-[#6b0f14]" />
                                    Loading students...
                                </td>
                            </tr>
                        ) : paginatedStudents.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-10 text-center text-gray-400 text-sm">
                                    No students found for this hostel.
                                </td>
                            </tr>
                        ) : (
                            paginatedStudents.map(({ student, allocations }, idx) => {
                                const gender = (student.sex || '').toLowerCase();
                                const activeAllocation = allocations?.find(a => a.active && a.roomId);
                                const hasRoom = !!activeAllocation;
>>>>>>> Stashed changes

                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="mt-4 flex justify-center gap-4 text-gray-700">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded border border-gray-300 hover:bg-[#fefaf0] disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="px-3 py-1 font-semibold">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded border border-gray-300 hover:bg-[#fefaf0] disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default WardenStudents;
