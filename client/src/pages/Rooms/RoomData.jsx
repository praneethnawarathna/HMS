import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { FaBed } from 'react-icons/fa6'

const RoomData = () => {
    const token = localStorage.getItem('login')
    // Always initialise as an array so .length never throws
    const [roomdata, setroomdata] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        axios.get(import.meta.env.VITE_APP_API + '/room/get-all-rooms', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => {
                // Guard: fall back to [] if Result is null / undefined
                setroomdata(res.data?.Result ?? [])
            })
            .catch(err => {
                console.error('RoomData fetch error:', err)
                setroomdata([])  // keep state as a safe empty array on error
            })
            .finally(() => setLoading(false))
    }, [token])

    // Early return — never attempt to render with uninitialised data
    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
                {[1].map(i => (
                    <div key={i} className="relative bg-[#6b0f14]/30 p-6 rounded-2xl shadow-lg animate-pulse h-24" />
                ))}
            </div>
        )
    }

    const stddata = [
        {
            id: 1,
            name: 'Total Rooms',
            icon: FaBed,
            // Optional chaining + nullish coalescing: safe even if roomdata is somehow falsy
            value: roomdata?.length ?? 0,
            bgColor: 'bg-[#6b0f14]',
        },
    ]

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
                {
                    stddata.map((data, index) => {
                        return (
                            <div key={index} className={`relative ${data.bgColor} text-white p-6 rounded-2xl shadow-lg overflow-hidden hover:scale-[1.02] transition-transform duration-300`}>
                                {/* Icon in background */}
                                <div className="absolute right-4 top-4 opacity-20 text-white text-6xl">
                                    <data.icon />
                                </div>

                                {/* Content */}
                                <div className="relative z-10">
                                    <div className="text-sm font-medium uppercase tracking-wide text-[#fdf6e3]">
                                        {data.name}
                                    </div>
                                    <div className="mt-2 text-3xl font-bold">{data.value}</div>
                                </div>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    )
}

export default RoomData