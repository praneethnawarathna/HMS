import React, { useState, useEffect } from 'react'
import axios from 'axios'
import DefaultBtn from '../../components/Buttons/DefaultBtn'
import TextAreaInput from '../../components/Form/TextAreaInput'
import { getUserInfoFromToken } from '../../utils/auth' 

import { useNavigate } from 'react-router-dom'

const CreateExtraNeeds = () => {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        regNo: '',
        needs: '',
    })

    const token = localStorage.getItem('login')

    useEffect(() => {
        const userInfo = getUserInfoFromToken()
        const savedRegNo = localStorage.getItem('studentRegNo')

        if (savedRegNo) {
            setFormData((prev) => ({
                ...prev,
                regNo: savedRegNo,
            }))
            return
        }

        if (userInfo && (userInfo.username || userInfo.email)) {
            // For students, username IS the enrolmentNo; email is a synthetic placeholder.
            setFormData((prev) => ({
                ...prev,
                regNo: userInfo.username || userInfo.email,
            }))
        }
    }, [])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            const res = await axios.post(import.meta.env.VITE_APP_API + '/student/student-create-needs', formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.data?.Status === "Success") {
                // Remember the identifier used so the list page can fetch the right record
                localStorage.setItem('studentRegNo', formData.regNo)

                alert(res.data.Message)
                navigate('/Dashboard/ExtraNeeds', { replace: true })
            } else {
                alert(res.data?.Error || res.data?.message || 'Failed to submit special needs')
            }
        } catch (error) {
            console.error('Error submitting special needs:', error)

            const data = error?.response?.data
            const serverMsg = typeof data === 'string'
                ? data
                : (data?.Error || data?.message || data?.Message || data?.error)

            const msg = serverMsg || error?.message || 'Failed to submit special needs'
            alert(msg)
        }
    }

    return (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
            <h1 className="text-2xl font-bold text-[#6b0f14] mb-6">Special Needs / Extra Requirements</h1>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <TextAreaInput
                        label="Special Needs / Requests"
                        name="needs"
                        value={formData.needs}
                        onChange={handleChange}
                        placeholder="Describe any special needs or requirements..."
                        required
                        rows={5}
                    />
                </div>

                <input type="hidden" name="regNo" value={formData.regNo} />

                <div className="col-span-full flex justify-end mt-2">
                    <DefaultBtn type="submit" label="Submit Special Needs" />
                </div>
            </form>
        </div>
    )
}

export default CreateExtraNeeds
