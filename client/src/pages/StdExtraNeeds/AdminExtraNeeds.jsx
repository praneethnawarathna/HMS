import axios from 'axios'
import React, { useEffect, useState } from 'react'
import DefaultInput from '../../components/Form/DefaultInput'
import { FaRegCheckSquare } from 'react-icons/fa'
import { BsHouseGearFill } from 'react-icons/bs'

<<<<<<< Updated upstream
const AdminExtraNeeds = () => {
    const [getExtraNeeds, setGetExtraNeeds] = useState([])
    const [filteredData, setFilteredData] = useState([])
    const [search, setSearch] = useState('')
    const [searchField, setSearchField] = useState('email')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15
=======
const AdminExtraNeeds = ({ hideHeader = false }) => {
    const [extraNeeds, setExtraNeeds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState(null);
    const [statusMap, setStatusMap] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
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
=======
        <div className="w-full space-y-6">
            {!hideHeader && (
                <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-2 border border-white/10">
                                <Shield size={14} className="text-amber-300" />
                                HMS Admin Console
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
                                <Wrench className="text-amber-300" size={28} />
                                Extra Needs (Maintenance Requests)
                            </h1>
                            <p className="text-white/80 text-sm mt-1">
                                System-wide view of all student maintenance requests across university residence halls.
                            </p>
                        </div>
                    </div>
>>>>>>> Stashed changes
                </div>
            )}

<<<<<<< Updated upstream
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
=======
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Requests</div>
                    <div className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-sm bg-amber-50/30">
                    <div className="text-xs text-amber-700 font-medium uppercase tracking-wider">Pending</div>
                    <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-200/60 shadow-sm bg-blue-50/30">
                    <div className="text-xs text-blue-700 font-medium uppercase tracking-wider">In Progress</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200/60 shadow-sm bg-emerald-50/30">
                    <div className="text-xs text-emerald-700 font-medium uppercase tracking-wider">Resolved</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.resolved}</div>
                </div>
            </div>

            {feedbackMessage && (
                <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${
                    feedbackMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                    {feedbackMessage.type === 'success' ? (
                        <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                        <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">{feedbackMessage.text}</span>
                </div>
            )}

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                <div className="flex-1 max-w-md relative">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                        Search by Enrollment No
                    </label>
                    <div className="relative">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search by Enrollment No (e.g., M/20/175)"
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#6b0f14] focus:border-transparent outline-none transition-all placeholder-gray-400"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status:</span>
                    <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200 text-xs font-medium">
                        {['ALL', 'Pending', 'In Progress', 'Resolved'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => {
                                    setStatusFilter(filter);
                                    setCurrentPage(1);
                                }}
                                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                    statusFilter === filter
                                        ? 'bg-white text-[#6b0f14] font-bold shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={fetchNeeds}
                        disabled={loading}
                        className="p-2 text-gray-500 hover:text-[#6b0f14] hover:bg-gray-100 rounded-xl transition-all border border-gray-200 cursor-pointer disabled:opacity-50"
                        title="Refresh requests"
                    >
                        <RotateCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#fefaf0] text-[#6b0f14] text-xs font-bold uppercase tracking-wider border-b border-[#f5e6d3]">
                            <tr>
                                <th className="px-5 py-4 w-12 text-center">#</th>
                                <th className="px-5 py-4">Enrollment No</th>
                                <th className="px-5 py-4">Room No</th>
                                <th className="px-5 py-4">Issue Category</th>
                                <th className="px-5 py-4 min-w-[220px]">Description</th>
                                <th className="px-5 py-4 min-w-[150px]">Status</th>
                                <th className="px-5 py-4 text-center w-28">Action</th>
>>>>>>> Stashed changes
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
