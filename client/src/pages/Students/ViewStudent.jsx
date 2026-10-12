import axios from 'axios';
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import DefaultBtn from '../../components/Buttons/DefaultBtn';
import DefaultInput from '../../components/Form/DefaultInput';
import Dropdown from '../../components/Form/Dropdown';
import { getUserInfoFromToken } from '../../utils/auth';

const ViewStudent = () => {
    const { id } = useParams();
    const [stdData, setStdData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const token = localStorage.getItem('login');

    const userInfo = getUserInfoFromToken();
    const userRoles = (userInfo?.roles || [])
        .map(r => (typeof r === 'string' ? r.toLowerCase() : r.name?.toLowerCase?.()))
        .filter(Boolean);


    // ✅ Role-based access control (lowercase match)
    const allowedRoles = ['warden', 'admin', 'director'];
    const isAuthorized = userRoles.some(role => allowedRoles.includes(role));

    const fetchHistory = useCallback(async (studentId) => {
        if (!studentId || !token) return;
        setHistoryLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_APP_API}/eligibility/allocation-history/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data.Result || []);
        } catch (err) {
            console.error('Failed to fetch allocation history:', err);
        } finally {
            setHistoryLoading(false);
        }
    }, [token]);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setLoadError('');

        axios.get(`${import.meta.env.VITE_APP_API}/student/get-student-byID/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!active) return;

                const student = res.data?.Result;
                if (!student) {
                    setStdData(null);
                    setLoadError(res.data?.Error || 'Student not found.');
                    return;
                }

                setStdData(student);
                setFormData(student);
                // Fetch history using the student's _id
                if (student._id) {
                    fetchHistory(student._id);
                }
            })
            .catch(err => {
                if (!active) return;
                console.error('Failed to load student:', err);
                setStdData(null);
                setLoadError(
                    err.response?.data?.Error
                    || err.response?.data?.message
                    || 'Failed to load student data.'
                );
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [id, token, fetchHistory]);

    if (!isAuthorized) {
        return <Navigate to="/" replace />;
    }

    const handleEditToggle = () => setIsEditing(!isEditing);

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();

        try {
            const res = await axios.post(`${import.meta.env.VITE_APP_API}/student/update-Student/${id}`, formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data.Status === "Success") {
                alert(res.data.Message);
                window.location.reload();
            } else {
                alert(res.data.Error);
            }
        } catch (err) {
            console.log(err);
        }
    };

    if (loading) return <div className="text-gray-500">Loading student data...</div>;

    if (loadError || !stdData) {
        return (
            <div className="p-6 max-w-xl bg-white shadow-md rounded-lg mt-5">
                <h1 className="text-xl font-bold text-[#6b0f14]">Unable to load student</h1>
                <p className="mt-2 text-gray-600">{loadError || 'Student not found.'}</p>
                <div className="mt-4">
                    <Link to="/Dashboard/Students">
                        <DefaultBtn type="button" label="Back to Students" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white shadow-md rounded-lg mt-5">
            <div className="flex justify-between items-center -mt-4 mb-2">
                <Link to={
                    userRoles.includes('warden')
                        ? '/Dashboard/WardenStudents'
                        : '/Dashboard/Students'
                }>
                    <DefaultBtn type="button" label="Back" />
                </Link>
                <DefaultBtn type="button" label={isEditing ? 'Cancel' : 'Edit'} onClick={handleEditToggle} />
            </div>

            <h1 className="text-2xl font-bold text-[#6b0f14] mb-4">Student Information</h1>

            {!isEditing ? (
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <Detail label="Enrolment No" value={stdData.enrolmentNo} />
                    <Detail label="NIC" value={stdData.nic} />
                    <Detail label="Name" value={stdData.name} />
                    <Detail label="AL District" value={stdData.alDistrict} />
                    <Detail label="Gender" value={stdData.sex} />
                    <Detail label="Address 1" value={stdData.address1} />
                    <Detail label="Address 2" value={stdData.address2} />
                    <Detail label="Address 3" value={stdData.address3} />
                    <Detail label="Full Address" value={stdData.fullAddress} />
                    <Detail label="Intake" value={stdData.intake} />
                    <Detail label="Date of Enrolment" value={new Date(stdData.dateOfEnrolment).toLocaleDateString()} />
                    <Detail label="Study Year" value={stdData.dateOfEnrolment ? `Year ${(new Date().getFullYear() - new Date(stdData.dateOfEnrolment).getFullYear()) + 1}` : ''} />
                    <Detail label="Distance" value={stdData.distance + ' km'} />
                    <Detail label="Assigned" value={stdData.isAssign ? 'Yes' : 'No'} />
                    {stdData.hostelAssignedDate && <Detail label="Assigned Date" value={new Date(stdData.hostelAssignedDate).toLocaleDateString()} />}
                    
                    {stdData.lastEditedBy && (
                        <div className="col-span-full mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Record Edited By Admin
                            </p>
                            <div className="mt-1 grid grid-cols-2 gap-4">
                                <Detail label="Admin Name / Email" value={stdData.lastEditedBy} />
                                <Detail label="Last Edited Date" value={new Date(stdData.lastEditedAt).toLocaleString()} />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleUpdate} className="grid md:grid-cols-2 gap-4 text-sm">
                    {[ // Editable fields
                        { name: 'name', label: 'Name' },
                        { name: 'alDistrict', label: 'AL District' },
                        { name: 'address1', label: 'Address 1' },
                        { name: 'address2', label: 'Address 2' },
                        { name: 'address3', label: 'Address 3' },
                        { name: 'fullAddress', label: 'Full Address' },
                        { name: 'intake', label: 'Intake' },
                        { name: 'dateOfEnrolment', label: 'Date of Enrolment', type: 'date' },
                        { name: 'distance', label: 'Distance (km)', type: 'number' }
                    ].map(field => (
                        <DefaultInput
                            key={field.name}
                            label={field.label}
                            name={field.name}
                            type={field.type || 'text'}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                        />
                    ))}
                    <Dropdown
                        label="Gender"
                        name="sex"
                        value={formData.sex || ''}
                        onChange={handleChange}
                        options={[
                            { label: 'Male', value: 'Male' },
                            { label: 'Female', value: 'Female' },
                            { label: 'REV', value: 'REV' }
                        ]}
                    />
                    <div className="col-span-2 -mt-4">
                        <DefaultBtn type="submit" label="Update Student" />
                    </div>
                </form>
            )}

            {/* ── Hostel Movement History ── */}
            <div className="mt-8 border-t pt-6">
                <h2 className="text-xl font-bold text-[#6b0f14] mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Hostel Movement History
                </h2>

                {historyLoading ? (
                    <p className="text-gray-500 text-sm">Loading history...</p>
                ) : history.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-400 mt-2 text-sm">No hostel movement history found for this student.</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                        <div className="space-y-4">
                            {history.map((item, index) => {
                                const actionConfig = {
                                    UNASSIGN_ROOM: {
                                        label: 'Room Removed',
                                        color: 'bg-amber-500',
                                        bgColor: 'bg-amber-50',
                                        borderColor: 'border-amber-200',
                                        textColor: 'text-amber-700',
                                        icon: '🚪'
                                    },
                                    HOSTEL_CHANGE: {
                                        label: 'Hostel Transfer',
                                        color: 'bg-blue-500',
                                        bgColor: 'bg-blue-50',
                                        borderColor: 'border-blue-200',
                                        textColor: 'text-blue-700',
                                        icon: '🔄'
                                    },
                                    UNASSIGN_HOSTEL: {
                                        label: 'Removed from Hostel',
                                        color: 'bg-red-500',
                                        bgColor: 'bg-red-50',
                                        borderColor: 'border-red-200',
                                        textColor: 'text-red-700',
                                        icon: '❌'
                                    },
                                    ASSIGN_HOSTEL: {
                                        label: 'Assigned to Hostel',
                                        color: 'bg-green-500',
                                        bgColor: 'bg-green-50',
                                        borderColor: 'border-green-200',
                                        textColor: 'text-green-700',
                                        icon: '✅'
                                    },
                                    ASSIGN_ROOM: {
                                        label: 'Room Assigned',
                                        color: 'bg-teal-500',
                                        bgColor: 'bg-teal-50',
                                        borderColor: 'border-teal-200',
                                        textColor: 'text-teal-700',
                                        icon: '🏠'
                                    }
                                };

                                const config = actionConfig[item.actionType] || {
                                    label: item.actionType,
                                    color: 'bg-gray-500',
                                    bgColor: 'bg-gray-50',
                                    borderColor: 'border-gray-200',
                                    textColor: 'text-gray-700',
                                    icon: '📋'
                                };

                                const prevHostel = item.previousHostelId?.name || '-';
                                const prevRoom = item.previousRoomId?.roomID || item.previousRoomId?.roomNo || '-';
                                const newHostel = item.newHostelId?.name || '-';
                                const newRoom = item.newRoomId?.roomID || item.newRoomId?.roomNo || '-';
                                const changedBy = item.changedBy?.username || item.changedBy?.email || '-';
                                const actionDate = item.actionDate ? new Date(item.actionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

                                return (
                                    <div key={item._id || index} className="relative pl-10">
                                        {/* Timeline dot */}
                                        <div className={`absolute left-2.5 w-3.5 h-3.5 rounded-full ${config.color} border-2 border-white shadow`}></div>

                                        <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 shadow-sm`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                                                    {config.icon} {config.label}
                                                </span>
                                                <span className="text-xs text-gray-500 font-medium">{actionDate}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mt-2">
                                                {(item.actionType === 'HOSTEL_CHANGE') && (
                                                    <>
                                                        <div>
                                                            <span className="font-semibold text-gray-600">From Hostel: </span>
                                                            <span className="text-gray-800">{prevHostel}</span>
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-gray-600">To Hostel: </span>
                                                            <span className="text-gray-800">{newHostel}</span>
                                                        </div>
                                                        {prevRoom !== '-' && (
                                                            <div>
                                                                <span className="font-semibold text-gray-600">Previous Room: </span>
                                                                <span className="text-gray-800">{prevRoom}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {(item.actionType === 'UNASSIGN_HOSTEL') && (
                                                    <>
                                                        <div>
                                                            <span className="font-semibold text-gray-600">Hostel: </span>
                                                            <span className="text-gray-800">{prevHostel}</span>
                                                        </div>
                                                        {prevRoom !== '-' && (
                                                            <div>
                                                                <span className="font-semibold text-gray-600">Room: </span>
                                                                <span className="text-gray-800">{prevRoom}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {(item.actionType === 'UNASSIGN_ROOM') && (
                                                    <>
                                                        <div>
                                                            <span className="font-semibold text-gray-600">Hostel: </span>
                                                            <span className="text-gray-800">{prevHostel}</span>
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-gray-600">Room Removed: </span>
                                                            <span className="text-gray-800">{prevRoom}</span>
                                                        </div>
                                                    </>
                                                )}

                                                {(item.actionType === 'ASSIGN_HOSTEL' || item.actionType === 'ASSIGN_ROOM') && (
                                                    <>
                                                        <div>
                                                            <span className="font-semibold text-gray-600">Hostel: </span>
                                                            <span className="text-gray-800">{newHostel !== '-' ? newHostel : prevHostel}</span>
                                                        </div>
                                                        {(newRoom !== '-') && (
                                                            <div>
                                                                <span className="font-semibold text-gray-600">Room: </span>
                                                                <span className="text-gray-800">{newRoom}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                <div>
                                                    <span className="font-semibold text-gray-600">Changed By: </span>
                                                    <span className="text-gray-800">{changedBy}</span>
                                                </div>
                                            </div>

                                            {item.remark && (
                                                <div className="mt-2 pt-2 border-t border-gray-200">
                                                    <p className="text-xs text-gray-600">
                                                        <span className="font-semibold">Remark: </span>
                                                        <span className="italic">&ldquo;{item.remark}&rdquo;</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Detail = ({ label, value }) => (
    <div>
        <p className="text-[#6b0f14] font-semibold">{label}</p>
        <p className="text-gray-800">{value || '-'}</p>
    </div>
);

export default ViewStudent;

