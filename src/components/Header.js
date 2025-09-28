import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { getUser } from '../utils/api';
import EditProfileModal from './EditProfileModal';
import './Header.css';

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ar', name: 'Arabic', native: 'العربية' }
];

const NAV_ITEMS = [
  { name: 'X-Perpetuals', path: '/market' },
  { name: 'Pledge', path: '/pledge' },
  { name: 'Referral', path: '/refer' },
  { name: 'Rewards', path: '/reward' }
];

const Header = () => {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const [langModal, setLangModal] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [lang, setLang] = useState('English');
  const [userData, setUserData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  // Reset user data when not authenticated
  useEffect(() => {
    if (!authenticated) {
      setUserData(null);
      setIsLoadingUser(false);
    }
  }, [authenticated]);

  // Fetch user data when authenticated and user exists
  useEffect(() => {
    if (authenticated && user && ready && !userData && !isLoadingUser) {
      fetchUserData();
    }
  }, [authenticated, user, ready, userData, isLoadingUser]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUserData = async () => {
    if (!user?.id) return;
    
    setIsLoadingUser(true);
    try {
      const response = await getUser(user.id);
      if (response.success) {
        setUserData(response.user);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const selectLang = (language) => {
    setLang(language);
    setLangModal(false);
  };

  const handleNavClick = (path) => {
    navigate(path);
  };

  const copyWalletAddress = async () => {
    if (userData?.walletAddress) {
      try {
        await navigator.clipboard.writeText(userData.walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        setUserDropdown(false);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const openEditProfile = () => {
    setShowEditModal(true);
    setUserDropdown(false);
  };

  const handleUserUpdate = (updatedUser) => {
    setUserData(updatedUser);
  };

  const handleLogout = () => {
    logout();
    setUserDropdown(false);
    setUserData(null);
    setIsLoadingUser(false);
  };

  // Determine what to show in header right section
  const shouldShowUserButton = ready && authenticated && userData && !isLoadingUser;
  const shouldShowSignInButton = ready && !authenticated;
  const shouldShowLoading = ready && authenticated && (isLoadingUser || !userData);

  return (
    <>
      <header className="header">
        <div className="header-left">
          <img src="/logo-transparent.png" alt="Logo" className="logo" />
          <h1 className="site-name" onClick={() => navigate('/')}>xp.lol</h1>
          <nav className="header-nav">
            {NAV_ITEMS.map(item => (
              <span 
                key={item.path} 
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavClick(item.path)}
              >
                {item.name}
              </span>
            ))}
          </nav>
        </div>
        <div className="header-right">
          {shouldShowUserButton && (
            <div className="user-dropdown-container" ref={dropdownRef}>
              <button 
                className="user-button" 
                onClick={() => setUserDropdown(!userDropdown)}
              >
                <img 
                  src={userData.profilePicture || '/pfpdefault.png'} 
                  alt="Profile" 
                  className="user-avatar"
                />
                <span className="user-name">{userData.username}</span>
                <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              
              {userDropdown && (
                <div className="user-dropdown">
                  <button 
                    className="dropdown-item" 
                    onClick={copyWalletAddress}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    {copied ? 'Copied!' : 'Copy Wallet'}
                  </button>
                  <button 
                    className="dropdown-item" 
                    onClick={openEditProfile}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit Profile
                  </button>
                  <button 
                    className="dropdown-item" 
                    onClick={handleLogout}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {shouldShowSignInButton && (
            <button 
              className="signin-btn" 
              onClick={login}
            >
              Sign In
            </button>
          )}

          {shouldShowLoading && (
            <div className="loading-user">Loading...</div>
          )}
          
          <div className="header-divider"/>
          <button className="globe-btn" onClick={() => setLangModal(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
          </button>
        </div>
      </header>

      {langModal && (
        <div className="modal-overlay" onClick={() => setLangModal(false)}>
          <div className="language-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Select Language</h2>
              <button className="modal-close" onClick={() => setLangModal(false)}>✕</button>
            </div>
            <div className="language-options">
              {LANGUAGES.map(({ code, name, native }) => (
                <button
                  key={code}
                  className={`language-option ${lang === name ? 'selected' : ''}`}
                  onClick={() => selectLang(name)}
                >
                  <span className="language-name">{name}</span>
                  <span className="language-native">{native}</span>
                  {lang === name && (
                    <svg className="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <EditProfileModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        userData={{...userData, privyUserId: user?.id}}
        onUserUpdate={handleUserUpdate}
      />
    </>
  );
};

export default Header;