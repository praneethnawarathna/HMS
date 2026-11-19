<<<<<<< Updated upstream
import axios from 'axios'
import React, { useState, useEffect } from 'react'
import DefaultInput from '../../components/Form/DefaultInput'
import DefaultBtn from '../../components/Buttons/DefaultBtn'
import { getUserInfoFromToken } from '../../utils/auth'

const AdminCreateSpecialNeed = () => {
    const [enrolmentNo, setEnrolmentNo] = useState('')
    const [category, setCategory] = useState('Special need')
    const [remark, setRemark] = useState('')
    const [loading, setLoading] = useState(false)
    const [existingNeeds, setExistingNeeds] = useState([])
=======
import axios from 'axios';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DefaultInput from '../../components/Form/DefaultInput';
import DefaultBtn from '../../components/Buttons/DefaultBtn';
import { getUserInfoFromToken } from '../../utils/auth';
import StudentSpecialNeed from '../StudentDash/StudentSpecialNeed';
import {
    HeartPulse,
    Search,
    CheckCircle2,
    Clock,
    AlertCircle,
    Save,
    RotateCw,
    Building2,
    DoorClosed,
    Filter,
    Shield,
    Activity,
    AlertTriangle,
    PlusCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

const MEDICAL_STATUS_OPTIONS = [
    'Pending Review',
    'Reviewed/Noted',
    'Room Re-allocation Required'
];

const AdminCreateSpecialNeed = ({ hideHeader = false }) => {
    const [enrolmentNo, setEnrolmentNo] = useState('');
    const [category, setCategory] = useState('Special need');
    const [remark, setRemark] = useState('');
    const [addingLoading, setAddingLoading] = useState(false);
    const [existingNeeds, setExistingNeeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [updatingId, setUpdatingId] = useState(null);
    const [statusMap, setStatusMap] = useState({});
    const [feedbackMessage, setFeedbackMessage] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [showAddForm, setShowAddForm] = useState(false);
    const itemsPerPage = 12;
>>>>>>> Stashed changes

    const token = localStorage.getItem('login')

    const userInfo = getUserInfoFromToken()
    const rawRoles = userInfo?.roles || []
    const roleNames = Array.isArray(rawRoles)
        ? rawRoles.map(r => (typeof r === 'string' ? r : r.name))
        : [typeof rawRoles === 'string' ? rawRoles : rawRoles?.name];
    const isWarden = roleNames.includes('warden')

    const fetchNeeds = React.useCallback(async () => {
        try {
            const res = await axios.get(import.meta.env.VITE_APP_API + '/admin/student-extra-needs', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.data.Status === "Success") {
                const validCategories = ['Special need', 'Medical', 'Sports']
                const filtered = (res.data.Result || []).filter(item => validCategories.includes(item.needs))
                setExistingNeeds(filtered)
            }
        } catch (err) {
            console.error(err)
        }
    }, [token])

    useEffect(() => {
        fetchNeeds()
    }, [fetchNeeds])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!enrolmentNo) {
            alert("Enrollment No is required")
            return
        }

        setLoading(true)
        try {
            const res = await axios.post(import.meta.env.VITE_APP_API + '/admin/add-special-need', 
            { enrolmentNo, category, remark },
            { headers: { 'Authorization': `Bearer ${token}` }})

            if (res.data.Status === "Success") {
                alert(res.data.Message)
                setEnrolmentNo('')
                setCategory('Special need')
                setRemark('')
                fetchNeeds()
            } else {
                alert(res.data.Error || "Failed to add special need")
            }
        } catch (err) {
            console.error(err)
            alert(err.response?.data?.Error || "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
<<<<<<< Updated upstream
        <div className="p-6 max-w-2xl mx-auto">
            {!isWarden && (
                <>
                    <h1 className="text-3xl font-bold text-[#6b0f14] mb-6">Add Special Need Student</h1>
                    
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <DefaultInput
                            label="Student Enrollment No."
                            name="enrolmentNo"
                            value={enrolmentNo}
                            onChange={(e) => setEnrolmentNo(e.target.value)}
                            placeholder="e.g. IT20001234"
                            required
=======
        <div className="w-full space-y-6">
            {/* Header */}
            {!hideHeader && (
                <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-2 border border-white/10">
                                <Shield size={14} className="text-amber-300" />
                                {isWarden ? 'Warden Medical Portal' : 'Admin Health & Special Needs Management'}
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
                                <HeartPulse className="text-amber-300" size={28} />
                                Special Needs (Medical Records)
                            </h1>
                            <p className="text-white/80 text-sm mt-1">
                                Acknowledge medical conditions, manage accessibility requirements, and flag students requiring ground-floor room re-allocations.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Records</div>
                    <div className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-sm bg-amber-50/30">
                    <div className="text-xs text-amber-700 font-medium uppercase tracking-wider">Pending Review</div>
                    <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200/60 shadow-sm bg-emerald-50/30">
                    <div className="text-xs text-emerald-700 font-medium uppercase tracking-wider">Reviewed / Noted</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.reviewed}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-purple-200/60 shadow-sm bg-purple-50/30">
                    <div className="text-xs text-purple-700 font-medium uppercase tracking-wider">Re-allocation Needed</div>
                    <div className="text-2xl font-bold text-purple-700 mt-1">{stats.reallocation}</div>
                </div>
            </div>

            {/* Admin Add Special Need Form (Only for Admin/Director) */}
            {!isWarden && (
                <div>
                    <button
                        type="button"
                        onClick={() => setShowAddForm(prev => !prev)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6b0f14] text-white text-sm font-semibold rounded-lg hover:bg-[#8b1a20] transition-colors cursor-pointer shadow-sm"
                    >
                        <PlusCircle size={16} />
                        <span>Add Pre-Approved Special Need Student</span>
                        {showAddForm ? <ChevronUp size={15} className="ml-1" /> : <ChevronDown size={15} className="ml-1" />}
                    </button>

                    {showAddForm && (
                        <div className="mt-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <form onSubmit={handleAdminAddSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <DefaultInput
                                        label="Student Enrollment No."
                                        name="enrolmentNo"
                                        value={enrolmentNo}
                                        onChange={(e) => setEnrolmentNo(e.target.value)}
                                        placeholder="e.g., M/20/175"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Medical Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6b0f14] focus:border-transparent outline-none transition-all text-sm"
                                        required
                                    >
                                        <option value="Special need">Special Need</option>
                                        <option value="Medical">Medical</option>
                                        <option value="Illness/Medical Condition">Illness/Medical Condition</option>
                                        <option value="Physical Disability">Physical Disability</option>
                                        <option value="Allergy">Allergy</option>
                                        <option value="Sports">Sports</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Remark / Accommodation Notes</label>
                                    <input
                                        type="text"
                                        value={remark}
                                        onChange={(e) => setRemark(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6b0f14] focus:border-transparent outline-none transition-all text-sm"
                                        placeholder="e.g. Asthma patient, mobility impaired, ground floor required..."
                                    />
                                </div>

                                <div className="md:col-span-3 flex justify-end">
                                    <DefaultBtn
                                        type="submit"
                                        label={addingLoading ? 'Adding...' : 'Add Student to Special Needs'}
                                        disabled={addingLoading}
                                    />
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {/* Feedback alert */}
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
>>>>>>> Stashed changes
                        />
                    </div>
                    
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6b0f14] focus:border-transparent outline-none transition-all"
                            required
                        >
                            <option value="Special need">Special Need</option>
                            <option value="Medical">Medical</option>
                            <option value="Sports">Sports</option>
                        </select>
                    </div>

<<<<<<< Updated upstream
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Remark (Why does this student need this?)</label>
                        <textarea
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6b0f14] focus:border-transparent outline-none transition-all"
                            rows="3"
                            placeholder="Custom example or explanation..."
                        ></textarea>
                    </div>

                    <div className="pt-4">
                        <DefaultBtn 
                            type="submit"
                            label={loading ? "Adding..." : "Add Student"} 
                            disabled={loading}
                        />
                    </div>
                </form>
=======
                    <button
                        type="button"
                        onClick={fetchNeeds}
                        disabled={loading}
                        className="p-2 text-gray-500 hover:text-[#6b0f14] hover:bg-gray-100 rounded-xl transition-all border border-gray-200 cursor-pointer disabled:opacity-50"
                        title="Refresh records"
                    >
                        <RotateCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
>>>>>>> Stashed changes
            </div>
            
            <div className="mt-6 bg-[#fdf6e3] p-4 rounded-xl border border-yellow-200">
                <h3 className="text-[#6b0f14] font-semibold text-sm">How it works:</h3>
                <ul className="list-disc ml-5 text-sm text-gray-600 mt-2 space-y-1">
                    <li>This assigns a pre-approved special need to the specified student.</li>
                    <li>The student will automatically be marked as <strong>Eligible</strong> for hostel assignment.</li>
                    <li>The student is appended to the <strong>Excel Assignment Queue</strong> automatically.</li>
                    <li>Once assigned to a hostel, they will appear in the Warden's Special Needs list.</li>
                </ul>
            </div>
            </>
            )}

            <div className={`mt-12 ${isWarden ? 'mt-0' : ''}`}>
                <h2 className="text-xl font-bold text-[#6b0f14] mb-4">Added Special Needs</h2>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-[#fefaf0] text-[#6b0f14] border-b border-[#f5e6d3]">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Enrollment No.</th>
                                    <th className="px-6 py-4 font-semibold">Category</th>
                                    <th className="px-6 py-4 font-semibold">Remark</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {existingNeeds.length > 0 ? (
                                    existingNeeds.map((need, i) => (
                                        <tr key={need._id || i} className="hover:bg-[#fefaf0] transition-all duration-150">
                                            <td className="px-6 py-4 font-medium text-gray-700">{need.enrolmentNo || "N/A"}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-xs">
                                                    {need.needs}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">{need.remark || "-"}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-gray-500 font-medium">
                                            No special needs added yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdminCreateSpecialNeed
