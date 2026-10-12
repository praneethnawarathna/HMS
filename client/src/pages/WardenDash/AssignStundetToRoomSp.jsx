import React, { useEffect, useState } from 'react';
import { getUserInfoFromToken } from '../../utils/auth';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import DefaultBtn from '../../components/Buttons/DefaultBtn';

const AssignStundetToRoomSp = () => {
    const navigate = useNavigate()
    const { id } = useParams();
    const { roles } = getUserInfoFromToken() || {};
    const token = localStorage.getItem('login');

    const roleNames = Array.isArray(roles)
        ? roles.map(r => (typeof r === 'string' ? r : r.name))
        : [typeof roles === 'string' ? roles : roles?.name];

    const [getallrooms, setgetallrooms] = useState([]);
    const [getsdt, setgetstd] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [roomQuery, setRoomQuery] = useState('')
    const [message, setMessage] = useState('');

    useEffect(() => {
        axios.get(import.meta.env.VITE_APP_API + '/warden/all-rooms', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => setgetallrooms(res.data.Result))
            .catch(err => console.log(err));
    }, []);

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_APP_API}/student/get-student-byID/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => setgetstd(res.data.Result))
            .catch(err => console.log(err));
    }, [id]);

    const handleAssignRoom = async (e) => {
        e.preventDefault();
        if (!selectedRoomId) {
            setMessage('Please select a room');
            return;
        }

        try {
            const res = await axios.post(`${import.meta.env.VITE_APP_API}/warden/assign-room-special`, {
                studentId: id,
                roomId: selectedRoomId
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.Status === "Success") {
                alert(res.data.Message)
                navigate('/Dashboard/AssignStudentViaNeeds')
            } else {
                alert(res.data.Error || 'Failed to assign room');
            }
        } catch (err) {
            console.error(err);
            setMessage('Something went wrong.');
        }
    };

    if (!(roleNames.includes('admin') || roleNames.includes('director') || roleNames.includes('warden'))) return null;

    return (
        <div>
            <div className="-mt-4 mb-2">
                <Link to={'/Dashboard/AssignStudentViaNeeds'}>
                    <DefaultBtn type='button' label='Back' />
                </Link>
            </div>

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#6b0f14]">Assign Student Room - {id}</h2>
                <p className="text-gray-500 text-sm">(via Special Needs)</p>
            </div>

            <div className="mb-4">
                <h1 className="text-gray-500 font-bold text-2xl mb-4">Student Information</h1>
                <div className="grid grid-cols-3 gap-4">
                    <Detail label="Student Email" value={getsdt?.email} />
                    
                    <Detail label="Student NIC" value={getsdt?.nic} />
                    <Detail label="Student Enrolment No" value={getsdt?.enrolmentNo} />
                </div>
            </div>

            <div>
                <h1 className="text-xl font-semibold text-[#6b0f14]">Assign Room for Student</h1>
                <form onSubmit={handleAssignRoom} className="mt-6 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Available Rooms</h2>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
                            <div className="flex-1">
                                <div className="mb-2 text-sm text-gray-600">{getallrooms?.length || 0} rooms available</div>
                                <input
                                    type="search"
                                    placeholder="Search rooms by room no or id"
                                    value={roomQuery}
                                    onChange={(e) => setRoomQuery(e.target.value)}
                                    className="w-full md:w-96 border rounded px-3 py-2"
                                />

                                <select
                                    value={selectedRoomId}
                                    onChange={(e) => setSelectedRoomId(e.target.value)}
                                    className="mt-3 w-full md:w-96 border rounded px-3 py-2 bg-white"
                                >
                                    <option value="">-- Select a room --</option>
                                    {getallrooms
                                        .filter((r) => {
                                            const q = roomQuery.trim().toLowerCase();
                                            if (!q) return true;
                                            return (
                                                String(r.roomID || r.roomNo || r.name || r._id).toLowerCase().includes(q) ||
                                                String(r._id).toLowerCase().includes(q)
                                            );
                                        })
                                        .map((room) => {
                                            const cap = room.capasity || room.capacity || 4
                                            const full = (room.currentOccupants || 0) >= cap || room.status === 'Full'
                                            return (
                                                <option key={room._id} value={room._id} disabled={full}>
                                                    {room.roomID || room.roomNo || room.name || room._id} — {room.currentOccupants || 0}/{cap} {full ? '(Full)' : ''}
                                                </option>
                                            )
                                        })}
                                </select>

                                {selectedRoomId && (
                                    (() => {
                                        const sel = getallrooms.find(r => r._id === selectedRoomId)
                                        if (!sel) return null
                                        const cap = sel.capasity || sel.capacity || 4
                                        return (
                                            <div className="mt-3 p-3 border rounded bg-white shadow-sm">
                                                <div className="text-sm text-gray-700 font-semibold">{sel.roomID || sel.roomNo || sel.name}</div>
                                                <div className="text-sm text-gray-500">Occupants: {sel.currentOccupants || 0}/{cap}</div>
                                                {sel.hostelName && <div className="text-sm text-gray-500">Hostel: {sel.hostelName}</div>}
                                            </div>
                                        )
                                    })()
                                )}
                            </div>

                            <div className="flex-shrink-0">
                                <DefaultBtn type="submit" label="✅ Assign Room to Student" />
                                {message && (
                                    <p className="mt-2 text-sm font-medium text-red-600">
                                        {message}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </form>

            </div>
        </div>
    );
};

const Detail = ({ label, value }) => (
    <div>
        <p className="text-[#6b0f14] font-semibold">{label}</p>
        <p className="text-gray-800">{value || '-'}</p>
    </div>
);

export default AssignStundetToRoomSp;
