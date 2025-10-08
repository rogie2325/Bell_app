import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { ref as dbRef, set, get } from 'firebase/database';
import { auth, database } from '../firebase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sign up with email and password
  const signup = async (email, password, displayName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      return userCredential;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  // Sign in with email and password
  const login = async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Check if mobile device
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Use redirect for mobile devices
        await signInWithRedirect(auth, provider);
      } else {
        // Use popup for desktop
        return await signInWithPopup(auth, provider);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      if (currentUser) {
        await updateProfile(currentUser, updates);
        
        // Refresh the user to get updated data
        const updatedUser = { ...currentUser, ...updates };
        setCurrentUser(updatedUser);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  // Update user bio (stored in Realtime Database)
  const updateUserBio = async (bio) => {
    try {
      if (!database) {
        console.warn('Database not available, bio stored locally only');
        if (currentUser) {
          setCurrentUser({ ...currentUser, bio });
        }
        return;
      }
      
      if (currentUser) {
        const userBioRef = dbRef(database, `users/${currentUser.uid}/bio`);
        await set(userBioRef, bio);
        
        // Update local state
        setCurrentUser({ ...currentUser, bio });
      }
    } catch (error) {
      console.error('Bio update error:', error);
      throw error;
    }
  };

  // Load user bio from database
  const loadUserBio = async (user) => {
    try {
      if (!database) {
        console.warn('Database not available, cannot load bio');
        return null;
      }
      
      if (user) {
        const userBioRef = dbRef(database, `users/${user.uid}/bio`);
        const snapshot = await get(userBioRef);
        if (snapshot.exists()) {
          return snapshot.val();
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading bio:', error);
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Load user bio from database
        const bio = await loadUserBio(user);
        setCurrentUser({ ...user, bio });
        console.log('👤 User authenticated:', user.email);
      } else {
        setCurrentUser(null);
        console.log('👤 No user authenticated');
      }
      setLoading(false);
    });

    // Check for redirect result on mount (for mobile Google sign-in)
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log('✅ Redirect sign-in successful');
        }
      })
      .catch((error) => {
        console.error('Redirect sign-in error:', error);
        setError(error.message);
      });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    error,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    updateUserBio,
    signInWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
