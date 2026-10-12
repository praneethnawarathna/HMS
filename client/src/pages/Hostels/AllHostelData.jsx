import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { FaMale, FaFemale, FaBed, FaUsers, FaUser } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import ActionButtons from '../../components/Buttons/ActionButtons';
import { X, Loader2, Save } from 'lucide-react';

const AllHostelData = () => {
    const navigate = useNavigate();
    const [allhostels, setAllHostels] = useState([]);
    const [wardenList, setWardenList] = useState([]);
    const [editingHostel, setEditingHostel] = useState(null);
    const [editForm, setEditForm] = useState({
        hostelID: '',
        name: '',
        location: '',
        gender: 'Male',
        roomCount: '',
        warden: ''
    });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');
    const token = localStorage.getItem('login');
    const hostels = Array.isArray(allhostels) ? allhostels : [];

    const maleHostelCount = hostels.filter(h => h.gender === 'Male').length;
    const femaleHostelCount = hostels.filter(h => h.gender === 'Female').length;
    const revHostelCount = hostels.filter(h => h.gender === 'REV' || h.gender === 'Rev').length;

    const totalCapacity = hostels.reduce((sum, h) => sum + (h.totalCapacity || 0), 0);
    const totalAssigned = hostels.reduce((sum, h) => sum + (h.assignedStudents || 0), 0);
    const overallOccupancy = totalCapacity > 0 ? Math.min((totalAssigned / totalCapacity) * 100, 100).toFixed(1) : 0;

    const fetchHostels = async () => {
        if (!token) {
            setAllHostels([]);
            return;
        }

        try {
            const res = await axios.get(import.meta.env.VITE_APP_API + '/hostel/get-all-hostels', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllHostels(Array.isArray(res.data?.Result) ? res.data.Result : []);
        } catch (err) {
            setAllHostels([]);
            if (err.response?.status !== 401) {
                console.error("Failed to fetch hostels:", err);
            }
        }
    };

    const fetchWardens = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${import.meta.env.VITE_APP_API}/hostel/get-all-warden`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWardenList(res.data?.result || []);
        } catch (err) {
            console.error("Failed to fetch wardens:", err);
        }
    };

    useEffect(() => {
        fetchHostels();
    }, [token]);

    // Delete a hostel and refresh the list
    const handleDeleteHostel = async (hostelId) => {
        if (!window.confirm('Delete this hostel? This will remove all related allocations, rooms, and warden assignments.')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_APP_API}/hostel/delete-hostel/${hostelId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchHostels();
        } catch (err) {
            console.error('Failed to delete hostel:', err);
        }
    };

    const handleOpenEditModal = (hostel) => {
        setEditingHostel(hostel);
        setEditForm({
            hostelID: hostel.hostelID || '',
            name: hostel.name || '',
            location: hostel.location || '',
            gender: hostel.gender || 'Male',
            roomCount: hostel.roomCount ?? '',
            warden: hostel.warden?._id || (typeof hostel.warden === 'string' ? hostel.warden : '')
        });
        setEditError('');
        setEditSuccess('');
        fetchWardens();
    };

    const handleSaveHostelEdit = async (e) => {
        e.preventDefault();
        if (!editingHostel?._id) return;

        setEditLoading(true);
        setEditError('');
        setEditSuccess('');

        try {
            const res = await axios.put(
                `${import.meta.env.VITE_APP_API}/hostel/update-hostel/${editingHostel._id}`,
                editForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data?.Status === 'Success') {
                setEditSuccess(res.data.Message || 'Hostel updated successfully!');
                await fetchHostels();
                setTimeout(() => {
                    setEditingHostel(null);
                    setEditSuccess('');
                }, 700);
            } else {
                setEditError(res.data?.Error || res.data?.error || 'Failed to update hostel.');
            }
        } catch (err) {
            console.error('Error updating hostel:', err);
            const msg = err.response?.data?.Error || err.response?.data?.error || 'Server error updating hostel.';
            setEditError(msg);
        } finally {
            setEditLoading(false);
        }
    };

    const hostelStats = [
        {
            id: 1,
            name: 'Male Hostels',
            icon: FaMale,
            value: maleHostelCount,
            bgColor: 'bg-[#6b0f14]',
        },
        {
            id: 2,
            name: 'Female Hostels',
            icon: FaFemale,
            value: femaleHostelCount,
            bgColor: 'bg-[#d4af37]',
        },
        {
            id: 5,
            name: 'REV Hostels',
            icon: FaUser,
            value: revHostelCount,
            bgColor: 'bg-[#7e57c2]',
        },
        {
            id: 3,
            name: 'Total Capacity',
            icon: FaBed,
            value: totalCapacity,
            bgColor: 'bg-[#2d6a4f]',
        },
        {
            id: 4,
            name: 'Total Assigned',
            icon: FaUsers,
            value: `${totalAssigned} / ${totalCapacity}`,
            subtitle: `${overallOccupancy}% Occupancy`,
            bgColor: 'bg-[#1b4965]',
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-[#6b0f14]">Hostels</h2>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                {hostelStats.map((stat) => (
                    <div key={stat.id} className={`relative ${stat.bgColor} text-white p-3 sm:p-4 rounded-xl shadow-md overflow-hidden hover:scale-[1.02] transition-transform duration-300`}>
                        {stat.icon && (
                            <div className="absolute right-3 top-3 opacity-20 text-white text-3xl sm:text-4xl">
                                <stat.icon />
                            </div>
                        )}
                        <div className="relative z-10">
                            <div className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-[#fdf6e3]">
                                {stat.name}
                            </div>
                            <div className="mt-1 text-xl sm:text-2xl font-bold">{stat.value}</div>
                            {stat.subtitle && <div className="text-[10px] mt-0.5 opacity-80">{stat.subtitle}</div>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="overflow-x-auto rounded-xl shadow-md">
                <table className="min-w-full text-xs sm:text-sm text-left text-gray-600 bg-white">
                    <thead className="text-[10px] sm:text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                        <tr>
                            <th className="px-3 py-2.5 font-semibold">#</th>
                            <th className="px-3 py-2.5 font-semibold">Hostel ID</th>
                            <th className="px-3 py-2.5 font-semibold">Name</th>
                            <th className="px-3 py-2.5 font-semibold">Location</th>
                            <th className="px-3 py-2.5 font-semibold">Warden</th>
                            <th className="px-3 py-2.5 font-semibold">Rooms</th>
                            <th className="px-3 py-2.5 font-semibold">Total Capacity</th>
                            <th className="px-3 py-2.5 font-semibold">Gender</th>
                            <th className="px-3 py-2.5 font-semibold">Assigned</th>
                            <th className="px-3 py-2.5 font-semibold">Available</th>
                            <th className="px-3 py-2.5 font-semibold text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {
                            hostels.length > 0 ? (
                                hostels.map((data, index) => (
                                    <tr key={index} className="hover:bg-[#fefaf0] transition-all duration-150">
                                        <td className="px-3 py-2.5 font-medium text-gray-800 align-top">{index + 1}</td>
                                        <td className="px-3 py-2.5 max-w-[110px] break-words whitespace-normal align-top">{data.hostelID}</td>
                                        <td className="px-3 py-2.5 max-w-[140px] break-words whitespace-normal align-top font-medium text-gray-900">{data.name}</td>
                                        <td className="px-3 py-2.5 align-top">
                                            {data.location ? (
                                                <a href={`${data.location}`} target='_blank' rel="noopener noreferrer" className='text-[#6b0f14] font-medium hover:underline'>
                                                    View
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 max-w-[120px] break-words whitespace-normal align-top">
                                            {data.warden?.username || 'Not Assigned'}
                                        </td>
                                        <td className="px-3 py-2.5 align-top">{data.roomCount}</td>
                                        <td className="px-3 py-2.5 font-medium text-gray-800 text-center align-top">{data.totalCapacity || 0}</td>
                                        <td className="px-3 py-2.5 align-top">
                                            {data.gender === 'Male' ? (
                                                <span className="flex items-center gap-1 bg-[#fdf6e3] text-[#6b0f14] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                                                    <FaMale /> Male
                                                </span>
                                            ) : data.gender === 'Female' ? (
                                                <span className="flex items-center gap-1 bg-pink-100 text-pink-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                                                    <FaFemale /> Female
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 bg-purple-100 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                                                    <FaUser /> {data.gender}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-gray-800 text-center align-top">{data.assignedStudents || 0}</td>
                                        <td className="px-3 py-2.5 font-medium text-center align-top">
                                            {data.isFull ? (
                                                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">FULL</span>
                                            ) : (
                                                <span className="text-green-700 font-semibold">{data.availableCapacity ?? 0}</span>
                                            )}
                                        </td>

                                        <td className="px-3 py-2.5 align-top text-center">
                                            <div className="flex items-center justify-center">
                                                <ActionButtons
                                                    onEdit={() => handleOpenEditModal(data)}
                                                    onDelete={() => handleDeleteHostel(data._id)}
                                                    showLabels={false}
                                                    size="sm"
                                                    editTitle={`Edit ${data.name}`}
                                                    deleteTitle={`Delete ${data.name}`}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="11" className="px-3 py-3 text-center text-gray-500">
                                        No matching records found.
                                    </td>
                                </tr>
                            )
                        }
                    </tbody>
                </table>
            </div>

            {/* Edit Hostel Modal */}
            {editingHostel && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-[#6b0f14] text-white flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">Edit Hostel Details</h3>
                                <p className="text-xs text-[#fdf6e3]/80">{editingHostel.name}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingHostel(null)}
                                className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSaveHostelEdit} className="p-6 space-y-4">
                            {editError && (
                                <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg">
                                    {editError}
                                </div>
                            )}
                            {editSuccess && (
                                <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-medium">
                                    {editSuccess}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Hostel ID <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.hostelID}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, hostelID: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14]"
                                        placeholder="e.g. Ak Nell"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Gender <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={editForm.gender}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14] bg-white"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="REV">REV</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Hostel Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14]"
                                    placeholder="e.g. Akbar Nell Hall"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Google Maps / Location Link
                                </label>
                                <input
                                    type="text"
                                    value={editForm.location}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14]"
                                    placeholder="https://maps.app.goo.gl/..."
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Room Count <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={editForm.roomCount}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, roomCount: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14]"
                                        placeholder="e.g. 280"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Assigned Warden
                                    </label>
                                    <select
                                        value={editForm.warden}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, warden: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14] bg-white"
                                    >
                                        <option value="">-- No Warden Assigned --</option>
                                        {editingHostel.warden && typeof editingHostel.warden === 'object' && editingHostel.warden._id && !wardenList.some(w => w._id === editingHostel.warden._id) && (
                                            <option value={editingHostel.warden._id}>
                                                {editingHostel.warden.username} (Current Warden)
                                            </option>
                                        )}
                                        {wardenList.map(w => (
                                            <option key={w._id} value={w._id}>
                                                {w.username} - {w.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingHostel(null)}
                                    disabled={editLoading}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#6b0f14] rounded-lg hover:bg-[#520b0f] transition-colors disabled:opacity-50 shadow-xs"
                                >
                                    {editLoading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllHostelData;
