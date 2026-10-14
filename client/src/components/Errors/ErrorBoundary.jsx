import React from 'react'
import { MdErrorOutline } from 'react-icons/md'
import { MdRefresh } from 'react-icons/md'

/**
 * ErrorBoundary — catches render errors in any child component tree.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 * Optional prop:
 *   fallback  — custom message string shown in the card (defaults to a generic message)
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
        this.handleReset = this.handleReset.bind(this)
    }

    // Update state so the next render shows the fallback UI
    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    // Log the error for debugging — swap with a real logging service if needed
    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Caught a render error:', error, info.componentStack)
    }

    handleReset() {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[300px] flex items-center justify-center p-6">
                    <div className="w-full max-w-md bg-white border border-red-100 rounded-2xl shadow-lg overflow-hidden">
                        {/* Red accent bar */}
                        <div className="h-1.5 bg-gradient-to-r from-[#6b0f14] to-red-400" />

                        <div className="p-8 flex flex-col items-center text-center gap-4">
                            {/* Icon */}
                            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                                <MdErrorOutline className="text-[#6b0f14]" size={36} />
                            </div>

                            {/* Heading */}
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">
                                    Something went wrong
                                </h2>
                                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                                    {/* Use custom fallback message if supplied, otherwise generic */}
                                    {this.props.fallback ??
                                        'An unexpected error occurred while loading this section. Our team has been notified.'}
                                </p>
                            </div>

                            {/* Error detail (dev-only hint) */}
                            {this.state.error && (
                                <details className="w-full text-left">
                                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                                        Show error details
                                    </summary>
                                    <pre className="mt-2 p-3 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                                        {this.state.error.toString()}
                                    </pre>
                                </details>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={this.handleReset}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6b0f14] hover:bg-[#7c1119] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                                >
                                    <MdRefresh size={18} />
                                    Try Again
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                                >
                                    Reload Page
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        // No error — render children normally
        return this.props.children
    }
}

export default ErrorBoundary
