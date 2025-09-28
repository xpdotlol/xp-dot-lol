import React, { useState, useRef, useCallback } from 'react';
import { updateUser } from '../utils/api';
import './EditProfileModal.css';

const EditProfileModal = ({ isOpen, onClose, userData, onUserUpdate }) => {
  const [username, setUsername] = useState(userData?.username || '');
  const [selectedImage, setSelectedImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Crop state - 500x500
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 500, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a JPG, PNG, JPEG, or WebP image');
      return;
    }

    // Validate file size (1.5MB)
    if (file.size > 1.5 * 1024 * 1024) {
      setError('Image must be less than 1.5MB');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Check minimum dimensions
        if (img.width < 500 || img.height < 500) {
          setError('Image must be at least 500x500 pixels');
          return;
        }
        setSelectedImage(e.target.result);
        setCropping(true);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - crop.x,
      y: e.clientY - crop.y
    });
  }, [crop]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(e.clientX - dragStart.x, rect.width - crop.width));
    const newY = Math.max(0, Math.min(e.clientY - dragStart.y, rect.height - crop.height));

    setCrop(prev => ({ ...prev, x: newX, y: newY }));
  }, [isDragging, dragStart, crop.width, crop.height]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const cropImage = () => {
    if (!selectedImage || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Set canvas to 500x500
    canvas.width = 500;
    canvas.height = 500;

    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    ctx.drawImage(
      img,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
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
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.8);
  };

  const handleSave = async () => {
    if (!userData?.username && !username.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updateData = {
        privyUserId: userData.privyUserId || userData.id,
        username: username.trim() || userData.username,
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

  const resetImage = () => {
    setSelectedImage(null);
    setCroppedImage(null);
    setCropping(false);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

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

          {/* Profile Picture Section */}
          <div className="profile-section">
            <label className="section-label">Profile Picture</label>
            <div className="profile-picture-editor">
              <div className="current-picture">
                <img 
                  src={croppedImage || userData?.profilePicture || '/pfpdefault.png'} 
                  alt="Profile" 
                  className="profile-preview"
                />
              </div>
              <div className="picture-controls">
                <button 
                  className="select-image-btn" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select
                </button>
                {selectedImage && (
                  <button className="reset-image-btn" onClick={resetImage}>
                    Reset
                  </button>
                )}
              </div>
            </div>
            <p className="image-hint">Min 500x500 • Max 1.5MB • JPG, PNG, JPEG, WebP</p>
          </div>

          {/* Username Section */}
          <div className="username-section">
            <label className="section-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="username-input"
              placeholder="Enter username"
              maxLength={20}
            />
          </div>

          {/* Wallet Info */}
          <div className="wallet-info">
            <label className="section-label">Site Wallet</label>
            <div className="wallet-display">
              <span className="wallet-text">
                {userData?.walletAddress ? 
                  `${userData.walletAddress.substring(0, 3)}...${userData.walletAddress.substring(userData.walletAddress.length - 3)}` 
                  : 'Loading...'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="edit-modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />

        {/* Image Cropping Modal */}
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
                  />
                </div>
              </div>
              <div className="crop-footer">
                <button onClick={() => setCropping(false)}>Cancel</button>
                <button onClick={cropImage}>Crop</button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default EditProfileModal;