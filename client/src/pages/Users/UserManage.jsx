import React, { useEffect, useState } from 'react';
import { FaUsers } from 'react-icons/fa6';
import axios from 'axios';
import { Link } from 'react-router-dom';

const UserManage = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const token = localStorage.getItem('login');

  const fetchUsers = React.useCallback(() => {
    axios
      .get(import.meta.env.VITE_APP_API + '/user/view-all-users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data.Result || []))
      .catch((err) => setError(err.message || 'Failed to fetch users'))
  }, [token]);

  useEffect(() => {
    if (token) fetchUsers();
  }, [token, fetchUsers]);

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
                <td className="px-6 py-4 flex gap-3">
                  <Link to={`/Dashboard/View-user/${user._id}`} className="text-[#6b0f14] font-medium hover:underline">View</Link>
                  <button onClick={() => handleDeleteUser(user._id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManage;