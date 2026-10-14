import axios from 'axios'
import React, { useEffect, useState, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { X } from 'lucide-react'

import DefaultInput from '../../components/Form/DefaultInput'
import { FaFemale, FaMale, FaUserTie } from 'react-icons/fa'
import Dropdown from '../../components/Form/Dropdown'
import ActionButtons from '../../components/Buttons/ActionButtons'

const DEPARTMENT_MAP = {
    A: 'Arts',
    LLB: 'Law',
    GIS: 'Geographical Science',
    SW: 'Social Work',
}

const AllStudents = () => {
    const navigate = useNavigate()
    const [allstds, setAllStds] = useState([])
    const [filteredStudents, setFilteredStudents] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [allHostels, setAllHostels] = useState([])

    const [sortOrder, setSortOrder] = useState('asc') // 'asc' or 'desc' for enrolmentNo
    const [assignmentStatus, setAssignmentStatus] = useState('All')
    const [minDistance, setMinDistance] = useState('')
    const [maxDistance, setMaxDistance] = useState('')
    const [genderFilter, setGenderFilter] = useState('')
    const [departmentFilter, setDepartmentFilter] = useState('')
    const [yearFilter, setYearFilter] = useState('')
    const [assignedYearFilter, setAssignedYearFilter] = useState('')
    const [hostelFilter, setHostelFilter] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [showPreviewModal, setShowPreviewModal] = useState(false)
    const [previewData, setPreviewData] = useState(null)
    const recordsPerPage = 15
    const token = localStorage.getItem('login')

    // Edit modal state
    const [editingStudent, setEditingStudent] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [editLoading, setEditLoading] = useState(false)
    const [editError, setEditError] = useState('')
    const [editSuccess, setEditSuccess] = useState('')

    // Bulk delete modal state
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
    const [bulkFilters, setBulkFilters] = useState({ faculty: '', batch: '', gender: '', assignmentStatus: '', hostel: '' })
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const [bulkDeleteResult, setBulkDeleteResult] = useState(null) // { deleted, failed }

    const handleOpenEditModal = (student) => {
        setEditingStudent(student)
        setEditForm({
            name: student.name || '',
            nic: student.nic || '',
            enrolmentNo: student.enrolmentNo || '',
            alDistrict: student.alDistrict || '',
            address1: student.address1 || '',
            address2: student.address2 || '',
            address3: student.address3 || '',
            fullAddress: student.fullAddress || '',
            intake: student.intake || '',
            dateOfEnrolment: student.dateOfEnrolment ? student.dateOfEnrolment.split('T')[0] : '',
            distance: student.distance || '',
            sex: student.sex || '',
        })
        setEditError('')
        setEditSuccess('')
    }

    const handleSaveStudentEdit = async (e) => {
        e.preventDefault()
        setEditLoading(true)
        setEditError('')
        setEditSuccess('')
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_APP_API}/student/update-Student/${editingStudent._id}`,
                editForm,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            if (res.data.Status === 'Success') {
                setEditSuccess('Student updated successfully!')
                const updated = { ...editingStudent, ...editForm }
                setAllStds(prev => prev.map(s => s._id === editingStudent._id ? updated : s))
                setFilteredStudents(prev => prev.map(s => s._id === editingStudent._id ? updated : s))
                setTimeout(() => setEditingStudent(null), 1000)
            } else {
                setEditError(res.data.Error || 'Failed to update student.')
            }
        } catch (err) {
            setEditError('Error updating student. Please try again.')
        } finally {
            setEditLoading(false)
        }
    }

    const isStudentAssigned = (student) => {
        return student?.isAssign === true || Boolean(student?.hostelId || student?.hostelName)
    }

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

    // Bulk delete: compute students matching the modal filters
    const bulkDeleteMatches = React.useMemo(() => {
        return (Array.isArray(allstds) ? allstds : []).filter(s => {
            const mainDept = getMainDept(s.enrolmentNo || '')
            const batch = getYear(s.enrolmentNo || '')
            const matchFaculty = !bulkFilters.faculty || mainDept === bulkFilters.faculty
            const matchBatch = !bulkFilters.batch || batch === bulkFilters.batch
            const matchGender = !bulkFilters.gender || (s.sex && s.sex.trim().toLowerCase() === bulkFilters.gender.trim().toLowerCase())
            const assigned = isStudentAssigned(s)
            const matchAssign =
                !bulkFilters.assignmentStatus ||
                bulkFilters.assignmentStatus === 'All' ||
                (bulkFilters.assignmentStatus === 'Assigned' ? assigned : !assigned)
            const matchHostel = !bulkFilters.hostel || s.hostelId === bulkFilters.hostel
            return matchFaculty && matchBatch && matchGender && matchAssign && matchHostel
        })
    }, [allstds, bulkFilters])

    const handleBulkDelete = async () => {
        if (bulkDeleteMatches.length === 0) return
        setBulkDeleting(true)
        setBulkDeleteResult(null)
        let deleted = 0
        let failed = 0
        const idsToDelete = new Set(bulkDeleteMatches.map(s => s._id))
        for (const s of bulkDeleteMatches) {
            try {
                const res = await axios.delete(
                    `${import.meta.env.VITE_APP_API}/student/delete-student/${s._id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                if (res.data.Status === 'Success') deleted++
                else failed++
            } catch { failed++ }
        }
        setAllStds(prev => prev.filter(s => !idsToDelete.has(s._id)))
        setFilteredStudents(prev => prev.filter(s => !idsToDelete.has(s._id)))
        setBulkDeleting(false)
        setBulkDeleteResult({ deleted, failed })
        setBulkFilters({ faculty: '', batch: '', gender: '', assignmentStatus: '', hostel: '' })
    }

    const openBulkDeleteModal = () => {
        setBulkFilters({ faculty: '', batch: '', gender: '', assignmentStatus: '', hostel: '' })
        setBulkDeleteResult(null)
        setShowBulkDeleteModal(true)
    }



    useEffect(() => {
        axios
            .get(import.meta.env.VITE_APP_API + '/student/get-all-students-auth', {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => {
                const students = Array.isArray(res.data.Result) ? res.data.Result : []
                setAllStds(students)
                setFilteredStudents(students)
            })
            .catch(err => {
                setAllStds([])
                setFilteredStudents([])
                console.error('Failed to fetch students:', err)
            })
    }, [token])

    useEffect(() => {
        axios
            .get(import.meta.env.VITE_APP_API + '/hostel/get-all-hostels', {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => setAllHostels(Array.isArray(res.data.Result) ? res.data.Result : []))
            .catch(err => {
                setAllHostels([])
                console.error('Failed to fetch hostels:', err)
            })
    }, [token])

    const hostelOptions = React.useMemo(() => {
        const opts = (allHostels || [])
            .filter(h => h && h._id)
            .map(h => ({ value: h._id, label: h.name || h.hostelID || 'Hostel' }))
            .sort((a, b) => (a.label || '').localeCompare((b.label || ''), undefined, { sensitivity: 'base' }))
        return [{ value: '', label: 'All Hostels' }, ...opts]
    }, [allHostels])

    // parent -> Array of sub objects { value, label, type }
    const parentSubMap = React.useMemo(() => {
        const m = new Map()
            ; (Array.isArray(allstds) ? allstds : []).forEach(s => {
                const enrol = s.enrolmentNo || ''
                const main = getMainDept(enrol)
                const parts = enrol.split('/').filter(Boolean)
                const explicitSub = parts.length >= 4 ? parts[2] : ''
                if (!main) return
                if (!m.has(main)) m.set(main, new Map())

                // explicit sub
                if (explicitSub && explicitSub !== main) m.get(main).set(`SUB:${explicitSub}`, { value: `SUB:${explicitSub}`, label: `${explicitSub}`, type: 'sub' })

                // short-format (3 parts) -> represent as SUBSHORT
                if (parts.length === 3) m.get(main).set(`SUBSHORT:${main}`, { value: `SUBSHORT:${main}`, label: `${main}`, type: 'short' })
            })

        // convert inner maps to arrays
        const out = new Map()
        for (const [k, innerMap] of m.entries()) {
            const arr = Array.from(innerMap.values())
            // sort by type priority: short -> sub -> main, then label
            const priority = t => (t === 'short' ? 0 : t === 'sub' ? 1 : 2)
            arr.sort((a, b) => {
                const p = priority(a.type) - priority(b.type)
                return p !== 0 ? p : a.label.localeCompare(b.label)
            })
            out.set(k, arr)
        }
        return out
    }, [allstds])

    const yearOptions = React.useMemo(() => {
        const set = new Set(allstds.map(s => getYear(s.enrolmentNo)))
        return [{ value: '', label: 'All' }, ...Array.from(set).sort().map(y => ({ value: y, label: `20${y}` }))]
    }, [allstds])

    const assignedYearOptions = React.useMemo(() => {
        const set = new Set(
            allstds
                .filter(s => s.hostelAssignedDate)
                .map(s => new Date(s.hostelAssignedDate).getFullYear().toString())
        )
        return [{ value: '', label: 'All' }, ...Array.from(set).sort().map(y => ({ value: y, label: y }))]
    }, [allstds])



    const DepartmentTree = ({ map, value, onChange }) => {
        const [open, setOpen] = useState(false)
        const [expanded, setExpanded] = useState(null)
        const rootRef = useRef(null)

        const displayLabelForValue = (val) => {
            if (!val) return ''
            if (val.startsWith('MAIN:')) return DEPARTMENT_MAP[val.slice(5)] || `${val.slice(5)} (main)`
            if (val.startsWith('SUB:')) return val.slice(4)
            if (val.startsWith('SUBSHORT:')) return val.slice(9)
            return DEPARTMENT_MAP[val] || val
        }

        // close when clicking outside
        useEffect(() => {
            function handleClick(e) {
                if (open && rootRef.current && !rootRef.current.contains(e.target)) {
                    setOpen(false)
                    setExpanded(null)
                }
            }
            document.addEventListener('mousedown', handleClick)
            document.addEventListener('touchstart', handleClick)
            return () => {
                document.removeEventListener('mousedown', handleClick)
                document.removeEventListener('touchstart', handleClick)
            }
        }, [open])

        return (
            <div className="w-32 relative mb-5" ref={rootRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                <div className="">
                    <div
                        role="button"
                        tabIndex={0}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-500 transition flex justify-between items-center cursor-pointer"
                        onClick={() => setOpen(o => { const next = !o; if (!next) setExpanded(null); return next; })}
                    >
                        <span className="truncate text-sm">{value ? displayLabelForValue(value) : 'Select an option'}</span>
                        <span className="text-gray-400">▾</span>
                    </div>

                    {open && (
                        <div className="absolute z-50 -mt-1 w-32 max-h-56 overflow-auto bg-white border rounded shadow-lg transition-opacity duration-200 ring-1 ring-black ring-opacity-5">
                            <div className="px-2 py-1 hover:bg-gray-50 cursor-pointer text-xs" onClick={() => { onChange(''); setOpen(false); setExpanded(null); }}>All Departments</div>
                            {Array.from(map.keys()).sort().map(parent => (
                                <div key={parent}>
                                    <div className={`px-2 py-1 flex justify-between items-center ${map.get(parent).some(s => s.value === value) ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}>
                                        <button
                                            type="button"
                                            className="text-left flex-1 truncate px-2 py-0.5 text-xs"
                                            onClick={() => { setExpanded(expanded === parent ? null : parent); }}
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
                                                <div key={subObj.value} className={`px-2 py-1 text-xs ${value === subObj.value ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'} cursor-pointer`} onClick={() => { onChange(subObj.value); setOpen(false); setExpanded(null); }}>{subObj.label}</div>
                                            ))}
                                        </div>
                                    )}
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

        const filtered = (Array.isArray(allstds) ? allstds : []).filter(student => {
            const matchesSearch =
                student.enrolmentNo?.toLowerCase().includes(term) ||
                student.name?.toLowerCase().includes(term)

            const assigned = isStudentAssigned(student)
            const matchesAssigned =
                assignmentStatus === 'All'
                    ? true
                    : assignmentStatus === 'Assigned'
                        ? assigned
                        : !assigned

            const matchesDistance =
                (minDistance === '' || (student.distance && student.distance >= Number(minDistance))) &&
                (maxDistance === '' || (student.distance && student.distance <= Number(maxDistance)))

            const matchesGender = genderFilter === '' || (student.sex && student.sex.trim().toLowerCase() === genderFilter.trim().toLowerCase());

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
                // backwards-compatible
                matchesDepartment = getMainDept(student.enrolmentNo) === departmentFilter || getSubDept(student.enrolmentNo) === departmentFilter
            }

            const matchesYear = yearFilter === '' || getYear(student.enrolmentNo) === yearFilter

            const matchesAssignedYear = assignedYearFilter === '' ||
                (student.hostelAssignedDate && new Date(student.hostelAssignedDate).getFullYear().toString() === assignedYearFilter)

            const matchesHostel = hostelFilter === '' || String(student.hostelId || '') === String(hostelFilter)

            return matchesSearch && matchesAssigned && matchesDistance && matchesGender && matchesDepartment && matchesYear && matchesHostel && matchesAssignedYear
        })

        // sort by enrolmentNo (if present)
        filtered.sort((a, b) => {
            const x = (a.enrolmentNo || '').toString();
            const y = (b.enrolmentNo || '').toString();
            return sortOrder === 'asc'
                ? x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' })
                : y.localeCompare(x, undefined, { numeric: true, sensitivity: 'base' })
        })

        setFilteredStudents(filtered)
        setCurrentPage(1)
    }, [searchTerm, allstds, assignmentStatus, minDistance, maxDistance, genderFilter, departmentFilter, yearFilter, hostelFilter, sortOrder, assignedYearFilter])

    const totalPages = Math.ceil(filteredStudents.length / recordsPerPage)
    const paginatedData = filteredStudents.slice(
        (currentPage - 1) * recordsPerPage,
        currentPage * recordsPerPage
    )


    const prepareStudentReport = () => {
        const columns = ['No', 'Enrolment No', 'Student Name', 'Faculty(Department)', 'Batch', 'Study Year', 'Hall Fee']
        const rows = filteredStudents.map((std, idx) => {
            let studyYear = '-'
            if (std.dateOfEnrolment) {
                const currentYear = new Date().getFullYear()
                const enrolYear = new Date(std.dateOfEnrolment).getFullYear()
                studyYear = `Year ${(currentYear - enrolYear) + 1}`
            }

            let batch = '-'
            if (std.enrolmentNo) {
                const parts = std.enrolmentNo.split('/')
                if (parts.length >= 2) {
                    batch = `${parts[0]}/${parts[1]}`.toUpperCase()
                }
            }

            const mainDeptCode = getMainDept(std.enrolmentNo)
            const mainDept = DEPARTMENT_MAP[mainDeptCode] || mainDeptCode || '-'

            return [
                idx + 1,
                std.enrolmentNo || '-',
                std.name || '-',
                mainDept,
                batch,
                studyYear,
                std.hallFee ? std.hallFee : '..........'
            ]
        })

        const totalRow = ['Total', `${filteredStudents.length} Students`, '', '', '', '', '']

        setPreviewData({
            reportId: 'students',
            title: 'Student List',
            headers: [
                'UNIVERSITY OF PERADENIYA',
                'STUDENT LIST REPORT',
                `Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
            ],
            columns,
            rows,
            totalRow,
            fileName: 'Student_List_Report'
        })
        setShowPreviewModal(true)
    }

    const handlePreviewHeaderEdit = (index, value) => {
        setPreviewData(prev => {
            const newHeaders = [...prev.headers]
            newHeaders[index] = value
            return { ...prev, headers: newHeaders }
        })
    }

    const handlePreviewCellEdit = (rowIdx, colIdx, value) => {
        setPreviewData(prev => {
            const newRows = prev.rows.map(r => [...r])
            newRows[rowIdx][colIdx] = value
            return { ...prev, rows: newRows }
        })
    }

    const handlePreviewTotalEdit = (colIdx, value) => {
        setPreviewData(prev => {
            const newTotal = [...prev.totalRow]
            newTotal[colIdx] = value
            return { ...prev, totalRow: newTotal }
        })
    }

    const previewColumnWidths = useMemo(() => {
        if (!previewData) return []
        return previewData.columns.map((col, i) => {
            let maxLen = String(col ?? '').length
            previewData.rows.forEach(r => {
                const len = String(r[i] ?? '').length
                if (len > maxLen) maxLen = len
            })
            if (previewData.totalRow) {
                const len = String(previewData.totalRow[i] ?? '').length
                if (len > maxLen) maxLen = len
            }
            return Math.min(Math.max(maxLen * 7 + 16, 50), 260)
        })
    }, [previewData])

    const exportStudentExcel = async (data) => {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet(data.title)
        const colCount = data.columns.length

        // Headers
        data.headers.forEach(line => worksheet.addRow([line]))
        worksheet.addRow([])

        // Column headers
        const headerRowStart = worksheet.rowCount + 1
        worksheet.addRow(data.columns)

        // Data rows
        data.rows.forEach(row => worksheet.addRow(row))
        if (data.totalRow) worksheet.addRow(data.totalRow)

        // Merge title rows
        data.headers.forEach((_, i) => worksheet.mergeCells(i + 1, 1, i + 1, colCount))

        // Auto column widths
        data.columns.forEach((col, i) => {
            let maxLen = String(col ?? '').length
            data.rows.forEach(r => {
                const len = String(r[i] ?? '').length
                if (len > maxLen) maxLen = len
            })
            if (data.totalRow) {
                const len = String(data.totalRow[i] ?? '').length
                if (len > maxLen) maxLen = len
            }
            worksheet.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 4), 35)
        })

        // Styling
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                }
                if (rowNumber === 1) {
                    cell.font = { name: 'Calibri', size: 14, bold: true }
                    cell.alignment = { vertical: 'middle', horizontal: 'center' }
                } else if (rowNumber === headerRowStart) {
                    cell.font = { name: 'Calibri', size: 11, bold: true }
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
                } else if (rowNumber === worksheet.rowCount && data.totalRow) {
                    cell.font = { name: 'Calibri', size: 11, bold: true }
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
                } else {
                    cell.font = { name: 'Calibri', size: 11 }
                    if (typeof cell.value === 'number') {
                        cell.alignment = { vertical: 'middle', horizontal: 'right' }
                    } else {
                        cell.alignment = { vertical: 'middle', horizontal: 'left' }
                    }
                }
            })
        })

        const buffer = await workbook.xlsx.writeBuffer()
        saveAs(new Blob([buffer]), `${data.fileName}.xlsx`)
    }

    return (<>
        <div className="mt-8">
            <div className="mb-4 flex flex-wrap items-center gap-6">
                <DefaultInput
                    label="Search by Enrolment No"
                    name="search"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Enter search term..."
                    className="w-full"
                />


                <div className="w-32">
                    <DepartmentTree map={parentSubMap} value={departmentFilter} onChange={setDepartmentFilter} />
                </div>

                <Dropdown
                    inline
                    label="Intake Year"
                    name="yearFilter"
                    value={yearFilter}
                    onChange={e => setYearFilter(e.target.value)}
                    options={yearOptions}
                    className="w-32"
                />

                <Dropdown
                    inline
                    label="Assignment Status"
                    name="assignmentStatus"
                    value={assignmentStatus}
                    onChange={e => setAssignmentStatus(e.target.value)}
                    options={[
                        { value: 'All', label: 'All' },
                        { value: 'Assigned', label: 'Assigned' },
                        { value: 'Unassigned', label: 'Unassigned' },
                    ]}
                    className="w-32"
                />

                <Dropdown
                    inline
                    label="Assigned Year"
                    name="assignedYearFilter"
                    value={assignedYearFilter}
                    onChange={e => setAssignedYearFilter(e.target.value)}
                    options={assignedYearOptions}
                    className="w-32"
                />

                <Dropdown
                    inline
                    label="Hostel"
                    name="hostelFilter"
                    value={hostelFilter}
                    onChange={e => setHostelFilter(e.target.value)}
                    options={hostelOptions}
                    className="w-44"
                />

                <DefaultInput
                    label="Min Distance (Km)"
                    name="minDistance"
                    type="number"
                    min="0"
                    value={minDistance}
                    onChange={e => setMinDistance(e.target.value)}
                    placeholder="Enter minimum distance"
                    className="w-full"
                />

                <DefaultInput
                    label="Max Distance (Km)"
                    name="maxDistance"
                    type="number"
                    min="0"
                    value={maxDistance}
                    onChange={e => setMaxDistance(e.target.value)}
                    placeholder="Enter maximum distance"
                    className="w-full"
                />

                <Dropdown
                    inline
                    label="Gender"
                    name="genderFilter"
                    value={genderFilter}
                    onChange={e => setGenderFilter(e.target.value)}
                    options={[
                        { value: '', label: 'All' },
                        { value: 'Male', label: 'Male' },
                        { value: 'Female', label: 'Female' },
                        { value: 'REV', label: 'REV' },
                    ]}
                    className="w-28"
                />


                <button
                    onClick={prepareStudentReport}
                    className="bg-[#6b0f14] text-white px-6 py-2 rounded hover:bg-[#4f0a0f]"
                >
                    Preview & Export Report
                </button>

                <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="bg-[#d4af37] text-[#6b0f14] px-6 py-2 rounded hover:bg-[#c59a3a] font-semibold"
                >
                    Sort Enrolment {sortOrder === 'asc' ? '↑' : '↓'}
                </button>

                <button
                    onClick={openBulkDeleteModal}
                    className="bg-red-700 text-white px-6 py-2 rounded hover:bg-red-800 font-semibold flex items-center gap-2"
                >
                    🗑 Bulk Delete
                </button>
            </div>

            <div className="overflow-x-auto rounded-2xl shadow-lg">
                <table className="min-w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="text-xs uppercase bg-[#fdf6e3] text-[#6b0f14]">
                        <tr>
                            <th className="px-6 py-4">#</th>
                            <th className="px-6 py-4">Enrolment No</th>
                            <th className="px-6 py-4">Study Year</th>
                            <th className="px-6 py-4">Gender</th>
                            <th className="px-6 py-4">Home Town</th>
                            <th className="px-6 py-4">Distance</th>
                            <th className="px-6 py-4">Hostel Assigned</th>
                            <th className="px-6 py-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((data, index) => (
                                <tr key={index} className="hover:bg-[#fefaf0] transition-all duration-150">
                                    <td className="px-6 py-4 font-medium text-gray-800">
                                        {(currentPage - 1) * recordsPerPage + index + 1}
                                    </td>
                                    <td className="px-6 py-4">{data.enrolmentNo}</td>
                                    <td className="px-6 py-4">
                                        {data.dateOfEnrolment ? `Year ${(new Date().getFullYear() - new Date(data.dateOfEnrolment).getFullYear()) + 1}` : ''}
                                    </td>
                                    <td className="px-6 py-4">
                                        {data.sex === 'Male' ? (
                                            <span className="flex bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-3 py-1 rounded-full gap-1 items-center">
                                                <FaMale className="h-4 w-auto" />
                                                Male
                                            </span>
                                        ) : data.sex === 'Female' ? (
                                            <span className="flex bg-pink-100 text-pink-700 text-xs font-semibold px-3 py-1 rounded-full gap-1 items-center">
                                                <FaFemale className="h-4 w-auto" />
                                                Female
                                            </span>
                                        ) : (
                                            <span className="flex bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full gap-1 items-center">
                                                <FaUserTie className="h-4 w-auto" />
                                                {data.sex || 'REV'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">{data.address3}</td>
                                    <td className="px-6 py-4">{data.distance} Km</td>
                                    <td className="px-6 py-4">
                                        {isStudentAssigned(data) ? (
                                            <span className="bg-[#fdf6e3] text-[#6b0f14] text-xs font-semibold px-3 py-1 rounded-full">
                                                {data.hostelName || 'Assigned'}
                                            </span>
                                        ) : (
                                            <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
                                                Not Assigned
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <ActionButtons
                                            onEdit={() => handleOpenEditModal(data)}
                                            onDelete={async () => {
                                                if (!window.confirm(`Delete student ${data.enrolmentNo}? This action cannot be undone.`)) return;
                                                try {
                                                    const res = await axios.delete(
                                                        `${import.meta.env.VITE_APP_API}/student/delete-student/${data._id}`,
                                                        { headers: { Authorization: `Bearer ${token}` } }
                                                    );
                                                    if (res.data.Status === 'Success') {
                                                        setAllStds(prev => prev.filter(s => s._id !== data._id));
                                                        setFilteredStudents(prev => prev.filter(s => s._id !== data._id));
                                                    } else {
                                                        alert(res.data.Error || res.data.error || 'Failed to delete student');
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                    alert('Error deleting student');
                                                }
                                            }}
                                            editTitle="Edit student details"
                                            deleteTitle="Delete this student"
                                            showLabels={false}
                                        />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                                    No students found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="mt-4 flex justify-center gap-4 text-gray-700">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded border border-gray-300 hover:bg-[#fefaf0] disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="px-3 py-1 font-semibold">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded border border-gray-300 hover:bg-[#fefaf0] disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Student Report Preview Modal */}
            {showPreviewModal && previewData && (
                <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 print-modal-overlay">
                    <style>
                        {`
                            @media print {
                                @page { size: landscape; }
                                body * { visibility: hidden !important; }
                                .print-modal-overlay,
                                .print-modal-overlay * { visibility: visible !important; }
                                .print-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white !important; padding: 0 !important; }
                                .print-modal-container { box-shadow: none !important; border: none !important; max-height: none !important; overflow: visible !important; }
                                .print-hide { display: none !important; }
                                .print-report-area { overflow: visible !important; padding: 20px !important; }
                            }
                        `}
                    </style>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden print-modal-container">
                        {/* Action Bar */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:p-6 border-b bg-gray-50 print-hide">
                            <h2 className="text-xl font-bold text-gray-800">Preview: {previewData.title}</h2>
                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                <button onClick={() => setShowPreviewModal(false)} className="flex-1 md:flex-none px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium whitespace-nowrap text-sm md:text-base">Close</button>
                                <button onClick={() => window.print()} className="flex-1 md:flex-none px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium whitespace-nowrap text-sm md:text-base">Export PDF</button>
                                <button onClick={() => exportStudentExcel(previewData)} className="flex-1 md:flex-none px-4 py-2 bg-[#6b0f14] text-white rounded-lg hover:bg-[#4f0a0f] font-medium whitespace-nowrap text-sm md:text-base">Export Excel</button>
                            </div>
                        </div>

                        {/* Printable Content */}
                        <div className="flex-1 overflow-auto p-8 bg-white print-report-area">
                            <div className="mb-6 font-bold text-lg leading-snug">
                                {previewData.headers.map((line, i) => (
                                    <div key={i}>
                                        <input
                                            type="text"
                                            value={line}
                                            onChange={(e) => handlePreviewHeaderEdit(i, e.target.value)}
                                            className="w-full outline-none bg-transparent font-bold text-lg"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="border-collapse border border-gray-400 text-sm w-full table-fixed">
                                    <colgroup>
                                        {previewColumnWidths.map((w, i) => (
                                            <col key={i} style={{ width: `${w}px` }} />
                                        ))}
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            {previewData.columns.map((col, i) => (
                                                <th key={i} className="border border-gray-400 p-1 font-bold text-left break-words">{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.rows.map((row, rIdx) => (
                                            <tr key={rIdx}>
                                                {row.map((cell, cIdx) => (
                                                    <td key={cIdx} className="border border-gray-400 p-0">
                                                        <input
                                                            type="text"
                                                            value={cell ?? ''}
                                                            onChange={(e) => handlePreviewCellEdit(rIdx, cIdx, e.target.value)}
                                                            title={String(cell ?? '')}
                                                            className="w-full h-full p-1 outline-none bg-transparent"
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {previewData.totalRow && (
                                            <tr className="font-bold bg-gray-50">
                                                {previewData.totalRow.map((cell, cIdx) => (
                                                    <td key={cIdx} className="border border-gray-400 p-0">
                                                        <input
                                                            type="text"
                                                            value={cell ?? ''}
                                                            onChange={(e) => handlePreviewTotalEdit(cIdx, e.target.value)}
                                                            title={String(cell ?? '')}
                                                            className="w-full h-full p-1 outline-none bg-transparent font-bold"
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Edit Student Modal */}
        {editingStudent && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                    {/* Modal Header */}
                    <div className="px-6 py-4 bg-[#6b0f14] text-white flex items-center justify-between flex-shrink-0">
                        <div>
                            <h3 className="font-bold text-lg">Edit Student Details</h3>
                            <p className="text-xs text-[#fdf6e3]/80">{editingStudent.enrolmentNo} — {editingStudent.name}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setEditingStudent(null)}
                            className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Modal Form */}
                    <form onSubmit={handleSaveStudentEdit} className="p-6 space-y-4 overflow-y-auto">
                        {editError && (
                            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg">{editError}</div>
                        )}
                        {editSuccess && (
                            <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-medium">{editSuccess}</div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { key: 'name', label: 'Full Name', type: 'text' },
                                { key: 'nic', label: 'NIC', type: 'text' },
                                { key: 'enrolmentNo', label: 'Enrolment No', type: 'text' },
                                { key: 'alDistrict', label: 'AL District', type: 'text' },
                                { key: 'address1', label: 'Address 1', type: 'text' },
                                { key: 'address2', label: 'Address 2', type: 'text' },
                                { key: 'address3', label: 'Address 3', type: 'text' },
                                { key: 'fullAddress', label: 'Full Address', type: 'text' },
                                { key: 'intake', label: 'Intake', type: 'text' },
                                { key: 'dateOfEnrolment', label: 'Date of Enrolment', type: 'date' },
                                { key: 'distance', label: 'Distance (km)', type: 'number' },
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">{field.label}</label>
                                    <input
                                        type={field.type}
                                        value={editForm[field.key]}
                                        onChange={e => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14]"
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                                <select
                                    value={editForm.sex}
                                    onChange={e => setEditForm(prev => ({ ...prev, sex: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 focus:border-[#6b0f14] bg-white"
                                >
                                    <option value="">-- Select --</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="REV">REV</option>
                                </select>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setEditingStudent(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={editLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#6b0f14] hover:bg-[#7c1119] rounded-lg transition-colors disabled:opacity-50"
                            >
                                {editLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}



        {/* Bulk Delete Modal */}
        {showBulkDeleteModal && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 bg-red-700 text-white flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-base">🗑 Bulk Delete Students</h3>
                            <p className="text-xs text-white/70 mt-0.5">Filter students to delete in bulk</p>
                        </div>
                        <button onClick={() => { setShowBulkDeleteModal(false); setBulkDeleteResult(null) }} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {bulkDeleteResult ? (
                            /* Result view */
                            <div className="text-center py-4">
                                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                                    <span className="text-2xl">✅</span>
                                </div>
                                <p className="font-bold text-gray-800 text-base mb-1">Deletion Complete</p>
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold text-green-700">{bulkDeleteResult.deleted}</span> student{bulkDeleteResult.deleted !== 1 ? 's' : ''} deleted successfully.
                                    {bulkDeleteResult.failed > 0 && <span className="text-red-600 ml-1">{bulkDeleteResult.failed} failed.</span>}
                                </p>
                                <button
                                    onClick={() => { setShowBulkDeleteModal(false); setBulkDeleteResult(null) }}
                                    className="mt-5 px-6 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                                >Close</button>
                            </div>
                        ) : (
                            <>
                                {/* Filter rows */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Faculty */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Faculty</label>
                                        <select
                                            value={bulkFilters.faculty}
                                            onChange={e => setBulkFilters(p => ({ ...p, faculty: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                                        >
                                            <option value="">All Faculties</option>
                                            {Array.from(new Set((allstds || []).map(s => getMainDept(s.enrolmentNo)).filter(Boolean))).sort().map(f => (
                                                <option key={f} value={f}>{DEPARTMENT_MAP[f] || f}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Batch / Intake Year */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Batch (Intake Year)</label>
                                        <select
                                            value={bulkFilters.batch}
                                            onChange={e => setBulkFilters(p => ({ ...p, batch: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                                        >
                                            <option value="">All Batches</option>
                                            {Array.from(new Set((allstds || []).map(s => getYear(s.enrolmentNo)).filter(Boolean))).sort().map(y => (
                                                <option key={y} value={y}>20{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Gender */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Gender</label>
                                        <select
                                            value={bulkFilters.gender}
                                            onChange={e => setBulkFilters(p => ({ ...p, gender: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                                        >
                                            <option value="">All Genders</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="REV">REV</option>
                                        </select>
                                    </div>
                                    {/* Assignment Status */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Assignment Status</label>
                                        <select
                                            value={bulkFilters.assignmentStatus}
                                            onChange={e => setBulkFilters(p => ({ ...p, assignmentStatus: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                                        >
                                            <option value="">All</option>
                                            <option value="Assigned">Assigned</option>
                                            <option value="Unassigned">Unassigned</option>
                                        </select>
                                    </div>
                                    {/* Hostel */}
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Hostel</label>
                                        <select
                                            value={bulkFilters.hostel}
                                            onChange={e => setBulkFilters(p => ({ ...p, hostel: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                                        >
                                            <option value="">All Hostels</option>
                                            {(allHostels || []).map(h => (
                                                <option key={h._id} value={h._id}>{h.name || h.hostelID}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Match preview */}
                                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${bulkDeleteMatches.length === 0 ? 'bg-gray-50 text-gray-500' : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                    <span className="text-2xl font-bold">{bulkDeleteMatches.length}</span>
                                    <span>student{bulkDeleteMatches.length !== 1 ? 's' : ''} match the selected filters and will be deleted.</span>
                                </div>

                                {/* Warning */}
                                {bulkDeleteMatches.length > 0 && (
                                    <p className="text-xs text-gray-500 flex items-start gap-1.5">
                                        <span className="text-amber-500 mt-0.5">⚠</span>
                                        This action is permanent and cannot be undone. All hostel assignments for these students will also be removed.
                                    </p>
                                )}

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-1">
                                    <button
                                        onClick={() => { setShowBulkDeleteModal(false); setBulkDeleteResult(null) }}
                                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >Cancel</button>
                                    <button
                                        onClick={handleBulkDelete}
                                        disabled={bulkDeleteMatches.length === 0 || bulkDeleting}
                                        className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {bulkDeleting ? (
                                            <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Deleting...</>
                                        ) : (
                                            <>🗑 Delete {bulkDeleteMatches.length} Student{bulkDeleteMatches.length !== 1 ? 's' : ''}</>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
    </>)
}

export default AllStudents
