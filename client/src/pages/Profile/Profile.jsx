import React, { useEffect, useState } from 'react';
import { MdOutlineEdit } from "react-icons/md";
import DefaultInput from '../../components/Form/DefaultInput';
import FileInput from '../../components/Form/FileInput';
import DefaultBtn from '../../components/Buttons/DefaultBtn';
import DashUser from '../../assets/new_profilePic.jpg';
import axios from 'axios';
import { API_BASE_URL, resolveApiUrl } from '../../utils/api';

const Profile = () => {
    const [btnClick, setBtnClick] = useState(false);
    const token = localStorage.getItem('login');

    const handleBtnClick = () => setBtnClick(!btnClick);

    const [mydata, setmydata] = useState({});
    const apiBase = API_BASE_URL;

    const profileImageSrc = mydata?.profileImage
        ? resolveApiUrl(mydata.profileImage)
        : DashUser;

    useEffect(() => {
        axios.get(`${apiBase}/auth/get-currentuser-data`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(res => setmydata(res.data.Result))
            .catch(err => console.log(err));
    }, [token, apiBase]);

    useEffect(() => {
        if (mydata?.profileImage) {
            const img = mydata.profileImage.startsWith('http')
                ? resolveApiUrl(mydata.profileImage)
                : `${apiBase}${mydata.profileImage}`;
            localStorage.setItem('profileImage', img);
            window.dispatchEvent(new CustomEvent('profileImageUpdated', { detail: img }));
        }
    }, [mydata, apiBase]);

    const [profileImageFile, setProfileImageFile] = useState(null);
    const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);

    const handleProfileImageChange = (e) => {
        const file = e.target.files?.[0] ?? null;
        setProfileImageFile(file);
    };

    const handleUploadProfileImage = async (e) => {
        e.preventDefault();
        if (!profileImageFile) { alert('Please select an image (JPG/PNG/WEBP).'); return; }
        setIsUploadingProfileImage(true);
        try {
            const formData = new FormData();
            formData.append('profileImage', profileImageFile);
            const res = await axios.post(
                `${apiBase}/auth/update-profile-picture`,
                formData,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.data?.Status === 'Success') {
                setmydata(res.data.Result || mydata);
                const newImg = res.data.Result?.profileImage
                    ? (res.data.Result.profileImage.startsWith('http')
                        ? resolveApiUrl(res.data.Result.profileImage)
                        : `${apiBase}${res.data.Result.profileImage}`)
                    : DashUser;
                localStorage.setItem('profileImage', newImg);
                window.dispatchEvent(new CustomEvent('profileImageUpdated', { detail: newImg }));
                setProfileImageFile(null);
                alert(res.data.Message || 'Profile picture updated');
            } else {
                alert(res.data?.Error || 'Failed to update profile picture');
            }
        } catch (err) {
            alert(err?.response?.data?.Error || 'Failed to update profile picture');
        } finally {
            setIsUploadingProfileImage(false);
        }
    };

    const [updatepass, setupdatepass] = useState({ currentpass: '', newpass: '' });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setupdatepass(prev => ({ ...prev, [name]: value }));
    };

    const healdeUpdatePass = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(
                `${apiBase}/auth/update-password-dashboard`,
                updatepass,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.data.Status === 'Success') {
                alert(res.data.Message);
                localStorage.clear();
                window.location.reload();
            } else {
                alert(res.data.Error);
            }
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-screen">
            <h1 className="text-2xl md:text-3xl font-bold text-[#6b0f14] mb-6 md:mb-8">
                My Profile
            </h1>

            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-5 md:p-10 transition hover:shadow-2xl">
                {/* Top section: avatar + info + edit button */}
                <div className="flex flex-col gap-5 md:flex-row md:justify-between md:items-center">

                    {/* Avatar + info: stacked on mobile, side-by-side on md+ */}
                    <div className="flex flex-col items-center text-center gap-3 sm:flex-row sm:items-start sm:text-left sm:gap-6">
                        <img
                            src={profileImageSrc}
                            alt="Profile"
                            className="h-24 w-24 md:h-36 md:w-36 rounded-full border-4 border-[#6b0f14] shadow-md object-cover flex-shrink-0"
                        />
                        <div className="space-y-1.5">
                            <h2 className="text-xl md:text-2xl font-extrabold text-[#6b0f14] uppercase">
                                {mydata?.username}
                            </h2>
                            <p className="text-gray-600 text-sm md:text-base">{mydata?.email}</p>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                                {mydata.roles?.length > 0 ? (
                                    mydata.roles.map((role, index) => (
                                        <span
                                            key={index}
                                            className="bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-3 py-1 rounded-full"
                                        >
                                            {typeof role === 'string' ? role : role.name}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-gray-400 italic text-sm">No roles</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Edit button: full-width on mobile, auto on md+ */}
                    <button
                        type="button"
                        onClick={handleBtnClick}
                        className="cursor-pointer flex items-center justify-center gap-2 text-sm text-[#6b0f14] hover:text-[#3a0709] bg-[#fdf6e3] hover:bg-[#f5e6c8] px-4 py-2 rounded-full shadow-sm transition w-full md:w-auto"
                    >
                        <MdOutlineEdit className="text-lg" />
                        {btnClick ? 'Close' : 'Edit Profile'}
                    </button>
                </div>
            </div>

            {/* Edit forms */}
            {btnClick && (
                <div className="max-w-4xl mx-auto mt-4 md:mt-6 bg-white p-4 md:p-6 rounded-2xl shadow-md transition">

                    {/* Profile picture form */}
                    <form onSubmit={handleUploadProfileImage} method="post" encType="multipart/form-data">
                        <FileInput
                            label="Profile Picture"
                            name="profileImage"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleProfileImageChange}
                        />
                        <div className="-mt-4 mb-4">
                            <DefaultBtn
                                type="submit"
                                label={isUploadingProfileImage ? 'Uploading...' : 'Update Profile Picture'}
                                disabled={isUploadingProfileImage}
                                className="w-full md:w-auto"
                            />
                        </div>
                    </form>

                    {/* Password form */}
                    <form onSubmit={healdeUpdatePass} method="post">
                        <DefaultInput
                            label="Current Password"
                            type="password"
                            name="currentpass"
                            value={updatepass.currentpass}
                            onChange={handleInputChange}
                            placeholder="*********"
                            required
                        />
                        <DefaultInput
                            label="New Password"
                            type="password"
                            name="newpass"
                            value={updatepass.newpass}
                            onChange={handleInputChange}
                            placeholder="*********"
                            required
                        />
                        <div className="-mt-4">
                            <DefaultBtn
                                type="submit"
                                label="Update Password"
                                className="w-full md:w-auto"
                            />
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Profile;
