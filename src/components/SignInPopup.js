import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createOrGetUser } from '../utils/api';
import './SignInPopup.css';

const SignInPopup = () => {
  const { authenticated, user } = usePrivy();
  const [showPopup, setShowPopup] = useState(false);
  const [hasShownPopup, setHasShownPopup] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authenticated && user && !hasShownPopup) {
      handleUserSignIn();
      setHasShownPopup(true);
    }
  }, [authenticated, user, hasShownPopup]);

  const handleUserSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await createOrGetUser({
        privyUserId: user.id,
        loginMethod: user.email ? 'email' : 'wallet',
        email: user.email?.address,
        signinWalletAddress: user.wallet?.address
      });

      if (response.success) {
        setUserData(response.user);
        setShowPopup(true);
      } else {
        setError('Failed to create user profile');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setError('Failed to create user profile');
    } finally {
      setLoading(false);
    }
  };

  const copyWalletAddress = async () => {
    if (userData?.walletAddress) {
      try {
        await navigator.clipboard.writeText(userData.walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = userData.walletAddress;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  // Don't render if not authenticated or no user data
  if (!showPopup || !userData || loading) return null;

  // Error state
  if (error) {
    return (
      <div className="popup-overlay" onClick={closePopup}>
        <div className="popup-container" onClick={e => e.stopPropagation()}>
          <div className="popup-header">
            <h2 className="popup-title">Error</h2>
            <button className="popup-close" onClick={closePopup}>✕</button>
          </div>
          <div className="profile-content">
            <p style={{ color: 'var(--silver)', textAlign: 'center', padding: '20px' }}>
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-overlay" onClick={closePopup}>
      <div className="popup-container" onClick={e => e.stopPropagation()}>
        <div className="popup-header">
          <h2 className="popup-title">Profile</h2>
          <button className="popup-close" onClick={closePopup}>
            ✕
          </button>
        </div>
        
        <div className="profile-content">
          <div className="profile-avatar">
            <img src="/pfpdefault.png" alt="Profile" />
          </div>
          
          <div className="profile-info">
            <h3 className="profile-name">{userData.username}</h3>
            
            <div className="wallet-section">
              <p className="wallet-label">Wallet Address</p>
              <div className="wallet-address-container">
                <p className="wallet-address">
                  {userData.walletAddress.substring(0, 8)}...{userData.walletAddress.substring(userData.walletAddress.length - 4)}
                </p>
                <button 
                  className="copy-button" 
                  onClick={copyWalletAddress}
                  title={copied ? 'Copied!' : 'Copy wallet address'}
                >
                  {copied ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="popup-footer">
          <button className="popup-link" onClick={closePopup}>
            Pledge
          </button>
          <button className="popup-link" onClick={closePopup}>
            Markets
          </button>
          <button className="popup-link" onClick={closePopup}>
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignInPopup;