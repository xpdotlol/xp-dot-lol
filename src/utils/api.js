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
      throw new Error(`HTTP error! status: ${response.status}`);
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
    const response = await fetch(`${API_BASE}?action=get&privyUserId=${privyUserId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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
      throw new Error(`HTTP error! status: ${response.status}`);
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
  } else {
    return 'An error occurred. Please try again.';
  }
}