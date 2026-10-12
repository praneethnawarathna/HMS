import React, { useEffect, useState } from 'react'
import DefaultBtn from '../../components/Buttons/DefaultBtn'
import DefaultInput from '../../components/Form/DefaultInput'
import ActionButtons from '../../components/Buttons/ActionButtons'
import { Link } from 'react-router-dom'
import { FaUserLock } from "react-icons/fa";
import axios from 'axios';

const SYSTEM_PERMISSIONS = [
    'manage-wardens',
    'view-all-users',
    'view-one-user',
    'verify-user-email',
    'update-user-status',
    'update-user-role',
    'get-all-hostels',
    'view-one-hostel',
    'create-hostel',
    'update-room-count',
    'assign-new-warden',
    'view-all-rooms',
    'get-one-room',
    'update-room-capasity',
    'warden-rooms',
    'student-assign-to-rooms',
    'delete-room',
    'get-all-students-auth',
    'get-student-byID',
    'create-student-sheet',
    'create-student-manually',
    'update-Student',
    'delete-student',
    'std-extra-needs',
    'approve-needs',
    'rooms-for-students',
    'assigned-all-students',
    'assign-room-special',
    'create-role-permission',
    'view-role-permission',
    'view-one-role-permission',
    'delete-role-permission',
];

const RolePermissions = () => {

    const [getreols, setgetroles] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const token = localStorage.getItem('login')

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingRole, setEditingRole] = useState({ _id: '', name: '', permissions: [], newPermission: '' })

    const fetchRoles = React.useCallback(() => {
        axios.get(import.meta.env.VITE_APP_API + '/auth/view-all-role', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
            .then(res => setgetroles(res.data.Result))
            .catch(err => console.log(err))
    }, [token])

    useEffect(() => {
        fetchRoles()
    }, [fetchRoles])

    const handleEditRole = (role) => {
        setEditingRole({
            _id: role._id,
            name: role.name || '',
            permissions: role.permissions || [],
            newPermission: ''
        })
        setShowEditModal(true)
        setError('')
        setSuccess('')
    }

    const cancelEditRole = () => {
        setShowEditModal(false)
        setEditingRole({ _id: '', name: '', permissions: [], newPermission: '' })
        setError('')
    }

    const handleAddPermission = async () => {
        if (!editingRole.newPermission.trim()) return
        setLoading(true)
        setError('')
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/auth/create-permission`,
                {
                    role: editingRole.name,
                    permissions: [editingRole.newPermission.trim()]
                },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            if (res.data.Status === 'Success' || res.data.message) {
                setSuccess('Permission added successfully')
                // Refresh role data
                const roleRes = await axios.get(
                    `${import.meta.env.VITE_APP_API}/auth/view-one-role/${editingRole._id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                setEditingRole(prev => ({
                    ...prev,
                    permissions: roleRes.data.Result?.permissions || [],
                    newPermission: ''
                }))
                fetchRoles()
            } else {
                setError(res.data.Error || 'Failed to add permission')
            }
        } catch (err) {
            console.error('Error adding permission:', err)
            setError('Failed to add permission')
        } finally {
            setLoading(false)
        }
    }

    const handleRemovePermission = async (permission) => {
        if (!window.confirm(`Remove permission "${permission}" from this role?`)) return
        setLoading(true)
        setError('')
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/auth/delete-role-permission`,
                { roleId: editingRole._id, permission },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            if (res.data.Status === 'Success') {
                setSuccess('Permission removed successfully')
                setEditingRole(prev => ({
                    ...prev,
                    permissions: prev.permissions.filter(p => p !== permission)
                }))
                fetchRoles()
            } else {
                setError(res.data.message || 'Failed to remove permission')
            }
        } catch (err) {
            console.error('Error removing permission:', err)
            setError('Failed to remove permission')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteRole = async (roleId) => {
        if (!window.confirm('Delete this role? This cannot be undone.')) return
        try {
            // Remove all permissions from the role to effectively "delete" it
            const role = getreols.find(r => r._id === roleId)
            if (role && role.permissions) {
                for (const perm of role.permissions) {
                    await axios.post(
                        `${import.meta.env.VITE_APP_API}/auth/delete-role-permission`,
                        { roleId, permission: perm },
                        { headers: { Authorization: `Bearer ${token}` } }
                    )
                }
            }
            setSuccess('Role permissions cleared successfully')
            fetchRoles()
        } catch (err) {
            console.error('Error deleting role:', err)
            setError('Failed to delete role')
        }
    }

    return (
        <div>
            <h1 className="font-bold text-[#6b0f14] text-xl">Role and Permissions</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
                <div className="relative bg-[#6b0f14] text-white p-6 rounded-2xl shadow-lg overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                    {/* Icon in background */}
                    <div className="absolute right-4 top-4 opacity-20 text-white text-6xl">
                        <FaUserLock />
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                        <div className="text-sm font-medium uppercase tracking-wide text-[#fdf6e3]">
                            Roles (User Types)
                        </div>
                        <div className="mt-2 text-3xl font-bold">{getreols.length}</div>
                    </div>
                </div>
            </div>

            <Link to={'/Dashboard/Create-Permissions'}>
                <DefaultBtn
                    type='button'
                    label='Create Role and Permissions'
                />
            </Link>

            {error && <div className="mb-4 mt-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
            {success && <div className="mb-4 mt-4 p-4 bg-green-100 text-green-700 rounded-lg">{success}</div>}

            <div className="mt-8">
                <div className="overflow-x-auto rounded-2xl shadow-lg">
                    <table className="min-w-full text-sm text-left text-gray-600 bg-white">
                        <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold tracking-wider">#</th>
                                <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {
                                getreols.map((role, index) => {
                                    return (
                                        <tr className="hover:bg-[#fefaf0] transition-all duration-150" key={index}>
                                            <td className="px-6 py-4 font-medium text-gray-800">{index + 1}</td>
                                            <td className="px-6 py-4">{role.name}</td>
                                            <td className="px-6 py-4">
                                                <ActionButtons
                                                    onEdit={() => handleEditRole(role)}
                                                    onDelete={() => handleDeleteRole(role._id)}
                                                    editTitle={`Edit ${role.name} permissions`}
                                                    deleteTitle={`Clear ${role.name} permissions`}
                                                    showLabels={false}
                                                    size="sm"
                                                />
                                            </td>
                                        </tr>
                                    )
                                })
                            }

                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Role Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-[#6b0f14]">
                                Edit Role: <span className="uppercase">{editingRole.name}</span>
                            </h3>
                            <span className="text-xs bg-[#fdf6e3] text-[#6b0f14] px-2.5 py-1 rounded-full font-medium">
                                {editingRole.permissions.length} permission{editingRole.permissions.length === 1 ? '' : 's'}
                            </span>
                        </div>

                        {/* Current Permissions */}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">Current Permissions</label>
                            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
                                {editingRole.permissions.length > 0 ? (
                                    editingRole.permissions.map((perm, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 bg-white text-[#6b0f14] border border-[#6b0f14]/20 text-xs px-2.5 py-1 rounded-lg shadow-xs"
                                        >
                                            {perm}
                                            <button
                                                onClick={() => handleRemovePermission(perm)}
                                                className="ml-1 text-red-500 hover:text-red-700 font-bold text-xs p-0.5 rounded hover:bg-red-50"
                                                title="Remove permission"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-gray-500 italic text-sm">No permissions assigned.</span>
                                )}
                            </div>
                        </div>

                        {/* Quick Add from Available Permissions */}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-1">Quick Add System Permission</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b0f14]"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setEditingRole(prev => ({ ...prev, newPermission: e.target.value }));
                                    }
                                }}
                                value=""
                            >
                                <option value="">-- Select a system permission to add --</option>
                                {SYSTEM_PERMISSIONS.filter(p => !editingRole.permissions.includes(p)).map((perm) => (
                                    <option key={perm} value={perm}>{perm}</option>
                                ))}
                            </select>
                        </div>

                        {/* Add New Permission (Custom) */}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">Or Enter Custom Permission</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={editingRole.newPermission}
                                    onChange={(e) => setEditingRole(prev => ({ ...prev, newPermission: e.target.value }))}
                                    placeholder="e.g. manage-hostels"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14] focus:border-transparent text-sm"
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPermission(); } }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddPermission}
                                    disabled={loading || !editingRole.newPermission.trim()}
                                    className="px-4 py-2 bg-[#6b0f14] text-white rounded-lg hover:bg-[#8b1a1f] transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    {loading ? '...' : 'Add'}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-4">
                            <DefaultBtn type="button" label="Close" onClick={cancelEditRole} className="bg-gray-500" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RolePermissions