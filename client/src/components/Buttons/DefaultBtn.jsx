import React from 'react'

const DefaultBtn = ({ label = "Click the Button", onClick, type = "button", disabled = false, hasCaret = false }) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`mt-4 inline-flex items-center justify-center gap-1.5 transition text-xs font-medium 
        ${disabled ? 'button-maroon opacity-60 cursor-not-allowed' : 'button-maroon'}
      `}
        >
            <span>{label}</span>
            {hasCaret && (
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </button>
    )
}

export default DefaultBtn