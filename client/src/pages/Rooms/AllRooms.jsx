import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import DefaultInput from '../../components/Form/DefaultInput'
import Dropdown from '../../components/Form/Dropdown'
import { FaRegCheckSquare } from "react-icons/fa"
import { BsHouseGearFill } from "react-icons/bs"
import { MdOutlineDoNotDisturbAlt } from "react-icons/md"

const AllRooms = () => {
    const token = localStorage.getItem('login')
    const [roomdata, setroomdata] = useState([])
    const [filteredData, setFilteredData] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [genderFilter, setGenderFilter] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

    useEffect(() => {
        axios.get(import.meta.env.VITE_APP_API + '/room/get-all-rooms', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => {
                setroomdata(res.data.Result)
                setFilteredData(res.data.Result)
            })
            .catch(err => console.log(err))
    }, [token])

    useEffect(() => {
        const term = searchTerm.toLowerCase()

        const filtered = roomdata.filter((room) => {
            const matchesSearch = room.roomID.toLowerCase().includes(term) ||
                room?.hostelID?.name?.toLowerCase().includes(term)

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

    return (
        <div className="p-3 sm:p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                <DefaultInput
                    label="Search"
                    name="search"
                    placeholder="Search by Room ID or Hostel Name..."
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
                                    <td className="px-3 py-2.5 max-w-[110px] break-words whitespace-normal align-top">{data.roomID}</td>
                                    <td className="px-3 py-2.5 align-top">{data.currentOccupants}</td>
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
                                        <Link to={`/Dashboard/View-Room/${data._id}`} className="text-[#6b0f14] font-medium hover:underline">View</Link>
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
        </div>
    )
}

export default AllRooms