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
<<<<<<< Updated upstream
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
=======

    const token = localStorage.getItem('login');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_APP_API}/user/view-all-users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(res.data?.Result || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            setFeedback({ type: 'error', text: 'Failed to load user accounts.' });
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchRoles = useCallback(async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_APP_API}/auth/view-all-role`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRoles(res.data?.Result || []);
        } catch (err) {
            console.error('Error fetching roles:', err);
        }
    }, [token]);

    const fetchHostels = useCallback(async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_APP_API}/hostel/get-all-hostels`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setHostels(res.data?.Result || []);
        } catch (err) {
            console.error('Error fetching hostels:', err);
        }
    }, [token]);

    const fetchWardens = useCallback(async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_APP_API}/warden/get-all-wardens`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setWardens(res.data?.Result || []);
        } catch (err) {
            console.error('Error fetching wardens:', err);
        }
    }, [token]);

    const fetchAllData = useCallback(() => {
        if (token) {
            fetchUsers();
            fetchRoles();
            fetchHostels();
            fetchWardens();
        }
    }, [token, fetchUsers, fetchRoles, fetchHostels, fetchWardens]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Map warden assignments by user ID for instant lookup
    const wardenMap = useMemo(() => {
        const map = {};
        wardens.forEach(w => {
            const uId = (w.userId?._id || w.userId)?.toString();
            if (uId) {
                map[uId] = w;
            }
        });
        return map;
    }, [wardens]);

    // Check if the currently selected role in the modal is 'warden'
    const isSelectedRoleWarden = useMemo(() => {
        if (!modalUser.roleID) return false;
        const matched = roles.find(r => r._id === modalUser.roleID || r.name.toLowerCase() === modalUser.roleID.toLowerCase());
        return matched?.name?.toLowerCase() === 'warden';
    }, [modalUser.roleID, roles]);

    // Handle toggling account active status via Tailwind Toggle Switch
    const handleToggleStatus = async (user) => {
        const id = user._id;
        const currentActive = Boolean(user.active);
        const nextActive = !currentActive;

        setTogglingId(id);
        setFeedback(null);

        // Optimistic UI update
        setUsers(prev => prev.map(u => u._id === id ? { ...u, active: nextActive } : u));

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/user/update-user-status/${id}`,
                null,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data?.Status === 'Success' || res.data?.Message || res.data?.success) {
                setFeedback({
                    type: 'success',
                    text: `Account "${user.username || user.email}" is now ${nextActive ? 'Active' : 'Disabled'}.`,
                });
            } else {
                // Revert on error
                setUsers(prev => prev.map(u => u._id === id ? { ...u, active: currentActive } : u));
                setFeedback({
                    type: 'error',
                    text: res.data?.Error || 'Failed to update user status.',
                });
            }
        } catch (err) {
            console.error('Error toggling status:', err);
            // Revert on error
            setUsers(prev => prev.map(u => u._id === id ? { ...u, active: currentActive } : u));
            setFeedback({
                type: 'error',
                text: err.response?.data?.message || err.response?.data?.Error || 'Server error while toggling status.',
            });
        } finally {
            setTogglingId(null);
            setTimeout(() => setFeedback(null), 3500);
        }
    };

    // Open modal to Create User
    const handleOpenCreateModal = () => {
        setIsCreateMode(true);
        // Default to first role or warden role if on wardens tab
        const defaultRole = activeTab === 'wardens'
            ? roles.find(r => r.name.toLowerCase() === 'warden')
            : roles[0];

        setModalUser({
            _id: '',
            username: '',
            email: '',
            password: '',
            emailVerified: true,
            active: true,
            roleID: defaultRole?._id || '',
            wardenId: '',
            hostelId: '',
            startDate: new Date().toISOString().split('T')[0],
            note: '',
        });
        setShowModal(true);
    };

    // Open modal to Edit User
    const handleOpenEditModal = (user) => {
        setIsCreateMode(false);
        const currentRoleId = user.roles?.length > 0
            ? (typeof user.roles[0] === 'string' ? user.roles[0] : user.roles[0]._id)
            : '';

        const existingWarden = wardenMap[user._id];
        const rawHostelId = existingWarden
            ? (typeof existingWarden.hostelId === 'object' ? existingWarden.hostelId?._id : existingWarden.hostelId)
            : '';

        setModalUser({
            _id: user._id,
            username: user.username || '',
            email: user.email || '',
            password: '',
            emailVerified: Boolean(user.emailVerified),
            active: Boolean(user.active),
            roleID: currentRoleId,
            wardenId: existingWarden?._id || '',
            hostelId: rawHostelId || '',
            startDate: existingWarden?.startDate ? new Date(existingWarden.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            note: existingWarden?.note || '',
        });
        setShowModal(true);
    };

    // Save User (Create or Edit)
    const handleSaveUser = async (e) => {
        e.preventDefault();
        setModalSubmitting(true);
        setFeedback(null);

        try {
            let targetUserId = modalUser._id;

            if (isCreateMode) {
                // 1. Create account
                if (!modalUser.password || modalUser.password.length < 6) {
                    setFeedback({ type: 'error', text: 'Password must be at least 6 characters long.' });
                    setModalSubmitting(false);
                    return;
                }

                const createRes = await axios.post(
                    `${import.meta.env.VITE_APP_API}/auth/signup`,
                    {
                        username: modalUser.username,
                        email: modalUser.email,
                        password: modalUser.password,
                    }
                );

                if (createRes.data?.Error) {
                    setFeedback({ type: 'error', text: createRes.data.Error });
                    setModalSubmitting(false);
                    return;
                }

                targetUserId = createRes.data?.userId || createRes.data?.user?._id;

                // Fallback to find new user ID if not returned
                if (!targetUserId) {
                    const refreshed = await axios.get(`${import.meta.env.VITE_APP_API}/user/view-all-users`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const found = (refreshed.data?.Result || []).find(u => u.email === modalUser.email || u.username === modalUser.username);
                    targetUserId = found?._id;
                }
            } else {
                // 2. Update existing account basic info
                const updatePayload = {
                    username: modalUser.username,
                    email: modalUser.email
                };
                if (modalUser.password && modalUser.password.trim()) {
                    updatePayload.password = modalUser.password.trim();
                }

                await axios.post(
                    `${import.meta.env.VITE_APP_API}/user/update-user/${modalUser._id}`,
                    updatePayload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            if (targetUserId) {
                // Update role assignment
                if (modalUser.roleID) {
                    await axios.post(
                        `${import.meta.env.VITE_APP_API}/user/update-user-role`,
                        { userID: targetUserId, roleID: modalUser.roleID },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }

                // Update email verification
                const originalUser = users.find(u => u._id === targetUserId);
                if (isCreateMode || (originalUser && Boolean(originalUser.emailVerified) !== modalUser.emailVerified)) {
                    await axios.post(
                        `${import.meta.env.VITE_APP_API}/user/verify-user-email/${targetUserId}`,
                        { emailVerified: modalUser.emailVerified },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }

                // Update active status
                if (!isCreateMode && originalUser && Boolean(originalUser.active) !== modalUser.active) {
                    await axios.post(
                        `${import.meta.env.VITE_APP_API}/user/update-user-status/${targetUserId}`,
                        null,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }

                // If role is warden and hostel is selected, handle warden assignment
                if (isSelectedRoleWarden && modalUser.hostelId) {
                    const existingWarden = wardenMap[targetUserId];
                    if (existingWarden) {
                        await axios.post(
                            `${import.meta.env.VITE_APP_API}/warden/update-warden/${existingWarden._id}`,
                            {
                                hostelId: modalUser.hostelId,
                                startDate: modalUser.startDate,
                                active: modalUser.active,
                                note: modalUser.note
                            },
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                    } else {
                        await axios.post(
                            `${import.meta.env.VITE_APP_API}/warden/create-warden`,
                            {
                                userId: targetUserId,
                                hostelId: modalUser.hostelId,
                                startDate: modalUser.startDate,
                                active: modalUser.active,
                                note: modalUser.note
                            },
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                    }
                }
            }

            setFeedback({
                type: 'success',
                text: isCreateMode
                    ? `User "${modalUser.username}" created successfully.`
                    : `User "${modalUser.username}" updated successfully.`
            });
            setShowModal(false);
            fetchAllData();
        } catch (err) {
            console.error('Error saving user:', err);
            setFeedback({
                type: 'error',
                text: err.response?.data?.message || err.response?.data?.Error || 'Failed to save user account details.'
            });
        } finally {
            setModalSubmitting(false);
            setTimeout(() => setFeedback(null), 3500);
        }
    };

    // Delete user
    const handleDeleteUser = async (user) => {
        const username = user.username || user.email || 'this user';
        if (!window.confirm(`Delete user "${username}"? This will revoke access and remove linked profile associations.`)) {
            return;
        }

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/user/delete-user/${user._id}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data?.Status === 'Success') {
                setFeedback({ type: 'success', text: `User "${username}" deleted successfully.` });
                fetchAllData();
            } else {
                setFeedback({ type: 'error', text: res.data?.Error || 'Failed to delete user.' });
            }
        } catch (err) {
            console.error('Error deleting user:', err);
            setFeedback({ type: 'error', text: err.response?.data?.message || 'Error deleting user.' });
        } finally {
            setTimeout(() => setFeedback(null), 3500);
        }
    };

    // Categorized groups
    const categorized = useMemo(() => {
        const wardensList = [];
        const adminsList = [];
        const studentsList = [];

        users.forEach(u => {
            const rNames = getUserRoleNames(u);
            if (rNames.includes('warden')) {
                wardensList.push(u);
            } else if (rNames.includes('admin') || rNames.includes('director')) {
                adminsList.push(u);
            } else if (rNames.includes('student') || rNames.length === 0) {
                studentsList.push(u);
            } else {
                studentsList.push(u);
            }
        });

        return {
            wardens: wardensList,
            admins: adminsList,
            students: studentsList,
            all: users
        };
    }, [users]);

    // Filter current tab users by search term
    const displayedUsers = useMemo(() => {
        const sourceList = categorized[activeTab] || categorized.all;
        if (!searchTerm.trim()) return sourceList;

        const term = searchTerm.trim().toLowerCase();
        return sourceList.filter(u => {
            const uname = (u.username || '').toLowerCase();
            const email = (u.email || '').toLowerCase();
            return uname.includes(term) || email.includes(term);
        });
    }, [categorized, activeTab, searchTerm]);

    const tabs = [
        {
            id: 'wardens',
            label: 'Wardens',
            icon: FaUserTie,
            count: categorized.wardens.length,
            badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
        },
        {
            id: 'admins',
            label: 'Admins & Directors',
            icon: FaUserShield,
            count: categorized.admins.length,
            badgeBg: 'bg-rose-100 text-[#6b0f14] border-rose-300',
        },
        {
            id: 'students',
            label: 'Students',
            icon: FaUserGraduate,
            count: categorized.students.length,
            badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        },
        {
            id: 'all',
            label: 'All Users',
            icon: FaUsers,
            count: categorized.all.length,
            badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
        },
    ];

    return (
        <div className="w-full space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#6b0f14] via-[#7d1319] to-[#8d1820] text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 mb-2 border border-white/10">
                            <ShieldCheck size={14} className="text-amber-300" />
                            HMS Administrative Console
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2.5">
                            <Users className="text-amber-300" size={28} />
                            Manage System Users
                        </h1>
                        <p className="text-white/80 text-sm mt-1 max-w-2xl">
                            Consolidated user directory for Wardens, Administrators, and Students with seamless hostel assignment controls and status management.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleOpenCreateModal}
                            type="button"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#6b0f14] rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
                        >
                            <UserPlus size={16} />
                            Create User
                        </button>

                    </div>
                </div>
            </div>

            {/* Notification / Feedback Banner */}
            {feedback && (
                <div
                    className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-sm transition-all ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        {feedback.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                        <span className="font-semibold">{feedback.text}</span>
                    </div>
                    <button
                        onClick={() => setFeedback(null)}
                        className="text-xs font-bold px-2 py-1 rounded hover:bg-black/5 transition cursor-pointer"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Users Directory Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Tabs Row */}
                <div className="flex border-b border-gray-200 bg-gray-50/70 overflow-x-auto scrollbar-none">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                type="button"
                                className={`flex items-center gap-2.5 px-6 py-4 font-bold text-sm transition-all whitespace-nowrap border-b-2 cursor-pointer ${
                                    isActive
                                        ? 'border-[#6b0f14] text-[#6b0f14] bg-white shadow-xs'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-[#6b0f14]' : 'text-gray-400'}`} />
                                <span>{tab.label}</span>
                                <span
                                    className={`ml-1 text-xs px-2.5 py-0.5 rounded-full border font-extrabold ${
                                        isActive
                                            ? 'bg-[#6b0f14] text-white border-[#6b0f14]'
                                            : tab.badgeBg
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search & Stats Bar */}
                <div className="p-4 bg-gray-50/50 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label}...`}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/20 focus:border-[#6b0f14] transition"
                        />
                    </div>
                    <div className="text-xs text-gray-500 font-medium self-end sm:self-auto">
                        Showing <strong className="text-gray-800">{displayedUsers.length}</strong> of{' '}
                        <strong className="text-gray-800">{categorized[activeTab]?.length || 0}</strong> accounts
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider font-semibold text-gray-600">
                                <th className="py-3.5 px-4 w-12 text-center">#</th>
                                <th className="py-3.5 px-4">User Details</th>
                                <th className="py-3.5 px-4">Assigned Role</th>
                                <th className="py-3.5 px-4 text-center">Email Verified</th>
                                <th className="py-3.5 px-4 text-center">Account Status</th>
                                <th className="py-3.5 px-4 text-center w-28">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-14 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <RotateCw className="w-6 h-6 animate-spin text-[#6b0f14]" />
                                            <span className="font-medium">Loading user accounts...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : displayedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-14 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Filter className="w-8 h-8 text-gray-300" />
                                            <p className="font-semibold text-gray-700">No users found</p>
                                            <p className="text-xs text-gray-400">
                                                {searchTerm
                                                    ? `No matches found for "${searchTerm}".`
                                                    : 'No users registered under this role category.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                displayedUsers.map((user, idx) => {
                                    const roleNames = getUserRoleNames(user);
                                    const isWarden = roleNames.includes('warden');
                                    const isAdmin = roleNames.includes('admin') || roleNames.includes('director');
                                    const isActive = Boolean(user.active);
                                    const isToggling = togglingId === user._id;
                                    const assignedWardenRecord = wardenMap[user._id];
                                    const assignedHostelName = assignedWardenRecord?.hostelId?.name;

                                    return (
                                        <tr key={user._id || idx} className="hover:bg-amber-50/20 transition-colors">
                                            <td className="py-4 px-4 text-center text-xs font-semibold text-gray-400">
                                                {idx + 1}
                                            </td>

                                            {/* User Details */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                                                            isWarden
                                                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                                                : isAdmin
                                                                ? 'bg-rose-100 text-[#6b0f14] border border-rose-300'
                                                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                                        }`}
                                                    >
                                                        {user.username ? user.username.substring(0, 2).toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">
                                                            {user.username || 'Unnamed User'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Mail className="w-3 h-3 text-gray-400" />
                                                            {user.email || 'No email provided'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role & Hostel Badges */}
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <div className="flex flex-wrap gap-1">
                                                        {roleNames.length > 0 ? (
                                                            roleNames.map((r, rIdx) => (
                                                                <span
                                                                    key={rIdx}
                                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                                                                        r === 'warden'
                                                                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                                                                            : r === 'admin' || r === 'director'
                                                                            ? 'bg-rose-50 text-[#6b0f14] border-rose-200'
                                                                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                    }`}
                                                                >
                                                                    <Shield className="w-3 h-3" />
                                                                    {r}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">No role</span>
                                                        )}
                                                    </div>

                                                    {/* Injected Warden Assigned Hostel Indicator */}
                                                    {isWarden && (
                                                        <div className="flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/70 mt-0.5">
                                                            <FaSchool size={11} className="text-[#6b0f14] shrink-0" />
                                                            <span className="font-medium truncate max-w-[170px]">
                                                                {assignedHostelName ? `${assignedHostelName}` : 'Unassigned Hostel'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Email Verified */}
                                            <td className="py-4 px-4 text-center">
                                                {user.emailVerified ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                        Verified
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                        <XCircle className="w-3.5 h-3.5 text-gray-400" />
                                                        Unverified
                                                    </span>
                                                )}
                                            </td>

                                            {/* Account Status with Tailwind CSS Toggle Switch */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={isActive}
                                                        disabled={isToggling}
                                                        onClick={() => handleToggleStatus(user)}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:ring-offset-2 ${
                                                            isToggling ? 'opacity-60 cursor-wait' : ''
                                                        } ${isActive ? 'bg-[#6b0f14]' : 'bg-gray-300'}`}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                                isActive ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>

                                                    <span
                                                        className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md min-w-[65px] text-center border ${
                                                            isActive
                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                                        }`}
                                                    >
                                                        {isActive ? 'ACTIVE' : 'DEACTIVE'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(user)}
                                                        title="Edit user details"
                                                        className="p-1.5 text-gray-600 hover:text-[#6b0f14] hover:bg-amber-50 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteUser(user)}
                                                        title="Delete this user account"
                                                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Dynamic Create / Edit User Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="bg-[#6b0f14] px-6 py-4 text-white flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    {isCreateMode ? <UserPlus size={18} /> : <Edit2 size={18} />}
                                    {isCreateMode ? 'Create New System User' : 'Edit User Account'}
                                </h3>
                                <p className="text-xs text-amber-200 mt-0.5">
                                    {isCreateMode
                                        ? 'Register an account and assign administrative or warden privileges'
                                        : 'Modify profile, credentials, and role assignments'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="text-white/80 hover:text-white text-2xl font-bold p-1 cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Modal Form Body */}
                        <form onSubmit={handleSaveUser} className="p-6 overflow-y-auto space-y-4">
                            <DefaultInput
                                label="Username"
                                type="text"
                                value={modalUser.username}
                                onChange={(e) => setModalUser(prev => ({ ...prev, username: e.target.value }))}
                                required
                            />

                            <DefaultInput
                                label="Email Address"
                                type="email"
                                value={modalUser.email}
                                onChange={(e) => setModalUser(prev => ({ ...prev, email: e.target.value }))}
                                required
                            />

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                    {isCreateMode ? 'Password (Required)' : 'Password (Optional)'}
                                </label>
                                <input
                                    type="password"
                                    placeholder={isCreateMode ? 'Enter temporary password (min 6 chars)' : 'Leave blank to keep unchanged'}
                                    value={modalUser.password}
                                    onChange={(e) => setModalUser(prev => ({ ...prev, password: e.target.value }))}
                                    required={isCreateMode}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/20 focus:border-[#6b0f14] transition"
                                />
                            </div>

                            <Dropdown
                                label="System Role"
                                name="roleID"
                                value={modalUser.roleID}
                                onChange={(e) => setModalUser(prev => ({ ...prev, roleID: e.target.value }))}
                                options={roles.map(r => ({
                                    label: r.name.toUpperCase(),
                                    value: r._id,
                                }))}
                            />

                            {/* DYNAMIC WARDEN OPTIONS INJECTION */}
                            {isSelectedRoleWarden && (
                                <div className="p-4 bg-amber-50/75 rounded-xl border border-amber-200 space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                                        <FaSchool className="w-3.5 h-3.5 text-[#6b0f14]" />
                                        <span>Warden Assignment Details</span>
                                    </div>

                                    <Dropdown
                                        label="Assigned Hostel"
                                        name="hostelId"
                                        value={modalUser.hostelId}
                                        onChange={(e) => setModalUser(prev => ({ ...prev, hostelId: e.target.value }))}
                                        options={[
                                            { label: '-- Select Hostel --', value: '' },
                                            ...hostels.map(h => ({
                                                label: `${h.name} (${h.gender ? h.gender.toUpperCase() : 'Mixed'}) - Cap: ${h.capacity || 0}`,
                                                value: h._id
                                            }))
                                        ]}
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                                Start Date
                                            </label>
                                            <input
                                                type="date"
                                                value={modalUser.startDate}
                                                onChange={(e) => setModalUser(prev => ({ ...prev, startDate: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/20 focus:border-[#6b0f14] transition"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                                Notes (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. In charge of wing B"
                                                value={modalUser.note}
                                                onChange={(e) => setModalUser(prev => ({ ...prev, note: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/20 focus:border-[#6b0f14] transition"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Status Checks */}
                            <div className="flex items-center gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={modalUser.emailVerified}
                                        onChange={(e) => setModalUser(prev => ({ ...prev, emailVerified: e.target.checked }))}
                                        className="w-4 h-4 accent-[#6b0f14] rounded cursor-pointer"
                                    />
                                    <span className="font-semibold text-xs text-gray-700">Email Verified</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={modalUser.active}
                                        onChange={(e) => setModalUser(prev => ({ ...prev, active: e.target.checked }))}
                                        className="w-4 h-4 accent-[#6b0f14] rounded cursor-pointer"
                                    />
                                    <span className="font-semibold text-xs text-gray-700">Account Active</span>
                                </label>
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={modalSubmitting}
                                    className="px-5 py-2 bg-[#6b0f14] text-white rounded-lg text-xs font-bold hover:bg-[#85131a] transition shadow disabled:opacity-60 inline-flex items-center gap-2 cursor-pointer"
                                >
                                    {modalSubmitting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                                    {isCreateMode ? 'Create User' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
>>>>>>> Stashed changes
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