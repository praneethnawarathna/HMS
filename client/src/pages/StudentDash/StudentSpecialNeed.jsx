import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { HeartPulse, CheckCircle2, Clock, XCircle, AlertCircle, Send, FileText, Activity } from 'lucide-react';
import { getUserInfoFromToken } from '../../utils/auth';
import NeedsWarningCard from '../../components/Cards/NeedsWarningCard';

const CONDITION_OPTIONS = [
    'Illness/Medical Condition',
    'Physical Disability',
    'Allergy',
    'Other'
];

const StudentSpecialNeed = () => {
    const token = localStorage.getItem('login');
    const userInfo = useMemo(() => getUserInfoFromToken() || {}, []);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [studentData, setStudentData] = useState(null);
    const [history, setHistory] = useState([]);
    const [conditionType, setConditionType] = useState('Illness/Medical Condition');
    const [description, setDescription] = useState('');
    const [alertMessage, setAlertMessage] = useState(null);

    // Fetch student profile, allocation, and room status
    const fetchStudentDetails = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const res = await axios.get(`${import.meta.env.VITE_APP_API}/auth/get-currentuser-data`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.Status === 'Success') {
                setStudentData(res.data.StudentDetails || null);
            }
        } catch (err) {
            console.error('Error fetching student allocation for special needs:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch existing submitted special needs for this student
    const fetchHistory = async () => {
        if (!token) return;
        const identifier = localStorage.getItem('studentRegNo') || userInfo.username || userInfo.email;
        if (!identifier) return;

        try {
            const res = await axios.get(
                `${import.meta.env.VITE_APP_API}/student/get-student-needs/${encodeURIComponent(identifier)}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data?.Data && Array.isArray(res.data.Data)) {
                // Filter to show medical / special need submissions
                const medicalList = res.data.Data.filter(item => {
                    if (item.conditionType) return true;
                    const text = (item.needs || '').toLowerCase();
                    return text.includes('illness') || text.includes('disability') || text.includes('allergy') ||
                        text.includes('medical') || text.includes('special need') || !text.startsWith('[');
                });
                setHistory(medicalList);
            }
        } catch (err) {
            console.error('Error fetching special needs history:', err);
        }
    };

    useEffect(() => {
        fetchStudentDetails();
        fetchHistory();
    }, [token]);

    const profileObj = studentData?.profile;
    const allocObj = studentData?.allocation;
    const roomObj = studentData?.room;
    const hostelObj = studentData?.hostel;

    // Check if the student is currently assigned to a hostel room
    const isAssignedToRoom = Boolean(
        (allocObj && allocObj.active !== false && allocObj.roomId) ||
        (roomObj && (roomObj.roomID || roomObj.roomNo || roomObj._id))
    );

    const currentRoomNo = roomObj?.roomID || roomObj?.roomNo || (isAssignedToRoom ? 'Assigned' : 'Not Assigned');
    const hostelName = hostelObj?.name || profileObj?.hostelName || 'Not Assigned';
    const hostelId = hostelObj?._id || allocObj?.hostelID?._id || allocObj?.hostelID || profileObj?.hostelId || '';
    const studentId = profileObj?._id || '';
    const enrolmentNo = profileObj?.enrolmentNo || userInfo?.username || '';

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!description.trim()) {
            setAlertMessage({ type: 'error', text: 'Please describe your medical or special health requirement.' });
            return;
        }

        setSubmitting(true);
        setAlertMessage(null);

        const payload = {
            student_id: studentId,
            regNo: enrolmentNo,
            hostel_id: hostelId,
            room_no: currentRoomNo,
            conditionType,
            needs: `${conditionType}: ${description.trim()}`,
            remark: description.trim()
        };

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/student/student-create-needs`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data?.Status === 'Success') {
                setAlertMessage({ type: 'success', text: 'Medical requirement submitted successfully.' });
                setDescription('');
                fetchHistory();
            } else {
                setAlertMessage({ type: 'error', text: res.data?.Error || 'Submission failed. Please try again.' });
            }
        } catch (err) {
            console.error('Error submitting medical need:', err);
            const msg = err.response?.data?.Error || err.response?.data?.message || 'Server error while submitting request.';
            setAlertMessage({ type: 'error', text: msg });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500 space-y-3">
                <div className="w-10 h-10 border-4 border-[#6b0f14] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Verifying hostel room allocation status...</p>
            </div>
        );
    }

    // Access Logic: If not assigned to a hostel room, display styled warning card
    if (!isAssignedToRoom) {
        return (
            <div className="w-full space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#6b0f14] flex items-center gap-3">
                        <HeartPulse className="text-[#6b0f14]" size={28} />
                        Special Need & Medical Requirements
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Submit medical, dietary, or accessibility requests to the hostel administration.
                    </p>
                </div>

                <NeedsWarningCard
                    title="Request Unavailable"
                    hostelName={hostelName}
                    roomNo="Not Assigned / Pending"
                />
            </div>
        );
    }

    // If assigned, show the student-facing "Medical & Health Requirements" form
    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#6b0f14] to-[#8d1820] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-2">
                            <Activity size={14} /> Student Health Portal
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold">Medical & Health Requirements</h1>
                        <p className="text-white/80 text-sm mt-1">
                            Report health conditions or special assistance needs to your Warden and University Medical Team.
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/15 text-xs text-right">
                        <div className="text-amber-200 font-semibold">{hostelName}</div>
                        <div className="text-white/90">Room: {currentRoomNo}</div>
                    </div>
                </div>
            </div>

            {/* Notification alert */}
            {alertMessage && (
                <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                    alertMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                    {alertMessage.type === 'success' ? (
                        <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={18} />
                    ) : (
                        <AlertCircle className="text-rose-600 flex-shrink-0 mt-0.5" size={18} />
                    )}
                    <p className="text-sm font-medium">{alertMessage.text}</p>
                </div>
            )}

            {/* Medical Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Condition Type <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={conditionType}
                            onChange={(e) => setConditionType(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-[#6b0f14] focus:border-transparent outline-none transition-all font-medium"
                            required
                        >
                            {CONDITION_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1.5">
                            Select the category that best fits your health or physical requirement.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description (Please describe your medical or special health requirement) <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={5}
                            placeholder="Please provide details regarding your condition, ongoing treatment, mobility aids, or specific hostel accommodations required..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#6b0f14] focus:border-transparent outline-none transition-all"
                            required
                        />
                        <p className="text-xs text-gray-400 mt-1.5">
                            Information provided will be kept confidential and shared only with authorized hostel administration.
                        </p>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#6b0f14] hover:bg-[#851319] text-white font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Submit Medical Requirement
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* History of Submitted Special Needs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FileText size={18} className="text-[#6b0f14]" />
                        Submitted Medical & Health Requests
                    </h2>
                    <span className="text-xs px-2.5 py-1 bg-gray-100 rounded-full font-semibold text-gray-600">
                        {history.length} {history.length === 1 ? 'Record' : 'Records'}
                    </span>
                </div>

                {history.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No previous medical or health requirements submitted.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {history.map((item) => {
                            const decision = item?.decision || (item?.isAccpeted ? 'approved' : 'pending');
                            const isApproved = decision === 'approved';
                            const isRejected = decision === 'rejected';

                            return (
                                <div key={item._id} className="py-4 space-y-2 first:pt-0 last:pb-0">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="px-3 py-1 bg-red-50 text-[#6b0f14] rounded-lg text-xs font-semibold border border-red-100">
                                            {item.conditionType || 'Medical / Special Need'}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            {isApproved ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <CheckCircle2 size={12} /> Approved
                                                </span>
                                            ) : isRejected ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                    <XCircle size={12} /> Rejected
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                    <Clock size={12} /> Pending Review
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                        {item.remark || item.needs}
                                    </p>

                                    <div className="text-xs text-gray-400 flex items-center gap-3">
                                        <span>Submitted: {new Date(item.createdAt).toLocaleDateString()}</span>
                                        {item.room_no && <span>• Room: {item.room_no}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentSpecialNeed;

