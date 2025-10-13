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
        // Separate Firebase Auth fields from custom fields
        const authFields = {};
        const customFields = {};
        
        // Firebase Auth only supports displayName and photoURL
        if (updates.displayName !== undefined) authFields.displayName = updates.displayName;
        if (updates.photoURL !== undefined) authFields.photoURL = updates.photoURL;
        
        // Everything else goes to local storage as fallback
        Object.keys(updates).forEach(key => {
          if (key !== 'displayName' && key !== 'photoURL') {
            customFields[key] = updates[key];
          }
        });
        
        // Update Firebase Auth profile
        if (Object.keys(authFields).length > 0) {
          await updateProfile(currentUser, authFields);
          console.log('✅ Firebase Auth profile updated');
        }
        
        // Try to update custom fields in Realtime Database, fallback to localStorage
        if (Object.keys(customFields).length > 0) {
          try {
            if (database) {
              const userRef = dbRef(database, `users/${currentUser.uid}/profile`);
              await set(userRef, customFields);
              console.log('✅ Profile data saved to Firebase Database');
            }
          } catch (dbError) {
            console.warn('⚠️ Firebase Database write failed, using localStorage:', dbError);
            // Store in localStorage as fallback
            const storageKey = `bell_profile_${currentUser.uid}`;
            const existingData = JSON.parse(localStorage.getItem(storageKey) || '{}');
            const updatedData = { ...existingData, ...customFields };
            localStorage.setItem(storageKey, JSON.stringify(updatedData));
            console.log('✅ Profile data saved to localStorage');
          }
        }
                // Update the user object properties directly to preserve Firebase methods
        Object.assign(currentUser, updates);
        // Force React re-render using functional update
        setCurrentUser(prevUser => {
          // Return the same object but trigger re-render
          return currentUser;
        });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  // Update user bio with fallback to localStorage
  const updateUserBio = async (bio) => {
    try {
      if (currentUser) {
        let bioSaved = false;
        
        // Try to save to Firebase Database first
        if (database) {
          try {
            const userBioRef = dbRef(database, `users/${currentUser.uid}/bio`);
            await set(userBioRef, bio);
            console.log('✅ Bio saved to Firebase Database');
            bioSaved = true;
          } catch (dbError) {
            console.warn('⚠️ Firebase Database bio save failed:', dbError);
          }
        }
        
        // Fallback to localStorage if Firebase failed
        if (!bioSaved) {
          const storageKey = `bell_profile_${currentUser.uid}`;
          const existingData = JSON.parse(localStorage.getItem(storageKey) || '{}');
          existingData.bio = bio;
          localStorage.setItem(storageKey, JSON.stringify(existingData));
          console.log('✅ Bio saved to localStorage');
        }
        
        // Update the user object directly to preserve Firebase methods
        currentUser.bio = bio;
        // Force React re-render using functional update
        setCurrentUser(prevUser => {
          return currentUser;
        });
      }
    } catch (error) {
      console.error('Bio update error:', error);
      throw error;
    }
  };

  // Get fresh authentication token for secure operations
  const getAuthToken = async () => {
    try {
      if (!currentUser) {
        throw new Error('No user authenticated');
      }
      
      // Get fresh token
      const token = await currentUser.getIdToken(true);
      console.log('✅ Fresh auth token obtained');
      return token;
    } catch (error) {
      console.error('❌ Failed to get auth token:', error);
      throw error;
    }
  };

  // Load user profile data from database or localStorage
  const loadUserProfileData = async (user) => {
    if (!user) return {};
    
    let profileData = {};
    
    // Try to load from Firebase Database first
    try {
      if (database) {
        const userDataRef = dbRef(database, `users/${user.uid}`);
        const snapshot = await get(userDataRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          profileData = {
            bio: data.bio || null,
            location: data.profile?.location || null,
            interests: data.profile?.interests || null,
            favoriteGenres: data.profile?.favoriteGenres || null,
            socialHandle: data.profile?.socialHandle || null,
            profileTheme: data.profile?.profileTheme || 'default'
          };
          console.log('✅ Profile data loaded from Firebase Database');
          return profileData;
        }
      }
    } catch (error) {
      console.warn('⚠️ Firebase Database read failed, trying localStorage:', error);
    }
    
    // Fallback to localStorage
    try {
      const storageKey = `bell_profile_${user.uid}`;
      const localData = localStorage.getItem(storageKey);
      if (localData) {
        const parsedData = JSON.parse(localData);
        profileData = {
          bio: parsedData.bio || null,
          location: parsedData.location || null,
          interests: parsedData.interests || null,
          favoriteGenres: parsedData.favoriteGenres || null,
          socialHandle: parsedData.socialHandle || null,
          profileTheme: parsedData.profileTheme || 'default'
        };
        console.log('✅ Profile data loaded from localStorage');
        return profileData;
      }
    } catch (error) {
      console.error('Error loading profile data from localStorage:', error);
    }
    
    // Return empty data if nothing found
    console.log('ℹ️ No profile data found, using defaults');
    return {
      bio: null,
      location: null,
      interests: null,
      favoriteGenres: null,
      socialHandle: null,
      profileTheme: 'default'
    };
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Ensure the user token is fresh and valid
          await user.getIdToken(true); // Force refresh token
          
          // Load user profile data from database
          const profileData = await loadUserProfileData(user);
          
          // Preserve the original Firebase user object and add profile data as properties
          Object.assign(user, profileData);
          setCurrentUser(user);
          console.log('👤 User authenticated:', user.email);
          console.log('✅ User token and profile data loaded successfully');
          console.log('📋 Profile data loaded:');
          console.log('   photoURL:', user.photoURL);
          console.log('   bio:', user.bio);
          console.log('   location:', user.location);
          console.log('   interests:', user.interests);
        } catch (error) {
          console.error('❌ Token refresh error:', error);
          // If token refresh fails, still set the user but log the error
          const profileData = await loadUserProfileData(user);
          Object.assign(user, profileData);
          setCurrentUser(user);
        }
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
    signInWithGoogle,
    getAuthToken
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
