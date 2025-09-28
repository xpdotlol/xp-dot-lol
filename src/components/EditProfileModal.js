import React, { useState, useRef, useCallback, useEffect } from 'react';
import { updateUser, checkUsernameAvailable } from '../utils/api';
import './EditProfileModal.css';

const EditProfileModal = ({ isOpen, onClose, userData, onUserUpdate }) => {
  const [username, setUsername] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [nextUsernameChangeDate, setNextUsernameChangeDate] = useState(null);
  const [currentUserSession, setCurrentUserSession] = useState(null); // Track current session
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Crop state with constraints
  const [crop, setCrop] = useState({ x: 50, y: 50, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // CRITICAL: Complete state reset function
  const resetAllState = useCallback(() => {
    setUsername('');
    setSelectedImage(null);
    setCroppedImage(null);
    setCropping(false);
    setLoading(false);
    setImageUploading(false);
    setError('');
    setUsernameError('');
    setCheckingUsername(false);
    setWalletCopied(false);
    setCanChangeUsername(true);
    setNextUsernameChangeDate(null);
    setCrop({ x: 50, y: 50, width: 200, height: 200 });
    setIsDragging(false);
    setIsResizing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // CRITICAL: Monitor for ANY user session change (including logout/login)
  useEffect(() => {
    // Create unique session identifier from user data
    const newSession = userData?.walletAddress ? 
      `${userData.walletAddress}-${userData.privyUserId || userData.id}` : 
      null;
    
    // If session changed (including logout), completely reset
    if (currentUserSession !== newSession) {
      console.log('User session changed, resetting state:', { 
        old: currentUserSession, 
        new: newSession 
      });
      
      resetAllState();
      setCurrentUserSession(newSession);
      
      // Set username ONLY after confirming session
      if (newSession && userData?.username) {
        setUsername(userData.username);
      }
    }
  }, [userData?.walletAddress, userData?.privyUserId, userData?.id, userData?.username, currentUserSession, resetAllState]);

  // Check if user can change username (7-day cooldown)
  useEffect(() => {
    if (userData?.lastUsernameChange && userData?.walletAddress && currentUserSession) {
      const lastChange = new Date(userData.lastUsernameChange);
      const sevenDaysLater = new Date(lastChange.getTime() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      
      if (now < sevenDaysLater) {
        setCanChangeUsername(false);
        setNextUsernameChangeDate(sevenDaysLater);
      } else {
        setCanChangeUsername(true);
        setNextUsernameChangeDate(null);
      }
    } else if (currentUserSession) {
      setCanChangeUsername(true);
      setNextUsernameChangeDate(null);
    }
  }, [userData?.lastUsernameChange, userData?.walletAddress, currentUserSession]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetAllState();
    }
  }, [isOpen, resetAllState]);

  // Validation functions
  const validateUserSession = () => {
    if (!userData?.walletAddress || !currentUserSession) {
      setError('Invalid session. Please close modal and try again.');
      return false;
    }
    
    const expectedSession = `${userData.walletAddress}-${userData.privyUserId || userData.id}`;
    if (currentUserSession !== expectedSession) {
      setError('Session mismatch detected. Please close modal and try again.');
      return false;
    }
    
    return true;
  };

  const validateUsername = (value) => {
    const validChars = /^[a-zA-Z0-9-]*$/;
    if (!validChars.test(value)) {
      return 'Only letters, numbers, and hyphens allowed';
    }
    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (value.length > 20) {
      return 'Username must be 20 characters or less';
    }
    return '';
  };

  const formatTimeRemaining = (date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days === 1 ? '1 day' : `${days} days`;
  };

  const handleUsernameChange = async (e) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    
    // CRITICAL: Validate session before any operation
    if (!validateUserSession()) {
      return;
    }
    
    // Check if user can change username
    if (!canChangeUsername) {
      setUsernameError(`Username can only be changed once every 7 days. Next change available in ${formatTimeRemaining(nextUsernameChangeDate)}.`);
      return;
    }
    
    const validation = validateUsername(value);
    if (validation) {
      setUsernameError(validation);
      return;
    }

    // If it's the same as current username, no need to check
    if (value === userData?.username?.toLowerCase()) {
      setUsernameError('');
      return;
    }

    setCheckingUsername(true);
    setUsernameError('');
    
    try {
      const response = await checkUsernameAvailable(value);
      if (!response.available) {
        setUsernameError('Username already taken');
      }
    } catch (error) {
      setUsernameError('Error checking username');
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleImageSelect = (e) => {
    // CRITICAL: Validate session before processing
    if (!validateUserSession()) {
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a JPG, PNG, JPEG, or WebP image');
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      setError('Image must be less than 1.5MB');
      return;
    }

    setError('');
    setImageUploading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 500 || img.height < 500) {
          setError('Image must be at least 500x500 pixels');
          setImageUploading(false);
          return;
        }
        setSelectedImage(e.target.result);
        setCropping(true);
        setCrop({ x: 50, y: 50, width: 200, height: 200 });
        setImageUploading(false);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const constrainCrop = (newCrop, imageRect) => {
    const maxX = imageRect.width - newCrop.width;
    const maxY = imageRect.height - newCrop.height;
    
    return {
      x: Math.max(0, Math.min(newCrop.x, maxX)),
      y: Math.max(0, Math.min(newCrop.y, maxY)),
      width: Math.min(newCrop.width, imageRect.width),
      height: Math.min(newCrop.height, imageRect.height)
    };
  };

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    
    if (e.target.classList.contains('resize-corner')) {
      setIsResizing(true);
    } else {
      setIsDragging(true);
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!imageRef.current || (!isDragging && !isResizing)) return;
    
    const imageRect = imageRef.current.getBoundingClientRect();
    const parentRect = imageRef.current.parentElement.getBoundingClientRect();
    
    if (isDragging) {
      const newX = e.clientX - parentRect.left - dragStart.x;
      const newY = e.clientY - parentRect.top - dragStart.y;
      
      const newCrop = { ...crop, x: newX, y: newY };
      const constrainedCrop = constrainCrop(newCrop, imageRect);
      setCrop(constrainedCrop);
      
    } else if (isResizing) {
      const newWidth = e.clientX - parentRect.left - crop.x;
      const newHeight = e.clientY - parentRect.top - crop.y;
      
      const size = Math.min(Math.max(100, Math.min(newWidth, newHeight)), 
                           Math.min(imageRect.width - crop.x, imageRect.height - crop.y));
      
      setCrop(prev => ({ ...prev, width: size, height: size }));
    }
  }, [isDragging, isResizing, dragStart, crop]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const cropImage = () => {
    if (!selectedImage || !imageRef.current || !canvasRef.current) return;

    setImageUploading(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    canvas.width = 500;
    canvas.height = 500;

    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;

    const actualCropX = crop.x * scaleX;
    const actualCropY = crop.y * scaleY;
    const actualCropWidth = crop.width * scaleX;
    const actualCropHeight = crop.height * scaleY;

    ctx.drawImage(
      img,
      actualCropX,
      actualCropY,
      actualCropWidth,
      actualCropHeight,
      0,
      0,
      500,
      500
    );

    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        setCroppedImage(reader.result);
        setCropping(false);
        setImageUploading(false);
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.9);
  };

  const copyWalletAddress = async () => {
    if (!validateUserSession()) {
      return;
    }

    if (userData?.walletAddress) {
      try {
        await navigator.clipboard.writeText(userData.walletAddress);
        setWalletCopied(true);
        setTimeout(() => setWalletCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const handleSave = async () => {
    // CRITICAL: Final session validation before save
    if (!validateUserSession()) {
      return;
    }

    if (usernameError || checkingUsername || imageUploading) {
      return;
    }

    if (!username.trim()) {
      setUsernameError('Username is required');
      return;
    }

    // Check if username changed and if user can change it
    const usernameChanged = username.trim().toLowerCase() !== userData?.username?.toLowerCase();
    if (usernameChanged && !canChangeUsername) {
      setUsernameError(`Username can only be changed once every 7 days. Next change available in ${formatTimeRemaining(nextUsernameChangeDate)}.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updateData = {
        privyUserId: userData.privyUserId || userData.id,
        username: username.trim(),
        usernameChanged: usernameChanged
      };

      if (croppedImage) {
        updateData.profilePicture = croppedImage;
      }

      const response = await updateUser(updateData);
      
      if (response.success) {
        onUserUpdate(response.user);
        onClose();
      } else {
        setError('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Check if save should be disabled
  const isSaveDisabled = loading || usernameError || checkingUsername || imageUploading || !currentUserSession;

  // Don't render if no valid session
  if (!isOpen || !currentUserSession) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-modal-container" onClick={e => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h2>Edit Profile</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="edit-modal-content">
          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="profile-grid">
            {/* Profile Picture - Spans left column, both rows */}
            <div className="grid-item profile-picture-section">
              <label className="section-label">Profile Picture</label>
              <div className="profile-picture-editor">
                <img 
                  src={croppedImage || userData?.profilePicture || '/pfpdefault.png'} 
                  alt="Profile" 
                  className="profile-preview"
                />
                <button 
                  className="select-image-btn" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                >
                  {imageUploading ? 'Processing...' : 'Select Image'}
                </button>
                <p className="image-hint">Min 500x500<br/>Max 1.5MB</p>
              </div>
            </div>

            {/* Username - Top right */}
            <div className="grid-item username-section">
              <label className="section-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                className={`username-input ${usernameError ? 'error' : ''}`}
                placeholder="Enter username"
                maxLength={20}
                disabled={!canChangeUsername}
              />
              {checkingUsername && <p className="checking-text">Checking...</p>}
              {usernameError && <p className="field-error">{usernameError}</p>}
              <p className="username-hint">
                {canChangeUsername 
                  ? '3-20 chars • a-z, 0-9, -' 
                  : `Can change in ${formatTimeRemaining(nextUsernameChangeDate)}`
                }
              </p>
            </div>

            {/* Site Wallet - Bottom right */}
            <div className="grid-item wallet-section">
              <label className="section-label">Site Wallet</label>
              <div className="wallet-display">
                <span className="wallet-text">
                  {userData?.walletAddress ? 
                    `${userData.walletAddress.substring(0, 6)}...${userData.walletAddress.substring(userData.walletAddress.length - 4)}` 
                    : 'Loading...'
                  }
                </span>
                <button 
                  className="copy-wallet-btn" 
                  onClick={copyWalletAddress}
                  title={walletCopied ? 'Copied!' : 'Copy wallet address'}
                >
                  {walletCopied ? '✓' : '⧉'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="edit-modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            {loading ? 'Saving...' : imageUploading ? 'Processing Image...' : 'Save'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />

        {cropping && selectedImage && (
          <div className="crop-overlay">
            <div className="crop-container">
              <div className="crop-header">
                <h3>Crop to 500x500</h3>
              </div>
              <div className="crop-content">
                <div className="image-crop-area">
                  <img
                    ref={imageRef}
                    src={selectedImage}
                    alt="Crop preview"
                    className="crop-image"
                    draggable={false}
                  />
                  <div
                    className="crop-selector"
                    style={{
                      left: crop.x,
                      top: crop.y,
                      width: crop.width,
                      height: crop.height,
                    }}
                    onMouseDown={handleMouseDown}
                  >
                    <div className="resize-corner" />
                  </div>
                </div>
              </div>
              <div className="crop-footer">
                <button onClick={() => setCropping(false)}>Cancel</button>
                <button onClick={cropImage} disabled={imageUploading}>
                  {imageUploading ? 'Processing...' : 'Crop'}
                </button>
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default EditProfileModal;