import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ActionButtons from '../../components/Buttons/ActionButtons'

import DefaultInput from '../../components/Form/DefaultInput'
import Dropdown from '../../components/Form/Dropdown'
import { FaRegCheckSquare } from "react-icons/fa"
import { BsHouseGearFill } from "react-icons/bs"
import { MdOutlineDoNotDisturbAlt } from "react-icons/md"
import { X, Users, UserPlus, Trash2, Search, AlertCircle, Check } from 'lucide-react'

const AllRooms = () => {
    const token = localStorage.getItem('login')
    const navigate = useNavigate()
    const [roomdata, setroomdata] = useState([])
    const [filteredData, setFilteredData] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [genderFilter, setGenderFilter] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

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

    const fetchAllRooms = () => {
        axios.get(import.meta.env.VITE_APP_API + '/room/get-all-rooms', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                setroomdata(res.data.Result || [])
                setFilteredData(res.data.Result || [])
            })
            .catch(err => console.log(err))
    }

    useEffect(() => {
        fetchAllRooms()
    }, [token])

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
        setAvailableStudents(prev => prev.filter(s => String(s._id) !== String(studentId)))
        setSelectedStudentToAdd('')
    }

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
                setEditSuccess('Room updated successfully!')
                const updatedRoom = res.data.Result
                if (updatedRoom) {
                    setroomdata(prev => prev.map(r => r._id === editingRoom._id ? updatedRoom : r))
                    setFilteredData(prev => prev.map(r => r._id === editingRoom._id ? updatedRoom : r))
                } else {
                    fetchAllRooms()
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

    useEffect(() => {
        const term = searchTerm.toLowerCase()

        const filtered = roomdata.filter((room) => {
            const matchesSearch = room.roomID.toLowerCase().includes(term) ||
                room?.hostelID?.name?.toLowerCase().includes(term) ||
                (room.students || []).some(s => (s?.name || s?.enrolmentNo || '').toLowerCase().includes(term))

            const matchesStatus = statusFilter ? room.status === statusFilter : true
            const matchesGender = genderFilter ? room.gender === genderFilter : true

            return matchesSearch && matchesStatus && matchesGender
        })

        setFilteredData(filtered)
        setCurrentPage(1)
    }, [searchTerm, statusFilter, genderFilter, roomdata])

    const handleSearch = (e) => setSearchTerm(e.target.value)
    const handleStatusChange = (e) => setStatusFilter(e.target.value)
    const handleGenderChange = (e) => setGenderFilter(e.target.value)

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(filteredData.length / itemsPerPage)

    const goToPage = (page) => {
        if (page > 0 && page <= totalPages) setCurrentPage(page)
    }

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
        <div className="p-3 sm:p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                <DefaultInput
                    label="Search"
                    name="search"
                    placeholder="Search by Room ID, Student, Hostel..."
                    value={searchTerm}
                    onChange={handleSearch}
                />

                <Dropdown
                    label="Filter by Status"
                    name="status"
                    value={statusFilter}
                    onChange={handleStatusChange}
                    options={[
                        { label: "Available", value: "Availabe" },
                        { label: "Repair", value: "Repair" },
                        { label: "Full", value: "Full" }
                    ]}
                />

                <Dropdown
                    label="Filter by Gender"
                    name="gender"
                    value={genderFilter}
                    onChange={handleGenderChange}
                    options={[
                        { label: "Male", value: "Male" },
                        { label: "Female", value: "Female" },
                        { label: "REV", value: "REV" }
                    ]}
                />
            </div>

            <div className="overflow-x-auto rounded-xl shadow-md">
                <table className="min-w-full text-xs sm:text-sm text-left text-gray-600 bg-white">
                    <thead className="text-[10px] sm:text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                        <tr>
                            <th className="px-3 py-2.5 font-semibold">#</th>
                            <th className="px-3 py-2.5 font-semibold">Room No</th>
                            <th className="px-3 py-2.5 font-semibold">Current Occupants</th>
                            <th className="px-3 py-2.5 font-semibold">Capacity</th>
                            <th className="px-3 py-2.5 font-semibold">Status</th>
                            <th className="px-3 py-2.5 font-semibold">Gender</th>
                            <th className="px-3 py-2.5 font-semibold">Hostel</th>
                            <th className="px-3 py-2.5 font-semibold">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {
                            currentItems.length > 0 ? currentItems.map((data, index) => (
                                <tr key={index} className="hover:bg-[#fefaf0] transition-all duration-150">
                                    <td className="px-3 py-2.5 font-medium text-gray-800 align-top">{indexOfFirstItem + index + 1}</td>
                                    <td className="px-3 py-2.5 max-w-[110px] break-words whitespace-normal align-top font-semibold">{data.roomID}</td>
                                    <td className="px-3 py-2.5 align-top">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            (data.currentOccupants || 0) >= (data.capasity || 0)
                                                ? 'bg-red-100 text-red-800'
                                                : (data.currentOccupants || 0) > 0
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-green-100 text-green-800'
                                        }`}>
                                            {data.currentOccupants ?? 0}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 align-top">{data.capasity}</td>
                                    <td className="px-3 py-2.5 align-top">
                                        {
                                            data.status === "Availabe" ? (
                                                <span className="flex items-center gap-1 bg-[#fdf6e3] text-[#6b0f14] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                                                    <FaRegCheckSquare className="h-3.5 w-auto" /> Available
                                                </span>
                                            ) : data.status === "Repair" ? (
                                                <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                                                    <BsHouseGearFill className="h-3.5 w-auto" /> Repair
                                                </span>
                                            ) : data.status === "Full" ? (
                                                <span className="flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                                                    <MdOutlineDoNotDisturbAlt className="h-3.5 w-auto" /> Full
                                                </span>
                                            ) : null
                                        }
                                    </td>
                                    <td className="px-3 py-2.5 align-top">{data.gender || '-'}</td>
                                    <td className="px-3 py-2.5 max-w-[130px] break-words whitespace-normal align-top">{data?.hostelID?.name}</td>
                                    <td className="px-3 py-2.5 align-top">
                                        <ActionButtons
                                            onEdit={() => handleOpenEditModal(data)}
                                            onDelete={async () => {
                                                if (!window.confirm('Delete this room? This will also remove related allocations.')) return;
                                                try {
                                                    const res = await axios.delete(
                                                        `${import.meta.env.VITE_APP_API}/room/delete-room/${data._id}`,
                                                        { headers: { Authorization: `Bearer ${token}` } }
                                                    );
                                                    if (res.data.Status === 'Success') {
                                                        setroomdata(prev => prev.filter(r => r._id !== data._id));
                                                        setFilteredData(prev => prev.filter(r => r._id !== data._id));
                                                    } else {
                                                        alert(res.data.Error || 'Failed to delete room');
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                    alert('Error deleting room');
                                                }
                                            }}
                                            editTitle="Edit room details"
                                            deleteTitle="Delete this room"
                                            showLabels={false}
                                        />
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" className="px-3 py-3 text-center text-gray-500">No matching records found.</td>
                                </tr>
                            )
                        }
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 text-xs sm:text-sm border rounded hover:bg-[#fdf6e3] disabled:opacity-50"
                    >
                        Prev
                    </button>
                    {[...Array(totalPages)].map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToPage(index + 1)}
                            className={`px-2.5 py-1 text-xs sm:text-sm border rounded ${currentPage === index + 1 ? 'bg-[#6b0f14] text-white' : 'hover:bg-[#fdf6e3]'}`}
                        >
                            {index + 1}
                        </button>
                    ))}
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 text-xs sm:text-sm border rounded hover:bg-[#fdf6e3] disabled:opacity-50"
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
                                    {editingRoom.roomID} {editingRoom.hostelID?.name ? `— ${editingRoom.hostelID.name}` : ''}
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

export default AllRooms