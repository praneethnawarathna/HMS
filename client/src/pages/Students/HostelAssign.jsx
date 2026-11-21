import React, { useEffect, useState, useRef } from 'react'
import DefaultInput from '../../components/Form/DefaultInput'
import Dropdown from '../../components/Form/Dropdown'
import { FaFemale, FaMale, FaUserTie } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { getStudentHomeTown } from '../../utils/studentUtils'



const DEPARTMENT_MAP = {
    A: 'Arts',
    LLB: 'Law',
    GIS: 'Geographical Science',
    SW: 'Social Work',
}

const HostelAssign = () => {
    const [getallstudents, setgetallstudents] = useState([])
    const [filteredStudents, setFilteredStudents] = useState([])
    const [filters, setFilters] = useState({
        search: '',
        distance: '',
        gender: '',
        intakeYear: '',
        department: '',
        studyYear: '',
    })

    // Excel import filter from DB
    const [importedFilter, setImportedFilter] = useState(undefined) // undefined = loading, null = no list saved, array = filtered
    const [importInfo, setImportInfo] = useState(null)

    const token = localStorage.getItem('login')

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

    const getIntakeYearCode = (enrolmentNo) => {
        const parts = String(enrolmentNo ?? '').split('/').filter(Boolean)
        return parts[1] || ''
    }

    const parentSubMap = React.useMemo(() => {
        const m = new Map()
            ; (getallstudents || []).forEach(s => {
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
    }, [getallstudents])

    const DepartmentTree = ({ map, value, onChange }) => {
        const [open, setOpen] = useState(false)
        const [expanded, setExpanded] = useState(null)
        const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
        const rootRef = useRef(null)
        const triggerRef = useRef(null)

        const displayLabelForValue = (val) => {
            if (!val) return ''
            if (val.startsWith('MAIN:')) return DEPARTMENT_MAP[val.slice(5)] || `${val.slice(5)} (main)`
            if (val.startsWith('SUB:')) return val.slice(4)
            if (val.startsWith('SUBSHORT:')) return val.slice(9)
            return DEPARTMENT_MAP[val] || val
        }

        const updatePos = () => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect()
                setDropdownPos({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: Math.max(rect.width, 192),
                })
            }
        }

        const handleOpen = () => {
            const next = !open
            if (next) updatePos()
            if (!next) setExpanded(null)
            setOpen(next)
        }

        useEffect(() => {
            function handleClick(e) {
                if (open && rootRef.current && !rootRef.current.contains(e.target)) {
                    setOpen(false)
                    setExpanded(null)
                }
            }
            function handleScroll() {
                if (open) updatePos()
            }
            document.addEventListener('mousedown', handleClick)
            document.addEventListener('touchstart', handleClick)
            window.addEventListener('scroll', handleScroll, true)
            return () => {
                document.removeEventListener('mousedown', handleClick)
                document.removeEventListener('touchstart', handleClick)
                window.removeEventListener('scroll', handleScroll, true)
            }
        }, [open])

        return (
            <div className="min-w-[150px] shrink-0" ref={rootRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <div
                    ref={triggerRef}
                    role="button"
                    tabIndex={0}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6b0f14] focus:border-[#6b0f14] transition flex justify-between items-center cursor-pointer h-[38px]"
                    onClick={handleOpen}
                >
                    <span className="truncate text-sm">{value ? displayLabelForValue(value) : 'All'}</span>
                    <span className="text-gray-400">▾</span>
                </div>

                {open && (
                    <div
                        style={{
                            position: 'fixed',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            width: dropdownPos.width,
                            zIndex: 9999,
                        }}
                        className="max-h-56 overflow-auto bg-white border rounded shadow-lg ring-1 ring-black ring-opacity-5"
                    >
                        <div
                            className="px-2 py-1 hover:bg-gray-50 cursor-pointer text-xs"
                            onClick={() => { onChange(''); setOpen(false); setExpanded(null); }}
                        >
                            All Departments
                        </div>
                        {Array.from(map.keys()).sort().map(parent => (
                            <div key={parent}>
                                <div className={`px-2 py-1 flex justify-between items-center ${map.get(parent).some(s => s.value === value) || value === `MAIN:${parent}` ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}>
                                    <button
                                        type="button"
                                        className="text-left flex-1 truncate px-2 py-0.5 text-xs"
                                        onClick={() => { onChange(`MAIN:${parent}`); setOpen(false); setExpanded(null); }}
                                    >
                                        {DEPARTMENT_MAP[parent] || parent}
                                    </button>
                                    {map.get(parent).length > 0 && (
                                        <button
                                            type="button"
                                            className="px-2 text-gray-400 hover:text-gray-600"
                                            onClick={(e) => { e.stopPropagation(); setExpanded(expanded === parent ? null : parent); }}
                                        >
                                            {expanded === parent ? '▾' : '▸'}
                                        </button>
                                    )}
                                </div>
                                {expanded === parent && map.get(parent).length > 0 && (
                                    <div className="ml-4 border-l pl-2 bg-white">
                                        {map.get(parent).map(subObj => (
                                            <div
                                                key={subObj.value}
                                                className={`px-2 py-1 text-xs ${value === subObj.value ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'} cursor-pointer`}
                                                onClick={() => { onChange(subObj.value); setOpen(false); setExpanded(null); }}
                                            >
                                                {subObj.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    const intakeYearOptions = React.useMemo(() => {
        const years = new Set()
            ; (getallstudents || []).forEach(s => {
                const y = getIntakeYearCode(s?.enrolmentNo)
                if (y) years.add(y)
            })

        return Array.from(years)
            .sort()
            .map(y => ({
                value: y,
                label: String(y).length === 2 ? `20${y}` : String(y)
            }))
    }, [getallstudents])

    const studyYearOptions = [
        { label: 'All Years', value: '' },
        { label: '1st Year', value: '1st Year' },
        { label: '2nd Year', value: '2nd Year' },
        { label: '3rd Year', value: '3rd Year' },
        { label: '4th Year', value: '4th Year' },
    ]

    const [allhostels, setAllHostels] = useState([])
    const [selectedHostel, setSelectedHostel] = useState('')
    const [selectedStudents, setSelectedStudents] = useState(new Set())
    const [selectAllVisible, setSelectAllVisible] = useState(false)
    const [selectCount, setSelectCount] = useState('Custom')
    const [customSelect, setCustomSelect] = useState('')

    useEffect(() => {
        axios.get(import.meta.env.VITE_APP_API + '/eligibility/eligible-for-assignment?includeAll=true', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const students = (res.data.Result || []).filter(student => student.assignmentStatus !== 'Assigned')
                setgetallstudents(students)
                setFilteredStudents(students)
            })
            .catch(err => console.log(err))
    }, [token])

    // Fetch the saved Excel import list from DB
    useEffect(() => {
        axios.get(import.meta.env.VITE_APP_API + '/eligibility/get-excel-import', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const list = res.data.Result
                if (list && list.enrolmentNumbers && list.enrolmentNumbers.length > 0) {
                    setImportedFilter(list.enrolmentNumbers)
                    setImportInfo(list)
                } else {
                    setImportedFilter(null)
                    setImportInfo(null)
                }
            })
            .catch(() => {
                setImportedFilter(null)
                setImportInfo(null)
            })
    }, [token])

    useEffect(() => {
        axios.get(import.meta.env.VITE_APP_API + '/hostel/get-all-hostels', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => setAllHostels(Array.isArray(res.data.Result) ? res.data.Result : []))
            .catch(err => {
                setAllHostels([])
                console.error("Failed to fetch hostels:", err)
            })
    }, [token])

    useEffect(() => {
        let filtered = Array.isArray(getallstudents) ? [...getallstudents] : []

        if (importedFilter !== null && importedFilter !== undefined) {
            const importSet = new Set(importedFilter)
            filtered = filtered.filter(student => importSet.has(student.enrolmentNo))
        } else if (importedFilter === null) {
            // No DB list saved — show all eligible students normally
            // filtered stays as is
        }

        if (filters.search.trim() !== '') {
            const searchTerm = filters.search.toLowerCase()
            filtered = filtered.filter(student =>
            (student.enrolmentNo?.toLowerCase().includes(searchTerm) ||
                student.nic?.toLowerCase().includes(searchTerm) ||
                getStudentHomeTown(student)?.toLowerCase().includes(searchTerm))
            )
        }

        if (filters.distance.trim() !== '') {
            const distNum = Number(filters.distance)
            if (!isNaN(distNum)) {
                filtered = filtered.filter(student => Number(student.distance) >= distNum)
            }
        }

        if (filters.gender !== '') {
            filtered = filtered.filter(student => student.sex === filters.gender)
        }

        if (filters.intakeYear !== '') {
            filtered = filtered.filter(student => getIntakeYearCode(student.enrolmentNo) === filters.intakeYear)
        }

        if (filters.studyYear !== '') {
            filtered = filtered.filter(student => (student.studyYear || '1st Year') === filters.studyYear)
        }

        if (filters.department !== '') {
            filtered = filtered.filter(student => {
                let matchesDepartment = false
                if (filters.department.startsWith('MAIN:')) {
                    const mainCode = filters.department.slice(5)
                    matchesDepartment = getMainDept(student.enrolmentNo) === mainCode
                } else if (filters.department.startsWith('SUB:')) {
                    const subCode = filters.department.slice(4)
                    matchesDepartment = getSubDept(student.enrolmentNo) === subCode
                } else if (filters.department.startsWith('SUBSHORT:')) {
                    const mainCode = filters.department.slice(9)
                    const parts = (student.enrolmentNo || '').split('/').filter(Boolean)
                    matchesDepartment = getMainDept(student.enrolmentNo) === mainCode && parts.length === 3
                } else {
                    matchesDepartment = getMainDept(student.enrolmentNo) === filters.department || getSubDept(student.enrolmentNo) === filters.department
                }
                return matchesDepartment
            })
        }

        filtered = filtered.sort((a, b) => Number(b.distance || 0) - Number(a.distance || 0))

        setFilteredStudents(filtered)
    }, [filters, getallstudents, importedFilter])

    const visibleStudents = filteredStudents

    useEffect(() => {
        const allSelected = visibleStudents.length > 0 && visibleStudents.every(s => selectedStudents.has(s._id))
        setSelectAllVisible(allSelected)
    }, [visibleStudents, selectedStudents])

    const handleFilterChange = (e) => {
        setFilters(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleCheckboxChange = (studentId) => {
        setSelectedStudents(prev => {
            const newSelected = new Set(prev)
            if (newSelected.has(studentId)) {
                newSelected.delete(studentId)
            } else {
                newSelected.add(studentId)
            }
            return newSelected
        })
    }

    const handleSelectAllChange = (e) => {
        const checked = e.target.checked
        setSelectedStudents(prev => {
            const newSelected = new Set(prev)
            visibleStudents.forEach(s => {
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
        setCustomSelect('')
        setSelectedStudents(new Set())
        setSelectAllVisible(false)
    }

    const handleCustomSelectChange = (e) => {
        const v = e.target.value.replace(/[^0-9]/g, '')
        setCustomSelect(v)

        if (!v) {
            setSelectedStudents(new Set())
            setSelectAllVisible(false)
            return
        }

        let numToSelect = Number(v)
        numToSelect = Math.min(numToSelect, visibleStudents.length)

        let selectedArray = []
        if (selectCount === 'Random') {
            const shuffled = [...visibleStudents].sort(() => 0.5 - Math.random())
            selectedArray = shuffled.slice(0, numToSelect)
        } else {
            selectedArray = visibleStudents.slice(0, numToSelect)
        }

        const ids = selectedArray.map(s => s._id)
        setSelectedStudents(new Set(ids))
        setSelectAllVisible(ids.length >= visibleStudents.length && visibleStudents.length > 0)
    }

    const handleHostelChange = (e) => {
        setSelectedHostel(e.target.value)
    }

    const handleAssignSubmit = () => {
        if (!selectedHostel) {
            alert('Please select a hostel first.')
            return
        }

        if (selectedStudents.size === 0) {
            alert('Please select at least one student.')
            return
        }

        const hostelObj = (Array.isArray(allhostels) ? allhostels : []).find(x => x._id === selectedHostel)
        const availableCap = hostelObj ? Number(hostelObj.availableCapacity) || 0 : 0

        let finalStudentIds = Array.from(selectedStudents)
        let skipped = 0
        let assignedCount = finalStudentIds.length

        if (finalStudentIds.length > availableCap) {
            assignedCount = availableCap
            skipped = finalStudentIds.length - availableCap
            finalStudentIds = finalStudentIds.slice(0, availableCap)
        }

        if (finalStudentIds.length === 0) {
            alert('This hostel is currently FULL. No students can be assigned.')
            return
        }

        const payload = {
            hostelId: selectedHostel,
            studentIds: finalStudentIds,
        }

        axios.post(import.meta.env.VITE_APP_API + '/hostel/assign-students', payload, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(() => {
                if (skipped > 0) {
                    alert(`Assignment Summary:\n\nAvailable Capacity: ${availableCap}\nAssigned Students: ${assignedCount}\nSkipped Students: ${skipped}\n\nNote: The remaining ${skipped} students were skipped because the hostel reached full capacity.`)
                } else {
                    alert('Students assigned successfully!')
                }

                setSelectedStudents(new Set())
                axios.get(import.meta.env.VITE_APP_API + '/eligibility/eligible-for-assignment?includeAll=true', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                    .then(res => {
                        const students = (res.data.Result || []).filter(student => student.assignmentStatus !== 'Assigned')
                        setgetallstudents(students)
                        setFilteredStudents(students)
                    })
            })
            .catch(err => {
                console.error(err)
                alert('Failed to assign students. Please try again.')
            })
    }


    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <h1 className="font-bold text-[#6b0f14] text-xl">Assign Students to Hostels</h1>
            </div>

            {/* Excel Import Filter Status Banner */}
            {importedFilter === undefined ? (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400">
                    Loading import list...
                </div>
            ) : importInfo ? (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-center justify-between gap-4">
                    <span>
                        <strong>Filtered by Excel Import:</strong> Showing <strong>{importedFilter.length}</strong> eligible students from the imported list (uploaded on {new Date(importInfo.importedAt).toLocaleString()}).
                        &nbsp;Go to <strong>Assign via Excel</strong> to change or clear the list.
                    </span>
                </div>
            ) : (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                    No Excel import filter active — showing all eligible unassigned students. Use <strong>Assign via Excel</strong> to filter by an uploaded list.
                </div>
            )}

            <div className="flex flex-wrap lg:flex-nowrap gap-3 mt-4 w-full pb-2">
                <div className="flex-grow min-w-[220px]">
                    <DefaultInput
                        label="Search Enrolment No / NIC"
                        name="search"
                        value={filters.search}
                        onChange={handleFilterChange}
                        placeholder="Enter enrolment or NIC"
                    />
                </div>

                <DepartmentTree
                    map={parentSubMap}
                    value={filters.department}
                    onChange={(val) => setFilters(prev => ({ ...prev, department: val }))}
                />

                <div className="min-w-[130px] shrink-0">
                    <Dropdown
                        label="Gender"
                        name="gender"
                        value={filters.gender}
                        onChange={handleFilterChange}
                        options={[
                            { label: 'Male', value: 'Male' },
                            { label: 'Female', value: 'Female' },
                            { label: 'REV', value: 'REV' },
                        ]}
                    />
                </div>

                <div className="min-w-[130px] shrink-0">
                    <Dropdown
                        label="Intake Year"
                        name="intakeYear"
                        value={filters.intakeYear}
                        onChange={handleFilterChange}
                        options={intakeYearOptions}
                    />
                </div>

                <div className="min-w-[130px] shrink-0">
                    <Dropdown
                        label="Study Year"
                        name="studyYear"
                        value={filters.studyYear}
                        onChange={handleFilterChange}
                        options={studyYearOptions}
                    />
                </div>

                <div className="min-w-[130px] shrink-0">
                    <DefaultInput
                        label="Distance ≥"
                        type="number"
                        name="distance"
                        value={filters.distance}
                        onChange={handleFilterChange}
                        placeholder="Enter minimum distance"
                        min="0"
                    />
                </div>
            </div>

            <div className="w-full max-w-2xl mt-2">
                <Dropdown
                    label="Select Hostel"
                    name="hostel"
                    value={selectedHostel}
                    onChange={handleHostelChange}
                    options={(Array.isArray(allhostels) ? allhostels : []).map(h => ({
                        label: `${h.name} (${h.gender || '?'}) — ${h.isFull ? 'FULL' : `${h.availableCapacity ?? '?'} available`}`,
                        value: h._id
                    }))}
                />
                {selectedHostel && (() => {
                    const h = (Array.isArray(allhostels) ? allhostels : []).find(x => x._id === selectedHostel)
                    if (!h) return null
                    const pct = Number(h.occupancyPercentage) || 0
                    const barColor = pct >= 100 ? 'bg-red-600' : pct >= 80 ? 'bg-orange-500' : 'bg-[#6b0f14]'
                    const textColor = pct >= 100 ? 'text-red-700' : pct >= 80 ? 'text-orange-700' : 'text-green-700'
                    return (
                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-gray-600">Assigned: <strong className="text-gray-800">{h.assignedStudents ?? 0}</strong></span>
                                <span className="text-gray-600">Capacity: <strong className="text-gray-800">{h.totalCapacity ?? 0}</strong></span>
                                {h.isFull ? (
                                    <span className="font-semibold text-red-700">Available: <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">FULL</span></span>
                                ) : (
                                    <span className={`font-semibold ${textColor}`}>Available: {h.availableCapacity ?? 0}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                                <div className="w-full bg-gray-200 rounded-full h-2 max-w-[160px]">
                                    <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                                </div>
                                <span className="text-xs font-semibold whitespace-nowrap">{pct}%</span>
                            </div>
                        </div>
                    )
                })()}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[#6b0f14] focus:ring-2 focus:ring-[#6b0f14]/30 transition" checked={selectAllVisible} onChange={handleSelectAllChange} />
                        <span className="text-sm font-medium text-gray-700">Select All</span>
                    </label>

                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Select rows:</label>
                        <select value={selectCount} onChange={handleSelectCountChange} className="border px-2 py-1.5 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 transition w-24 bg-white">
                            <option value="Custom">Custom</option>
                            <option value="Random">Random</option>
                        </select>
                        <input type="number" min="1" value={customSelect} onChange={handleCustomSelectChange} placeholder="Amount" className="border px-2 py-1.5 text-sm rounded-md w-20 focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 transition bg-white" />
                        {selectCount === 'Random' && (
                            <button onClick={() => handleCustomSelectChange({ target: { value: customSelect } })} className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-2 py-1.5 rounded-md text-sm font-medium transition">
                                Reroll
                            </button>
                        )}
                    </div>
                </div>

                <div className="w-full sm:w-auto flex justify-end">
                    <button
                        onClick={handleAssignSubmit}
                        className="w-full sm:w-auto bg-gradient-to-r from-[#6b0f14] to-[#4f0a0f] text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-[#520b0f] transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-[#6b0f14]/25"
                        disabled={!selectedHostel || selectedStudents.size === 0}
                    >
                        Assign Selected Students
                    </button>
                </div>
            </div>

            <div className="mt-3 w-full flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                    <span>Filtered: <strong className="text-gray-900">{filteredStudents.length}</strong></span>
                    <span>Total: <strong className="text-gray-900">{getallstudents.length}</strong></span>
                    <span>Selected: <strong className="text-[#6b0f14]">{selectedStudents.size}</strong></span>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl shadow-lg mt-4 w-full border border-gray-100">
                <table className="w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                        <tr>
                            <th className="px-4 py-4 font-semibold text-center w-12">Select</th>
                            <th className="px-4 py-4 font-semibold text-center w-12">#</th>
                            <th className="px-6 py-4 font-semibold whitespace-nowrap">Enrolment No</th>
                            <th className="px-6 py-4 font-semibold whitespace-nowrap">Study Year</th>
                            <th className="px-6 py-4 font-semibold whitespace-nowrap">Gender</th>
                            <th className="px-6 py-4 font-semibold whitespace-nowrap">Home Town</th>
                            <th className="px-6 py-4 font-semibold whitespace-nowrap">Distance</th>
                            <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Hostel Assigned</th>
                            <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {
                            visibleStudents.length > 0 ? (
                                visibleStudents.map((data, index) => (
                                    <tr
                                        key={data._id}
                                        onClick={() => handleCheckboxChange(data._id)}
                                        className={`transition-all duration-150 cursor-pointer ${selectedStudents.has(data._id)
                                            ? 'bg-[#fdf6e3] text-[#3a0709]'
                                            : 'hover:bg-[#fefaf0]'
                                            }`}
                                    >
                                        <td className="px-4 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.has(data._id)}
                                                onChange={(e) => {
                                                    e.stopPropagation()
                                                    handleCheckboxChange(data._id)
                                                }}
                                                disabled={data.isAssign}
                                                className="h-4 w-4 rounded border-gray-300 text-[#6b0f14] focus:ring-[#6b0f14]"
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-center font-medium text-gray-800">{index + 1}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{data.enrolmentNo}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                                                {data.studyYear || '1st Year'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {data.sex === 'Male' ? (
                                                <span className="inline-flex uppercase bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-2.5 py-1 rounded-full items-center">
                                                    <FaMale className='h-3.5 w-auto mr-1' /> Male
                                                </span>
                                            ) : data.sex === 'Female' ? (
                                                <span className="inline-flex uppercase bg-pink-100 text-pink-700 text-xs font-semibold px-2.5 py-1 rounded-full items-center">
                                                    <FaFemale className='h-3.5 w-auto mr-1' /> Female
                                                </span>
                                            ) : (
                                                <span className="inline-flex uppercase bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-full items-center">
                                                    <FaUserTie className='h-3.5 w-auto mr-1' /> {data.sex || 'REV'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{getStudentHomeTown(data)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">{data.distance ? `${data.distance} Km` : '—'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="uppercase bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                                                Not Assigned
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <Link
                                                to={`/Dashboard/View-Student/${data._id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="px-3 py-1 text-xs font-semibold text-[#6b0f14] bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500">No matching records found.</td>
                                </tr>
                            )
                        }
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default HostelAssign
