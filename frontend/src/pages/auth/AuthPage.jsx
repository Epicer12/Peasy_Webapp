import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../index.css';
import logo from '../../assets/logo-white.png';
import LoginPage from './LoginPage';
import SignUpPage from './SignUpPage';

function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname !== '/signup';

  const toggleMode = () => {
    navigate(isLogin ? '/signup' : '/login', { replace: true });
  };

  // Shared inner glass panel styling
  const panelStyles = "absolute inset-0 w-full h-full transition-all duration-500 ease-in-out bg-[#050505]/80 backdrop-blur-sm p-8 flex flex-col justify-center";

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-[#050505] font-mono relative">
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <img src={logo} alt="" className="w-[150%] h-[150%] object-contain blur-md" />
      </div>

      <div className="w-full max-w-md relative z-10 perspective-1000">
        
        {/* Main Flip Container */}
        <div className={`relative w-full transition-all duration-500 ease-in-out min-h-[600px] preserve-3d border-2 border-[#333] ${!isLogin ? 'rotate-y-180' : ''}`}>
          
          {/* Corner Markers (Static on wrapper) */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00f3ff] z-20"></div>
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00f3ff] z-20"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00f3ff] z-20"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00f3ff] z-20"></div>

          {/* FRONT PANEL: LOGIN */}
          <div className={`${panelStyles} backface-hidden z-10`}>
            <LoginPage toggleMode={toggleMode} />
          </div>

          {/* BACK PANEL: SIGN UP */}
          <div className={`${panelStyles} backface-hidden rotate-y-180 z-0`}>
            <SignUpPage toggleMode={toggleMode} />
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-[#333] uppercase tracking-widest">
            PEASY_SYSTEM v2.0.5 // SECURE_AUTH
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
