import React, { useEffect, useState } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'

const Spinner = ({ className = 'h-4 w-4' }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
    </svg>
)

const AssignViaExcel = () => {
    const token = localStorage.getItem('login')

    const [allEligible, setAllEligible] = useState([])
    const [currentList, setCurrentList] = useState(null)  // saved list from DB
    const [isImporting, setIsImporting] = useState(false)
    const [isClearing, setIsClearing] = useState(false)
    const [importStats, setImportStats] = useState(null)
    const [rejectedList, setRejectedList] = useState([])
    const [isDragActive, setIsDragActive] = useState(false)
    const [showAllRejected, setShowAllRejected] = useState(false)
    const [previewData, setPreviewData] = useState(null) // New state for preview mode

    // Manual add states
    const [allStudents, setAllStudents] = useState([])
    const [manualEnrolment, setManualEnrolment] = useState('')
    const [manualMessage, setManualMessage] = useState(null)
    const [isManualAdding, setIsManualAdding] = useState(false)

    const fetchSavedList = React.useCallback(async () => {
        try {
            const res = await axios.get(import.meta.env.VITE_APP_API + '/eligibility/get-excel-import', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setCurrentList(res.data.Result)
        } catch (err) {
            console.error('Failed to fetch saved import list:', err)
        }
    }, [token])

    useEffect(() => {
        // Load eligible students for cross-check preview
        axios.get(import.meta.env.VITE_APP_API + '/eligibility/eligible-for-assignment', {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => setAllEligible(res.data.Result || []))
            .catch(err => console.error(err))

        // Load all students to check "Not Found" / "Already Assigned" / "Not Eligible" states
        axios.get(import.meta.env.VITE_APP_API + '/student/get-all-students-auth', {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => setAllStudents(res.data.Result || []))
            .catch(err => console.error(err))

        fetchSavedList()
    }, [token, fetchSavedList])

    const validateEnrolment = (eNo) => {
        if (!eNo) return { status: 'empty', reason: '' }
        if (allEligible.some(s => s.enrolmentNo === eNo)) return { status: 'valid', reason: 'Eligible' }
        const std = allStudents.find(s => s.enrolmentNo === eNo)
        if (!std) return { status: 'not_found', reason: 'Not found in database' }
        if (std.isAssign || std.hostelId) return { status: 'already_assigned', reason: 'Already assigned to hostel' }
        return { status: 'not_eligible', reason: 'Not eligible for assignment' }
    }

    const processFile = (file) => {
        if (!file) return
        setIsImporting(true)
        setImportStats(null)
        setRejectedList([])
        setShowAllRejected(false)

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

                // Detect enrolment column
                let enrolIdx = 0
                const headerRow = (data[0] || [])
                for (let i = 0; i < headerRow.length; i++) {
                    const h = String(headerRow[i] || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                    if (h === 'enrolmentno' || h === 'enrollmentno' || h === 'enrolmentnumber' || h === 'enrollmentnumber') {
                        enrolIdx = i
                        break
                    }
                }

                const hasHeader = (() => {
                    const h = String(headerRow[enrolIdx] || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                    return h === 'enrolmentno' || h === 'enrollmentno'
                })()
                const startRow = hasHeader ? 1 : 0

                const rawEnrols = []
                for (let i = startRow; i < data.length; i++) {
                    const v = data[i][enrolIdx]
                    if (v) rawEnrols.push(String(v).trim())
                }

                const unique = [...new Set(rawEnrols.filter(Boolean))]

                // Create preview items
                const previewItems = unique.map(eNo => {
                    const validation = validateEnrolment(eNo)
                    return {
                        id: Math.random().toString(36).substring(7),
                        original: eNo,
                        current: eNo,
                        ...validation
                    }
                })

                // Set preview data and STOP (do not save to DB yet)
                setPreviewData({
                    fileName: file.name,
                    items: previewItems
                })

            } catch (err) {
                console.error(err)
                alert('Error reading file. Please make sure it is a valid Excel file.')
            } finally {
                setIsImporting(false)
            }
        }
        reader.readAsBinaryString(file)
    }

    const updatePreviewItem = (id, newEnrolment) => {
        setPreviewData(prev => {
            if (!prev) return prev
            const newItems = prev.items.map(item => {
                if (item.id === id) {
                    const validation = validateEnrolment(newEnrolment.trim())
                    return { ...item, current: newEnrolment, ...validation }
                }
                return item
            })
            return { ...prev, items: newItems }
        })
    }

    const confirmImport = async () => {
        if (!previewData) return
        setIsImporting(true)

        // Filter out empty and get unique valid ones
        const validEnrolsRaw = previewData.items
            .filter(item => item.status === 'valid')
            .map(item => item.current.trim())
            .filter(Boolean)

        const matched = [...new Set(validEnrolsRaw)]

        // Collect rejected for the final stats
        const rejected = previewData.items
            .filter(item => item.status !== 'valid' && item.current.trim() !== '')
            .map(item => ({ Enrolment_No: item.current, Reason: item.reason }))

        const notFound = previewData.items.filter(i => i.status === 'not_found').length
        const notEligible = previewData.items.filter(i => i.status === 'not_eligible').length
        const alreadyAssigned = previewData.items.filter(i => i.status === 'already_assigned').length

        try {
            // Save to database
            if (matched.length > 0) {
                await axios.post(import.meta.env.VITE_APP_API + '/eligibility/save-excel-import', {
                    enrolmentNumbers: matched,
                    label: previewData.fileName,
                    append: true
                }, { headers: { Authorization: `Bearer ${token}` } })

                await fetchSavedList()
            }

            // Update stats view
            setImportStats({
                total: previewData.items.length,
                eligible: matched.length,
                notFound,
                notEligible,
                alreadyAssigned
            })
            setRejectedList(rejected)
            setPreviewData(null)

        } catch (err) {
            console.error(err)
            alert('Error saving to database. Please try again.')
        } finally {
            setIsImporting(false)
        }
    }

    const handleImportExcel = (e) => {
        const file = e.target.files[0]
        processFile(file)
        e.target.value = null
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragActive(false)
        if (isImporting) return
        const file = e.dataTransfer.files?.[0]
        processFile(file)
    }

    const handleManualAdd = async () => {
        const enrol = manualEnrolment.trim()
        if (!enrol) return

        setManualMessage(null)
        setIsManualAdding(true)

        try {
            // Check student status
            const std = allStudents.find(s => s.enrolmentNo === enrol)
            if (!std) {
                setManualMessage({ type: 'error', text: 'Student not found in database.' })
                return
            }

            if (std.isAssign || std.hostelId) {
                setManualMessage({ type: 'error', text: 'Student is already assigned to a hostel.' })
                return
            }

            const isEligible = allEligible.some(s => s.enrolmentNo === enrol)
            if (!isEligible) {
                setManualMessage({ type: 'error', text: 'Student is not eligible for assignment.' })
                return
            }

            // Valid student, append to list
            await axios.post(import.meta.env.VITE_APP_API + '/eligibility/save-excel-import', {
                enrolmentNumbers: [enrol],
                label: 'Manual Add',
                append: true // always append for manual add
            }, { headers: { Authorization: `Bearer ${token}` } })

            setManualMessage({ type: 'success', text: `${enrol} added to the queue.` })
            setManualEnrolment('')
            await fetchSavedList()

        } catch (err) {
            console.error(err)
            setManualMessage({ type: 'error', text: 'Failed to add student. Please try again.' })
        } finally {
            setIsManualAdding(false)
        }
    }

    const handleManualKeyDown = (e) => {
        if (e.key === 'Enter') handleManualAdd()
    }

    const handleClear = async () => {
        if (!window.confirm('Clear the current import list? The Assign Students page will show all eligible students again.')) return
        setIsClearing(true)
        try {
            await axios.delete(import.meta.env.VITE_APP_API + '/eligibility/clear-excel-import', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setCurrentList(null)
            setImportStats(null)
            setRejectedList([])
        } catch (err) {
            console.error(err)
            alert('Failed to clear import list.')
        } finally {
            setIsClearing(false)
        }
    }

    const downloadRejected = () => {
        const ws = XLSX.utils.json_to_sheet(rejectedList)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Rejected')
        XLSX.writeFile(wb, 'Rejected_Students.xlsx')
    }

    const reasonBadge = (reason) => {
        if (reason.includes('Not found')) return 'bg-red-50 text-red-700 border-red-200'
        if (reason.includes('Already assigned')) return 'bg-blue-50 text-blue-700 border-blue-200'
        return 'bg-orange-50 text-orange-700 border-orange-200'
    }

    const statCards = importStats ? [
        { label: 'Total in file', value: importStats.total, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
        { label: 'Eligible & saved', value: importStats.eligible, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
        { label: 'Not found', value: importStats.notFound, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
        { label: 'Not eligible', value: importStats.notEligible, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
        { label: 'Already assigned', value: importStats.alreadyAssigned, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    ] : []

    const visibleRejected = showAllRejected ? rejectedList : rejectedList.slice(0, 6)

    return (
        <div className="w-full">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-[#6b0f14] to-[#8a1620] px-6 py-5 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Assign via Excel</h1>
                            <p className="text-xs sm:text-sm text-white/70 mt-0.5">
                                Upload enrolment numbers to build the hostel assignment queue
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                    {previewData ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">Preview & Fix Imported Data</h2>
                                    <p className="text-xs text-gray-500">Edit invalid enrolment numbers below before saving.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setPreviewData(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Cancel</button>
                                    <button onClick={confirmImport} disabled={isImporting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#6b0f14] hover:bg-[#4f0a0f] rounded-lg transition disabled:opacity-50">
                                        {isImporting && <Spinner className="h-4 w-4" />} Confirm Import
                                    </button>
                                </div>
                            </div>
                            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white max-h-[60vh] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold w-12 text-center">#</th>
                                            <th className="px-4 py-3 font-semibold">Enrolment No</th>
                                            <th className="px-4 py-3 font-semibold">Status / Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {previewData.items.map((item, idx) => (
                                            <tr key={item.id} className={
                                                item.status === 'valid' ? 'bg-white' :
                                                    item.status === 'not_found' ? 'bg-red-50' :
                                                        item.status === 'already_assigned' ? 'bg-blue-50' : 'bg-orange-50'
                                            }>
                                                <td className="px-4 py-3 text-center text-gray-500">{idx + 1}</td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.current}
                                                        onChange={(e) => updatePreviewItem(item.id, e.target.value)}
                                                        className={`w-full px-3 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/30 bg-white ${item.status === 'valid' ? 'border-gray-200' : 'border-red-300'}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {item.status === 'valid' ? (
                                                            <span className="flex items-center gap-1.5 text-green-700 font-medium text-xs"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Valid</span>
                                                        ) : (
                                                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${reasonBadge(item.reason)}`}>{item.reason}</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Status card */}
                            <div className={`rounded-xl border p-4 ${currentList ? 'bg-green-50/60 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${currentList ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">
                                                {currentList ? 'Import queue active' : 'No active import queue'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {currentList
                                                    ? <>{currentList.eligibleCount} eligible students queued{currentList.label ? ` · ${currentList.label}` : ''}</>
                                                    : 'The Assign Students page is showing all eligible students'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {currentList && (
                                            <span className="text-xs text-gray-400 hidden sm:inline">
                                                {new Date(currentList.importedAt).toLocaleString()}
                                            </span>
                                        )}
                                        {currentList && (
                                            <button
                                                onClick={handleClear}
                                                disabled={isClearing}
                                                className="flex items-center gap-1.5 text-xs font-semibold bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                                            >
                                                {isClearing ? <Spinner className="h-3.5 w-3.5" /> : (
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                )}
                                                {isClearing ? 'Clearing…' : 'Clear queue'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Manual add + Upload */}
                            <div className="grid sm:grid-cols-2 gap-4 items-start">

                                {/* Manual add */}
                                <div className="rounded-xl border border-gray-200 p-5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <svg className="w-4 h-4 text-[#6b0f14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        <h3 className="font-semibold text-gray-800 text-sm">Add one manually</h3>
                                    </div>
                                    <p className="text-xs text-gray-500">Check a single enrolment number and add it to the queue.</p>

                                    <div className="flex items-center gap-2 mt-4">
                                        <input
                                            type="text"
                                            value={manualEnrolment}
                                            onChange={(e) => setManualEnrolment(e.target.value)}
                                            onKeyDown={handleManualKeyDown}
                                            placeholder="e.g. A/21/001"
                                            className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b0f14]/40 focus:border-[#6b0f14]"
                                        />
                                        <button
                                            onClick={handleManualAdd}
                                            disabled={isManualAdding || !manualEnrolment.trim()}
                                            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#6b0f14] text-white text-sm rounded-lg font-semibold hover:bg-[#4f0a0f] disabled:opacity-50 transition"
                                        >
                                            {isManualAdding && <Spinner className="h-3.5 w-3.5" />}
                                            {isManualAdding ? 'Checking…' : 'Add'}
                                        </button>
                                    </div>

                                    {manualMessage && (
                                        <div className={`mt-3 flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${manualMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {manualMessage.type === 'success'
                                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                            </svg>
                                            <span>{manualMessage.text}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Upload / dropzone */}
                                <div className="rounded-xl border border-gray-200 p-5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <svg className="w-4 h-4 text-[#6b0f14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        <h3 className="font-semibold text-gray-800 text-sm">Upload a file</h3>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Column named <code className="bg-gray-100 border px-1 rounded">Enrolment No</code>, or numbers in the first column.
                                    </p>

                                    <label
                                        onDragOver={(e) => { e.preventDefault(); if (!isImporting) setIsDragActive(true) }}
                                        onDragLeave={() => setIsDragActive(false)}
                                        onDrop={handleDrop}
                                        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition
                                    ${isImporting
                                                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                                                : isDragActive
                                                    ? 'border-[#6b0f14] bg-[#6b0f14]/5 cursor-pointer'
                                                    : 'border-gray-300 hover:border-[#6b0f14]/50 hover:bg-gray-50 cursor-pointer'}`}
                                    >
                                        <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} disabled={isImporting} />
                                        {isImporting ? (
                                            <>
                                                <Spinner className="h-5 w-5 text-[#6b0f14]" />
                                                <p className="text-xs font-medium text-gray-600 mt-1">Processing & saving…</p>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-6 h-6 text-[#6b0f14]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3" />
                                                </svg>
                                                <p className="text-xs font-semibold text-gray-700 mt-1">
                                                    <span className="text-[#6b0f14]">Click to upload</span> or drag & drop
                                                </p>
                                                <p className="text-[11px] text-gray-400">.xlsx, .xls, .csv</p>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <p className="text-xs text-gray-400 -mt-2">
                                Manual additions and uploads both add to the existing queue — neither replaces it.
                            </p>

                            {/* Results */}
                            {importStats && (
                                <div className="rounded-xl border border-yellow-200 bg-[#fefaf0] p-5">
                                    <h3 className="font-bold text-[#6b0f14] mb-3 text-sm">Last import results</h3>

                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4">
                                        {statCards.map((s) => (
                                            <div key={s.label} className={`rounded-lg border p-3 ${s.bg} ${s.border}`}>
                                                <p className="text-[11px] text-gray-500">{s.label}</p>
                                                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {importStats.eligible > 0 && (
                                        <div className="flex items-start gap-2 p-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800 mb-3">
                                            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span><strong>{importStats.eligible} eligible students</strong> saved to the queue. Head to <strong>Assign Students</strong> to continue.</span>
                                        </div>
                                    )}

                                    {rejectedList.length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-gray-600">Rejected entries ({rejectedList.length})</p>
                                                <button onClick={downloadRejected} className="flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-200 transition">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-8-4V4m0 8l-4-4m4 4l4-4" />
                                                    </svg>
                                                    Download full list
                                                </button>
                                            </div>
                                            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-gray-50 text-gray-500">
                                                        <tr>
                                                            <th className="text-left font-medium px-3 py-2">Enrolment No</th>
                                                            <th className="text-left font-medium px-3 py-2">Reason</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {visibleRejected.map((r, i) => (
                                                            <tr key={i}>
                                                                <td className="px-3 py-1.5 text-gray-700 font-medium">{r.Enrolment_No}</td>
                                                                <td className="px-3 py-1.5">
                                                                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] ${reasonBadge(r.Reason)}`}>
                                                                        {r.Reason}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {rejectedList.length > 6 && (
                                                <button
                                                    onClick={() => setShowAllRejected(!showAllRejected)}
                                                    className="text-xs text-gray-500 hover:text-gray-700 mt-2 font-medium"
                                                >
                                                    {showAllRejected ? 'Show less' : `Show all ${rejectedList.length}`}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AssignViaExcel