import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, signInWithPopup } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

function LoginPage({ toggleMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleAuth = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ username: user.displayName?.replace(/\s+/g, '_') || user.email.split('@')[0] })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'SOCIAL_LOGIN_SYNC_FAILED');
      }

      navigate('/home');
    } catch (err) {
      setError(err.message === 'USERNAME_TAKEN' ? 'SOCIAL_ACCOUNT_STALE_OR_USER_ALREADY_EXISTS' : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setError('USER_NOT_FOUND');
      } else if (error.code === 'auth/wrong-password') {
        setError('INVALID_CREDENTIALS');
      } else {
        setError('AUTH_ERROR');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div>
        <div className="border-b-2 border-[#333] pb-4 mb-6 text-center">
          <h1 className="text-3xl font-black text-[#eeeeee] tracking-tighter uppercase leading-none">
            AUTH_<span className="text-[#00f3ff]">LOGIN</span>
          </h1>
          <p className="text-[10px] text-[#666] mt-2 uppercase tracking-widest">
            // SECURE_ACCESS_GRANTED //
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-[#1a1a1a] border border-[#ff4400] text-[#ff4400] text-[10px] uppercase">
            ERR: {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] text-[#666] uppercase tracking-widest mb-1">EMAIL_ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-[#0a0a0a] border border-[#333] text-[#eeeeee] text-sm focus:outline-none focus:border-[#00f3ff]"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] text-[#666] uppercase tracking-widest mb-1">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-[#0a0a0a] border border-[#333] text-[#eeeeee] text-sm focus:outline-none focus:border-[#00f3ff]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-4 border-2 border-[#00f3ff] text-[#00f3ff] font-black uppercase tracking-widest hover:bg-[#00f3ff] hover:text-black transition-all text-sm disabled:opacity-50"
          >
            {isLoading ? 'EXECUTING...' : 'EXECUTE_LOGIN'}
          </button>
        </form>

        <div className="flex items-center gap-4 py-4">
          <div className="flex-1 h-[1px] bg-[#333]"></div>
          <span className="text-[10px] text-[#444] uppercase tracking-widest">OR_USE_SOCIAL</span>
          <div className="flex-1 h-[1px] bg-[#333]"></div>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full py-3 border-2 border-[#eeeeee] text-[#eeeeee] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#eeeeee] hover:text-black transition-all disabled:opacity-50 text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          SIGN_IN_WITH_GOOGLE
        </button>
      </div>
      
      <div className="mt-8 pt-4 border-t border-[#333] text-center">
        <button 
          onClick={toggleMode}
          className="text-sm font-bold text-[#666] hover:text-[#00f3ff] transition-colors uppercase tracking-wide cursor-pointer"
        >
          NO_ACCOUNT? INITIATE_REGISTRATION →
        </button>
      </div>
    </>
  );
}

export default LoginPage;