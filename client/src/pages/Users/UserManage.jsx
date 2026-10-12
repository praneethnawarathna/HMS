import React, { useEffect, useState } from 'react';
import { FaUsers } from 'react-icons/fa6';
import axios from 'axios';
import ActionButtons from '../../components/Buttons/ActionButtons';
import DefaultInput from '../../components/Form/DefaultInput';
import DefaultBtn from '../../components/Buttons/DefaultBtn';
import Dropdown from '../../components/Form/Dropdown';

const UserManage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState({
    _id: '',
    username: '',
    email: '',
    password: '',
    emailVerified: false,
    active: false,
    roleID: '',
  });

  const token = localStorage.getItem('login');

  const fetchUsers = React.useCallback(() => {
    axios
      .get(import.meta.env.VITE_APP_API + '/user/view-all-users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data.Result || []))
      .catch((err) => setError(err.message || 'Failed to fetch users'));
  }, [token]);

  const fetchRoles = React.useCallback(() => {
    axios
      .get(import.meta.env.VITE_APP_API + '/auth/view-all-role', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setRoles(res.data.Result || []))
      .catch((err) => console.error('Error fetching roles:', err));
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchRoles();
    }
  }, [token, fetchUsers, fetchRoles]);

  const handleEditUser = (user) => {
    const currentRoleId = user.roles?.length > 0
      ? (typeof user.roles[0] === 'string' ? user.roles[0] : user.roles[0]._id)
      : '';
    setEditingUser({
      _id: user._id,
      username: user.username || '',
      email: user.email || '',
      emailVerified: user.emailVerified || false,
      active: user.active || false,
      roleID: currentRoleId,
    });
    setShowEditModal(true);
    setError(null);
    setSuccess(null);
  };

  const submitEditUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Update username, email & password (if provided)
      const updateData = { username: editingUser.username, email: editingUser.email };
      if (editingUser.password && editingUser.password.trim()) {
        updateData.password = editingUser.password.trim();
      }

      await axios.post(
        `${import.meta.env.VITE_APP_API}/user/update-user/${editingUser._id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update email verification status
      const currentUser = users.find(u => u._id === editingUser._id);
      if (currentUser && currentUser.emailVerified !== editingUser.emailVerified) {
        await axios.post(
          `${import.meta.env.VITE_APP_API}/user/verify-user-email/${editingUser._id}`,
          null,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Update active status
      if (currentUser && currentUser.active !== editingUser.active) {
        await axios.post(
          `${import.meta.env.VITE_APP_API}/user/update-user-status/${editingUser._id}`,
          null,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Update role if changed
      if (editingUser.roleID) {
        await axios.post(
          `${import.meta.env.VITE_APP_API}/user/update-user-role`,
          { userID: editingUser._id, roleID: editingUser.roleID },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setSuccess('User updated successfully');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const cancelEditUser = () => {
    setShowEditModal(false);
    setEditingUser({ _id: '', username: '', email: '', password: '', emailVerified: false, active: false, roleID: '' });
    setError(null);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user? This will also remove any linked student data.')) return;
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_APP_API}/user/delete-user/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.Status === 'Success') {
        setSuccess('User deleted successfully');
        fetchUsers();
      } else {
        setError(res.data.Error || 'Failed to delete user');
      }
    } catch (err) {
      setError(err.message || 'Error deleting user');
    }
  };

  return (
    <div className="p-6">
      <h1 className="font-bold text-[#6b0f14] text-xl mb-4">Manage Users</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
        <div className="relative bg-[#6b0f14] text-white p-6 rounded-2xl shadow-lg overflow-hidden hover:scale-[1.02] transition-transform duration-300">
          <div className="absolute right-4 top-4 opacity-20 text-white text-6xl">
            <FaUsers />
          </div>
          <div className="relative z-10">
            <div className="text-sm font-medium uppercase tracking-wide text-[#fdf6e3]">Total Users</div>
            <div className="mt-2 text-3xl font-bold">{users.length}</div>
          </div>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
      {success && <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">{success}</div>}

      <div className="overflow-x-auto rounded-2xl shadow-lg mt-8">
        <table className="min-w-full text-sm text-left text-gray-600 bg-white">
          <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
            <tr>
              <th className="px-6 py-4 font-semibold">#</th>
              <th className="px-6 py-4 font-semibold">Username</th>
              <th className="px-6 py-4 font-semibold">Roles</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold">Email Verify</th>
              <th className="px-6 py-4 font-semibold">Account Status</th>
              <th className="px-6 py-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user, idx) => (
              <tr key={user._id} className="hover:bg-[#fefaf0] transition-all duration-150">
                <td className="px-6 py-4 font-medium text-gray-800">{idx + 1}</td>
                <td className="px-6 py-4">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-2">
                    {user.roles?.length > 0 ? (
                      user.roles.map((role, i) => (
                        <span key={i} className="bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-3 py-1 rounded-full">
                          {typeof role === 'string' ? role : role.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 italic text-sm">No roles</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">
                  {user.emailVerified ? (
                    <span className="uppercase bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-3 py-1 rounded-full">Verified</span>
                  ) : (
                    <span className="uppercase bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">Not Verified</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {user.active ? (
                    <span className="uppercase bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-3 py-1 rounded-full">Active</span>
                  ) : (
                    <span className="uppercase bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">Deactive</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <ActionButtons
                    onEdit={() => handleEditUser(user)}
                    onDelete={() => handleDeleteUser(user._id)}
                    editTitle="Edit user details"
                    deleteTitle="Delete this user"
                    showLabels={false}
                    size="sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-semibold text-[#6b0f14] mb-4">Edit User</h3>
            <form onSubmit={submitEditUser} className="grid grid-cols-1 gap-4">
              <DefaultInput
                label="Username"
                type="text"
                value={editingUser.username}
                onChange={(e) => setEditingUser(prev => ({ ...prev, username: e.target.value }))}
              />
              <DefaultInput
                label="Email"
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
              />
              <DefaultInput
                label="Password (optional)"
                type="password"
                placeholder="Leave blank to keep unchanged"
                value={editingUser.password || ''}
                onChange={(e) => setEditingUser(prev => ({ ...prev, password: e.target.value }))}
              />
              <Dropdown
                label="Role"
                name="roleID"
                value={editingUser.roleID}
                onChange={(e) => setEditingUser(prev => ({ ...prev, roleID: e.target.value }))}
                options={roles.map(role => ({
                  label: role.name,
                  value: role._id,
                }))}
              />
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.emailVerified}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, emailVerified: e.target.checked }))}
                    className="w-4 h-4 accent-[#6b0f14]"
                  />
                  <span className="font-medium text-sm">Email Verified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.active}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4 accent-[#6b0f14]"
                  />
                  <span className="font-medium text-sm">Active</span>
                </label>
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <DefaultBtn type="button" label="Cancel" onClick={cancelEditUser} className="bg-gray-500" />
                <DefaultBtn type="submit" label={loading ? 'Saving...' : 'Save Changes'} disabled={loading} />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManage;