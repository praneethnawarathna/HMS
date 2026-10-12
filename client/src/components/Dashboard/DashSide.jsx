import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getRoleNames, getUserInfoFromToken } from '../../utils/auth';
import { dashsidedata } from './DashSideData';
import uoplogo from '../../assets/uoplogo.png';
import DashUser from '../../assets/new_profilePic.jpg';

const DashSide = ({ toggleSide, user }) => {
    const [activeMenu, setActiveMenu] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

    const fallbackUserInfo = useMemo(() => getUserInfoFromToken() || {}, []);
    const userInfo = user || fallbackUserInfo;
    const { username } = userInfo;

    const roleNames = useMemo(() => getRoleNames(userInfo), [userInfo]);

    const filteredMenu = useMemo(() => dashsidedata.filter(item => {
        if (roleNames.includes('admin') || roleNames.includes('director')) {
            return ![3, 5, 7, 12, 13, 14].includes(item.id);
        }
        if (roleNames.includes('warden')) {
            return ![2, 4, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21].includes(item.id);
        }
        if (roleNames.includes('student')) {
            return ![2, 3, 4, 5, 6, 7, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20, 21].includes(item.id);
        }
        return false;
    }), [roleNames]);

    const profileItem = filteredMenu.find(item => item.id === 8);
    const mainMenu = filteredMenu.filter(item => item.id !== 8);
    const ProfileIcon = profileItem ? profileItem.icon : null;

    useEffect(() => {
        const currentItem = dashsidedata.find(item => item.link === location.pathname);
        if (currentItem) {
            const allowedIds = filteredMenu.map(item => item.id);
            if (roleNames.includes('warden') && !allowedIds.includes(currentItem.id)) {
                localStorage.clear();
                navigate('/');
                return;
            }
            setActiveMenu(currentItem.id);
            localStorage.setItem('dashmenuID', currentItem.id);
        } else {
            const savedId = localStorage.getItem('dashmenuID');
            if (savedId) {
                const savedIdNum = Number(savedId);
                const allowedIds = filteredMenu.map(item => item.id);
                if (allowedIds.includes(savedIdNum)) {
                    setActiveMenu(savedIdNum);
                } else {
                    localStorage.clear();
                    navigate('/');
                }
            } else {
                setActiveMenu(null);
            }
        }
    }, [location, filteredMenu, roleNames, navigate]);

    return (
        <aside
            className="shadow-lg h-full p-4 pb-10 flex flex-col xl:rounded-r-3xl overflow-y-auto transition-all duration-300"
            style={{
                background: 'linear-gradient(180deg, #6b0f14, #4f0a0f)',
                color: '#fff',
                borderRight: '1px solid rgba(212,175,55,0.15)',
                scrollbarWidth: 'none',       /* Firefox */
                msOverflowStyle: 'none',      /* IE/Edge */
            }}
        >
            {/* Hide scrollbar for WebKit (Chrome, Safari) */}
            <style>{`aside::-webkit-scrollbar { display: none; }`}</style>

            <div className="relative mb-6 flex justify-center items-center">
                <img src={uoplogo} alt="University of Peradeniya Logo" className="h-14 object-contain" />
                {toggleSide && (
                    <button
                        onClick={toggleSide}
                        className="absolute -top-3 -right-3 xl:hidden p-0.5 bg-black/10 hover:bg-black/20 rounded-md transition"
                        aria-label="Close sidebar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            <h2 className="text-center text-xs font-extrabold tracking-widest mb-4 select-none" style={{ color: '#d4af37' }}>
                HOSTEL MANAGEMENT SYSTEM
            </h2>

            <div className="flex items-center gap-3 rounded-2xl p-3 shadow-inner mb-6 select-none" style={{ background: 'rgba(212,175,55,0.1)', color: '#fff' }}>
                <img
                    src={DashUser}
                    alt={`${username} avatar`}
                    className="h-12 w-12 rounded-full border-2 shadow"
                    style={{ borderColor: '#d4af37' }}
                />
                <div>
                    <h3 className="font-semibold uppercase tracking-wide text-white">{username}</h3>
                    <p className="text-xs uppercase font-medium tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {roleNames.join(', ')}
                    </p>
                </div>
            </div>

            <nav className="flex flex-col space-y-2 flex-grow">
                {/* eslint-disable-next-line no-unused-vars */}
                {mainMenu.map(({ id, icon: Icon, name, link }) => (
                    <Link
                        to={link}
                        key={id}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm
                            ${activeMenu === id ? 'text-white shadow-lg' : 'hover:text-white'}`}
                        style={activeMenu === id
                            ? { background: 'linear-gradient(90deg, #d4af37, #c59a3a)' }
                            : { color: 'rgba(255,255,255,0.75)', background: 'transparent' }
                        }
                        onClick={() => {
                            setActiveMenu(id);
                            localStorage.setItem('dashmenuID', id);
                        }}
                        tabIndex={0}
                        aria-current={activeMenu === id ? 'page' : undefined}
                    >
                        <span className="text-lg"><Icon /></span>
                        <span className="font-semibold tracking-wide">{name}</span>
                    </Link>
                ))}
            </nav>

            {profileItem && (
                <div className="pt-4 mt-4 border-t" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
                    <Link
                        to={profileItem.link}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm
                            ${activeMenu === profileItem.id ? 'text-white shadow-lg' : 'hover:text-white'}`}
                        style={activeMenu === profileItem.id
                            ? { background: 'linear-gradient(90deg, #d4af37, #c59a3a)' }
                            : { color: 'rgba(255,255,255,0.75)', background: 'transparent' }
                        }
                        onClick={() => {
                            setActiveMenu(profileItem.id);
                            localStorage.setItem('dashmenuID', profileItem.id);
                        }}
                        tabIndex={0}
                        aria-current={activeMenu === profileItem.id ? 'page' : undefined}
                    >
                        <span className="text-lg">{ProfileIcon && <ProfileIcon />}</span>
                        <span className="font-semibold tracking-wide">{profileItem.name}</span>
                    </Link>
                </div>
            )}
        </aside>
    );
};

export default DashSide;
