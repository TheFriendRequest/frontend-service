// Custom hook for Firebase Authentication
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  IdTokenResult
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

interface UserProfile {
  user_id: number;
  firebase_uid: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  profile_picture: string | null;
  created_at: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, userData: {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  syncUserToBackend: (userData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Get ID token
      const tokenResult: IdTokenResult = await user.getIdTokenResult();
      const token = tokenResult.token;
      setIdToken(token);
      
      // Try to sync user to backend, but don't fail login if this fails
      // User is already authenticated via Firebase
      try {
        await syncUserToBackend({
          first_name: user.displayName?.split(' ')[0] || '',
          last_name: user.displayName?.split(' ').slice(1).join(' ') || '',
          username: user.email?.split('@')[0] || '',
          email: user.email || '',
          profile_picture: user.photoURL || null
        }, token);
      } catch (syncError: any) {
        // Log the error but don't throw - user is still logged in via Firebase
        console.error('Failed to sync user to backend:', syncError);
        console.error('Error details:', syncError.message);
        // Try to fetch profile anyway in case user already exists
        try {
          await fetchUserProfile(token);
        } catch (profileError: any) {
          console.error('Could not fetch user profile from backend:', profileError);
          // Show error to user
          alert('Warning: Could not sync with backend. Some features may not work. Please try refreshing the page.');
        }
      }
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      // Only throw if it's an actual Firebase authentication error
      if (error.code && error.code.startsWith('auth/')) {
        throw new Error(`Authentication failed: ${error.message || 'Please try again.'}`);
      }
      throw new Error('Failed to sign in. Please try again.');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Get ID token
      const tokenResult: IdTokenResult = await user.getIdTokenResult();
      const token = tokenResult.token;
      setIdToken(token);
      
      // Fetch user profile from backend
      await fetchUserProfile(token).catch(() => {
        console.warn('Could not fetch user profile from backend');
      });
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      let errorMessage = 'Failed to sign in. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up first.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (error.code && error.code.startsWith('auth/')) {
        errorMessage = error.message || errorMessage;
      }
      throw new Error(errorMessage);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    userData: {
      first_name: string;
      last_name: string;
      username: string;
      email: string;
    }
  ) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Get ID token
      const tokenResult: IdTokenResult = await user.getIdTokenResult();
      const token = tokenResult.token;
      setIdToken(token);
      
      // Sync user to backend
      try {
        await syncUserToBackend({
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username,
          email: userData.email,
          profile_picture: null
        }, token);
      } catch (syncError: any) {
        console.warn('Failed to sync user to backend:', syncError);
        // User is still authenticated via Firebase, but backend sync failed
        throw new Error('Account created but failed to sync with backend. Please try logging in.');
      }
    } catch (error: any) {
      console.error('Error signing up with email:', error);
      let errorMessage = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code && error.code.startsWith('auth/')) {
        errorMessage = error.message || errorMessage;
      }
      throw new Error(errorMessage);
    }
  };

  const syncUserToBackend = async (userData: any, token?: string) => {
    const tokenToUse = token || idToken;
    if (!tokenToUse) {
      console.error('No ID token available');
      throw new Error('No authentication token available');
    }

    const compositeServiceUrl = process.env.REACT_APP_COMPOSITE_SERVICE_URL || 'http://localhost:8000';
    
    try {
      console.log('Syncing user to backend at:', `${compositeServiceUrl}/api/users/sync`);
      
      const response = await fetch(`${compositeServiceUrl}/api/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Failed to sync user to backend';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = `Backend error: ${response.status} ${response.statusText}`;
        }
        
        // Distinguish between different error types
        if (response.status === 0 || response.status >= 500) {
          throw new Error(`Cannot connect to backend service. Please ensure Composite Service is running on ${compositeServiceUrl}`);
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please try logging in again.');
        } else {
          throw new Error(errorMessage);
        }
      }

      const result = await response.json();
      console.log('User synced to backend successfully:', result);
      
      // Fetch user profile from backend after sync
      try {
        await fetchUserProfile(tokenToUse);
        console.log('User profile fetched successfully after sync');
      } catch (profileError: any) {
        console.error('Error fetching profile after sync:', profileError);
        // Don't throw - profile fetch failure shouldn't break the sync
      }
    } catch (error: any) {
      // Re-throw with more context if it's not already an Error object
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Cannot connect to backend service at ${compositeServiceUrl}. Please ensure Composite Service is running.`);
      }
      throw error;
    }
  };

  const fetchUserProfile = useCallback(async (token?: string) => {
    const tokenToUse = token || idToken;
    if (!tokenToUse) {
      console.warn('No token available for fetching user profile');
      return;
    }

    try {
      const compositeServiceUrl = process.env.REACT_APP_COMPOSITE_SERVICE_URL || 'http://localhost:8000';
      console.log('Fetching user profile from:', `${compositeServiceUrl}/api/users/me`);
      
      const response = await fetch(`${compositeServiceUrl}/api/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenToUse}`
        }
      });

      // Log eTag from response (if present)
      const etag = response.headers.get('ETag') || response.headers.get('etag');
      console.log('🔐 Auth Service - Response Headers (GET /users/me):', {
        'ETag': etag || '(not found)',
        'All Headers': Array.from(response.headers.entries()),
        'URL': `${compositeServiceUrl}/api/users/me`
      });
      if (etag) {
        console.log('✅ eTag received:', etag);
      } else {
        console.warn('⚠️  eTag not found in response headers');
      }

      if (response.ok) {
        const profile = await response.json();
        console.log('User profile fetched successfully:', profile);
        setUserProfile(profile);
      } else {
        const errorText = await response.text().catch(() => '');
        console.error(`Failed to fetch user profile: ${response.status} ${response.statusText}`, errorText);
        // If 404, user might not be synced yet - that's okay, don't throw
        if (response.status !== 404) {
          console.error('Non-404 error fetching profile, will retry later');
        }
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      // Don't throw - let it fail silently and retry later
    }
  }, [idToken]);

  const logout = async () => {
    try {
      await signOut(auth);
      setIdToken(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      setCurrentUser(user);
      if (user) {
        // Get fresh ID token
        try {
          const tokenResult = await user.getIdTokenResult();
          const token = tokenResult.token;
          setIdToken(token);
          // Fetch user profile from backend
          await fetchUserProfile(token);
        } catch (error) {
          console.error('Error getting ID token:', error);
        }
      } else {
        setIdToken(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserProfile]);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    idToken,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    syncUserToBackend
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

