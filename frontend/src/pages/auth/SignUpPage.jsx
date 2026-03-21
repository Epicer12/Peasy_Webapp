import React, { useState } from 'react';
import { auth } from '../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import '../../index.css';
import logo from '../../assets/logo-white.png';

function SignUpPage() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Username
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Step 1: Request OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'FAILED_TO_SEND_OTP');

      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'INVALID_OR_EXPIRED_OTP');

      // Success - Move to registration step
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Final Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // For this custom flow, we pass the email and username to the register endpoint
      // and let the backend handle the mapping. The Authorization header is checked by backend.
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer MOCK_TOKEN_${email}` // Backend expects a Bearer token
        },
        body: JSON.stringify({ username })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'REGISTRATION_FAILED');

      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-[#050505] font-mono relative">
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <img src={logo} alt="" className="w-[150%] h-[150%] object-contain blur-md" />
      </div>

      <div className="w-full max-w-md p-6 relative z-10">
        <div className="bg-[#050505]/80 backdrop-blur-sm border-2 border-[#333] p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00f3ff]"></div>
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00f3ff]"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00f3ff]"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00f3ff]"></div>

          <div className="border-b-2 border-[#333] pb-4 mb-6">
            <h1 className="text-3xl md:text-4xl font-black text-[#eeeeee] tracking-tighter uppercase leading-none">
              AUTH_<span className="text-[#00f3ff]">{step === 1 ? 'EMAIL' : step === 2 ? 'VERIFY' : 'PROFILE'}</span>
            </h1>
            <p className="text-[10px] font-mono text-[#666] mt-2 uppercase tracking-widest">
              // STEP_0{step} // {step === 1 ? 'IDENTIFICATION' : step === 2 ? 'OTP_CHALLENGE' : 'INITIALIZE_USER'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-[#1a1a1a] border border-[#ff4400] text-[#ff4400] text-xs font-mono uppercase tracking-wide">
              ERROR: {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="block text-[10px] font-mono text-[#666] uppercase tracking-widest mb-2">EMAIL_ADDRESS</label>
                <input
                  type="email"
                  placeholder="USER@DOMAIN.COM"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-[#0a0a0a] border border-[#333] text-[#eeeeee] font-mono text-sm focus:outline-none focus:border-[#00f3ff]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 border-2 border-[#00f3ff] text-[#00f3ff] font-black font-mono uppercase tracking-widest hover:bg-[#00f3ff] hover:text-black transition-all disabled:opacity-50"
              >
                {isLoading ? 'INITIATING...' : 'SEND_VERIFICATION_CODE'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="p-4 bg-[#111] border border-[#333] text-center">
                <p className="text-[10px] font-mono text-[#00f3ff] uppercase tracking-widest">CODE_SENT_TO:</p>
                <p className="text-xs font-bold text-[#eee] mt-1">{email}</p>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#666] uppercase tracking-widest mb-2 text-center">ENTER_6_DIGIT_OTP</label>
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full p-4 bg-[#0a0a0a] border border-[#333] text-[#eeeeee] font-mono text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-[#00f3ff]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 border-2 border-[#ccff00] text-[#ccff00] font-black font-mono uppercase tracking-widest hover:bg-[#ccff00] hover:text-black transition-all disabled:opacity-50"
              >
                {isLoading ? 'VERIFYING...' : 'VERIFY_OTP_CODE'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-[10px] text-[#444] hover:text-[#00f3ff] uppercase tracking-widest mt-2"
              >
                ← BACK_TO_EMAIL
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label className="block text-[10px] font-mono text-[#666] uppercase tracking-widest mb-2">CHOOSE_USERNAME</label>
                <input
                  type="text"
                  placeholder="CYBER_OPERATOR"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 bg-[#0a0a0a] border border-[#333] text-[#eeeeee] font-mono text-sm focus:outline-none focus:border-[#00f3ff]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 border-2 border-[#00f3ff] text-[#00f3ff] font-black font-mono uppercase tracking-widest hover:bg-[#00f3ff] hover:text-black transition-all disabled:opacity-50"
              >
                {isLoading ? 'REGISTERING...' : 'COMPLETE_REGISTRATION'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[#333] text-center">
            <Link to="/" className="text-xs text-[#666] hover:text-[#00f3ff] transition-colors font-mono uppercase tracking-wide">
              RETURN_TO_LOGIN_INTERFACE →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;