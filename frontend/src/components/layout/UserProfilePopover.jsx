import React, { useRef, useEffect } from 'react';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const UserProfilePopover = ({ user, isOpen, onClose }) => {
    const popoverRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !user) return null;

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    const displayName = user.displayName || user.email?.split('@')[0] || 'UNKNOWN_USER';
    const email = user.email || 'NO_EMAIL_PROVIDED';

    return (
        <div
            ref={popoverRef}
            className="absolute bottom-16 left-2 w-72 md:w-80 bg-[#050505] border-2 border-[#333333] z-[100] shadow-2xl"
        >
            {/* Popover Header/Decorations */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00f3ff]"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00f3ff]"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00f3ff]"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00f3ff]"></div>

            <div className="p-6 border-b border-[#333]">
                <p className="text-xs font-mono text-[#00f3ff] uppercase tracking-widest mb-2">LOGGED_IN_AS:</p>
                <h3 className="text-xl md:text-2xl font-black text-[#eeeeee] uppercase tracking-wider truncate" title={displayName}>
                    {displayName}
                </h3>
                <p className="text-sm md:text-base font-mono text-[#666] truncate mt-2" title={email}>
                    {email}
                </p>
            </div>

            <div className="p-3 space-y-2">
                <button
                    onClick={() => {
                        navigate('/profile');
                        onClose();
                    }}
                    className="w-full py-3 text-sm md:text-base font-black font-mono uppercase tracking-widest text-[#eeeeee] hover:bg-[#00f3ff] hover:text-black border border-transparent transition-all text-left px-3 flex justify-between items-center group/btn"
                >
                    <span>MY_PROFILE</span>
                    <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                </button>

                <button
                    onClick={handleSignOut}
                    className="w-full py-3 text-sm md:text-base font-black font-mono uppercase tracking-widest text-[#ff4400] hover:bg-[#1a0a0a] hover:border-[#ff4400] border border-transparent transition-all text-left px-3 flex justify-between items-center group/btn"
                >
                    <span>SIGN_OUT</span>
                    <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                </button>
            </div>
        </div>
    );
};

export default UserProfilePopover;
