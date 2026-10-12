import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import DefaultBtn from '../../components/Buttons/DefaultBtn'
import Dropdown from '../../components/Form/Dropdown'


const ViewUser = () => {
    const { id } = useParams()
    const token = localStorage.getItem('login')
    const loginemail = localStorage.getItem('loginE')
    const [getoneuser, setgetoneuser] = useState(null)
    const [loadingUser, setLoadingUser] = useState(true)
    const [userError, setUserError] = useState('')

    useEffect(() => {
        let active = true
        setLoadingUser(true)
        setUserError('')

        axios.get(import.meta.env.VITE_APP_API + '/user/view-one-user/' + id, {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        })
            .then(res => {
                if (!active) return

                const user = res.data?.Result
                if (!user) {
                    setgetoneuser(null)
                    setUserError(res.data?.Error || 'User not found.')
                    return
                }

                setgetoneuser(user)
            })
            .catch(err => {
                if (!active) return
                console.error('Failed to load user:', err)
                setgetoneuser(null)
                setUserError(
                    err.response?.data?.Error
                    || err.response?.data?.message
                    || 'Failed to load user.'
                )
            })
            .finally(() => {
                if (active) setLoadingUser(false)
            })

        return () => {
            active = false
        }
    }, [id, token])


    const [getuserroles, setgetuserroles] = useState([])

    useEffect(() => {
        axios.get(import.meta.env.VITE_APP_API + '/auth/view-all-role', {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        })
            .then(res => {
                setgetuserroles(res.data.Result);
            })
            .catch(err => console.log(err))
    }, [token])

    const headleVerifyuerEmail = async (userID) => {
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/user/verify-user-email/${userID}`,
                null,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                }
            );
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

    const headleActiveDeactiveAccount = async (userID) => {
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/user/update-user-status/${userID}`,
                null,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                }
            );
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

    const [updateuserrole, setupdateuserrole] = useState({
        userID: id,
        roleID: '',
    })



    const handleUpdateUserRole = async () => {
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/user/update-user-role`,
                updateuserrole,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                }
            );

            if (res.data.message) {
                alert(res.data.message);
                window.location.reload();
            } else {
                alert(res.data.error || "Something went wrong.");
            }
        } catch (err) {
            console.log(err);
            alert("Server error.");
        }
    };

    if (loadingUser) {
        return <div className="p-6 text-gray-500">Loading user data...</div>
    }

    if (userError || !getoneuser) {
        return (
            <div className="p-6 max-w-xl bg-white shadow-md rounded-lg mt-5">
                <h1 className="text-xl font-bold text-[#6b0f14]">Unable to load user</h1>
                <p className="mt-2 text-gray-600">{userError || 'User not found.'}</p>
                <div className="mt-4">
                    <Link to="/Dashboard/Users">
                        <DefaultBtn type="button" label="Back to Users" />
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gray-100 py-10 px-4">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
                <div className="-mt-4 mb-2">
                    <Link to={'/Dashboard/Users'}>
                        <DefaultBtn
                            type='button'
                            label='Back'
                        />
                    </Link>
                </div>
                <h1 className="xl:text-3xl font-bold text-[#6b0f14] mb-4">
                    Current User: <span className="">{getoneuser?.email}</span>
                </h1>

                <div className="mt-6 space-y-4">
                    <div className="md:flex">
                        <div className="">
                            <div className="">
                                <h1 className="block text-gray-700 font-medium">Username</h1>
                                <span
                                    className="inline-block bg-[#fdf6e3] text-[#6b0f14] text-sm px-3 py-1 rounded-full shadow-sm"
                                >
                                    {getoneuser?.username}
                                </span>
                            </div>

                            <div className="">
                                <h1 className="block text-gray-700 font-medium">Email</h1>
                                <span
                                    className="inline-block bg-[#fdf6e3] text-[#6b0f14] text-sm px-3 py-1 rounded-full shadow-sm"
                                >
                                    {getoneuser?.email}
                                </span>
                            </div>

                            <div className="">
                                <h1 className="block text-gray-700 font-medium">Active Roles</h1>
                                <span
                                    className="inline-block bg-[#fdf6e3] text-[#6b0f14] text-sm px-3 py-1 rounded-full shadow-sm"
                                >
                                    <div className="flex flex-wrap gap-2">
                                        {getoneuser?.roles?.length > 0 ? (
                                            getoneuser.roles.map((role, index) => (
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
                                </span>
                            </div>
                        </div>

                        <div className="md:ml-4">
                            <div className="">
                                <h1 className="block text-gray-700 font-medium">Email Verify</h1>
                                {
                                    getoneuser?.emailVerified === true ?
                                        <div className="">
                                            <span
                                                className="uppercase bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-3 py-1 rounded-full"
                                            >
                                                Verified
                                            </span>
                                        </div>
                                        :
                                        <div className="">
                                            <span
                                                className="uppercase bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full"
                                            >
                                                Not Verified
                                            </span>
                                        </div>

                                }
                            </div>

                            <div className="">
                                <h1 className="block text-gray-700 font-medium">Acocunt Status</h1>                               {
                                    getoneuser?.active === true ?
                                        <div className="">
                                            <span
                                                className="uppercase bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-3 py-1 rounded-full"
                                            >
                                                Active
                                            </span>
                                        </div>
                                        :
                                        <div className="">
                                            <span
                                                className="uppercase bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full"
                                            >
                                                Deactive
                                            </span>
                                        </div>

                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-8">
                <h1 className="text-3xl font-bold text-[#6b0f14] mb-4">
                    Update User Status
                </h1>

                {
                    getoneuser?.email === loginemail ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-2 rounded-lg shadow-sm">
                            ⚠️ You cannot update your own account while logged in.
                        </div>
                    ) : (
                        <div className="-mt-2">
                            <div className="">
                                <DefaultBtn
                                    label={
                                        getoneuser?.emailVerified
                                            ? 'Un-Verify User Email Address'
                                            : 'Verify User Email Address'
                                    }
                                    onClick={() => headleVerifyuerEmail(getoneuser?._id)}
                                />
                            </div>

                            <div className="">
                                <DefaultBtn
                                    label={
                                        getoneuser?.active
                                            ? 'Deactive Account'
                                            : 'Active Account'
                                    }
                                    onClick={() => headleActiveDeactiveAccount(getoneuser?._id)}
                                />
                            </div>

                            <div className="mt-4">
                                <h1 className="text-xl font-bold text-[#6b0f14] mb-4">Update User Role</h1>
                                <div className="">
                                    <div className="mt-6">
                                        <Dropdown
                                            label="Select New Role"
                                            name="roleID"
                                            required={true}
                                            onChange={(e) =>
                                                setupdateuserrole(prev => ({ ...prev, roleID: e.target.value }))
                                            }
                                            options={getuserroles.map(role => ({
                                                label: role.name,
                                                value: role._id
                                            }))}
                                        />


                                        <div className="-mt-4">
                                            <DefaultBtn
                                                label="Update User Role"
                                                onClick={handleUpdateUserRole}
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>


                    )
                }

            </div>
        </div>
    )
}

export default ViewUser
