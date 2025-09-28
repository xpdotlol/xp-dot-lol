import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
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
  const { ready, authenticated, login, logout } = usePrivy();
  const [langModal, setLangModal] = useState(false);
  const [lang, setLang] = useState('English');
  const navigate = useNavigate();
  const location = useLocation();

  const selectLang = (language) => {
    setLang(language);
    setLangModal(false);
  };

  const handleNavClick = (path) => {
    navigate(path);
  };

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
          <button 
            className="signin-btn" 
            onClick={() => authenticated ? logout() : login()}
            disabled={!ready}
          >
            {authenticated ? 'Sign Out' : 'Sign In'}
          </button>
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
    </>
  );
};

export default Header