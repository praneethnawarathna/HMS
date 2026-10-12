import React, { useState } from 'react';
import axios from 'axios';
import DefaultInput from '../../components/Form/DefaultInput';
import DefaultBtn from '../../components/Buttons/DefaultBtn';
import { useNavigate } from 'react-router-dom';
import uopLogo from '../../assets/uoplogo.png';
import authBg from '../../assets/auth-bg.jpg';

const VerifyOTP = () => {
    const [otpData, setOtpData] = useState({ email: '', otp: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setOtpData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${import.meta.env.VITE_APP_API}/auth/verify-otp`, otpData);
            if (res.data.Status === 'Success') {
                alert(res.data.Message);
                localStorage.setItem("updatepass", res.data.Token);
                navigate('/update-new-pass');
            } else {
                setError(res.data.Error || 'OTP verification failed');
            }
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen auth-bg px-4 py-10 flex flex-col relative overflow-hidden"
            style={{ '--auth-bg-url': `url(${authBg})` }}
        >
            {/* Decorative animated blobs */}
            <div className="bg-blob blob-1" />
            <div className="bg-blob blob-2" />

            <div className="flex flex-col md:flex-row md:items-center md:justify-center flex-grow max-w-6xl w-full mx-auto auth-content">
                {/* Left side — logo & welcome */}
                <div className="flex flex-col items-center mb-8 md:mb-0 md:mr-10 text-center">
                    <div className="logo-badge mb-4 inline-block">
                        <img src={uopLogo} alt="University Logo" className="md:h-32 w-auto" />
                    </div>
                    <div className="welcome-panel">
                        <h1 className="welcome-title">
                            <span className="title-accent">Verify Your</span>
                            <span className="title-accent"> OTP Code</span>
                        </h1>
                        <div className="welcome-underline" />
                        <p className="welcome-subtitle">
                            Enter the code sent to your email
                        </p>
                    </div>
                </div>

                {/* Right side — glass card form */}
                <div className="w-full max-w-md glass-card p-8">
                    <div className="accent-line w-16 mx-auto" />
                    <h2 className="text-2xl font-semibold auth-heading mb-6 text-center">
                        Verify OTP
                    </h2>

                    <form onSubmit={handleSubmit}>
                        <DefaultInput
                            label="Email"
                            type="email"
                            name="email"
                            value={otpData.email}
                            onChange={handleInputChange}
                            placeholder="you@example.com"
                            required
                        />
                        <DefaultInput
                            label="OTP"
                            type="text"
                            name="otp"
                            value={otpData.otp}
                            onChange={handleInputChange}
                            placeholder="Enter OTP"
                            required
                        />

                        {error && (
                            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <DefaultBtn type="submit" label={loading ? 'Verifying...' : 'Verify OTP'} disabled={loading} />
                    </form>

                    <div className="mt-5 text-sm text-center">
                        <a
                            href="/"
                            className="text-gray-600 hover:text-[var(--maroon)] transition-colors duration-200"
                        >
                            Back to{' '}
                            <span className="font-semibold underline underline-offset-2">
                                Sign In
                            </span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="footer-wrap">
                <footer className="footer-muted">
                    &copy; {new Date().getFullYear()} University of Peradeniya | Hostel Management System
                </footer>
            </div>
        </div>
    );
};

export default VerifyOTP;
