import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Pencil, X, Save, Loader2 } from 'lucide-react'


const ViewHostel = () => {
    const { id } = useParams()
    const token = localStorage.getItem('login')

    const [getonehostel, setGetOneHostel] = useState(null)
    const [fetchError, setFetchError] = useState(null)
    const [newRoomCount, setNewRoomCount] = useState('')
    const [newGender, setNewGender] = useState('')
    const [loadingRoomUpdate, setLoadingRoomUpdate] = useState(false)
    const [loadingGenderUpdate, setLoadingGenderUpdate] = useState(false)
    const [loadingAssignWarden, setLoadingAssignWarden] = useState(false)
    const [message, setMessage] = useState('')
    const [assignStatus, setAssignStatus] = useState('')

    const [availableWardens, setAvailableWardens] = useState([])
    const [selectedWarden, setSelectedWarden] = useState('')

    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [allDetailsForm, setAllDetailsForm] = useState({
        hostelID: '',
        name: '',
        location: '',
        gender: '',
        roomCount: '',
        warden: ''
    })
    const [savingAll, setSavingAll] = useState(false)
    const [allSaveError, setAllSaveError] = useState('')
    const [allSaveSuccess, setAllSaveSuccess] = useState('')

    const handleOpenEditModal = () => {
        setAllDetailsForm({
            hostelID: getonehostel?.hostelID || '',
            name: getonehostel?.name || '',
            location: getonehostel?.location || '',
            gender: getonehostel?.gender || 'Male',
            roomCount: getonehostel?.roomCount || '',
            warden: getonehostel?.warden?._id || (typeof getonehostel?.warden === 'string' ? getonehostel.warden : '')
        })
        setAllSaveError('')
        setAllSaveSuccess('')
        setIsEditModalOpen(true)
    }

    const handleSaveAllDetails = async (e) => {
        e.preventDefault()
        setSavingAll(true)
        setAllSaveError('')
        setAllSaveSuccess('')

        try {
            const res = await axios.put(
                `${import.meta.env.VITE_APP_API}/hostel/update-hostel/${id}`,
                allDetailsForm,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            if (res.data?.Status === 'Success') {
                setAllSaveSuccess(res.data.Message || 'Hostel details updated!')
                fetchHostel()
                setTimeout(() => {
                    setIsEditModalOpen(false)
                    setAllSaveSuccess('')
                }, 700)
            } else {
                setAllSaveError(res.data?.Error || 'Failed to update hostel details.')
            }
        } catch (err) {
            console.error('Error saving all details:', err)
            setAllSaveError(err.response?.data?.Error || 'Server error saving details.')
        } finally {
            setSavingAll(false)
        }
    }

    // Fetch hostel details by ID
    const fetchHostel = () => {
        setFetchError(null)
        axios
            .get(`${import.meta.env.VITE_APP_API}/hostel/View-one-hostel/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (res.data?.Result) {
                    setGetOneHostel(res.data.Result)
                } else {
                    setFetchError('Hostel data not found.')
                }
            })
            .catch((err) => {
                console.error('Error fetching hostel:', err)
                const msg = err.response?.data?.message || err.response?.data?.Error || 'Failed to load hostel details.'
                setFetchError(msg)
            })
    }

    // Fetch all wardens to populate the dropdown
    const fetchAvailableWardens = () => {
        axios
            .get(`${import.meta.env.VITE_APP_API}/hostel/get-all-warden`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                console.log('Wardens API response:', res.data)
                setAvailableWardens(res.data.result || [])
            })
            .catch((err) => {
                console.error('Error fetching wardens:', err)
                setAvailableWardens([])
            })
    }

    useEffect(() => {
        fetchHostel()
        fetchAvailableWardens()
    }, [id, token])

    useEffect(() => {
        if (getonehostel?.gender) {
            setNewGender(getonehostel.gender)
        }
    }, [getonehostel])

    // Update room count API call
    const handleRoomCountUpdate = async () => {
        if (!newRoomCount || isNaN(newRoomCount) || newRoomCount <= 0) {
            setMessage('Please enter a valid room count')
            return
        }

        try {
            setLoadingRoomUpdate(true)
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/hostel/update-room-count/${id}`,
                { newRoomCount: parseInt(newRoomCount) },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setMessage(res.data.Message || 'Room count updated successfully.')
            setNewRoomCount('')
            fetchHostel()
        } catch (error) {
            console.error('Error updating room count:', error)
            setMessage('Error updating room count')
        } finally {
            setLoadingRoomUpdate(false)
        }
    }

    const handleGenderUpdate = async () => {
        if (!newGender) {
            setMessage('Please select a hostel gender')
            return
        }

        try {
            setLoadingGenderUpdate(true)
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/hostel/update-hostel-gender/${id}`,
                { gender: newGender },
                { headers: { Authorization: `Bearer ${token}` } }
            )

            setMessage(res.data.Message || 'Hostel gender updated successfully.')
            fetchHostel()
        } catch (error) {
            console.error('Error updating hostel gender:', error)
            setMessage('Error updating hostel gender')
        } finally {
            setLoadingGenderUpdate(false)
        }
    }

    // Assign new warden API call
    const handleAssignWarden = async () => {
        if (!selectedWarden) {
            setAssignStatus('Please select a warden.')
            return
        }

        const url = `${import.meta.env.VITE_APP_API}/hostel/assign-new-warden`
        console.log('Assign Warden URL:', url)
        console.log('Payload:', { hostelId: id, newWardenId: selectedWarden })

        try {
            setLoadingAssignWarden(true)
            const res = await axios.post(
                url,
                {
                    hostelId: id,
                    newWardenId: selectedWarden,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setAssignStatus(res.data.Message || 'Warden assigned successfully.')
            setSelectedWarden('')
            fetchHostel()
        } catch (err) {
            console.error('Error assigning warden:', err)
            setAssignStatus('Error assigning warden.')
        } finally {
            setLoadingAssignWarden(false)
        }
    }

    if (fetchError) {
        return (
            <div className="text-center mt-10 space-y-4">
                <div className="text-red-600 font-medium">⚠️ {fetchError}</div>
                <Link
                    to="/Dashboard/Hostels"
                    className="inline-block px-4 py-2 bg-[#6b0f14] text-white rounded-md text-sm hover:bg-[#4f0a0f] transition-colors"
                >
                    &larr; Back to Hostels
                </Link>
            </div>
        )
    }

    if (!getonehostel) {
        return (
            <div className="text-center mt-10 text-gray-500">
                Loading hostel details...
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* View Details */}
            <div className="p-6 max-w-4xl mx-auto bg-white shadow-md rounded-lg mt-5">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 flex-wrap gap-2">
                    <h1 className="font-bold text-[#6b0f14] text-xl">
                        View Hostel: {getonehostel?.name}
                    </h1>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleOpenEditModal}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6b0f14] rounded-lg hover:bg-[#520b0f] transition-colors shadow-xs"
                        >
                            <Pencil size={14} />
                            <span>Edit All Details</span>
                        </button>
                        <Link
                            to="/Dashboard/Hostels"
                            className="text-xs font-medium text-gray-500 hover:text-[#6b0f14] transition-colors"
                        >
                            &larr; Back to Hostels
                        </Link>
                    </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm mt-8">
                    <Detail label="Hostel ID" value={getonehostel.hostelID} />
                    <Detail label="Hostel Name" value={getonehostel.name} />
                    <Detail
                        label="Location"
                        value={
                            <a
                                href={getonehostel.location}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#6b0f14] font-medium hover:underline"
                            >
                                Open Location
                            </a>
                        }
                    />
                    <Detail label="Hostel Warden" value={getonehostel?.warden?.username} />
                    <Detail label="Warden Email" value={getonehostel?.warden?.email} />
                    <Detail label="Room Count" value={getonehostel?.roomCount} />
                    <Detail label="Hostel Gender" value={getonehostel?.gender} />
                </div>
            </div>

            {/* Update Hostel Gender */}
            <div className="p-6 max-w-4xl mx-auto bg-white shadow-md rounded-lg">
                <h1 className="font-bold text-[#6b0f14] text-xl">Update Hostel Gender</h1>
                <div className="mt-4 flex items-center gap-4">
                    <select
                        className="border rounded-md px-4 py-2 w-52"
                        value={newGender}
                        onChange={(e) => setNewGender(e.target.value)}
                    >
                        <option value="">-- Select Gender --</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="REV">REV</option>
                    </select>
                    <button
                        onClick={handleGenderUpdate}
                        disabled={loadingGenderUpdate}
                        className="bg-[#6b0f14] text-white px-4 py-2 rounded-md hover:bg-[#4f0a0f] disabled:opacity-50"
                    >
                        {loadingGenderUpdate ? 'Updating...' : 'Update Gender'}
                    </button>
                </div>
            </div>

            {/* Update Room Count */}
            <div className="p-6 max-w-4xl mx-auto bg-white shadow-md rounded-lg">
                <h1 className="font-bold text-[#6b0f14] text-xl">Update Room Count</h1>
                <div className="mt-4 flex items-center gap-4">
                    <input
                        type="number"
                        className="border rounded-md px-4 py-2 w-40"
                        placeholder="Enter new count"
                        value={newRoomCount}
                        onChange={(e) => setNewRoomCount(e.target.value)}
                        min="1"
                    />
                    <button
                        onClick={handleRoomCountUpdate}
                        disabled={loadingRoomUpdate}
                        className="bg-[#6b0f14] text-white px-4 py-2 rounded-md hover:bg-[#4f0a0f] disabled:opacity-50"
                    >
                        {loadingRoomUpdate ? 'Updating...' : 'Update'}
                    </button>
                </div>
                {message && <p className="mt-2 text-sm text-[#6b0f14]">{message}</p>}
            </div>

            {/* Assign New Warden */}
            <div className="p-6 max-w-4xl mx-auto bg-white shadow-md rounded-lg">
                <h1 className="font-bold text-[#6b0f14] text-xl mb-4">Assign New Warden</h1>
                <div className="flex items-center gap-4">
                    <select
                        value={selectedWarden}
                        onChange={(e) => setSelectedWarden(e.target.value)}
                        className="border px-4 py-2 rounded-md w-full md:w-64"
                    >
                        <option value="">-- Select Warden --</option>
                        {availableWardens.length === 0 && (
                            <option disabled>No wardens available</option>
                        )}
                        {availableWardens.map((warden) => (
                            <option key={warden._id} value={warden._id}>
                                {warden.username} - {warden.email}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleAssignWarden}
                        disabled={loadingAssignWarden}
                        className="bg-[#6b0f14] text-white px-4 py-2 rounded-md hover:bg-[#4f0a0f] disabled:opacity-50"
                    >
                        {loadingAssignWarden ? 'Assigning...' : 'Assign'}
                    </button>
                </div>
                {assignStatus && <p className="mt-2 text-sm text-[#6b0f14]">{assignStatus}</p>}
            </div>

            {/* Edit All Details Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 bg-[#6b0f14] text-white flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">Edit All Hostel Details</h3>
                                <p className="text-xs text-[#fdf6e3]/80">{getonehostel?.name}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAllDetails} className="p-6 space-y-4">
                            {allSaveError && (
                                <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg">
                                    {allSaveError}
                                </div>
                            )}
                            {allSaveSuccess && (
                                <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-medium">
                                    {allSaveSuccess}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Hostel ID <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={allDetailsForm.hostelID}
                                        onChange={(e) => setAllDetailsForm(prev => ({ ...prev, hostelID: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Gender <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={allDetailsForm.gender}
                                        onChange={(e) => setAllDetailsForm(prev => ({ ...prev, gender: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14] bg-white"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="REV">REV</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Hostel Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={allDetailsForm.name}
                                    onChange={(e) => setAllDetailsForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Google Maps / Location Link
                                </label>
                                <input
                                    type="text"
                                    value={allDetailsForm.location}
                                    onChange={(e) => setAllDetailsForm(prev => ({ ...prev, location: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Room Count <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={allDetailsForm.roomCount}
                                        onChange={(e) => setAllDetailsForm(prev => ({ ...prev, roomCount: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Assigned Warden
                                    </label>
                                    <select
                                        value={allDetailsForm.warden}
                                        onChange={(e) => setAllDetailsForm(prev => ({ ...prev, warden: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14] bg-white"
                                    >
                                        <option value="">-- No Warden Assigned --</option>
                                        {getonehostel?.warden && typeof getonehostel.warden === 'object' && getonehostel.warden._id && !availableWardens.some(w => w._id === getonehostel.warden._id) && (
                                            <option value={getonehostel.warden._id}>
                                                {getonehostel.warden.username} (Current Warden)
                                            </option>
                                        )}
                                        {availableWardens.map((warden) => (
                                            <option key={warden._id} value={warden._id}>
                                                {warden.username} - {warden.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    disabled={savingAll}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingAll}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#6b0f14] rounded-lg hover:bg-[#520b0f] transition-colors disabled:opacity-50 shadow-xs"
                                >
                                    {savingAll ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

const Detail = ({ label, value }) => (
    <div>
        <p className="text-[#6b0f14] font-semibold">{label}</p>
        <p className="text-gray-800">{value || '-'}</p>
    </div>
)

export default ViewHostel
