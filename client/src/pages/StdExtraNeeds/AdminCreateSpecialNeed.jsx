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
