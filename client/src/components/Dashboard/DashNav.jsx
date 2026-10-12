import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FaUserCog } from 'react-icons/fa';
import { FaGear, FaPowerOff, FaChevronRight, FaBell } from 'react-icons/fa6';
import { getRoleNames, getUserInfoFromToken } from '../../utils/auth';
import { resolveApiUrl } from '../../utils/api';
import DashUser from '../../assets/new_profilePic.jpg';

// Derive a readable page title from the current path
const getPageTitle = (pathname) => {
    const segment = pathname.split('/').filter(Boolean).pop() || 'Dashboard';
    return segment
        .replace(/([A-Z])/g, ' $1')
        .replace(/[-_]/g, ' ')
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase());
};

const DashNav = ({ user }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const location = useLocation();

    const userInfo = user || getUserInfoFromToken() || {};
    const { username } = userInfo;
    const roleNames = getRoleNames(userInfo);
    const role = roleNames[0] || '';
    const canSeeBackup = roleNames.some(r => r === 'admin' || r === 'director');

    const pageTitle = getPageTitle(location.pathname);

    const [profileImage, setProfileImage] = useState(() => {
        try { return resolveApiUrl(localStorage.getItem('profileImage')) || DashUser; }
        catch { return DashUser; }
    });

    useEffect(() => {
        const handler = (e) => {
            try {
                const img = resolveApiUrl(e?.detail || localStorage.getItem('profileImage')) || DashUser;
                setProfileImage(img);
            } catch { setProfileImage(DashUser); }
        };
        window.addEventListener('profileImageUpdated', handler);
        return () => window.removeEventListener('profileImageUpdated', handler);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/';
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        const handleEscape = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    return (
        <nav className="w-full flex items-center justify-between px-6 py-0 bg-white"
            style={{ borderBottom: '1px solid rgba(107,15,20,0.10)', minHeight: '64px' }}>

            {/* ── Left: breadcrumb / page title ── */}
            <div className="flex items-center gap-2 select-none pl-8 xl:pl-0">
                <span className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'rgba(107,15,20,0.4)' }}>
                    HMS
                </span>
                <FaChevronRight size={10} style={{ color: 'rgba(107,15,20,0.3)' }} />
                <span className="text-sm font-bold tracking-wide" style={{ color: '#6b0f14' }}>
                    {pageTitle}
                </span>
            </div>

            {/* ── Right: notification + user menu ── */}
            <div className="flex items-center gap-3">

                {/* Notification bell */}
                <button
                    aria-label="Notifications"
                    className="relative p-2 rounded-xl transition-colors hover:bg-red-50 focus:outline-none"
                    style={{ color: '#6b0f14' }}
                >
                    <FaBell size={18} />
                    {/* dot badge */}
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2 border-white"
                        style={{ background: '#d4af37' }} />
                </button>

                {/* Divider */}
                <div className="h-8 w-px mx-1" style={{ background: 'rgba(107,15,20,0.12)' }} />

                {/* User menu trigger */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(prev => !prev)}
                        aria-haspopup="true"
                        aria-expanded={menuOpen}
                        aria-label="User menu"
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-colors hover:bg-red-50 focus:outline-none group"
                    >
                        {/* Avatar with live pulse ring */}
                        <div className="relative">
                            <img
                                src={profileImage}
                                alt={`${username} avatar`}
                                className="h-9 w-9 rounded-full object-cover object-center border-2 shadow-sm"
                                style={{ borderColor: '#6b0f14' }}
                            />
                            <span
                                className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white animate-pulse"
                                style={{ background: '#22c55e' }}
                            />
                        </div>

                        {/* Name + role stacked */}
                        <div className="hidden sm:flex flex-col items-start leading-tight">
                            <span className="text-sm font-bold tracking-wide" style={{ color: '#6b0f14' }}>
                                {username}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest font-semibold"
                                style={{ color: 'rgba(107,15,20,0.5)' }}>
                                {roleNames.join(', ')}
                            </span>
                        </div>

                        {/* Chevron indicator */}
                        <FaChevronRight
                            size={10}
                            className={`hidden sm:block transition-transform duration-200 ${menuOpen ? 'rotate-90' : ''}`}
                            style={{ color: 'rgba(107,15,20,0.4)' }}
                        />
                    </button>

                    {/* ── Dropdown panel ── */}
                    <div
                        className={`absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-2xl border
                            transition-all duration-200 origin-top-right
                            ${menuOpen ? 'opacity-100 scale-100 pointer-events-auto translate-y-0'
                                : 'opacity-0 scale-95 pointer-events-none -translate-y-2'}`}
                        style={{ border: '1px solid rgba(107,15,20,0.10)', zIndex: 999 }}
                        role="menu"
                        aria-label="User menu options"
                    >
                        {/* Profile header */}
                        <div className="relative overflow-hidden rounded-t-2xl px-5 pt-5 pb-4 text-center"
                            style={{ background: 'linear-gradient(135deg, #6b0f14 0%, #4f0a0f 100%)' }}>
                            {/* Gold accent stripe */}
                            <div className="absolute bottom-0 left-0 right-0 h-0.5"
                                style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />
                            <div className="relative inline-block">
                                <img
                                    src={profileImage}
                                    alt={`${username} profile`}
                                    className="h-16 w-16 mx-auto rounded-full object-cover object-center border-2 shadow-lg"
                                    style={{ borderColor: '#d4af37' }}
                                />
                                <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white animate-pulse"
                                    style={{ background: '#22c55e' }} />
                            </div>
                            <h2 className="mt-2 text-base font-bold text-white tracking-wide">{username}</h2>
                            <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
                                style={{ color: '#d4af37' }}>
                                {role}
                            </p>
                        </div>

                        {/* Menu items */}
                        <div className="p-2 space-y-0.5">
                            <a
                                href="/Dashboard/Profile"
                                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                                style={{ color: '#6b0f14' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,15,20,0.06)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                role="menuitem"
                            >
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg"
                                    style={{ background: 'rgba(107,15,20,0.08)' }}>
                                    <FaUserCog size={13} style={{ color: '#6b0f14' }} />
                                </span>
                                Profile
                            </a>

                            {canSeeBackup && (
                                <a
                                    href="/Dashboard/BackupOptions"
                                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                                    style={{ color: '#6b0f14' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,15,20,0.06)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    role="menuitem"
                                >
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg"
                                        style={{ background: 'rgba(107,15,20,0.08)' }}>
                                        <FaGear size={13} style={{ color: '#6b0f14' }} />
                                    </span>
                                    Backup Options
                                </a>
                            )}

                            {/* Divider */}
                            <div className="my-1 mx-2 h-px" style={{ background: 'rgba(107,15,20,0.08)' }} />

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left"
                                style={{ color: '#dc2626' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.06)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                role="menuitem"
                            >
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg"
                                    style={{ background: 'rgba(220,38,38,0.08)' }}>
                                    <FaPowerOff size={13} style={{ color: '#dc2626' }} />
                                </span>
                                Logout
                            </button>
                        </div>

                        {/* Footer note */}
                        <p className="text-center text-[10px] pb-3 tracking-widest uppercase"
                            style={{ color: 'rgba(107,15,20,0.3)' }}>
                            University of Peradeniya
                        </p>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default DashNav;
