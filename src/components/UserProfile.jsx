import React, { useState, useRef } from 'react';
import { User, Mail, LogOut, Edit2, Save, X, Camera, Upload, MapPin, Heart, Film, Instagram } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import ImageCropper from './ImageCropper';
import './UserProfile.css';

const UserProfile = ({ onClose }) => {
  const { currentUser, logout, updateUserProfile, updateUserBio, getAuthToken } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [interests, setInterests] = useState(currentUser?.interests || '');
  const [favoriteGenres, setFavoriteGenres] = useState(currentUser?.favoriteGenres || '');
  const [socialHandle, setSocialHandle] = useState(currentUser?.socialHandle || '');
  const [profileTheme, setProfileTheme] = useState(currentUser?.profileTheme || 'default');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef(null);

  const profileThemes = [
    { id: 'default', name: '🎨 Default', color: '#3b82f6' },
    { id: 'sunset', name: '🌅 Sunset', color: '#f59e0b' },
    { id: 'ocean', name: '🌊 Ocean', color: '#06b6d4' },
    { id: 'forest', name: '🌿 Forest', color: '#10b981' },
    { id: 'purple', name: '💜 Purple', color: '#8b5cf6' },
    { id: 'rose', name: '🌹 Rose', color: '#f43f5e' }
  ];

  // Debug: Log storage configuration on component mount and update form when user changes
  React.useEffect(() => {
    console.log('🔥 UserProfile mounted/updated');
    console.log('Current user:', currentUser?.uid, currentUser?.email);
    
    // Update form fields when user data changes
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setBio(currentUser.bio || '');
      setLocation(currentUser.location || '');
      setInterests(currentUser.interests || '');
      setFavoriteGenres(currentUser.favoriteGenres || '');
      setSocialHandle(currentUser.socialHandle || '');
      setProfileTheme(currentUser.profileTheme || 'default');
    }
    
    // Test if getIdToken is available
    if (currentUser && typeof currentUser.getIdToken === 'function') {
      console.log('✅ getIdToken method is available');
    } else {
      console.log('❌ getIdToken method is NOT available');
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      if (onClose) onClose();
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to logout');
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update display name and other profile fields
      await updateUserProfile({ 
        displayName: displayName.trim(),
        location: location.trim(),
        interests: interests.trim(),
        favoriteGenres: favoriteGenres.trim(),
        socialHandle: socialHandle.trim(),
        profileTheme: profileTheme
      });
      
      // Update bio if it changed
      if (bio !== currentUser?.bio) {
        await updateUserBio(bio.trim());
      }
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Debug: Log the updated user object
      console.log('🔄 Profile saved, current user object:', {
        displayName: currentUser?.displayName,
        bio: currentUser?.bio,
        location: currentUser?.location,
        interests: currentUser?.interests,
        favoriteGenres: currentUser?.favoriteGenres,
        socialHandle: currentUser?.socialHandle,
        profileTheme: currentUser?.profileTheme
      });
      
      // Force refresh of the entire component
      setRefreshKey(prev => prev + 1);
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Profile update error:', error);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = async (event) => {
    console.log('📸 Photo select triggered');
    console.log('Event target:', event.target);
    console.log('Files:', event.target.files);
    
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    console.log('✅ File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type);
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('❌ File too large:', file.size);
      setError('Image size should be less than 5MB');
      return;
    }

    console.log('🖼️ Creating image URL for cropping...');
    
    // Create image URL for cropping
    const imageUrl = URL.createObjectURL(file);
    console.log('🔗 Image URL created:', imageUrl);
    
    setSelectedImage(imageUrl);
    setShowCropModal(true);
    setError('');
    
    console.log('🎨 Crop modal should be visible now');
    console.log('State - showCropModal:', true);
    console.log('State - selectedImage:', imageUrl);
  };

  const handlePhotoUpload = async (croppedImageBlob) => {
    console.log('📸 Photo upload triggered with cropped image');
    console.log('🖼️ Cropped image blob:', croppedImageBlob);
    console.log('📊 Blob details:', {
      size: croppedImageBlob?.size,
      type: croppedImageBlob?.type
    });
    
    // Check if user is authenticated
    if (!currentUser) {
      console.error('❌ No user logged in');
      setError('Please log in to upload a photo');
      return;
    }
    
    console.log('✅ User authenticated:', currentUser.uid);

    setUploadingPhoto(true);
    setShowCropModal(false);
    setError('');
    console.log('🔄 Starting upload...');
    console.log('🔥 Firebase Storage instance:', storage);
    console.log('🪣 Storage bucket:', storage.app.options.storageBucket);

    try {
      // Get fresh authentication token directly from Firebase user
      console.log('🔑 Getting fresh authentication token...');
      await currentUser.getIdToken(true); // Use the Firebase user object directly
      console.log('✅ Authentication token refreshed');

      // Create a unique filename
      const filename = `profile-photos/${currentUser.uid}/${Date.now()}_cropped.jpg`;
      const storageRef = ref(storage, filename);
      console.log('📁 Upload path:', filename);
      console.log('📍 Storage ref:', storageRef);

      // Upload file with metadata for better compatibility
      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          'uploadedBy': currentUser.uid,
          'uploadedAt': new Date().toISOString(),
          'cropped': 'true'
        }
      };

      // Upload file
      console.log('⬆️ Uploading cropped image to Firebase Storage...');
      console.log('📦 File blob:', croppedImageBlob);
      console.log('📋 Metadata:', metadata);
      await uploadBytes(storageRef, croppedImageBlob, metadata);
      console.log('✅ File uploaded successfully');

      // Get download URL
      console.log('🔗 Getting download URL...');
      const photoURL = await getDownloadURL(storageRef);
      console.log('✅ Download URL:', photoURL);

      // Update user profile
      console.log('👤 Updating user profile...');
      await updateUserProfile({ photoURL });
      console.log('✅ Profile updated successfully!');

      setSuccess('Profile photo updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('❌ Photo upload error:', error);
      console.error('Error details:', error.message, error.code);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to upload photo. ';
      
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'Permission denied. Please check Firebase Storage rules.';
      } else if (error.code === 'storage/unauthenticated') {
        errorMessage = 'Authentication error. Please sign out and sign back in.';
      } else if (error.message && error.message.includes('getIdToken')) {
        errorMessage = 'Authentication token error. Please sign out and sign back in.';
      } else if (error.code === 'storage/canceled') {
        errorMessage = 'Upload was canceled.';
      } else if (error.code === 'storage/unknown') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setUploadingPhoto(false);
      // Clean up image URL
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage(null);
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      console.log('🔄 Upload process complete');
    }
  };

  const handleCancel = () => {
    setDisplayName(currentUser?.displayName || '');
    setBio(currentUser?.bio || '');
    setLocation(currentUser?.location || '');
    setInterests(currentUser?.interests || '');
    setFavoriteGenres(currentUser?.favoriteGenres || '');
    setSocialHandle(currentUser?.socialHandle || '');
    setProfileTheme(currentUser?.profileTheme || 'default');
    setIsEditing(false);
    setError('');
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
      setSelectedImage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Direct photo upload without cropping (for testing)
  const handleDirectPhotoUpload = async (file) => {
    console.log('⚡ Direct photo upload started');
    
    if (!currentUser) {
      console.error('❌ No user logged in');
      setError('Please log in to upload a photo');
      return;
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    setError('');
    
    try {
      console.log('🔑 Getting fresh authentication token...');
      await currentUser.getIdToken(true);
      console.log('✅ Authentication token refreshed');

      const filename = `profile-photos/${currentUser.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, filename);
      
      const metadata = {
        contentType: file.type,
        customMetadata: {
          'uploadedBy': currentUser.uid,
          'uploadedAt': new Date().toISOString()
        }
      };

      console.log('⬆️ Uploading direct image to Firebase Storage...');
      await uploadBytes(storageRef, file, metadata);
      console.log('✅ File uploaded successfully');

      console.log('🔗 Getting download URL...');
      const photoURL = await getDownloadURL(storageRef);
      console.log('✅ Download URL:', photoURL);

      console.log('👤 Updating user profile...');
      await updateUserProfile({ photoURL });
      console.log('✅ Profile updated successfully!');

      setSuccess('Profile photo updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('❌ Direct photo upload error:', error);
      setError('Failed to upload photo: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <>
      {showCropModal && selectedImage && (
        <ImageCropper
          image={selectedImage}
          onSave={handlePhotoUpload}
          onCancel={handleCropCancel}
        />
      )}
      
      <div className="user-profile-overlay" onClick={onClose}>
        <div className="user-profile-card" onClick={(e) => e.stopPropagation()}>
        <button className="profile-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="profile-header">
          <div className="profile-avatar-container">
            <div className="profile-avatar">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" />
              ) : (
                <User size={32} />
              )}
              {uploadingPhoto && (
                <div className="photo-uploading-overlay">
                  <span className="loading-spinner"></span>
                </div>
              )}
            </div>
            <div className="photo-upload-buttons">
              <button 
                className="change-photo-btn"
                onClick={() => {
                  console.log('📷 Camera button clicked');
                  console.log('File input ref:', fileInputRef.current);
                  fileInputRef.current?.click();
                }}
                disabled={uploadingPhoto}
                title="Change profile photo"
              >
                <Camera size={16} />
              </button>
              <button 
                className="quick-upload-btn"
                onClick={() => {
                  console.log('⚡ Quick upload button clicked');
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log('📸 Quick upload file selected:', file.name);
                      await handleDirectPhotoUpload(file);
                    }
                  };
                  input.click();
                }}
                disabled={uploadingPhoto}
                title="Quick upload (no cropping)"
              >
                <Upload size={16} />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
              id="profile-photo-input"
            />
          </div>
          <h2>Profile</h2>
          {!currentUser?.photoURL && !isEditing && (
            <p className="profile-hint">
              Tap the camera icon to add a profile picture! 📸
            </p>
          )}
          {currentUser?.bio && !isEditing && (
            <p className="profile-bio-preview">{currentUser.bio}</p>
          )}
        </div>

        {error && (
          <div className="profile-alert profile-alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="profile-alert profile-alert-success">
            {success}
          </div>
        )}

        <div className="profile-content">
          <div className="profile-field">
            <label>
              <User size={18} />
              Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                disabled={loading}
              />
            ) : (
              <p key={`name-${refreshKey}`}>{currentUser?.displayName || 'Not set'}</p>
            )}
          </div>

          <div className="profile-field">
            <label>
              <Edit2 size={18} />
              Bio / Purpose
            </label>
            {isEditing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Why did you join Bell? (e.g., 'Here to connect with friends and watch movies together')"
                disabled={loading}
                maxLength={200}
                rows={3}
              />
            ) : (
              <p key={`bio-${refreshKey}`} className="profile-bio">{currentUser?.bio || 'Not set'}</p>
            )}
            {isEditing && (
              <span className="bio-char-count">{bio.length}/200</span>
            )}
          </div>

          <div className="profile-field">
            <label>
              <MapPin size={18} />
              Location
            </label>
            {isEditing ? (
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where are you from? (e.g., 'San Francisco, CA')"
                disabled={loading}
                maxLength={50}
              />
            ) : (
              <p key={`location-${refreshKey}`}>{currentUser?.location || 'Not set'}</p>
            )}
          </div>

          <div className="profile-field">
            <label>
              <Heart size={18} />
              Interests
            </label>
            {isEditing ? (
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="What do you love? (e.g., 'Music, Gaming, Cooking')"
                disabled={loading}
                maxLength={100}
              />
            ) : (
              <p key={`interests-${refreshKey}`}>{currentUser?.interests || 'Not set'}</p>
            )}
          </div>

          <div className="profile-field">
            <label>
              <Film size={18} />
              Favorite Genres
            </label>
            {isEditing ? (
              <input
                type="text"
                value={favoriteGenres}
                onChange={(e) => setFavoriteGenres(e.target.value)}
                placeholder="Movie/Music genres you enjoy (e.g., 'Sci-Fi, Comedy, Jazz')"
                disabled={loading}
                maxLength={100}
              />
            ) : (
              <p key={`genres-${refreshKey}`}>{currentUser?.favoriteGenres || 'Not set'}</p>
            )}
          </div>

          <div className="profile-field">
            <label>
              <Instagram size={18} />
              Social Handle
            </label>
            {isEditing ? (
              <input
                type="text"
                value={socialHandle}
                onChange={(e) => setSocialHandle(e.target.value)}
                placeholder="Your social media handle (e.g., '@username')"
                disabled={loading}
                maxLength={50}
              />
            ) : (
              <p key={`social-${refreshKey}`}>{currentUser?.socialHandle || 'Not set'}</p>
            )}
          </div>

          {isEditing && (
            <div className="profile-field">
              <label>
                🎨 Profile Theme
              </label>
              <div className="theme-selector">
                {profileThemes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-option ${profileTheme === theme.id ? 'selected' : ''}`}
                    onClick={() => setProfileTheme(theme.id)}
                    style={{ '--theme-color': theme.color }}
                    disabled={loading}
                    title={theme.name}
                  >
                    <div className="theme-preview" style={{ backgroundColor: theme.color }}></div>
                    <span>{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="profile-field">
            <label>
              <Mail size={18} />
              Email
            </label>
            <p>{currentUser?.email}</p>
          </div>

          <div className="profile-field">
            <label>
              <User size={18} />
              Account Type
            </label>
            <p>
              {currentUser?.providerData?.[0]?.providerId === 'google.com' 
                ? 'Google Account' 
                : 'Email Account'}
            </p>
          </div>
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <>
              <button 
                className="profile-btn profile-btn-primary"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? <span className="loading-spinner"></span> : <><Save size={18} /> Save</>}
              </button>
              <button 
                className="profile-btn profile-btn-secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button 
                className="profile-btn profile-btn-primary"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={18} /> Edit Profile
              </button>
              <button 
                className="profile-btn profile-btn-danger"
                onClick={handleLogout}
              >
                <LogOut size={18} /> Sign Out
              </button>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default UserProfile;
