import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../index.css';
import { auth } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import logo from '../../assets/logo-white.png';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // Redirect to home page after successful login
      navigate('/home');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setError('USER_NOT_FOUND');
      } else if (error.code === 'auth/wrong-password') {
        setError('INVALID_CREDENTIALS');
      } else {
        setError('AUTH_ERROR');
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
              AUTH_<span className="text-[#00f3ff]">LOGIN</span>
            </h1>
            <p className="text-[10px] font-mono text-[#666] mt-2 uppercase tracking-widest">
              // SYSTEM_ACCESS // CREDENTIALS_REQUIRED
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-3 bg-[#1a1a1a] border border-[#ff4400] text-[#ff4400] text-xs font-mono uppercase tracking-wide">
              ERROR: {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 border-2 border-[#00f3ff] text-[#00f3ff] font-black font-mono uppercase tracking-widest hover:bg-[#00f3ff] hover:text-black transition-all text-sm mt-6"
            >
              EXECUTE_LOGIN
            </button>
          </form>

          {/* Sign-Up Link */}
          <div className="mt-6 pt-6 border-t border-[#333] text-center">
            <p className="text-[10px] text-[#666] uppercase tracking-widest mb-2">
              NO_ACCOUNT_DETECTED
            </p>
            <Link
              to="/signup"
              className="text-sm text-[#00f3ff] hover:text-[#eeeeee] transition-colors font-mono uppercase tracking-wide"
            >
              REGISTER_NEW_USER →
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

export default LoginPage;