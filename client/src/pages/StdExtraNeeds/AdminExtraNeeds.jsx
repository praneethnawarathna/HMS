import axios from 'axios'
import React, { useEffect, useState } from 'react'
import DefaultInput from '../../components/Form/DefaultInput'
import { FaRegCheckSquare } from 'react-icons/fa'
import { BsHouseGearFill } from 'react-icons/bs'

const AdminExtraNeeds = () => {
    const [getExtraNeeds, setGetExtraNeeds] = useState([])
    const [filteredData, setFilteredData] = useState([])
    const [search, setSearch] = useState('')
    const [searchField, setSearchField] = useState('email')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

    const token = localStorage.getItem('login')

    useEffect(() => {
        axios.get(import.meta.env.VITE_APP_API + '/admin/student-extra-needs', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => {
                console.log("API raw data:", res.data)
                if (res.data && res.data.Result) {
                    setGetExtraNeeds(res.data.Result)
                    setFilteredData(res.data.Result)
                } else {
                    console.error("API returned no Result:", res.data)
                    setGetExtraNeeds([])
                    setFilteredData([])
                }
            })
            .catch(err => {
                console.error("API error:", err)
                setGetExtraNeeds([])
                setFilteredData([])
            })
    }, [token])

    useEffect(() => {
        const specialCategories = ['Special need', 'Medical', 'Sports']
        const extraNeedsOnly = (getExtraNeeds || []).filter(item => {
            return !specialCategories.includes(item.needs)
        })

        const filtered = extraNeedsOnly.filter(item => {
            const searchLower = search.toLowerCase()
            
            if (searchField === 'email' && item.email) {
                return item.email.toLowerCase().includes(searchLower)
            }
            if (searchField === 'enrolmentNo' && item.enrolmentNo) {
                return item.enrolmentNo.toLowerCase().includes(searchLower)
            }
            if (searchField === 'hostel' && item.hostelName) {
                return item.hostelName.toLowerCase().includes(searchLower)
            }
            return false
        })
        setFilteredData(filtered)
        setCurrentPage(1)
    }, [search, getExtraNeeds, searchField])

    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = (filteredData || []).slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil((filteredData || []).length / itemsPerPage)

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-[#6b0f14] mb-6">Student Extra Needs</h1>
            
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <DefaultInput
                    label="Search"
                    name="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Type to search..."
                />
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-2">Search By</label>
                    <select
                        value={searchField}
                        onChange={(e) => setSearchField(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6b0f14] focus:border-transparent"
                    >
                        <option value="email">Email</option>
                        <option value="enrolmentNo">Enrollment No.</option>
                        <option value="hostel">Hostel</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl shadow-lg">
                <table className="min-w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                        <tr>
                            <th className="px-6 py-4 font-semibold">#</th>
                            <th className="px-6 py-4 font-semibold">Enrollment No.</th>
                            <th className="px-6 py-4 font-semibold">Email</th>
                            <th className="px-6 py-4 font-semibold">Hostel</th>
                            <th className="px-6 py-4 font-semibold">Room ID</th>
                            <th className="px-6 py-4 font-semibold">Extra Need</th>
                            <th className="px-6 py-4 font-semibold">Remark</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {(currentItems || []).length > 0 ? currentItems.map((data, index) => (
                            (() => {
                                const decision = data?.decision || (data?.isAccpeted ? 'approved' : 'pending')
                                return (
                            <tr key={data._id} className="hover:bg-[#fefaf0] transition-all duration-150">
                                <td className="px-6 py-4 font-medium text-gray-800">
                                    {indexOfFirstItem + index + 1}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-700">
                                    {data.enrolmentNo || "N/A"}
                                </td>
                                <td className="px-6 py-4">
                                    {data.email || "N/A"}
                                </td>
                                <td className="px-6 py-4">
                                    {data.hostelName || "N/A"}
                                </td>
                                <td className="px-6 py-4">
                                    {data.roomNo || "N/A"}
                                </td>
                                <td className="px-6 py-4 max-w-xs">
                                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-xs">
                                        {data.needs}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500 max-w-xs">
                                    {data.remark || "-"}
                                </td>
                                <td className="px-6 py-4">
                                    {decision === 'approved' && (
                                        <span className="flex items-center gap-1 bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-3 py-1 rounded-full uppercase">
                                            <FaRegCheckSquare className="h-4 w-auto" /> Approved
                                        </span>
                                    )}
                                    {decision === 'rejected' && (
                                        <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full uppercase">
                                            Rejected
                                        </span>
                                    )}
                                    {decision === 'pending' && (
                                        <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full uppercase">
                                            Pending
                                        </span>
                                    )}
                                </td>
                            </tr>
                                )
                            })()
                        )) : (
                            <tr>
                                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                                    No matching records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-600">
                    Showing {currentItems.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} records
                </div>
                <div className="flex space-x-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                        <button
                            key={number}
                            onClick={() => setCurrentPage(number)}
                            className={`px-3 py-1 rounded-md border text-sm font-medium ${
                                currentPage === number
                                    ? 'bg-[#6b0f14] text-white'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-[#fefaf0]'
                            }`}
                        >
                            {number}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default AdminExtraNeeds
