import axios from 'axios'
import React, { useEffect, useState } from 'react'

import { FaFemale, FaMale } from 'react-icons/fa'


const WardenRooms = () => {
    const [rooms, setRooms] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const recordsPerPage = 15
    const token = localStorage.getItem('login')
    const [wardenHostels, setWardenHostels] = useState([]);

    useEffect(() => {
        axios
            .get(import.meta.env.VITE_APP_API + '/room/warden-Rooms', {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(res => {
                setRooms(res.data.rooms || [])
            })
            .catch(err => console.log(err))
    },)

    // Fetch warden profile to get assigned hostels
    useEffect(() => {
        axios.get(import.meta.env.VITE_APP_API + '/auth/get-currentuser-data', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => {
                setWardenHostels(res.data.Hostels || []);
            })
            .catch(err => console.log(err));
    }, [token]);

    // Filter rooms by search term (roomID or student names)
    const filteredRooms = rooms.filter(room => {
        const term = searchTerm.toLowerCase()
        const roomIdMatch = room.roomID.toLowerCase().includes(term)
        const studentsMatch = room.students.some(student =>
            (student.name || '').toLowerCase().includes(term)
        )
        return roomIdMatch || studentsMatch
    })

    const totalPages = Math.ceil(filteredRooms.length / recordsPerPage)
    const paginatedData = filteredRooms.slice(
        (currentPage - 1) * recordsPerPage,
        currentPage * recordsPerPage
    )

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

            <div className="flex my-4 mb-8">
                {/* <Link to={'/Dashboard/WardenRoomAssignNeed'}>
                    <DefaultBtn
                        label='Assign Student (Needs Available)'
                        type='button'
                    />
                </Link> */}

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
                                    <td className="px-6 py-4">{room.roomID}</td>
                                    <td className="px-6 py-4">{room.capasity}</td>
                                    <td className="px-6 py-4">{room.currentOccupants}</td>
                                    <td className="px-6 py-4">{room.status}</td>
                                    <td className="px-6 py-4">
                                        {room.gender === 'Male' ? (
                                            <span className="flex bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-3 py-1 rounded-full gap-1 items-center">
                                                <FaMale className="h-4 w-auto" />
                                                Male
                                            </span>
                                        ) : room.gender === 'Female' ? (
                                            <span className="flex bg-pink-100 text-pink-700 text-xs font-semibold px-3 py-1 rounded-full gap-1 items-center">
                                                <FaFemale className="h-4 w-auto" />
                                                Female
                                            </span>
                                        ) : (
                                            <span className="flex bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full gap-1 items-center">
                                                REV
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        {room.students.length > 0
                                            ? room.students
                                                .map(s => s.name || s._id)
                                                .join(', ')
                                                .substring(0, 100) + (room.students.length > 5 ? '...' : '')
                                            : 'No students'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan="7"
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
        </div>
    )
}

export default WardenRooms
