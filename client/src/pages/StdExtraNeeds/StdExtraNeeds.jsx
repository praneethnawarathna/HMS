import axios from 'axios'
import React, { useEffect, useState } from 'react'
import DefaultInput from '../../components/Form/DefaultInput'
import { FaRegCheckSquare } from 'react-icons/fa'
import { BsHouseGearFill } from 'react-icons/bs'

const StdExtraNeeds = () => {
    const [getExtraNeeds, setGetExtraNeeds] = useState([])
    const [filteredData, setFilteredData] = useState([])
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

    const token = localStorage.getItem('login')

    useEffect(() => {
        axios.get(import.meta.env.VITE_APP_API + '/warden/std-extra-needs', {
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
        const filtered = (getExtraNeeds || []).filter(item =>
            item.regNo?.email?.toLowerCase().includes(search.toLowerCase())
        )
        setFilteredData(filtered)
        setCurrentPage(1)
    }, [search, getExtraNeeds])

    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = (filteredData || []).slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil((filteredData || []).length / itemsPerPage)

    const headleApprove = async (id) => {
        try {
            const res = await axios.post(import.meta.env.VITE_APP_API + '/warden/approve-need/' + id, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.data.Status === "Success") {
                alert("Student Need Approve Success")
                window.location.reload()
            } else {
                alert(res.data.Error)
            }
        } catch (err) {
            console.log(err)
        }
    }

    const handleReject = async (id) => {
        try {
            const res = await axios.post(import.meta.env.VITE_APP_API + '/warden/reject-need/' + id, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.data.Status === "Success") {
                alert("Student Need Rejected")
                window.location.reload()
            } else {
                alert(res.data.Error)
            }
        } catch (err) {
            console.log(err)
        }
    }

    return (
<<<<<<< Updated upstream
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-4">
                <DefaultInput
                    label="Search by Email"
                    name="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Type email to search..."
                />
            </div>

            <div className="overflow-x-auto rounded-2xl shadow-lg">
                <table className="min-w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                        <tr>
                            <th className="px-6 py-4 font-semibold">#</th>
                            <th className="px-6 py-4 font-semibold">Student Email</th>
                            <th className="px-6 py-4 font-semibold">Needs</th>
                            <th className="px-6 py-4 font-semibold">Remark</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Action</th>
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
                                <td className="px-6 py-4">
                                    {data.regNo?.email || "N/A"}
                                </td>
                                <td className="px-6 py-4">{data.needs}</td>
                                <td className="px-6 py-4 text-gray-500 max-w-xs">{data.remark || "-"}</td>
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
                                            <BsHouseGearFill className="h-4 w-auto" /> Pending
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {decision === 'approved' ? (
                                        <div className="text-[#4f0a0f]">Approved</div>
                                    ) : decision === 'rejected' ? (
                                        <div className="text-red-700">Rejected</div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="text-[#4f0a0f] hover:underline cursor-pointer"
                                                onClick={() => headleApprove(data._id)}
                                            >
                                                Approve
                                            </div>
                                            <div
                                                className="text-red-700 hover:underline cursor-pointer"
                                                onClick={() => handleReject(data._id)}
                                            >
                                                Reject
                                            </div>
                                        </div>
                                    )}
                                </td>
=======
        <div className="w-full space-y-6">
            {/* Page Header */}
            <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-2 border border-white/10">
                            <Shield size={14} className="text-amber-300" />
                            Warden Management Console
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
                            <Wrench className="text-amber-300" size={28} />
                            Extra Needs (Maintenance Requests)
                        </h1>
                        <p className="text-white/80 text-sm mt-1">
                            Review room maintenance tickets, update repair progress, and mark issues resolved for your hostel.
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Cards */}
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

            {/* Feedback notification */}
            {feedbackMessage && (
                <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${feedbackMessage.type === 'success'
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

            {/* Controls Bar: Search & Status Filter */}
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
                                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === filter
                                        ? 'bg-white text-[#6b0f14] font-bold shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
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
                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                    No matching records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

<<<<<<< Updated upstream
            <div className="flex justify-center mt-6 space-x-2">
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
=======
                                    return (
                                        <tr key={item._id} className="hover:bg-[#fefaf0]/60 transition-colors">
                                            <td className="px-5 py-4 text-center font-medium text-gray-400 text-xs">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="px-5 py-4 font-bold text-gray-800 whitespace-nowrap">
                                                {enrolmentNo}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 font-semibold rounded-lg text-xs border border-gray-200">
                                                    <DoorClosed size={12} className="text-gray-500" />
                                                    {roomNo}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold">
                                                    {category}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-gray-600 text-xs leading-relaxed max-w-sm">
                                                <div className="line-clamp-2" title={description}>
                                                    {description || '-'}
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-1">
                                                    Submitted: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <select
                                                    value={currentStatus}
                                                    onChange={(e) => handleStatusDropdownChange(item._id, e.target.value)}
                                                    className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg border outline-none transition-all cursor-pointer ${currentStatus === 'Resolved'
                                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-500'
                                                            : currentStatus === 'In Progress'
                                                                ? 'bg-blue-50 text-blue-800 border-blue-300 focus:ring-blue-500'
                                                                : 'bg-amber-50 text-amber-800 border-amber-300 focus:ring-amber-500'
                                                        }`}
                                                >
                                                    {STATUS_OPTIONS.map(opt => (
                                                        <option key={opt} value={opt} className="bg-white text-gray-800">
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <button
                                                    onClick={() => handleUpdateStatus(item)}
                                                    disabled={isUpdating}
                                                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-[#6b0f14] hover:bg-[#851319] text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer w-full"
                                                >
                                                    {isUpdating ? (
                                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <>
                                                            <Save size={13} />
                                                            Update
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                        <div>
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-all font-medium cursor-pointer"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1.5 font-bold text-[#6b0f14]">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-all font-medium cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
>>>>>>> Stashed changes
            </div>
        </div>
    )
}

export default StdExtraNeeds
