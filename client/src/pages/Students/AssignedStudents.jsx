import axios from 'axios'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import DefaultInput from '../../components/Form/DefaultInput'
import { FaFemale, FaMale, FaUserTie } from 'react-icons/fa'
import Dropdown from '../../components/Form/Dropdown'

const DEPARTMENT_MAP = {
    A: 'Arts',
    LLB: 'Law',
    GIS: 'Geographical Science',
    SW: 'Social Work',
}

const AssignedStudents = () => {
    const [students, setStudents] = useState([])
    const [filteredList, setFilteredList] = useState([])
    const [allHostels, setAllHostels] = useState([])

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [genderFilter, setGenderFilter] = useState('')
    const [departmentFilter, setDepartmentFilter] = useState('')
    const [yearFilter, setYearFilter] = useState('')
    const [hostelFilter, setHostelFilter] = useState('')

    const token = localStorage.getItem('login')

    const fetchStudents = useCallback(() => {
        axios.get(import.meta.env.VITE_APP_API + '/eligibility/assigned-students', {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            setStudents(res.data.Result || [])
        }).catch(err => console.error(err))
    }, [token]);

    const fetchHostels = useCallback(() => {
        axios.get(import.meta.env.VITE_APP_API + '/hostel/get-all-hostels', {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            setAllHostels(res.data.Result || [])
        }).catch(err => console.error(err))
    }, [token]);

    useEffect(() => {
        fetchStudents()
        fetchHostels()
    }, [fetchStudents, fetchHostels])

    const getMainDept = enrolNo => {
        if (!enrolNo) return ''
        const parts = enrolNo.split('/').filter(Boolean)
        return parts[0] || ''
    }

    const getSubDept = enrolNo => {
        if (!enrolNo) return ''
        const parts = enrolNo.split('/').filter(Boolean)
        if (parts.length >= 4) return parts[2]
        if (parts.length === 3) return parts[0]
        return ''
    }

    const getYear = enrolNo => enrolNo?.split('/')?.[1] ?? ''

    const yearOptions = React.useMemo(() => {
        const set = new Set(students.map(s => getYear(s.enrolmentNo)))
        return [{ value: '', label: 'All Years' }, ...Array.from(set).filter(Boolean).sort().map(y => ({ value: y, label: `20${y}` }))]
    }, [students])

    const hostelOptions = React.useMemo(() => {
        const set = new Set(students.map(s => s.hostelName))
        return [{ value: '', label: 'All Hostels' }, ...Array.from(set).filter(Boolean).sort().map(h => ({ value: h, label: h }))]
    }, [students])

    // Department tree dropdown
    const DepartmentTree = ({ value, onChange }) => {
        const [open, setOpen] = useState(false)
        const rootRef = useRef(null)

        const map = React.useMemo(() => {
            const m = new Map()
            students.forEach(s => {
                const enrol = s.enrolmentNo || ''
                const main = getMainDept(enrol)
                const parts = enrol.split('/').filter(Boolean)
                const explicitSub = parts.length >= 4 ? parts[2] : ''
                if (!main) return
                if (!m.has(main)) m.set(main, new Map())
                if (explicitSub && explicitSub !== main) m.get(main).set(`SUB:${explicitSub}`, { value: `SUB:${explicitSub}`, label: `${explicitSub}`, type: 'sub' })
                if (parts.length === 3) m.get(main).set(`SUBSHORT:${main}`, { value: `SUBSHORT:${main}`, label: `${main}`, type: 'short' })
            })

            const out = new Map()
            for (const [k, innerMap] of m.entries()) {
                const arr = Array.from(innerMap.values())
                const priority = t => (t === 'short' ? 0 : t === 'sub' ? 1 : 2)
                arr.sort((a, b) => {
                    const p = priority(a.type) - priority(b.type)
                    return p !== 0 ? p : a.label.localeCompare(b.label)
                })
                out.set(k, arr)
            }
            return out
        }, [])

        const displayLabelForValue = (val) => {
            if (!val) return ''
            if (val.startsWith('MAIN:')) return DEPARTMENT_MAP[val.slice(5)] || `${val.slice(5)} (main)`
            if (val.startsWith('SUB:')) return val.slice(4)
            if (val.startsWith('SUBSHORT:')) return val.slice(9)
            return DEPARTMENT_MAP[val] || val
        }

        useEffect(() => {
            function handleClick(e) {
                if (open && rootRef.current && !rootRef.current.contains(e.target)) {
                    setOpen(false)
                }
            }
            document.addEventListener('mousedown', handleClick)
            return () => document.removeEventListener('mousedown', handleClick)
        }, [open])

        return (
            <div className="w-40 relative mb-5" ref={rootRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <div>
                    <div
                        role="button"
                        tabIndex={0}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 transition flex justify-between items-center cursor-pointer"
                        onClick={() => setOpen(!open)}
                    >
                        <span className="truncate text-sm">{value ? displayLabelForValue(value) : 'Select'}</span>
                        <span className="text-gray-400">▾</span>
                    </div>

                    {open && (
                        <div className="absolute z-50 mt-1 w-48 max-h-56 overflow-auto bg-white border rounded shadow-lg">
                            <div className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm" onClick={() => { onChange(''); setOpen(false); }}>All Departments</div>
                            {Array.from(map.keys()).sort().map(parent => (
                                <div key={parent}>
                                    <div
                                        className="px-3 py-2 text-sm font-semibold hover:bg-gray-50 cursor-pointer"
                                        onClick={() => { onChange(`MAIN:${parent}`); setOpen(false); }}
                                    >
                                        {DEPARTMENT_MAP[parent] || parent}
                                    </div>
                                    {map.get(parent).map(subObj => (
                                        <div
                                            key={subObj.value}
                                            className="px-6 py-1 text-xs hover:bg-gray-50 cursor-pointer text-gray-600"
                                            onClick={() => { onChange(subObj.value); setOpen(false); }}
                                        >
                                            ↳ {subObj.label}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Filtering
    useEffect(() => {
        const term = searchTerm.toLowerCase()

        const filtered = students.filter(student => {
            if (!student) return false

            const matchesSearch =
                student.nic?.toLowerCase().includes(term) ||
                student.enrolmentNo?.toLowerCase().includes(term) ||
                student.name?.toLowerCase().includes(term)

            const matchesGender = genderFilter === '' || (student.sex && student.sex.trim().toLowerCase() === genderFilter.trim().toLowerCase())

            let matchesDepartment = false
            if (departmentFilter === '') {
                matchesDepartment = true
            } else if (departmentFilter.startsWith('MAIN:')) {
                const mainCode = departmentFilter.slice(5)
                matchesDepartment = getMainDept(student.enrolmentNo) === mainCode
            } else if (departmentFilter.startsWith('SUB:')) {
                const subCode = departmentFilter.slice(4)
                matchesDepartment = getSubDept(student.enrolmentNo) === subCode
            } else if (departmentFilter.startsWith('SUBSHORT:')) {
                const mainCode = departmentFilter.slice(9)
                const parts = (student.enrolmentNo || '').split('/').filter(Boolean)
                matchesDepartment = getMainDept(student.enrolmentNo) === mainCode && parts.length === 3
            } else {
                matchesDepartment = getMainDept(student.enrolmentNo) === departmentFilter || getSubDept(student.enrolmentNo) === departmentFilter
            }

            const matchesYear = yearFilter === '' || getYear(student.enrolmentNo) === yearFilter
            const matchesHostel = hostelFilter === '' || student.hostelName === hostelFilter

            return matchesSearch && matchesGender && matchesDepartment && matchesYear && matchesHostel
        })

        setFilteredList(filtered)
    }, [searchTerm, students, genderFilter, departmentFilter, yearFilter, hostelFilter])

    // Unassignment Logic
    const [selectedStudents, setSelectedStudents] = useState(new Set())
    const [showUnassignModal, setShowUnassignModal] = useState(false)
    const [isUnassigning, setIsUnassigning] = useState(false)
    const [unassignNote, setUnassignNote] = useState('')
    const [unassignDate, setUnassignDate] = useState(new Date().toISOString().split('T')[0])

    const toggleStudent = (id) => {
        const newSet = new Set(selectedStudents)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedStudents(newSet)
    }

    const toggleAll = () => {
        if (selectedStudents.size === filteredList.length) {
            setSelectedStudents(new Set())
        } else {
            const newSet = new Set(selectedStudents)
            filteredList.forEach(std => newSet.add(std.allocationId || std._id))
            setSelectedStudents(newSet)
        }
    }

    const handleUnassign = async () => {
        setIsUnassigning(true)
        try {
            await axios.post(import.meta.env.VITE_APP_API + '/eligibility/unassign-students', {
                allocationIds: Array.from(selectedStudents),
                note: unassignNote,
                changeDate: unassignDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setShowUnassignModal(false)
            setSelectedStudents(new Set())
            setUnassignNote('')
            setUnassignDate(new Date().toISOString().split('T')[0])
            fetchStudents()
        } catch (err) {
            console.error("Error unassigning students:", err)
            alert("Failed to unassign students. Please try refreshing the page and try again.")
            setShowUnassignModal(false)
        } finally {
            setIsUnassigning(false)
        }
    }

    // Change Hostel Logic
    const [showChangeModal, setShowChangeModal] = useState(false)
    const [isChanging, setIsChanging] = useState(false)
    const [newHostelId, setNewHostelId] = useState('')
    const [changeNote, setChangeNote] = useState('')
    const [changeDate, setChangeDate] = useState(new Date().toISOString().split('T')[0])

    const handleChangeHostel = async () => {
        if (!newHostelId) return alert('Please select a new hostel.')
        setIsChanging(true)
        try {
            await axios.post(import.meta.env.VITE_APP_API + '/eligibility/change-hostel', {
                allocationIds: Array.from(selectedStudents),
                newHostelId,
                note: changeNote,
                changeDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setShowChangeModal(false)
            setSelectedStudents(new Set())
            setNewHostelId('')
            setChangeNote('')
            setChangeDate(new Date().toISOString().split('T')[0])
            fetchStudents()
        } catch (err) {
            console.error("Error changing hostel:", err)
            alert("Failed to change hostel. Please try refreshing the page and try again.")
            setShowChangeModal(false)
        } finally {
            setIsChanging(false)
        }
    }

    return (
        <div className="p-6 mt-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <h1 className="text-2xl font-bold text-[#6b0f14] mb-6 border-b pb-3">Assigned Students</h1>

            <div className="flex justify-between items-center mb-6">
                <p className="text-sm text-gray-500">
                    Students listed below have been <span className="font-semibold text-green-600">successfully allocated to a hostel</span>.
                </p>
                <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
                    Showing <span className="font-bold text-[#6b0f14]">{filteredList.length}</span> results
                </div>
            </div>

            <div className="mb-6 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px] mb-5">
                    <DefaultInput
                        label="Search by Name, NIC, Enrolment"
                        name="search"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search..."
                    />
                </div>
                <div className="mb-[20px]">
                    <DepartmentTree value={departmentFilter} onChange={setDepartmentFilter} />
                </div>
                <div className="mb-[20px]">
                    <Dropdown
                        inline
                        label="Study Year"
                        name="yearFilter"
                        value={yearFilter}
                        onChange={e => setYearFilter(e.target.value)}
                        options={yearOptions}
                        className="w-32 mb-5"
                    />
                </div>
                <div className="mb-[20px]">
                    <Dropdown
                        inline
                        label="Hostel"
                        name="hostelFilter"
                        value={hostelFilter}
                        onChange={e => setHostelFilter(e.target.value)}
                        options={hostelOptions}
                        className="w-32 mb-5"
                    />
                </div>
                <div className="mb-[20px]">
                    <Dropdown
                        inline
                        label="Gender"
                        name="genderFilter"
                        value={genderFilter}
                        onChange={e => setGenderFilter(e.target.value)}
                        options={[
                            { value: '', label: 'All Gender' },
                            { value: 'Male', label: 'Male' },
                            { value: 'Female', label: 'Female' },
                            { value: 'REV', label: 'REV' },
                        ]}
                        className="w-32 mb-5"
                    />
                </div>
            </div>

            {selectedStudents.size > 0 && (
                <div className="bg-[#fff8f8] border border-[#ffcdd2] rounded-lg p-4 mb-6 flex justify-between items-center shadow-sm">
                    <span className="text-[#6b0f14] font-semibold flex items-center gap-2">
                        <div className="bg-[#6b0f14] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            {selectedStudents.size}
                        </div>
                        Students Selected for Unassignment
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowChangeModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-medium transition-colors shadow-sm"
                        >
                            Change Hostel
                        </button>
                        <button
                            onClick={() => setShowUnassignModal(true)}
                            className="bg-[#6b0f14] hover:bg-[#80141a] text-white px-5 py-2 rounded-md font-medium transition-colors shadow-sm"
                        >
                            Unassign Selected Students
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto rounded-xl shadow border border-gray-200">
                <table className="min-w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14] border-b">
                        <tr>
                            <th className="px-6 py-4 font-semibold w-10">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-[#6b0f14] focus:ring-[#6b0f14]"
                                    onChange={toggleAll}
                                    checked={filteredList.length > 0 && selectedStudents.size === filteredList.length}
                                />
                            </th>
                            <th className="px-6 py-4 font-semibold">Enrollment No</th>
                            <th className="px-6 py-4 font-semibold">Student Name</th>
                            <th className="px-6 py-4 font-semibold">Study Year</th>
                            <th className="px-6 py-4 font-semibold">Gender</th>
                            <th className="px-6 py-4 font-semibold">Hostel</th>
                            <th className="px-6 py-4 font-semibold">Room</th>
                            <th className="px-6 py-4 font-semibold">Assigned Date</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredList.length > 0 ? (
                            filteredList.map((std) => {
                                const studyYear = std.dateOfEnrolment ? `Year ${(new Date().getFullYear() - new Date(std.dateOfEnrolment).getFullYear()) + 1}` : ''

                                const normalizedSex = (std.sex || '').trim().toLowerCase();
                                const rowId = std.allocationId || std._id;
                                const isSelected = selectedStudents.has(rowId);

                                return (
                                    <tr
                                        key={rowId}
                                        onClick={() => toggleStudent(rowId)}
                                        className={`transition-all duration-150 border-b cursor-pointer ${isSelected ? 'bg-red-50' : 'hover:bg-[#fefaf0]'}`}
                                    >
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-[#6b0f14] focus:ring-[#6b0f14] pointer-events-none"
                                                checked={isSelected}
                                                readOnly
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium">{std.enrolmentNo}</td>
                                        <td className="px-6 py-4">{std.name}</td>
                                        <td className="px-6 py-4">{studyYear}</td>
                                        <td className="px-6 py-4">
                                            {['male', 'm'].includes(normalizedSex) ? (
                                                <span className="flex bg-[#fdf6e3] text-[#6b0f14] w-fit text-xs font-semibold px-2 py-1 rounded-md gap-1 items-center">
                                                    <FaMale className="h-3 w-auto" />
                                                    Male
                                                </span>
                                            ) : ['female', 'f'].includes(normalizedSex) ? (
                                                <span className="flex bg-pink-50 text-pink-700 w-fit text-xs font-semibold px-2 py-1 rounded-md gap-1 items-center">
                                                    <FaFemale className="h-3 w-auto" />
                                                    Female
                                                </span>
                                            ) : (
                                                <span className="flex bg-orange-50 text-orange-700 w-fit text-xs font-semibold px-2 py-1 rounded-md gap-1 items-center">
                                                    <FaUserTie className="h-3 w-auto" />
                                                    {std.sex || 'REV'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium">{std.hostelName || 'Unknown'}</td>
                                        <td className="px-6 py-4 font-medium">{std.roomNumber || 'Unknown'}</td>
                                        <td className="px-6 py-4 font-medium">
                                            {std.assignmentDate ? new Date(std.assignmentDate).toLocaleDateString() : 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-md border bg-green-100 text-green-700 border-green-200">
                                                Assigned
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan="9" className="px-6 py-8 text-center text-gray-500 bg-gray-50">
                                    No assigned students found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Unassign Confirmation Modal */}
            {showUnassignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="bg-red-50 p-6 flex flex-col items-center border-b border-red-100">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 text-center">Confirm Unassignment</h3>
                            <p className="text-sm text-gray-500 mt-2 text-center">
                                You are about to unassign <span className="font-bold text-red-600">{selectedStudents.size}</span> student(s) from their hostels.
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unassignment Date</label>
                                <input
                                    type="date"
                                    value={unassignDate}
                                    onChange={(e) => setUnassignDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6b0f14]"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Remark</label>
                                <textarea
                                    value={unassignNote}
                                    onChange={(e) => setUnassignNote(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6b0f14]"
                                    rows="3"
                                    placeholder="Enter reason for unassignment (e.g. Graduated, Suspended)"
                                ></textarea>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowUnassignModal(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUnassign}
                                disabled={isUnassigning}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isUnassigning ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    "Yes, Unassign"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Hostel Modal */}
            {showChangeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="bg-blue-50 p-6 flex flex-col items-center border-b border-blue-100">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 text-center">Change Hostel</h3>
                            <p className="text-sm text-gray-500 mt-2 text-center">
                                You are about to change the hostel for <span className="font-bold text-blue-600">{selectedStudents.size}</span> student(s).
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Hostel</label>
                                <select
                                    value={newHostelId}
                                    onChange={(e) => setNewHostelId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">-- Select New Hostel --</option>
                                    {allHostels.map(h => (
                                        <option key={h._id} value={h._id}>
                                            {h.name} ({h.gender})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Change Date</label>
                                <input
                                    type="date"
                                    value={changeDate}
                                    onChange={(e) => setChangeDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Remark</label>
                                <textarea
                                    value={changeNote}
                                    onChange={(e) => setChangeNote(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    rows="3"
                                    placeholder="Enter reason for transfer"
                                ></textarea>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowChangeModal(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangeHostel}
                                disabled={isChanging || !newHostelId}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isChanging ? "Processing..." : "Change Hostel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AssignedStudents
