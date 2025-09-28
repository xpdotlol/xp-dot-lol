// src/utils/api.js - Complete client-side API helper functions

const API_BASE = '/api/user';

// Create or get user (called on first sign-in)
export async function createOrGetUser(userData) {
  try {
    const response = await fetch(`${API_BASE}?action=create-or-get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Create/Get User Error:', error);
    throw error;
  }
}

// Get user data
export async function getUser(privyUserId) {
  try {
    const response = await fetch(`${API_BASE}?action=get&privyUserId=${encodeURIComponent(privyUserId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get User Error:', error);
    throw error;
  }
}

// Check if username is available
export async function checkUsernameAvailable(username, excludeUserId = null) {
  try {
    const response = await fetch(`${API_BASE}?action=check-username`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, excludeUserId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Check Username Error:', error);
    throw error;
  }
}

// Update user profile
export async function updateUser(userData) {
  try {
    const response = await fetch(`${API_BASE}?action=update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Update User Error:', error);
    throw error;
  }
}

// Helper function to handle API errors
export function handleApiError(error) {
  if (error.message.includes('429')) {
    return 'Too many requests. Please try again later.';
  } else if (error.message.includes('500')) {
    return 'Server error. Please try again later.';
  } else if (error.message.includes('404')) {
    return 'User not found.';
  } else if (error.message.includes('400')) {
    return error.message || 'Invalid request. Please check your input.';
  } else {
    return error.message || 'An error occurred. Please try again.';
  }
}

// Utility function to validate image file
export function validateImageFile(file) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 1.5 * 1024 * 1024; // 1.5MB
  
  if (!validTypes.includes(file.type)) {
    throw new Error('Please select a JPG, PNG, JPEG, or WebP image');
  }
  
  if (file.size > maxSize) {
    throw new Error('Image must be less than 1.5MB');
  }
  
  return true;
}

// Utility function to convert file to base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Validate username format client-side
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim().toLowerCase();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }
  
  // Only allow letters, numbers, and hyphens
  const validChars = /^[a-zA-Z0-9-]+$/;
  if (!validChars.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and hyphens' };
  }
  
  return { valid: true, username: trimmed };
}

// Debounce function for username checking
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Format wallet address for display
export function formatWalletAddress(address, startChars = 6, endChars = 4) {
  if (!address) return 'Loading...';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

// Copy text to clipboard with fallback
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      console.error('Failed to copy text:', fallbackError);
      return false;
    }
  }
}

// Check if file is valid image
export function isValidImageFile(file) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 1.5 * 1024 * 1024; // 1.5MB
  
  return {
    validType: validTypes.includes(file.type),
    validSize: file.size <= maxSize,
    type: file.type,
    size: file.size,
    sizeInMB: (file.size / 1024 / 1024).toFixed(2)
  };
}

// Get image dimensions
export function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}