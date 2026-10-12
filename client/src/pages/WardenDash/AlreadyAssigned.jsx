import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { getUserInfoFromToken } from '../../utils/auth';
import { Link, useNavigate } from 'react-router-dom';
import DefaultBtn from '../../components/Buttons/DefaultBtn';
import { FaGraduationCap } from 'react-icons/fa6';
import axios from 'axios'

const AlreadyAssigned = () => {
    const navigate = useNavigate()
    const { roles } = getUserInfoFromToken() || {};
    const token = localStorage.getItem('login');

    const roleNames = useMemo(() => {
        return Array.isArray(roles)
            ? roles.map(r => (typeof r === 'string' ? r : r.name))
            : [typeof roles === 'string' ? roles : roles?.name];
    }, [roles]);

    useEffect(() => {
        if (!(roleNames.includes('admin') || roleNames.includes('director') || roleNames.includes('warden'))) {
            localStorage.clear();
            navigate('/', { replace: true });
        }
    }, [roleNames, navigate]);

    const [assignedstd, setassignedstd] = useState([])
    const [searchTerm, setSearchTerm] = useState("");
    const [_currentPage, setCurrentPage] = useState(1);
    const _itemsPerPage = 15;
    const [unassigningIds, setUnassigningIds] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [_roomsLoading, setRoomsLoading] = useState(false);
    const [showReassignFor, setShowReassignFor] = useState(null);
    const [selectedRoomByAlloc, setSelectedRoomByAlloc] = useState({});
    const [reassigningIds, setReassigningIds] = useState([]);

    // Fetch assigned allocations or warden-specific student allocations
    const fetchAssigned = useCallback(async () => {
        try {
            const headers = { headers: { 'Authorization': `Bearer ${token}` } };
            const currentUser = getUserInfoFromToken() || {};
            // Prefer warden-specific endpoint (returns { student, allocations }) when available
            if (currentUser.email) {
                try {
                    const url = `${import.meta.env.VITE_APP_API}/hostel/warden-students`;
                    const res = await axios.get(url, headers);
                    // console.log('hostel/warden-students response', res.data);
                    if (res?.data?.Result && res.data.Result.length > 0) {
                        setassignedstd(res.data.Result);
                        return;
                    }
                } catch (e) {
                    // ignore and fallback
                    console.warn('hostel/warden-students failed:', e?.response?.data || e.message || e);
                }
            }

            // Fallback to the global assigned-students endpoint
            const res2 = await axios.get(`${import.meta.env.VITE_APP_API}/warden/assigned-students`, headers);
            // console.log('warden/assigned-students response', res2.data);
            setassignedstd(res2.data.Result || []);
        } catch (err) {
            console.error('Error fetching assigned students:', err?.response?.data || err.message || err);
        }
    }, [token]);

    useEffect(() => {
        fetchAssigned();
    }, [fetchAssigned]);

    // Fetch rooms for reassign select (try multiple endpoints and normalize)
    const fetchRooms = useCallback(async () => {
        setRoomsLoading(true);
        try {
            const endpoints = [
                `${import.meta.env.VITE_APP_API}/warden/all-rooms`,
                `${import.meta.env.VITE_APP_API}/room/warden-Rooms`,
                `${import.meta.env.VITE_APP_API}/room/get-all-rooms`
            ];

            for (const url of endpoints) {
                try {
                    const res = await axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
                    // Normalize possible shapes
                    const data = res?.data || {};
                    const roomsCandidate = data.Result || data.rooms || data.result || data;

                    if (Array.isArray(roomsCandidate) && roomsCandidate.length > 0) {
                        setRooms(roomsCandidate);
                        return;
                    }

                    // If the API returned an object with a nested rooms array
                    if (data?.rooms && Array.isArray(data.rooms) && data.rooms.length > 0) {
                        setRooms(data.rooms);
                        return;
                    }
                } catch (e) {
                    // keep trying next endpoint
                    console.warn('fetchRooms attempt failed for', url, e?.response?.data || e.message || e);
                }
            }

            // none returned rooms
            setRooms([]);
        } finally {
            setRoomsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    const handleUnassign = async (allocationId) => {
        if (!allocationId) return;
        if (!window.confirm('Unassign this student from the room?')) return;

        try {
            setUnassigningIds(prev => [...prev, allocationId]);
            const res = await axios.post(`${import.meta.env.VITE_APP_API}/warden/unassign-student/${allocationId}`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.Status === 'Success') {
                // refresh list
                await fetchAssigned();
            } else {
                alert(res.data.Error || 'Failed to unassign student');
            }
        } catch (err) {
            console.error('Unassign error:', err);
            alert('Failed to unassign student');
        } finally {
            setUnassigningIds(prev => prev.filter(id => id !== allocationId));
        }
    };
    
    const getStudentIdFromItem = (item) => {
        if (!item) return null;
        if (item.regNo && item.regNo._id) return item.regNo._id;
        if (item.student && item.student._id) return item.student._id;
        if (typeof item.regNo === 'string' && /^[0-9a-fA-F]{24}$/.test(item.regNo)) return item.regNo;
        return null;
    };

    const handleShowReassign = (allocationId, item) => {
        setShowReassignFor(allocationId);
        // preselect current room if available
        const currentRoomId = item?.roomId?._id || item?.roomId?.id || null;
        setSelectedRoomByAlloc(prev => ({ ...prev, [allocationId]: currentRoomId }));
    };

    const handleCancelReassign = (allocationId) => {
        setShowReassignFor(null);
        setSelectedRoomByAlloc(prev => {
            const copy = { ...prev };
            delete copy[allocationId];
            return copy;
        });
    };

    const handleReassignConfirm = async (allocationId, item) => {
        const selectedRoom = selectedRoomByAlloc[allocationId];
        if (!selectedRoom) return alert('Please select a room');

        const studentId = getStudentIdFromItem(item);
        if (!studentId) return alert('Student id not found for this allocation');

        try {
            setReassigningIds(prev => [...prev, allocationId]);
            const res = await axios.post(`${import.meta.env.VITE_APP_API}/warden/assign-room-special`, {
                studentId,
                roomId: selectedRoom
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Handle various server response shapes and surface helpful messages
            const data = res?.data || {};
            if (data.Status === 'Success' || data.status === 'Success') {
                await fetchAssigned();
                setShowReassignFor(null);
                return;
            }

            const serverMsg = data.Error || data.error || data.Message || data.message || JSON.stringify(data);
            console.warn('assign-room-special response:', data);
            alert('Failed to assign room: ' + serverMsg);
        } catch (err) {
            console.error('Reassign error:', err);
            const rdata = err?.response?.data;
            const msg = rdata?.Error || rdata?.error || rdata?.message || err.message;
            alert('Failed to assign room: ' + (msg || 'Unknown error'));
        } finally {
            setReassigningIds(prev => prev.filter(id => id !== allocationId));
        }
    };
    const groupedRooms = useMemo(() => {
        const term = (searchTerm || '').trim().toLowerCase();
        const map = {};

        // Normalize different backend shapes:
        // - Allocation docs: { _id, regNo, roomId }
        // - Warden endpoint: { student, allocations: [{ allocationId, roomId, ... }] }
        const flat = [];

        if (Array.isArray(assignedstd) && assignedstd.length > 0) {
            const first = assignedstd[0];
            if (first && first.student && Array.isArray(first.allocations)) {
                // shape: [{ student, allocations: [...] }]
                assignedstd.forEach(s => {
                    const student = s.student || s.regNo || {};
                    (s.allocations || []).forEach(a => {
                        // skip allocations that are not assigned to any room
                        if (!a.roomId) return;
                        flat.push({
                            _id: a.allocationId || a._id,
                            regNo: student,
                            roomId: a.roomId || null,
                            raw: a
                        });
                    });
                });
            } else {
                // assume already allocations array — only include those with roomId
                assignedstd.forEach(a => {
                    if (!a.roomId) return;
                    flat.push(a);
                });
            }
        }

        flat.forEach(item => {
            if (!item) return;
            const student = item.regNo || {};
            const roomKey = (item.roomId?.roomID || item.roomId?.roomNo || 'Unassigned').toString();

            if (term) {
                const matches = (student?.email || '').toLowerCase().includes(term) ||
                    (student?.enrolmentNo || '').toLowerCase().includes(term) ||
                    (student?.nic || '').toLowerCase().includes(term) ||
                    roomKey.toLowerCase().includes(term);
                if (!matches) return;
            }

            if (!map[roomKey]) map[roomKey] = { room: item.roomId || null, students: [] };
            map[roomKey].students.push(item);
        });

        const arr = Object.keys(map).map(key => ({ roomKey: key, room: map[key].room, students: map[key].students }));
        arr.sort((a, b) => a.roomKey.localeCompare(b.roomKey, undefined, { numeric: true }));
        return arr;
    }, [assignedstd, searchTerm]);

    const assignedCount = useMemo(() => {
        return (groupedRooms || []).reduce((sum, g) => sum + (g.students?.length || 0), 0);
    }, [groupedRooms]);

    

    return (
        <div>
            <div className="-mt-4 mb-2">
                <Link to={'/Dashboard/WardenStudents'}>
                    <DefaultBtn type='button' label='Back' />
                </Link>
            </div>

            <div className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
                    <div className="relative bg-[#6b0f14] text-white p-6 rounded-2xl shadow-lg overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                        <div className="absolute right-4 top-4 opacity-20 text-white text-6xl">
                            <FaGraduationCap />
                        </div>

                        <div className="relative z-10">
                            <div className="text-sm font-medium uppercase tracking-wide text-[#fdf6e3]">
                                Total Assigned Students
                            </div>
                            <div className="mt-2 text-3xl font-bold">{assignedCount}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by Email, Enrolment No, NIC, Room ID"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="w-full p-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6b0f14]"
                />
            </div>

            <div className="space-y-4">
                {groupedRooms.length === 0 ? (
                    <div className="p-6 text-center text-gray-600">No assigned students found.</div>
                ) : (
                    groupedRooms.map((grp) => (
                        <div key={grp.room?._id || grp.roomKey} className="bg-white rounded-2xl shadow p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-xs text-gray-500">Room</div>
                                    <div className="text-lg font-semibold">{grp.roomKey}</div>
                                    {grp.room?.hostelID && (
                                        <div className="text-sm text-gray-400">Hostel: {grp.room.hostelID}</div>
                                    )}
                                </div>

                                <div className="text-right">
                                    <div className="text-xs text-gray-500">Occupants</div>
                                    <div className="text-lg font-semibold">
                                        {grp.students.length}{grp.room?.capasity ? ` / ${grp.room.capasity}` : ''}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm text-left text-gray-600">
                                    <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">#</th>
                                            <th className="px-6 py-3 font-semibold">Enrolment No</th>
                                            <th className="px-6 py-3 font-semibold">Email</th>
                                            <th className="px-6 py-3 font-semibold">NIC</th>
                                            <th className="px-6 py-3 font-semibold">Gender</th>
                                            <th className="px-6 py-3 font-semibold">Intake Year</th>
                                            <th className="px-6 py-3 font-semibold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {grp.students.map((item, idx) => {
                                            const rowKey = item._id || idx;
                                            return (
                                                <React.Fragment key={rowKey}>
                                                    <tr className="hover:bg-gray-50">
                                                        <td className="px-6 py-3">{idx + 1}</td>
                                                        <td className="px-6 py-3">{item?.regNo?.enrolmentNo ?? 'N/A'}</td>
                                                        <td className="px-6 py-3">{item?.regNo?.email ?? 'N/A'}</td>
                                                        <td className="px-6 py-3">{item?.regNo?.nic ?? 'N/A'}</td>
                                                        <td className="px-6 py-3">{item?.regNo?.sex ?? 'N/A'}</td>
                                                        <td className="px-6 py-3">
                                                            {item?.regNo?.dateOfEnrolment
                                                                ? new Date(item.regNo.dateOfEnrolment).getFullYear()
                                                                : 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleUnassign(item._id)}
                                                                    disabled={unassigningIds.includes(item._id)}
                                                                    className={`px-3 py-1 text-xs font-semibold rounded ${unassigningIds.includes(item._id) ? 'bg-red-200 text-red-600 cursor-not-allowed' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                                                >
                                                                    {unassigningIds.includes(item._id) ? 'Unassigning...' : 'Unassign'}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleShowReassign(item._id, item)}
                                                                    className="px-3 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                                >
                                                                    Reassign
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                        {showReassignFor === item._id && (
                                                        <tr>
                                                            <td colSpan={7} className="px-6 py-3 bg-gray-50">
                                                                <div className="flex items-center gap-2">
                                                                    <select
                                                                        value={selectedRoomByAlloc[item._id] || ''}
                                                                        onChange={(e) => setSelectedRoomByAlloc(prev => ({ ...prev, [item._id]: e.target.value }))}
                                                                        className="px-2 py-1 border rounded text-sm min-w-[220px]"
                                                                    >
                                                                        <option value="">Select room</option>
                                                                        {rooms.length === 0 ? (
                                                                            <option value="" disabled>No rooms available</option>
                                                                        ) : (
                                                                            rooms.map(room => (
                                                                                <option
                                                                                    key={room._id}
                                                                                    value={room._id}
                                                                                    disabled={room.status === 'Full' || (room.currentOccupants ?? 0) >= (room.capasity ?? 0)}
                                                                                >
                                                                                    {room.roomID} ({room.currentOccupants ?? 0}/{room.capasity ?? 0}){room.status === 'Full' ? ' - Full' : ''}
                                                                                </option>
                                                                            ))
                                                                        )}
                                                                    </select>

                                                                    <button
                                                                        onClick={() => handleReassignConfirm(item._id, item)}
                                                                        disabled={reassigningIds.includes(item._id)}
                                                                        className={`px-3 py-1 text-xs font-semibold rounded ${reassigningIds.includes(item._id) ? 'bg-green-200 text-green-600 cursor-not-allowed' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                                                    >
                                                                        {reassigningIds.includes(item._id) ? 'Assigning...' : 'Confirm'}
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleCancelReassign(item._id)}
                                                                        className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default AlreadyAssigned
