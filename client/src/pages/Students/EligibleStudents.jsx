import axios from 'axios'
import React, { useEffect, useState, useRef } from 'react'
import DefaultInput from '../../components/Form/DefaultInput'
import { FaFemale, FaMale, FaUserTie } from 'react-icons/fa'
import Dropdown from '../../components/Form/Dropdown'

const DEPARTMENT_MAP = {
    A: 'Arts',
    LLB: 'Law',
    GIS: 'Geographical Science',
    SW: 'Social Work',
}

const EligibleStudents = () => {
    const [students, setStudents] = useState([])
    const [filteredList, setFilteredList] = useState([])
    const [activeTab, setActiveTab] = useState('Not Eligible')

    const [searchTerm, setSearchTerm] = useState('')
    const [genderFilter, setGenderFilter] = useState('')
    const [departmentFilter, setDepartmentFilter] = useState('')
    const [yearFilter, setYearFilter] = useState('')
    const [distanceFilter, setDistanceFilter] = useState('')

    const [selectedStudents, setSelectedStudents] = useState(new Set())
    const [selectAllVisible, setSelectAllVisible] = useState(false)
    const [selectCount, setSelectCount] = useState('Custom')
    const [customSelect, setCustomSelect] = useState('')

    const token = localStorage.getItem('login')

    const fetchStudents = React.useCallback(() => {
        const endpoint = activeTab === 'Not Eligible'
            ? '/eligibility/not-eligible'
            : '/eligibility/eligible-for-assignment'

        axios.get(import.meta.env.VITE_APP_API + endpoint, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            setStudents(res.data.Result || [])
            setSelectedStudents(new Set())
        }).catch(err => console.error(err))
    }, [token, activeTab])

    useEffect(() => {
        fetchStudents()
    }, [fetchStudents])

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
        return [{ value: '', label: 'Select' }, ...Array.from(set).filter(Boolean).sort().map(y => ({ value: y, label: `20${y}` }))]
    }, [students])

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
            <div className="w-full relative" ref={rootRef}>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Department</label>
                <div>
                    <div
                        role="button"
                        tabIndex={0}
                        className="w-full px-3 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 transition flex justify-between items-center cursor-pointer h-[42px]"
                        onClick={() => setOpen(!open)}
                    >
                        <span className="truncate text-sm">{value ? displayLabelForValue(value) : 'Select'}</span>
                        <span className="text-gray-400 text-[10px]">▼</span>
                    </div>

                    {open && (
                        <div className="absolute z-50 mt-1 w-full min-w-[200px] max-h-56 overflow-auto bg-white border rounded shadow-lg">
                            <div className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm" onClick={() => { onChange(''); setOpen(false) }}>All Departments</div>
                            {Array.from(map.keys()).sort().map(parent => (
                                <div key={parent}>
                                    <div
                                        className="px-3 py-2 text-sm font-semibold hover:bg-gray-50 cursor-pointer"
                                        onClick={() => { onChange(`MAIN:${parent}`); setOpen(false) }}
                                    >
                                        {DEPARTMENT_MAP[parent] || parent}
                                    </div>
                                    {map.get(parent).map(subObj => (
                                        <div
                                            key={subObj.value}
                                            className="px-6 py-1 text-xs hover:bg-gray-50 cursor-pointer text-gray-600"
                                            onClick={() => { onChange(subObj.value); setOpen(false) }}
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
            const matchesDistance = distanceFilter === '' || (student.distance && Number(student.distance) >= Number(distanceFilter))

            return matchesSearch && matchesGender && matchesDepartment && matchesYear && matchesDistance
        })

        setFilteredList(filtered)
    }, [searchTerm, students, genderFilter, departmentFilter, yearFilter, distanceFilter])

    const handleCheckboxChange = (studentId) => {
        setSelectedStudents(prev => {
            const newSelected = new Set(prev)
            if (newSelected.has(studentId)) newSelected.delete(studentId)
            else newSelected.add(studentId)
            return newSelected
        })
    }

    const handleSelectAllChange = (e) => {
        const checked = e.target.checked
        setSelectedStudents(prev => {
            const newSelected = new Set(prev)
            filteredList.forEach(s => {
                if (checked) newSelected.add(s._id)
                else newSelected.delete(s._id)
            })
            return newSelected
        })
        setSelectAllVisible(checked)
    }

    const handleSelectCountChange = (e) => {
        const val = e.target.value
        setSelectCount(val)
        if (val !== 'Custom') setCustomSelect('')
        const n = val === 'All' ? filteredList.length : Number(val) || 0
        const ids = filteredList.slice(0, n).map(s => s._id)
        setSelectedStudents(new Set(ids))
    }

    const handleCustomSelectChange = (e) => {
        const v = e.target.value.replace(/[^0-9]/g, '')
        setCustomSelect(v)
        if (v) {
            setSelectCount(v)
            const n = Number(v)
            const ids = filteredList.slice(0, n).map(s => s._id)
            setSelectedStudents(new Set(ids))
        } else {
            setSelectCount('Custom')
            setSelectedStudents(new Set())
        }
    }

    useEffect(() => {
        const allSelected = filteredList.length > 0 && filteredList.every(s => selectedStudents.has(s._id))
        setSelectAllVisible(allSelected)
    }, [filteredList, selectedStudents])

    const handleToggleEligibility = () => {
        if (selectedStudents.size === 0) {
            alert('Please select at least one student.')
            return
        }

        const endpoint = activeTab === 'Not Eligible'
            ? '/eligibility/mark-eligible'
            : '/eligibility/mark-not-eligible'

        axios.post(import.meta.env.VITE_APP_API + endpoint, {
            studentIds: Array.from(selectedStudents)
        }, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            if (res.data.Status === 'Success') {
                alert(res.data.Message)
                setSelectedStudents(new Set())
                fetchStudents()
            } else {
                alert(res.data.Error || 'Failed to update eligibility')
            }
        }).catch(err => {
            console.error(err)
            alert('Failed to update eligibility')
        })
    }

    return (
        <div className="p-4 md:p-6 mt-2 bg-white rounded-xl shadow-sm border border-gray-100 max-w-full overflow-hidden">
            <h1 className="text-xl md:text-2xl font-bold text-[#6b0f14] mb-6 border-b pb-3">Eligibility Management</h1>

            <div className="flex gap-4 mb-6 border-b overflow-x-auto whitespace-nowrap scrollbar-hide">
                <button
                    className={`pb-2 px-4 font-semibold shrink-0 ${activeTab === 'Not Eligible' ? 'text-[#6b0f14] border-b-2 border-[#6b0f14]' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('Not Eligible')}
                >
                    Not Eligible List
                </button>
                <button
                    className={`pb-2 px-4 font-semibold shrink-0 ${activeTab === 'Eligible' ? 'text-[#6b0f14] border-b-2 border-[#6b0f14]' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('Eligible')}
                >
                    Eligible List
                </button>
            </div>

            <p className="text-sm text-gray-500 mb-6">
                {activeTab === 'Not Eligible'
                    ? <span>Students listed below have <span className="font-semibold text-red-600">not yet been marked as eligible</span> for hostel allocation. Select students and mark them as eligible.</span>
                    : <span>Students listed below are <span className="font-semibold text-green-600">currently eligible</span> but not yet assigned a hostel. Select students to revert their status if needed.</span>
                }
            </p>

            {/* ── ALIGNED FILTER BAR ── */}
            <div className="mb-6 flex flex-col lg:flex-row items-end gap-4 w-full bg-gray-50 p-4 rounded-xl border border-gray-100">
                
                {/* Search field gets flex-[1.6] to make it wider than others */}
                <div className="w-full lg:flex-[1.6]">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Search Records</label>
                    <DefaultInput
                        name="search"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Name, NIC, Enrol..."
                        className="w-full h-[42px]"
                    />
                </div>

                {/* Department dropdown nudged slightly up via -top-[4px] to hit perfect line alignment */}
                <div className="w-full lg:flex-1 relative -top-[20px]">
                    <DepartmentTree value={departmentFilter} onChange={setDepartmentFilter} />
                </div>

                <div className="w-full lg:flex-1">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Study Year</label>
                    <Dropdown
                        name="yearFilter"
                        value={yearFilter}
                        onChange={e => setYearFilter(e.target.value)}
                        options={yearOptions}
                        className="w-full h-[42px]"
                    />
                </div>

                <div className="w-full lg:flex-1">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Gender</label>
                    <Dropdown
                        name="genderFilter"
                        value={genderFilter}
                        onChange={e => setGenderFilter(e.target.value)}
                        options={[
                            { value: '', label: 'Select' },
                            { value: 'Male', label: 'Male' },
                            { value: 'Female', label: 'Female' },
                            { value: 'REV', label: 'REV' },
                        ]}
                        className="w-full h-[42px]"
                    />
                </div>

                <div className="w-full lg:flex-1">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Min Distance</label>
                    <DefaultInput
                        type="number"
                        name="distanceFilter"
                        value={distanceFilter}
                        onChange={e => setDistanceFilter(e.target.value)}
                        placeholder="Km"
                        min="0"
                        className="w-full h-[42px]"
                    />
                </div>
            </div>

            {/* Selection and Action Row */}
            <div className="mb-6 p-4 md:p-5 bg-[#fefaf0] rounded-lg border border-[#fdf6e3] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                    <label className="flex items-center gap-2 cursor-pointer py-1">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[#6b0f14] focus:ring-2 focus:ring-[#6b0f14]/30" checked={selectAllVisible} onChange={handleSelectAllChange} />
                        <span className="text-sm font-medium whitespace-nowrap">Select All</span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <label className="text-sm whitespace-nowrap text-gray-700">Select rows:</label>
                        <select value={selectCount} onChange={handleSelectCountChange} className="border border-gray-300 px-3 py-1.5 bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm w-28">
                            <option value="Custom">Custom</option>
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                            <option value="All">All</option>
                        </select>
                        <input type="number" min="1" value={customSelect} onChange={handleCustomSelectChange} placeholder="Count" className="border border-gray-300 px-3 py-1.5 bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm w-24" />
                    </div>
                </div>

                <div className="w-full lg:w-auto flex justify-end shrink-0">
                    <button
                        onClick={handleToggleEligibility}
                        className={`w-full sm:w-auto text-white px-6 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] transition disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none ${activeTab === 'Not Eligible' ? 'bg-gradient-to-r from-[#6b0f14] to-[#4f0a0f]' : 'bg-red-600'}`}
                        disabled={selectedStudents.size === 0}
                    >
                        {activeTab === 'Not Eligible' ? `Mark as Eligible (${selectedStudents.size})` : `Revert to Not Eligible (${selectedStudents.size})`}
                    </button>
                </div>
            </div>

            {/* Table Wrapper Container */}
            <div className="w-full overflow-x-auto rounded-xl shadow border border-gray-200">
                <table className="w-full table-auto text-sm text-left text-gray-600 bg-white">
                    <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14] border-b whitespace-nowrap">
                        <tr>
                            <th className="px-4 py-4 font-semibold w-12">Select</th>
                            <th className="px-4 py-4 font-semibold w-10">#</th>
                            <th className="px-6 py-4 font-semibold whitespace-nowrap">Registration No</th>
                            <th className="px-6 py-4 font-semibold">Student Name</th>
                            <th className="px-6 py-4 font-semibold">Department</th>
                            <th className="px-4 py-4 font-semibold whitespace-nowrap">Study Year</th>
                            <th className="px-4 py-4 font-semibold">Gender</th>
                            <th className="px-4 py-4 font-semibold whitespace-nowrap">Distance (KM)</th>
                            <th className="px-4 py-4 font-semibold">Eligibility Status</th>
                            {activeTab === 'Eligible' && <>
                                <th className="px-4 py-4 font-semibold whitespace-nowrap">Assignment Status</th>
                                <th className="px-4 py-4 font-semibold whitespace-nowrap">Current Hostel</th>
                            </>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredList.length > 0 ? (
                            filteredList.map((std, index) => {
                                const isSelected = selectedStudents.has(std._id)
                                const mainDeptCode = getMainDept(std.enrolmentNo)
                                const mainDept = DEPARTMENT_MAP[mainDeptCode] || mainDeptCode
                                const studyYear = std.dateOfEnrolment ? `Year ${(new Date().getFullYear() - new Date(std.dateOfEnrolment).getFullYear()) + 1}` : ''

                                return (
                                    <tr key={std._id}
                                        onClick={() => handleCheckboxChange(std._id)}
                                        className={`transition-all duration-150 cursor-pointer ${isSelected ? 'bg-[#fdf6e3]' : 'hover:bg-[#fefaf0]'}`}>
                                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleCheckboxChange(std._id)}
                                                className="h-4 w-4 rounded border-gray-300 text-[#6b0f14] focus:ring-[#6b0f14]"
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-gray-800">{index + 1}</td>
                                        <td className="px-6 py-4 font-medium whitespace-nowrap">{std.enrolmentNo}</td>
                                        <td className="px-6 py-4 font-normal text-gray-900 break-words max-w-[220px]">{std.name}</td>
                                        <td className="px-6 py-4 text-gray-700 break-words max-w-[180px]">{mainDept}</td>
                                        <td className="px-4 py-4 whitespace-nowrap">{studyYear}</td>
                                        <td className="px-4 py-4">
                                            {std.sex === 'Male' ? (
                                                <span className="flex bg-[#fdf6e3] text-[#6b0f14] w-fit text-xs font-semibold px-2 py-1 rounded-md gap-1 items-center whitespace-nowrap">
                                                    <FaMale className="h-3 w-auto" />
                                                    Male
                                                </span>
                                            ) : std.sex === 'Female' ? (
                                                <span className="flex bg-pink-50 text-pink-700 w-fit text-xs font-semibold px-2 py-1 rounded-md gap-1 items-center whitespace-nowrap">
                                                    <FaFemale className="h-3 w-auto" />
                                                    Female
                                                </span>
                                            ) : (
                                                <span className="flex bg-orange-50 text-orange-700 w-fit text-xs font-semibold px-2 py-1 rounded-md gap-1 items-center whitespace-nowrap">
                                                    <FaUserTie className="h-3 w-auto" />
                                                    {std.sex || 'REV'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 font-medium whitespace-nowrap">{std.distance || 'N/A'}</td>
                                        <td className="px-4 py-4">
                                            {activeTab === 'Not Eligible' ? (
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-md border bg-red-100 text-red-700 border-red-200 whitespace-nowrap">
                                                    Not Eligible
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-md border bg-green-100 text-green-700 border-green-200 whitespace-nowrap">
                                                    Eligible
                                                </span>
                                            )}
                                        </td>
                                        {activeTab === 'Eligible' && <>
                                            <td className="px-4 py-4">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border whitespace-nowrap ${std.assignmentStatus === 'Assigned'
                                                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                    : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                    {std.assignmentStatus || 'Not Assigned'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">{std.currentHostel || '-'}</td>
                                        </>}
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan={activeTab === 'Eligible' ? 11 : 9} className="px-6 py-8 text-center text-gray-500 bg-gray-50">
                                    {activeTab === 'Not Eligible' ? 'No students found. All students may already be eligible.' : 'No eligible students waiting for assignment found.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 text-sm text-gray-500 text-right">
                Total: <span className="font-semibold text-gray-700">{filteredList.length}</span> students
            </div>
        </div>
    )
}

export default EligibleStudents