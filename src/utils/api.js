// src/utils/api.js - Client-side API helper functions

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
    return 'Invalid request. Please check your input.';
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