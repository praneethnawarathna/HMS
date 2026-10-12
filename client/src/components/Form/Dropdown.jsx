import React from 'react'

const Dropdown = ({ label, name, value, onChange, required = false, options = [] }) => {
    const selectProps = {}
    if (value !== undefined) {
        selectProps.value = value
    }

    return (
        <div className="mb-5">
            {label && (
                <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <select
                id={name}
                name={name}
                onChange={onChange}
                required={required}
                {...selectProps}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-500 transition"
            >
                <option value="">Select an option</option>
                {options.map((opt, idx) => (
                    <option key={idx} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

export default Dropdown