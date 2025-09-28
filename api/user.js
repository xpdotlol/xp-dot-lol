// api/user.js - With 7-day username change cooldown
import { createClient } from '@supabase/supabase-js';
import { Keypair } from '@solana/web3.js';
import CryptoJS from 'crypto-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;
const rateLimiter = new Map();

// Rate limiting
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 30; // Increased for username checks
  
  if (!rateLimiter.has(ip)) {
    rateLimiter.set(ip, []);
  }
  
  const requests = rateLimiter.get(ip);
  const validRequests = requests.filter(time => now - time < windowMs);
  
  if (validRequests.length >= maxRequests) {
    return false;
  }
  
  validRequests.push(now);
  rateLimiter.set(ip, validRequests);
  return true;
}

// Generate Solana wallet
function generateSolanaWallet() {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: Buffer.from(keypair.secretKey).toString('base64')
  };
}

// Encrypt private key
function encryptPrivateKey(privateKey) {
  return CryptoJS.AES.encrypt(privateKey, ENCRYPTION_KEY).toString();
}

// Generate custom user ID
async function generateUserId() {
  const { data, error } = await supabase.rpc('generate_user_id');
  if (error) throw error;
  return data;
}

// Format username: 3 letters...3 letters (only for wallet-based default usernames)
function formatUsername(walletAddress) {
  return `${walletAddress.substring(0, 3)}...${walletAddress.substring(walletAddress.length - 3)}`;
}

// Validate username format
function validateUsername(username) {
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

// Check if username is available (no exclusions - prevents hoarding)
async function isUsernameAvailable(username) {
  const validation = validateUsername(username);
  if (!validation.valid) {
    return { available: false, error: validation.error };
  }
  
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .ilike('username', validation.username)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw error;
  }
  
  return { available: !data, username: validation.username };
}

// Check if user can change username (7-day cooldown)
async function canChangeUsername(privyUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('last_username_change')
    .eq('privy_user_id', privyUserId)
    .single();
  
  if (error) {
    throw error;
  }
  
  if (!data.last_username_change) {
    return { canChange: true };
  }
  
  const lastChange = new Date(data.last_username_change);
  const sevenDaysLater = new Date(lastChange.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  
  if (now < sevenDaysLater) {
    return { 
      canChange: false, 
      nextChangeDate: sevenDaysLater,
      daysRemaining: Math.ceil((sevenDaysLater - now) / (1000 * 60 * 60 * 24))
    };
  }
  
  return { canChange: true };
}

// Main API handler
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'create-or-get':
        return await handleCreateOrGetUser(req, res);
      case 'get':
        return await handleGetUser(req, res);
      case 'update':
        return await handleUpdateUser(req, res);
      case 'check-username':
        return await handleCheckUsername(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Check username availability
async function handleCheckUsername(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.body;

  try {
    const result = await isUsernameAvailable(username);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Username check error:', error);
    return res.status(500).json({ error: 'Failed to check username' });
  }
}

// Create new user or get existing user
async function handleCreateOrGetUser(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { privyUserId, loginMethod, email, signinWalletAddress } = req.body;

  if (!privyUserId || !loginMethod) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('username, wallet_address, profile_picture_url, last_username_change')
    .eq('privy_user_id', privyUserId)
    .single();

  if (existingUser) {
    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('privy_user_id', privyUserId);

    return res.status(200).json({
      success: true,
      user: {
        username: existingUser.username,
        walletAddress: existingUser.wallet_address,
        profilePicture: existingUser.profile_picture_url,
        lastUsernameChange: existingUser.last_username_change
      }
    });
  }

  // Generate new wallet and user
  const wallet = generateSolanaWallet();
  const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey);
  const userId = await generateUserId();
  const defaultUsername = formatUsername(wallet.publicKey);

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      user_id: userId,
      privy_user_id: privyUserId,
      username: defaultUsername,
      wallet_address: wallet.publicKey,
      wallet_private_key_encrypted: encryptedPrivateKey,
      login_method: loginMethod,
      signin_wallet_address: signinWalletAddress,
      email: email,
      profile_picture_url: '/pfpdefault.png',
      last_username_change: null // No username change yet for new users
    })
    .select('username, wallet_address, profile_picture_url, last_username_change')
    .single();

  if (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }

  return res.status(201).json({
    success: true,
    user: {
      username: newUser.username,
      walletAddress: newUser.wallet_address,
      profilePicture: newUser.profile_picture_url,
      lastUsernameChange: newUser.last_username_change
    }
  });
}

// Get user data
async function handleGetUser(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { privyUserId } = req.query;

  if (!privyUserId) {
    return res.status(400).json({ error: 'Missing privyUserId' });
  }

  const { data, error } = await supabase
    .from('users')
    .select('username, wallet_address, profile_picture_url, created_at, user_id, last_username_change')
    .eq('privy_user_id', privyUserId)
    .single();

  if (error) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json({
    success: true,
    user: {
      username: data.username,
      walletAddress: data.wallet_address,
      profilePicture: data.profile_picture_url,
      createdAt: data.created_at,
      userId: data.user_id,
      lastUsernameChange: data.last_username_change
    }
  });
}

// Update user profile
async function handleUpdateUser(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { privyUserId, username, profilePicture, usernameChanged } = req.body;

  if (!privyUserId) {
    return res.status(400).json({ error: 'Missing privyUserId' });
  }

  const updateData = {
    updated_at: new Date().toISOString()
  };

  // Handle username update with 7-day cooldown
  if (username && usernameChanged) {
    // Check if user can change username
    const cooldownCheck = await canChangeUsername(privyUserId);
    if (!cooldownCheck.canChange) {
      return res.status(400).json({ 
        error: `Username can only be changed once every 7 days. ${cooldownCheck.daysRemaining} days remaining.`
      });
    }
    
    // Check if username is available
    const availabilityCheck = await isUsernameAvailable(username);
    if (!availabilityCheck.available) {
      return res.status(400).json({ 
        error: availabilityCheck.error || 'Username already taken' 
      });
    }
    
    updateData.username = availabilityCheck.username;
    updateData.last_username_change = new Date().toISOString();
  } else if (username && !usernameChanged) {
    // Username provided but not changed, just validate format
    const validation = validateUsername(username);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    updateData.username = validation.username;
  }

  // Store base64 image directly in database
  if (profilePicture && profilePicture.startsWith('data:image/')) {
    updateData.profile_picture_url = profilePicture;
  }

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('privy_user_id', privyUserId)
    .select('username, wallet_address, profile_picture_url, last_username_change')
    .single();

  if (error) {
    console.error('Update error:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }

  return res.status(200).json({
    success: true,
    user: {
      username: data.username,
      walletAddress: data.wallet_address,
      profilePicture: data.profile_picture_url,
      lastUsernameChange: data.last_username_change
    }
  });
}