import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import ActionButtons from '../../components/Buttons/ActionButtons'
import DefaultInput from '../../components/Form/DefaultInput'
import DefaultBtn from '../../components/Buttons/DefaultBtn'
import Dropdown from '../../components/Form/Dropdown'

const WardenManage = () => {
    const [wardens, setWardens] = useState([])
    const [users, setUsers] = useState([])
    const [hostels, setHostels] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [formData, setFormData] = useState({
        userId: '',
        hostelId: '',
        startDate: new Date().toISOString().split('T')[0],
        active: true,
        note: ''
    })

    // Edit warden modal state (edits all details: user & warden assignment)
    const [showEditWardenModal, setShowEditWardenModal] = useState(false)
    const [editingWarden, setEditingWarden] = useState({
        _id: '',
        userId: '',
        username: '',
        email: '',
        password: '',
        hostelId: '',
        startDate: '',
        active: true,
        note: ''
    })

    const token = localStorage.getItem('login')

    // Fetch all wardens
    const fetchWardens = useCallback(() => {
        axios.get(import.meta.env.VITE_APP_API + '/warden/get-all-wardens', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                console.log('🛎️ Fetched wardens – count:', (res.data.Result || []).length);
                setWardens(res.data.Result || [])
                setError('')
            })
            .catch(err => {
                console.error('Error fetching wardens:', err.response?.status, err.response?.data)
                if (err.response?.status === 403) {
                    setError('Permission denied. Admin must add "manage-wardens" permission to their role first.')
                } else if (err.response?.status === 404) {
                    setError('Warden API endpoint not found. Please restart the server.')
                } else {
                    setError('Failed to fetch wardens: ' + (err.response?.data?.Error || err.message))
                }
            })
    }, [token])

    // Fetch users for dropdown
    const fetchUsers = useCallback(() => {
        axios.get(import.meta.env.VITE_APP_API + '/user/view-all-users', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                setUsers(res.data.Result || [])
            })
            .catch(err => console.error('Error fetching users:', err))
    }, [token])

    // Fetch hostels for dropdown
    const fetchHostels = useCallback(() => {
        axios.get(import.meta.env.VITE_APP_API + '/hostel/get-all-hostels', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                setHostels(res.data.Result || [])
            })
            .catch(err => console.error('Error fetching hostels:', err))
    }, [token])

    useEffect(() => {
        if (token) {
            fetchWardens()
            fetchUsers()
            fetchHostels()
        }
    }, [token, fetchWardens, fetchUsers, fetchHostels])

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            if (!formData.userId || !formData.hostelId) {
                setError('Please select both user and hostel')
                setLoading(false)
                return
            }

            if (editingId) {
                // Update warden
                const res = await axios.post(
                    `${import.meta.env.VITE_APP_API}/warden/update-warden/${editingId}`,
                    formData,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                )
                
                if (res.data.Status === 'Success') {
                    setSuccess('Warden updated successfully')
                    setShowForm(false)
                    setEditingId(null)
                    setFormData({ userId: '', hostelId: '', startDate: new Date().toISOString().split('T')[0], active: true, note: '' })
                    fetchWardens()
                } else {
                    setError(res.data.Error || 'Failed to update warden')
                }
            } else {
                // Create warden
                const res = await axios.post(
                    `${import.meta.env.VITE_APP_API}/warden/create-warden`,
                    formData,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                )
                
                if (res.data.Status === 'Success') {
                    setSuccess('Warden created successfully')
                    setShowForm(false)
                    setFormData({ userId: '', hostelId: '', startDate: new Date().toISOString().split('T')[0], active: true, note: '' })
                    fetchWardens()
                } else {
                    setError(res.data.Error || 'Failed to create warden')
                }
            }
        } catch (err) {
            console.error('Error:', err)
            setError(err.response?.data?.Error || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const cancelForm = () => {
        setShowForm(false)
        setEditingId(null)
        setFormData({ userId: '', hostelId: '', startDate: new Date().toISOString().split('T')[0], active: true, note: '' })
        setError('')
    }

    // Edit full warden details (user info & warden assignment)
    const handleOpenEditWardenModal = (warden) => {
        const rawHostelId = typeof warden.hostelId === 'object' ? (warden.hostelId?._id || '') : (warden.hostelId || '');
        const rawUserId = typeof warden.userId === 'object' ? (warden.userId?._id || '') : (warden.userId || '');
        setEditingWarden({
            _id: warden._id,
            userId: rawUserId,
            username: warden.userId?.username || '',
            email: warden.userId?.email || '',
            password: '',
            hostelId: rawHostelId,
            startDate: warden.startDate ? new Date(warden.startDate).toISOString().split('T')[0] : '',
            active: warden.active !== undefined ? warden.active : true,
            note: warden.note || ''
        });
        setShowEditWardenModal(true);
        setError('');
        setSuccess('');
    };

    const submitEditWarden = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            // 1. Update user details (username, email, password)
            if (editingWarden.userId) {
                const userPayload = {
                    id: editingWarden.userId,
                    username: editingWarden.username,
                    email: editingWarden.email
                };
                if (editingWarden.password && editingWarden.password.trim()) {
                    userPayload.password = editingWarden.password.trim();
                }
                await axios.post(
                    `${import.meta.env.VITE_APP_API}/user/update-user-body`,
                    userPayload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            // 2. Update warden assignment
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/warden/update-warden/${editingWarden._id}`,
                {
                    hostelId: editingWarden.hostelId,
                    startDate: editingWarden.startDate,
                    active: editingWarden.active,
                    note: editingWarden.note
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.Status === 'Success') {
                setSuccess('Warden updated successfully');
                setShowEditWardenModal(false);
                fetchWardens();
                fetchUsers();
            } else {
                setError(res.data.Error || 'Failed to update warden');
            }
        } catch (err) {
            console.error('Error updating warden:', err);
            setError(err.response?.data?.Error || 'Failed to update warden');
        } finally {
            setLoading(false);
        }
    };

    const cancelEditWarden = () => {
        setShowEditWardenModal(false);
        setEditingWarden({
            _id: '',
            userId: '',
            username: '',
            email: '',
            password: '',
            hostelId: '',
            startDate: '',
            active: true,
            note: ''
        });
        setError('');
    };

    const handleDeleteWarden = async (wardenId) => {
        if (!window.confirm('Delete this warden assignment? This will remove the hostel assignment.')) return;
        try {
            setLoading(true);
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/warden/delete-warden/${wardenId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.Status === 'Success') {
                setSuccess('Warden assignment removed successfully');
                fetchWardens();
                fetchUsers();
            } else {
                setError(res.data.Error || 'Failed to remove warden');
            }
        } catch (err) {
            console.error('Error deleting warden:', err);
            setError('Failed to remove warden');
        } finally {
            setLoading(false);
        }
    };

    // Edit user details (username, email, password) for unassigned wardens
    const [showEditUserForm, setShowEditUserForm] = useState(false);
    const [editingUser, setEditingUser] = useState({ _id: '', username: '', email: '', password: '' });

    const handleEditUser = (userId) => {
        const user = users.find(u => u._id === userId);
        if (!user) {
            setError('User not found');
            return;
        }
        setEditingUser({ _id: user._id, username: user.username || '', email: user.email || '', password: '' });
        setShowEditUserForm(true);
    };

    const submitEditUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const userPayload = {
                id: editingUser._id,
                username: editingUser.username,
                email: editingUser.email
            };
            if (editingUser.password && editingUser.password.trim()) {
                userPayload.password = editingUser.password.trim();
            }
            await axios.post(
                `${import.meta.env.VITE_APP_API}/user/update-user-body`,
                userPayload,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('User updated successfully');
            setShowEditUserForm(false);
            setEditingUser({ _id: '', username: '', email: '', password: '' });
            fetchUsers();
            fetchWardens();
        } catch (err) {
            console.error('Error updating user:', err);
            setError('Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    const cancelEditUser = () => {
        setShowEditUserForm(false);
        setEditingUser({ _id: '', username: '', email: '', password: '' });
        setError('');
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Delete this user? This will also remove any warden record.')) return;
        try {
            setLoading(true);
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/user/delete-user/${userId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.Status === 'Success') {
                setSuccess('User deleted');
                fetchUsers();
                fetchWardens();
            } else {
                setError(res.data.Error || 'Failed to delete user');
            }
        } catch (err) {
            console.error('Error deleting user:', err);
            setError('Failed to delete user');
        } finally {
            setLoading(false);
        }
    };

    // Create new user (signup) and refresh users
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [newUserData, setNewUserData] = useState({ username: '', email: '', password: '' });

    const handleCreateUser = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/auth/signup`,
                newUserData
            )
            if (res.data.Status === 'Success') {
                setSuccess('User created. Please verify email and activate account.')
                setShowCreateUser(false)
                setNewUserData({ username: '', email: '', password: '' })
                fetchUsers()
            } else {
                setError(res.data.Error || 'Failed to create user')
            }
        } catch (err) {
            console.error('Create user error:', err)
            setError('Failed to create user')
        } finally {
            setLoading(false)
        }
    }

    const getHostelName = (hostelData) => {
        if (!hostelData) return 'N/A';
        // If the backend populated the hostel data, it's an object with a name property
        if (typeof hostelData === 'object' && hostelData.name) {
            return hostelData.name;
        }
        // Fallback: if it's just an ID, find it in the hostels array
        const idString = typeof hostelData === 'object' ? hostelData._id : hostelData;
        const hostel = hostels.find(h => String(h._id) === String(idString));
        return hostel ? hostel.name : 'N/A';
    }

    const userOptions = users.map(u => ({ value: u._id, label: u.username }))
    const hostelOptions = hostels.map(h => ({ value: h._id, label: `${h.name} (${h.gender})` }))

    const assignmentCounts = wardens.reduce((counts, warden) => {
        const userId = warden.userId?._id?.toString?.() || warden.userId?.toString?.()
        if (!userId) return counts
        counts[userId] = (counts[userId] || 0) + 1
        return counts
    }, {})

    // Count distinct assigned hostels for stats
    const assignedHostelCount = React.useMemo(() => {
        const ids = wardens.map(w => w.hostelId?.toString?.()).filter(Boolean)
        return new Set(ids).size
    }, [wardens])

    // Users who have the 'warden' role and fewer than two hostel assignments
    const unassignedWardenUsers = users.filter(u => {
        const hasWardenRole = Array.isArray(u.roles) && u.roles.some(r => r.name === 'warden')
        const userId = u._id?.toString?.() || String(u._id)
        return hasWardenRole && (assignmentCounts[userId] || 0) < 2
    })

    // Get all users who have the 'warden' role
    const wardenUsers = React.useMemo(() => {
        return users.filter(u => Array.isArray(u.roles) && u.roles.some(r => r.name === 'warden'));
    }, [users]);

    const totalWardensCount = wardenUsers.length;
    const activeWardensCount = wardenUsers.filter(u => u.active).length;
    const inactiveWardensCount = wardenUsers.filter(u => !u.active).length;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="font-bold text-[#6b0f14] text-2xl">Manage Wardens</h1>
                <div className="flex gap-3">
                    <DefaultBtn
                        type="button"
                        label={showCreateUser ? 'Cancel User' : 'Create User'}
                        onClick={() => setShowCreateUser(prev => !prev)}
                        className={showCreateUser ? 'bg-gray-500' : 'bg-[#6b0f14]'}
                    />
                </div>
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="relative bg-[#6b0f14] text-white p-6 rounded-2xl shadow-lg">
                    <div className="text-sm font-medium uppercase tracking-wide text-[#fdf6e3]">
                        Total Wardens
                    </div>
                    <div className="mt-3 text-4xl font-bold">{totalWardensCount}</div>
                </div>
                <div className="relative bg-[#d4af37] text-[#6b0f14] p-6 rounded-2xl shadow-lg">
                    <div className="text-sm font-semibold uppercase tracking-wide">
                        Active Wardens
                    </div>
                    <div className="mt-3 text-4xl font-bold">{activeWardensCount}</div>
                </div>
                <div className="relative bg-blue-600 text-white p-6 rounded-2xl shadow-lg">
                    <div className="text-sm font-medium uppercase tracking-wide">
                        Inactive Wardens
                    </div>
                    <div className="mt-3 text-4xl font-bold">{inactiveWardensCount}</div>
                </div>
                <div className="relative bg-[#4a90e2] text-white p-6 rounded-2xl shadow-lg">
                    <div className="text-sm font-medium uppercase tracking-wide">
                        Assigned Hostels
                    </div>
                    <div className="mt-3 text-4xl font-bold">{assignedHostelCount}</div>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
                    {success}
                </div>
            )}

            {/* Form */}
            {showForm && (
                <div className="mb-8 p-6 bg-gray-50 rounded-2xl shadow-lg border border-gray-200">
                    <h2 className="text-xl font-semibold text-[#6b0f14] mb-4">
                        {editingId ? 'Edit Warden' : 'Create New Warden'}
                    </h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Dropdown
                            label="User"
                            name="userId"
                            value={formData.userId}
                            onChange={handleInputChange}
                            options={userOptions}
                        />
                        <Dropdown
                            label="Hostel"
                            name="hostelId"
                            value={formData.hostelId}
                            onChange={handleInputChange}
                            options={hostelOptions}
                        />
                        <DefaultInput
                            label="Start Date"
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleInputChange}
                        />
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="active"
                                checked={formData.active}
                                onChange={handleInputChange}
                                className="w-4 h-4"
                            />
                            <label className="font-medium">Active</label>
                        </div>
                        <DefaultInput
                            label="Notes"
                            type="text"
                            name="note"
                            value={formData.note}
                            onChange={handleInputChange}
                            placeholder="Optional notes"
                            className="sm:col-span-2"
                        />
                        <div className="sm:col-span-2 flex gap-3">
                            <DefaultBtn
                                type="submit"
                                label={loading ? 'Processing...' : editingId ? 'Update Warden' : 'Create Warden'}
                                disabled={loading}
                            />
                            <DefaultBtn
                                type="button"
                                label="Cancel"
                                onClick={cancelForm}
                                className="bg-gray-500"
                            />
                        </div>
                    </form>
                </div>
            )}

            {/* Create User Form */}
            {showCreateUser && (
                <div className="mb-8 p-6 bg-gray-50 rounded-2xl shadow-lg border border-gray-200">
                    <h2 className="text-xl font-semibold text-[#6b0f14] mb-4">Create New User (warden)</h2>
                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <DefaultInput label="Username" type="text" name="username" value={newUserData.username} onChange={(e)=>setNewUserData({...newUserData, username: e.target.value})} />
                        <DefaultInput label="Email" type="email" name="email" value={newUserData.email} onChange={(e)=>setNewUserData({...newUserData, email: e.target.value})} />
                        <DefaultInput label="Password" type="password" name="password" value={newUserData.password} onChange={(e)=>setNewUserData({...newUserData, password: e.target.value})} />
                        <div className="sm:col-span-3 flex gap-3">
                            <DefaultBtn type="submit" label={loading ? 'Processing...' : 'Create User'} disabled={loading} />
                            <DefaultBtn type="button" label="Cancel" onClick={()=>setShowCreateUser(false)} className="bg-gray-500" />
                        </div>
                    </form>
                </div>
            )}

            {/* Wardens Table */}
            <div className="overflow-x-auto rounded-2xl shadow-lg">
                <table className="min-w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                        <tr>
                            <th className="px-6 py-4 font-semibold">#</th>
                            <th className="px-6 py-4 font-semibold">Username</th>
                            <th className="px-6 py-4 font-semibold">Email</th>
                            <th className="px-6 py-4 font-semibold">Assigned Hostel</th>
                            <th className="px-6 py-4 font-semibold">Start Date</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {wardens.length > 0 ? (
                            wardens.map((warden, index) => (
                                <tr key={warden._id} className="hover:bg-[#fefaf0] transition-all duration-150">
                                    <td className="px-6 py-4 font-medium">{index + 1}</td>
                                    <td className="px-6 py-4">{warden.userId?.username || 'N/A'}</td>
                                    <td className="px-6 py-4">{warden.userId?.email || 'N/A'}</td>
                                    <td className="px-6 py-4">{getHostelName(warden.hostelId)}</td>
                                    <td className="px-6 py-4">
                                        {warden.startDate ? new Date(warden.startDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            warden.active 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {warden.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <ActionButtons
                                            onEdit={() => handleOpenEditWardenModal(warden)}
                                            onDelete={() => handleDeleteWarden(warden._id)}
                                            editTitle="Edit warden details"
                                            deleteTitle="Remove warden assignment"
                                            showLabels={false}
                                            size="sm"
                                        />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                                    No wardens found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Unassigned users with warden role */}
            {unassignedWardenUsers.length > 0 && (
                <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-3">Available Wardens (users with `warden` role and fewer than two hostels)</h2>
                    <div className="overflow-x-auto rounded-2xl shadow-lg">
                        <table className="min-w-full text-sm text-left text-gray-600 bg-white">
                            <thead className="text-xs uppercase bg-[#f8f7f4] text-[#6b0f14]">
                                <tr>
                                    <th className="px-6 py-3">#</th>
                                    <th className="px-6 py-3">Username</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {unassignedWardenUsers.map((u, i) => (
                                    <tr key={u._id} className="hover:bg-[#fefaf0]">
                                        <td className="px-6 py-3">{i + 1}</td>
                                        <td className="px-6 py-3">{u.username}</td>
                                        <td className="px-6 py-3">{u.email}</td>
                                        <td className="px-6 py-3">
                                            <ActionButtons
                                                onEdit={() => handleEditUser(u._id)}
                                                onDelete={() => handleDeleteUser(u._id)}
                                                editTitle="Edit user details"
                                                deleteTitle="Delete user"
                                                showLabels={false}
                                                size="sm"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit Full Warden Details Modal */}
            {showEditWardenModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-[#6b0f14] mb-4">Edit Warden Details</h3>
                        <form onSubmit={submitEditWarden} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DefaultInput
                                label="Username"
                                type="text"
                                value={editingWarden.username}
                                onChange={(e) => setEditingWarden(prev => ({ ...prev, username: e.target.value }))}
                                required
                            />
                            <DefaultInput
                                label="Email"
                                type="email"
                                value={editingWarden.email}
                                onChange={(e) => setEditingWarden(prev => ({ ...prev, email: e.target.value }))}
                                required
                            />
                            <div className="sm:col-span-2">
                                <DefaultInput
                                    label="Password (optional)"
                                    type="password"
                                    placeholder="Leave blank to keep unchanged"
                                    value={editingWarden.password}
                                    onChange={(e) => setEditingWarden(prev => ({ ...prev, password: e.target.value }))}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Dropdown
                                    label="Assigned Hostel"
                                    name="hostelId"
                                    value={editingWarden.hostelId}
                                    onChange={(e) => setEditingWarden(prev => ({ ...prev, hostelId: e.target.value }))}
                                    options={hostelOptions}
                                />
                            </div>
                            <DefaultInput
                                label="Start Date"
                                type="date"
                                value={editingWarden.startDate}
                                onChange={(e) => setEditingWarden(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                            <div className="flex items-center gap-2 pt-6">
                                <input
                                    type="checkbox"
                                    id="warden-active-toggle"
                                    checked={editingWarden.active}
                                    onChange={(e) => setEditingWarden(prev => ({ ...prev, active: e.target.checked }))}
                                    className="w-4 h-4 accent-[#6b0f14]"
                                />
                                <label htmlFor="warden-active-toggle" className="font-medium text-sm text-gray-700 cursor-pointer">
                                    Active Status
                                </label>
                            </div>
                            <div className="sm:col-span-2">
                                <DefaultInput
                                    label="Notes"
                                    type="text"
                                    placeholder="Optional notes"
                                    value={editingWarden.note}
                                    onChange={(e) => setEditingWarden(prev => ({ ...prev, note: e.target.value }))}
                                />
                            </div>
                            <div className="sm:col-span-2 flex gap-3 justify-end mt-2">
                                <DefaultBtn type="button" label="Cancel" onClick={cancelEditWarden} className="bg-gray-500" />
                                <DefaultBtn type="submit" label={loading ? 'Saving...' : 'Save Changes'} disabled={loading} />
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Form (for available unassigned wardens) */}
            {showEditUserForm && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-semibold text-[#6b0f14] mb-4">Edit User</h3>
                        <form onSubmit={submitEditUser} className="grid grid-cols-1 gap-3">
                            <DefaultInput label="Username" type="text" value={editingUser.username} onChange={(e)=>setEditingUser(prev=>({...prev, username: e.target.value}))} required />
                            <DefaultInput label="Email" type="email" value={editingUser.email} onChange={(e)=>setEditingUser(prev=>({...prev, email: e.target.value}))} required />
                            <DefaultInput label="Password (optional)" type="password" placeholder="Leave blank to keep unchanged" value={editingUser.password} onChange={(e)=>setEditingUser(prev=>({...prev, password: e.target.value}))} />
                            <div className="flex gap-3 justify-end mt-2">
                                <DefaultBtn type="button" label="Cancel" onClick={cancelEditUser} className="bg-gray-500" />
                                <DefaultBtn type="submit" label={loading ? 'Saving...' : 'Save'} disabled={loading} />
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default WardenManage
