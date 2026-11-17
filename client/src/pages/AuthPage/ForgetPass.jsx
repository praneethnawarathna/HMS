import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import DefaultInput from '../../components/Form/DefaultInput';
import DefaultBtn from '../../components/Buttons/DefaultBtn';
import uopLogo from '../../assets/uoplogo.png';

const ForgetPass = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        setEmail(e.target.value);
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await axios.post(`${import.meta.env.VITE_APP_API}/auth/forgot-password`, { email: email.trim() });
            if (res.data?.Status === 'Success') {
                setSuccessMsg(res.data.Message || 'OTP verification code has been sent to your email.');
                // Store email for verify-otp step
                localStorage.setItem('resetEmail', email.trim());
                setTimeout(() => {
                    navigate('/verify-otp');
                }, 1200);
            } else {
                setError(res.data?.Error || 'Failed to send reset code. Please check your email address.');
            }
        } catch (err) {
            console.error('Forgot password error:', err);
            setError(err.response?.data?.Error || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 px-4 py-10 flex flex-col justify-between">
            <div className="flex flex-col md:items-center md:justify-center flex-grow">
                {/* University Logo */}
                <img
                    src={uopLogo}
                    alt="University of Peradeniya Logo"
                    className="h-24 md:h-32 w-auto mb-4 mx-auto"
                />

                {/* Subtitle Message */}
                <p className="text-center text-gray-700 mb-6 max-w-md mx-auto text-sm leading-relaxed">
                    Enter your registered email address to receive a one-time verification password (OTP).
                </p>

                {/* Central Card */}
                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                        Forgot Password
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <DefaultInput
                            label="Email Address"
                            type="email"
                            name="email"
                            value={email}
                            onChange={handleInputChange}
                            placeholder="Enter your email"
                            required
                        />

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700">
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800">
                                {successMsg}
                            </div>
                        )}

                        <div className="pt-2">
                            <DefaultBtn
                                type="submit"
                                label={loading ? 'Sending OTP...' : 'Send OTP'}
                                disabled={loading}
                            />
                        </div>
                    </form>

                    {/* Back to Login Link */}
                    <div className="mt-6 text-center pt-4 border-t border-gray-100">
                        <Link
                            to="/"
                            className="text-sm font-medium text-gray-600 hover:text-[#6b0f14] transition-colors"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="text-center text-sm text-gray-600 mt-10">
                &copy; {new Date().getFullYear()} University of Peradeniya | Hostel Management System
            </footer>
        </div>
    );
};

export default ForgetPass;
