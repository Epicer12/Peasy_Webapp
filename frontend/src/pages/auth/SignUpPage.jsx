import React, { useState } from 'react';
import { auth } from '../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import '../../index.css';
import logo from '../../assets/logo-white.png';

function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get ID token and store it
      const token = await user.getIdToken();
      localStorage.setItem('token', token);

      // Redirect to home page after successful signup
      navigate('/home');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError('EMAIL_ALREADY_REGISTERED');
      } else if (error.code === 'auth/weak-password') {
        setError('PASSWORD_TOO_WEAK');
      } else {
        setError('REGISTRATION_ERROR');
      }
    }
  };

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-[#050505] font-mono relative">
      {/* Blurred Logo Background - Full Page */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <img src={logo} alt="" className="w-[150%] h-[150%] object-contain blur-md" />
      </div>

      <div className="w-full max-w-md p-6 relative z-10">

        {/* Main Card */}
        <div className="bg-[#050505]/80 backdrop-blur-sm border-2 border-[#333] p-8 relative overflow-hidden">

          {/* Corner Markers */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00f3ff]"></div>
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00f3ff]"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00f3ff]"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00f3ff]"></div>

          {/* Header */}
          <div className="border-b-2 border-[#333] pb-4 mb-6">
            <h1 className="text-3xl md:text-4xl font-black text-[#eeeeee] tracking-tighter uppercase leading-none">
              AUTH_<span className="text-[#00f3ff]">REGISTER</span>
            </h1>
            <p className="text-[10px] font-mono text-[#666] mt-2 uppercase tracking-widest">
              // NEW_USER // ACCOUNT_CREATION
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-3 bg-[#1a1a1a] border border-[#ff4400] text-[#ff4400] text-xs font-mono uppercase tracking-wide">
              ERROR: {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-[10px] font-mono text-[#666] uppercase tracking-widest mb-2">
                EMAIL_ADDRESS
              </label>
              <input
                type="email"
                placeholder="user@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-[#0a0a0a] border border-[#333] text-[#eeeeee] font-mono text-sm focus:outline-none focus:border-[#00f3ff] transition-colors placeholder:text-[#444]"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[10px] font-mono text-[#666] uppercase tracking-widest mb-2">
                PASSWORD
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-[#0a0a0a] border border-[#333] text-[#eeeeee] font-mono text-sm focus:outline-none focus:border-[#00f3ff] transition-colors placeholder:text-[#444]"
                required
              />
              <p className="text-[10px] text-[#666] mt-1 font-mono">MIN_LENGTH: 6_CHARS</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 border-2 border-[#00f3ff] text-[#00f3ff] font-black font-mono uppercase tracking-widest hover:bg-[#00f3ff] hover:text-black transition-all text-sm mt-6"
            >
              CREATE_ACCOUNT
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t border-[#333] text-center">
            <p className="text-[10px] text-[#666] uppercase tracking-widest mb-2">
              ACCOUNT_EXISTS
            </p>
            <Link
              to="/"
              className="text-sm text-[#00f3ff] hover:text-[#eeeeee] transition-colors font-mono uppercase tracking-wide"
            >
              RETURN_TO_LOGIN →
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-[10px] font-mono text-[#333] uppercase tracking-widest">
            PEASY_SYSTEM v2.0.5 // SECURE_AUTH
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;