import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { FaFemale, FaMale } from 'react-icons/fa'
import { X, UserPlus, Trash2, Users, Search, AlertCircle, Check } from 'lucide-react'
import ActionButtons from '../../components/Buttons/ActionButtons'

const WardenRooms = () => {
    const [rooms, setRooms] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const recordsPerPage = 15
    const token = localStorage.getItem('login')
    const [wardenHostels, setWardenHostels] = useState([])

    // Edit modal state
    const [editingRoom, setEditingRoom] = useState(null)
    const [editForm, setEditForm] = useState({
        _id: '',
        roomID: '',
        capasity: 0,
        currentOccupants: 0,
        gender: '',
        status: 'Availabe',
        students: []
    })
    const [availableStudents, setAvailableStudents] = useState([])
    const [availLoading, setAvailLoading] = useState(false)
    const [studentSearchTerm, setStudentSearchTerm] = useState('')
    const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('')
    const [editLoading, setEditLoading] = useState(false)
    const [editError, setEditError] = useState('')
    const [editSuccess, setEditSuccess] = useState('')

    const fetchRooms = () => {
        axios
            .get(import.meta.env.VITE_APP_API + '/room/warden-Rooms', {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(res => {
                setRooms(res.data.rooms || [])
            })
            .catch(err => console.log(err))
    }

    useEffect(() => {
        if (token) {
            fetchRooms()
        }
    }, [token])

    // Fetch warden profile to get assigned hostels
    useEffect(() => {
        if (token) {
            axios.get(import.meta.env.VITE_APP_API + '/auth/get-currentuser-data', {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(res => {
                    setWardenHostels(res.data.Hostels || [])
                })
                .catch(err => console.log(err))
        }
    }, [token])

    // Fetch available unassigned students for the room's hostel
    const fetchAvailableStudents = async (room) => {
        setAvailLoading(true)
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_APP_API}/room/available-students/${room._id || room.roomID}`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setAvailableStudents(res.data.Result || [])
        } catch (err) {
            console.error('Error fetching available students:', err)
            setAvailableStudents([])
        } finally {
            setAvailLoading(false)
        }
    }

    const handleOpenEditModal = (room) => {
        const assignedStudents = room.students || []
        setEditingRoom(room)
        setEditForm({
            _id: room._id,
            roomID: room.roomID || '',
            capasity: room.capasity ?? 4,
            currentOccupants: room.currentOccupants !== undefined ? room.currentOccupants : assignedStudents.length,
            gender: room.gender || '',
            status: room.status || 'Availabe',
            students: [...assignedStudents],
        })
        setEditError('')
        setEditSuccess('')
        setStudentSearchTerm('')
        setSelectedStudentToAdd('')
        fetchAvailableStudents(room)
    }

    // Add a student to the room
    const handleAddStudent = (studentId) => {
        if (!studentId) return
        const studentObj = availableStudents.find(s => String(s._id) === String(studentId))
        if (!studentObj) return

        setEditForm(prev => {
            const updated = [...prev.students, studentObj]
            const newOccupants = updated.length
            const isFull = newOccupants >= Number(prev.capasity)
            return {
                ...prev,
                students: updated,
                currentOccupants: newOccupants,
                status: isFull ? 'Full' : (prev.status === 'Full' ? 'Availabe' : prev.status)
            }
        })
        // Remove from available dropdown list
        setAvailableStudents(prev => prev.filter(s => String(s._id) !== String(studentId)))
        setSelectedStudentToAdd('')
    }

    // Remove an assigned student from the room
    const handleRemoveStudent = (studentId) => {
        const studentToRemove = editForm.students.find(s => String(s._id || s) === String(studentId))
        setEditForm(prev => {
            const updated = prev.students.filter(s => String(s._id || s) !== String(studentId))
            const newOccupants = updated.length
            return {
                ...prev,
                students: updated,
                currentOccupants: newOccupants,
                status: prev.status === 'Full' && newOccupants < Number(prev.capasity) ? 'Availabe' : prev.status
            }
        })
        if (studentToRemove && studentToRemove._id) {
            setAvailableStudents(prev => [studentToRemove, ...prev])
        }
    }

    const handleSaveRoomEdit = async (e) => {
        e.preventDefault()
        setEditLoading(true)
        setEditError('')
        setEditSuccess('')
        try {
            const payload = {
                _id: editingRoom._id,
                roomID: editingRoom.roomID,
                newRoomID: editForm.roomID,
                capasity: Number(editForm.capasity),
                currentOccupants: Number(editForm.currentOccupants),
                gender: editForm.gender,
                status: editForm.status,
                studentIds: editForm.students.map(s => s._id || s)
            }
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/room/Update-room-capasity`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            if (res.data.Status === 'Success') {
                setEditSuccess('Room details updated successfully!')
                const updatedRoom = res.data.Result
                if (updatedRoom) {
                    setRooms(prev => prev.map(r => r._id === editingRoom._id ? updatedRoom : r))
                } else {
                    fetchRooms()
                }
                setTimeout(() => setEditingRoom(null), 1000)
            } else {
                setEditError(res.data.Error || 'Failed to update room.')
            }
        } catch (err) {
            console.error('Error updating room:', err)
            setEditError('Error updating room. Please try again.')
        } finally {
            setEditLoading(false)
        }
    }

    const handleDeleteRoom = async (roomId) => {
        if (!window.confirm('Delete this room? This will also remove related allocations.')) return;
        try {
            const res = await axios.delete(
                `${import.meta.env.VITE_APP_API}/room/delete-room/${roomId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.Status === 'Success') {
                setRooms(prev => prev.filter(r => r._id !== roomId));
            } else {
                alert(res.data.Error || 'Failed to delete room');
            }
        } catch (err) {
            console.error('Error deleting room:', err);
            alert('Error deleting room');
        }
    }

    // Filter rooms by search term (roomID or student names)
    const filteredRooms = rooms.filter(room => {
        const term = searchTerm.toLowerCase()
        const roomIdMatch = (room.roomID || '').toLowerCase().includes(term)
        const studentsMatch = (room.students || []).some(student =>
            (student?.name || student?.enrolmentNo || '').toLowerCase().includes(term)
        )
        return roomIdMatch || studentsMatch
    })

    const totalPages = Math.ceil(filteredRooms.length / recordsPerPage)
    const paginatedData = filteredRooms.slice(
        (currentPage - 1) * recordsPerPage,
        currentPage * recordsPerPage
    )

    // Filter available students for addition dropdown
    const filteredAvailableStudents = availableStudents.filter(s => {
        const term = studentSearchTerm.toLowerCase()
        if (!term) return true
        return (
            (s.name || '').toLowerCase().includes(term) ||
            (s.enrolmentNo || '').toLowerCase().includes(term) ||
            (s.alDistrict || '').toLowerCase().includes(term)
        )
    })

    return (
        <div className="mt-8">
            {/* Assigned Hostels Section */}
            {wardenHostels.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h2 className="text-lg font-semibold text-[#6b0f14] mb-2">Assigned Hostels</h2>
                    <div className="flex flex-wrap gap-2">
                        {wardenHostels.map((hostel, idx) => (
                            <span key={idx} className="bg-[#fdf6e3] text-[#6b0f14] text-sm font-medium px-3 py-1 rounded-full">
                                {hostel.name}{hostel.gender ? ` (${hostel.gender})` : ''}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            <div className="mb-4 flex items-center gap-8">
                <input
                    type="text"
                    placeholder="Search by Room ID or Student Name"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full max-w-md border border-gray-300 rounded px-4 py-2"
                />
            </div>

            <div className="overflow-x-auto rounded-2xl shadow-lg">
                <table className="min-w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                        <tr>
                            <th className="px-6 py-4">#</th>
                            <th className="px-6 py-4">Room ID</th>
                            <th className="px-6 py-4">Capacity</th>
                            <th className="px-6 py-4">Current Occupants</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Gender</th>
                            <th className="px-6 py-4">Students</th>
                            <th className="px-6 py-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((room, index) => (
                                <tr
                                    key={room._id}
                                    className="hover:bg-[#fefaf0] transition-all duration-150"
                                >
                                    <td className="px-6 py-4 font-medium text-gray-800">
                                        {(currentPage - 1) * recordsPerPage + index + 1}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-gray-800">{room.roomID}</td>
                                    <td className="px-6 py-4">{room.capasity}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            (room.currentOccupants || 0) >= (room.capasity || 0)
                                                ? 'bg-red-100 text-red-800'
                                                : (room.currentOccupants || 0) > 0
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-green-100 text-green-800'
                                        }`}>
                                            {room.currentOccupants ?? 0} / {room.capasity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            room.status === 'Full'
                                                ? 'bg-red-100 text-red-700'
                                                : room.status === 'Repair'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-[#fdf6e3] text-[#6b0f14]'
                                        }`}>
                                            {room.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {room.gender === 'Male' ? (
                                             <span className="flex bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-3 py-1 rounded-full gap-1 items-center w-fit">
                                                <FaMale className="h-4 w-auto" />
                                                Male
                                            </span>
                                        ) : room.gender === 'Female' ? (
                                            <span className="flex bg-pink-100 text-pink-700 text-xs font-semibold px-3 py-1 rounded-full gap-1 items-center w-fit">
                                                <FaFemale className="h-4 w-auto" />
                                                Female
                                            </span>
                                        ) : (
                                            <span className="flex bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full gap-1 items-center w-fit">
                                                REV
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        {room.students && room.students.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {room.students.map((s, idx) => (
                                                    <span
                                                        key={s?._id || idx}
                                                        className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded border border-gray-200"
                                                        title={`${s?.name || ''} (${s?.enrolmentNo || ''})`}
                                                    >
                                                        {s?.name || s?.enrolmentNo || s?._id || 'Student'}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">No students</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <ActionButtons
                                            onEdit={() => handleOpenEditModal(room)}
                                            onDelete={() => handleDeleteRoom(room._id)}
                                            editTitle="Edit room details"
                                            deleteTitle="Delete this room"
                                            showLabels={false}
                                            size="sm"
                                        />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan="8"
                                    className="px-6 py-4 text-center text-gray-500"
                                >
                                    No rooms found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="mt-4 flex justify-center gap-4 text-gray-700">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded border border-gray-300 hover:bg-[#fefaf0] disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="px-3 py-1 font-semibold">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded border border-gray-300 hover:bg-[#fefaf0] disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Comprehensive Edit Room Modal */}
            {editingRoom && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-[#6b0f14] text-white flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Users size={20} className="text-[#fdf6e3]" />
                                    Edit Room Details
                                </h3>
                                <p className="text-xs text-[#fdf6e3]/80">
                                    {editingRoom.roomID} {editingRoom.hostelID?.name ? `• ${editingRoom.hostelID.name}` : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingRoom(null)}
                                className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveRoomEdit} className="p-6 overflow-y-auto space-y-6 flex-1">
                            {editError && (
                                <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} className="shrink-0 text-red-500" />
                                    <span>{editError}</span>
                                </div>
                            )}
                            {editSuccess && (
                                <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-medium flex items-center gap-2">
                                    <Check size={16} className="shrink-0 text-emerald-600" />
                                    <span>{editSuccess}</span>
                                </div>
                            )}

                            {/* Section 1: Room Properties */}
                            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6b0f14]">Room Configuration</h4>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Room ID / Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={editForm.roomID}
                                            onChange={e => setEditForm(prev => ({ ...prev, roomID: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14] bg-white font-medium"
                                            placeholder="e.g. Ramanathan/1"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Capacity (Max Beds) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            required
                                            value={editForm.capasity}
                                            onChange={e => {
                                                const val = Number(e.target.value)
                                                setEditForm(prev => ({
                                                    ...prev,
                                                    capasity: val,
                                                    status: prev.students.length >= val ? 'Full' : (prev.status === 'Full' ? 'Availabe' : prev.status)
                                                }))
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14] bg-white font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Current Occupants <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={editForm.capasity || 10}
                                            required
                                            value={editForm.currentOccupants}
                                            onChange={e => setEditForm(prev => ({ ...prev, currentOccupants: Number(e.target.value) }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14] bg-white font-medium"
                                        />
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            {editForm.students.length} student(s) currently listed
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Gender <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            value={editForm.gender}
                                            onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14] bg-white font-medium"
                                        >
                                            <option value="">-- Select --</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="REV">REV</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Status <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            value={editForm.status}
                                            onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14] bg-white font-medium"
                                        >
                                            <option value="Availabe">Available</option>
                                            <option value="Repair">Repair</option>
                                            <option value="Full">Full</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Assigned Students */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6b0f14] flex items-center gap-1.5">
                                        <Users size={16} />
                                        Assigned Students
                                    </h4>
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                        editForm.students.length >= editForm.capasity
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {editForm.students.length} / {editForm.capasity} Beds
                                    </span>
                                </div>

                                {editForm.students && editForm.students.length > 0 ? (
                                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                        {editForm.students.map((student, idx) => {
                                            const stId = student._id || student
                                            return (
                                                <div
                                                    key={stId || idx}
                                                    className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-[#fdf6e3] text-[#6b0f14] font-bold text-xs flex items-center justify-center shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-800">
                                                                {student.name || student.fullName || `Student #${stId}`}
                                                            </p>
                                                            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                                                {student.enrolmentNo && (
                                                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                                        {student.enrolmentNo}
                                                                    </span>
                                                                )}
                                                                {student.sex && (
                                                                    <span>{student.sex}</span>
                                                                )}
                                                                {student.alDistrict && (
                                                                    <span>• {student.alDistrict}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveStudent(stId)}
                                                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                                                        title="Remove from room"
                                                    >
                                                        <Trash2 size={16} />
                                                        <span className="hidden sm:inline">Remove</span>
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                        <p className="text-xs text-gray-500">No students currently assigned to this room.</p>
                                    </div>
                                )}
                            </div>

                            {/* Section 3: Add Student to Room */}
                            <div className="bg-[#fefaf0] p-4 rounded-xl border border-[#eedab2] space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6b0f14] flex items-center gap-1.5">
                                    <UserPlus size={16} />
                                    Assign Student to This Room
                                </h4>

                                {editForm.students.length >= editForm.capasity ? (
                                    <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                                        Room is currently full ({editForm.students.length}/{editForm.capasity}). Increase capacity above if you wish to assign more students.
                                    </p>
                                ) : availLoading ? (
                                    <p className="text-xs text-gray-500 italic">Loading unassigned hostel students...</p>
                                ) : availableStudents.length > 0 ? (
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Filter available students by name or reg number..."
                                                value={studentSearchTerm}
                                                onChange={e => setStudentSearchTerm(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6b0f14]"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <select
                                                value={selectedStudentToAdd}
                                                onChange={e => setSelectedStudentToAdd(e.target.value)}
                                                className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30"
                                            >
                                                <option value="">-- Choose unassigned student ({filteredAvailableStudents.length} available) --</option>
                                                {filteredAvailableStudents.map(st => (
                                                    <option key={st._id} value={st._id}>
                                                        {st.name} ({st.enrolmentNo || 'No Reg'}) {st.sex ? `- ${st.sex}` : ''} {st.alDistrict ? `[${st.alDistrict}]` : ''}
                                                    </option>
                                                ))}
                                            </select>

                                            <button
                                                type="button"
                                                disabled={!selectedStudentToAdd}
                                                onClick={() => handleAddStudent(selectedStudentToAdd)}
                                                className="px-4 py-2 text-xs font-semibold text-white bg-[#6b0f14] hover:bg-[#7c1119] rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                                            >
                                                <UserPlus size={14} />
                                                Add to Room
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500">No unassigned students waiting in this hostel.</p>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingRoom(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="px-5 py-2 text-sm font-semibold text-white bg-[#6b0f14] hover:bg-[#7c1119] rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                                >
                                    {editLoading ? 'Saving Changes...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default WardenRooms
