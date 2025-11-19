// Custom hook for Firebase Authentication
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  signInWithPopup,
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
        console.warn('Failed to sync user to backend, but login succeeded:', syncError);
        // Try to fetch profile anyway in case user already exists
        await fetchUserProfile(token).catch(() => {
          console.warn('Could not fetch user profile from backend');
        });
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

  const syncUserToBackend = async (userData: any, token?: string) => {
    const tokenToUse = token || idToken;
    if (!tokenToUse) {
      console.error('No ID token available');
      throw new Error('No authentication token available');
    }

    const usersServiceUrl = process.env.REACT_APP_USERS_SERVICE_URL || 'http://localhost:8000';
    
    try {
      console.log('Syncing user to backend at:', `${usersServiceUrl}/users/sync`);
      
      const response = await fetch(`${usersServiceUrl}/users/sync`, {
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
          throw new Error(`Cannot connect to backend service. Please ensure Users-Service is running on ${usersServiceUrl}`);
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please try logging in again.');
        } else {
          throw new Error(errorMessage);
        }
      }

      const result = await response.json();
      console.log('User synced to backend:', result);
      
      // Fetch user profile from backend
      await fetchUserProfile(tokenToUse);
    } catch (error: any) {
      // Re-throw with more context if it's not already an Error object
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Cannot connect to backend service at ${usersServiceUrl}. Please ensure Users-Service is running.`);
      }
      throw error;
    }
  };

  const fetchUserProfile = useCallback(async (token?: string) => {
    const tokenToUse = token || idToken;
    if (!tokenToUse) {
      return;
    }

    try {
      const usersServiceUrl = process.env.REACT_APP_USERS_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${usersServiceUrl}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenToUse}`
        }
      });

      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
      } else {
        console.warn(`Failed to fetch user profile: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
    logout,
    syncUserToBackend
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

