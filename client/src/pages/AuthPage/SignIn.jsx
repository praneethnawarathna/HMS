import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DefaultInput from '../../components/Form/DefaultInput';
import DefaultBtn from '../../components/Buttons/DefaultBtn';
import { clearAuthentication, getUserInfoFromToken } from '../../utils/auth';

import uopLogo from '../../assets/uoplogo.png';
import authBg from '../../assets/81.jpg';

const SignIn = () => {
    const [signInData, setSignInData] = useState({ identifier: '', password: '' });
    const [loginMode, setLoginMode] = useState('student');
    const [showRolePicker, setShowRolePicker] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showStudentGuide, setShowStudentGuide] = useState(false);
    const [showWardenGuide, setShowWardenGuide] = useState(false);
    // separate dropdown state to avoid colliding with modal flags
    const [showStudentGuideDropdown, setShowStudentGuideDropdown] = useState(false);
    const [showWardenGuideDropdown, setShowWardenGuideDropdown] = useState(false);
    const navigate = useNavigate();

    // Auto-redirect if already logged in
    React.useEffect(() => {
        if (getUserInfoFromToken()) {
            navigate('/Dashboard/Home');
        }
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSignInData((prev) => ({ ...prev, [name]: value }));
    };

    const handleRoleSelect = (mode) => {
        setLoginMode(mode);
        setShowRolePicker(false);
        setError('');
    };

    const handleChangeRole = () => {
        setShowRolePicker(true);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post(
                '/auth/signin',
                {
                    ...signInData,
                    loginMode,
                    ...(loginMode === 'staff' ? { email: signInData.identifier } : {})
                }
            );

            if (res.data.Status === 'Success') {
                alert(res.data.Message);
                clearAuthentication();
                localStorage.setItem('login', res.data.Token);
                localStorage.setItem('dashmenuID', 1);

                // Reload from a clean authenticated state so components cannot
                // reuse a token value captured before sign-in.
                window.location.replace('/Dashboard/Home');
            } else {
                setError(res.data.Error || 'Sign-in failed');
            }
        } catch (err) {
            const serverMessage = err.response?.data?.Error || err.response?.data?.message;
            console.error('Sign-in request failed:', serverMessage || err.message);
            setError(serverMessage || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const Modal = ({ title, content, onClose }) => (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">

            <div className="bg-white p-6 rounded-xl shadow-lg w-11/12 max-w-lg">
                <h2 className="text-xl font-semibold mb-4">{title}</h2>
                <div className="text-gray-700 mb-4">{content}</div>
                <div className="text-right">
                    <DefaultBtn type="button" label="Close" onClick={onClose} />
                </div>
            </div>
        </div>
    );

    return (
        <div
            className="min-h-screen auth-bg px-3 sm:px-4 py-18 sm:py-10 flex flex-col relative overflow-hidden"
            style={{ '--auth-bg-url': `url(${authBg})` }}
        >
            <div className="bg-blob blob-1" />
            <div className="bg-blob blob-2" />

            <div className="flex flex-col md:flex-row md:items-center md:justify-center flex-grow max-w-6xl w-full mx-auto auth-content">
                <div
                    className={`flex flex-col items-center mb-8 md:mb-0 md:mr-10 text-center ${showRolePicker ? '-mt-4 sm:-mt-24 md:-mt-36' : 'mt-0'
                        }`}
                >
                    <div className="logo-badge mb-4 inline-block scale-105">
                        <img
                            src={uopLogo}
                            alt="University Logo"
                            className={`${showRolePicker ? 'h-24 sm:h-28 md:h-40' : 'h-20 sm:h-24 md:h-32'} w-auto`}
                        />
                    </div>
                    <div className="welcome-panel">
                        <h1 className={`welcome-title ${showRolePicker ? 'scale-105' : 'scale-95'}`}>
                            <span className="title-accent">WELCOME TO</span>
                            <span className="title-accent"> HOSTEL MANAGEMENT SYSTEM</span>
                        </h1>
                        <div className="welcome-underline" />
                    </div>
                    <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${showRolePicker
                                ? 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
                                : 'max-h-[600px] opacity-100 translate-y-0'
                            }`}
                    >
                        <p className="welcome-subtitle">Read SignUp Guides</p>
                        <div
                            className="mt-2"
                            tabIndex={0}
                            onMouseEnter={() => {
                                setShowStudentGuideDropdown(true);
                                setShowWardenGuideDropdown(false);
                            }}
                            onMouseLeave={() => setShowStudentGuideDropdown(false)}
                            onFocus={() => {
                                setShowStudentGuideDropdown(true);
                                setShowWardenGuideDropdown(false);
                            }}
                            onBlur={() => setShowStudentGuideDropdown(false)}
                        >
                            <DefaultBtn
                                type="button"
                                label="Read Student Guide"
                                hasCaret={true}
                                onClick={() => {
                                    setShowStudentGuideDropdown(s => !s);
                                    setShowWardenGuideDropdown(false);
                                }}
                            />
                            {showStudentGuideDropdown && (
                                <div className="mt-3 p-4 bg-white rounded shadow-sm text-left text-gray-700 transition-all duration-150">
                                    <h3 className="font-semibold mb-2">Student Sign-Up Guide</h3>
                                    <ul className="list-disc ml-5 space-y-2 text-sm">
                                        <li>Wait for email to confirm that your account is created and active.</li>
                                        <li>If you receive the email, it contains credentials to log in to the system.</li>
                                        <li>Every student account default password is <strong>12345678</strong>.</li>
                                        <li><span className="uppercase font-semibold text-red-500">Important</span>: After login please update your password.</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div
                            className="mt-2"
                            tabIndex={0}
                            onMouseEnter={() => {
                                setShowWardenGuideDropdown(true);
                                setShowStudentGuideDropdown(false);
                            }}
                            onMouseLeave={() => setShowWardenGuideDropdown(false)}
                            onFocus={() => {
                                setShowWardenGuideDropdown(true);
                                setShowStudentGuideDropdown(false);
                            }}
                            onBlur={() => setShowWardenGuideDropdown(false)}
                        >
                            <DefaultBtn
                                type="button"
                                label="Warden SignUp Guide"
                                hasCaret={true}
                                onClick={() => {
                                    setShowWardenGuideDropdown(s => !s);
                                    setShowStudentGuideDropdown(false);
                                }}
                            />
                            {showWardenGuideDropdown && (
                                <div className="mt-3 p-4 bg-white rounded shadow-sm text-left text-gray-700 transition-all duration-150">
                                    <h3 className="font-semibold mb-2">Warden Sign-Up Guide</h3>
                                    <ul className="list-disc ml-5 space-y-2 text-sm">
                                        <li>Sign up using official university credentials.</li>
                                        <li>Go to Email Verify page — you must verify your email there.</li>
                                        <li>Your account will be verified by the admin.</li>
                                        <li>Once approved, you can access the Dashboard.</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className={`w-full transition-all duration-300 ease-in-out overflow-hidden ${showRolePicker
                            ? 'max-w-0 max-h-0 opacity-0 translate-y-2 pointer-events-none'
                            : 'max-w-md max-h-[900px] opacity-100 translate-y-0'
                        }`}
                    aria-hidden={showRolePicker}
                >
                    <div className="w-full glass-card p-6 sm:p-8 rounded-2xl shadow-md">
                        <div className="accent-line" />
                        <h2 className="text-xl sm:text-2xl font-semibold auth-heading mb-3 text-center">
                            {`${loginMode === 'staff' ? 'Staff' : 'Student'} Sign In`}
                        </h2>
                        {!showRolePicker && (
                            <div className="mb-4 text-center">
                                <button
                                    type="button"
                                    onClick={handleChangeRole}
                                    className="text-xs text-gray-500 hover:text-gray-700 underline transition"
                                >
                                    Change Login Type
                                </button>
                            </div>
                        )}

                        <div
                            className={`transition-all duration-300 ease-in-out overflow-hidden ${showRolePicker
                                    ? 'max-h-0 opacity-0 translate-y-2 pointer-events-none'
                                    : 'max-h-[900px] opacity-100 translate-y-0'
                                }`}
                        >
                            <form onSubmit={handleSubmit}>
                                <DefaultInput
                                    label={loginMode === 'student' ? 'Enrolment No' : 'Email'}
                                    type="text"
                                    name="identifier"
                                    value={signInData.identifier}
                                    onChange={handleInputChange}
                                    placeholder={loginMode === 'student' ? 'Enter your Enrolment Number' : 'you@example.com'}
                                    required
                                />
                                <div className="mb-3 text-xs text-gray-600">
                                    {loginMode === 'student'
                                        ? 'Students must sign in only with their enrolment number.'
                                        : 'All other users must sign in only with their email.'}
                                </div>
                                <DefaultInput
                                    label="Password"
                                    type="password"
                                    name="password"
                                    value={signInData.password}
                                    onChange={handleInputChange}
                                    placeholder="••••••••"
                                    required
                                />
                                {error && (
                                    <div className="mb-4 text-sm text-red-600">
                                        {error}
                                    </div>
                                )}
                                <div className="mb-4 flex items-center">
                                    <input
                                        type="checkbox"
                                        id="showPassword"
                                        name="showPassword"
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        onChange={(e) => {
                                            const passwordInput = document.querySelector('input[name="password"]');
                                            if (passwordInput) {
                                                passwordInput.type = e.target.checked ? 'text' : 'password';
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor="showPassword"
                                        className="ml-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900 transition"
                                    >
                                        Show password
                                    </label>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 px-4 bg-red-900 hover:bg-red-950 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Signing In...' : 'Sign In'}
                                </button>
                            </form>

                            <div className={`mt-4 flex ${loginMode === 'student' ? 'justify-start' : 'justify-between'} items-center text-sm`}>
                                <p className="transition">
                                    <a
                                        href="/Forgetpassword"
                                        className="text-red-600 hover:text-red-700 hover:underline font-medium transition"
                                    >
                                        Forgot password?
                                    </a>
                                </p>
                                {/* Conditionally render Create Account link */}
                                {loginMode !== 'student' && (
                                    <p className="transition">
                                        <a
                                            href="/register"
                                            className="text-green-600 hover:text-green-700 hover:underline font-medium transition"
                                        >
                                            Create Account
                                        </a>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={`fixed bottom-48 sm:bottom-28 md:bottom-36 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ease-in-out ${showRolePicker
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-2 pointer-events-none'
                    }`}
            >
                <div className="glass-card p-4 rounded-2xl shadow-md w-[min(92vw,20rem)]">
                    <p className="text-sm text-gray-700 font-semibold text-center mb-3">
                        Select Login Type
                    </p>
                    <div className="grid gap-2">
                        <button
                            type="button"
                            onClick={() => handleRoleSelect('staff')}
                            className="w-full py-3 px-4 rounded-lg font-semibold text-sm sm:text-base transition shadow-sm bg-red-900 text-white hover:bg-red-950"
                        >
                            Staff Login
                        </button>
                        <button
                            type="button"
                            onClick={() => handleRoleSelect('student')}
                            className="w-full py-3 px-4 rounded-lg font-semibold text-sm sm:text-base transition shadow-sm bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            Student Login
                        </button>
                    </div>
                </div>
            </div>

            <div className="footer-wrap">
                <footer className="text-center text-sm footer-muted">
                    &copy; {new Date().getFullYear()} University of Peradeniya | Hostel Management System
                </footer>
            </div>

            {/* Student Guide Modal */}
            {showStudentGuide && (
                <Modal
                    title="Student Sign-Up Guide"
                    content={
                        <ul className="list-disc ml-5 space-y-2">
                            <li>Wait for email to confirm that your account is created and active.</li>
                            <li>If you receive the email, it contains credentials to log in to the system.</li>
                            <li>Every student account default password is <strong>12345678</strong>.</li>
                            <li><span className='uppercase font-semibold text-red-500'>Important</span>: After login with credentials please update the password.</li>
                        </ul>
                    }
                    onClose={() => setShowStudentGuide(false)}
                />
            )}

            {/* Warden Guide Modal */}
            {showWardenGuide && (
                <Modal
                    title="Warden Sign-Up Guide"
                    content={
                        <ul className="list-disc ml-5 space-y-2">
                            <li>Sign up using official university credentials.</li>
                            <li>Then you go to Email Verify page if you do not verify email at that stage you cannot verify email after.</li>
                            <li>Your account will be verified by the admin.</li>
                            <li>Once approved, you can go to Dashboard.</li>
                        </ul>
                    }
                    onClose={() => setShowWardenGuide(false)}
                />
            )}
        </div>
    );
};

export default SignIn;
