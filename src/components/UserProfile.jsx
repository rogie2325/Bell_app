import React, { useState, useRef } from 'react';
import { User, Mail, LogOut, Edit2, Save, X, Camera, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import './UserProfile.css';

const UserProfile = ({ onClose }) => {
  const { currentUser, logout, updateUserProfile, updateUserBio } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Debug: Log storage configuration on component mount
  React.useEffect(() => {
    console.log('🔥 UserProfile mounted');
    console.log('Storage instance:', storage);
    console.log('Storage bucket:', storage?.app?.options?.storageBucket);
    console.log('Current user:', currentUser?.uid, currentUser?.email);
  }, []);

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
      // Update display name
      await updateUserProfile({ displayName: displayName.trim() });
      
      // Update bio if it changed
      if (bio !== currentUser?.bio) {
        await updateUserBio(bio.trim());
      }
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
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

  const handlePhotoUpload = async (event) => {
    console.log('📸 Photo upload triggered');
    console.log('Event:', event);
    console.log('Files:', event.target.files);
    
    // Check if user is authenticated
    if (!currentUser) {
      console.error('❌ No user logged in');
      setError('Please log in to upload a photo');
      return;
    }
    
    console.log('✅ User authenticated:', currentUser.uid);
    console.log('User email:', currentUser.email);
    
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    console.log('✅ File selected:', file.name, 'Type:', file.type, 'Size:', file.size);

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

    setUploadingPhoto(true);
    setError('');
    console.log('🔄 Starting upload...');
    console.log('🔥 Firebase Storage instance:', storage);
    console.log('🪣 Storage bucket:', storage.app.options.storageBucket);

    try {
      // Create a unique filename
      const filename = `profile-photos/${currentUser.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, filename);
      console.log('📁 Upload path:', filename);
      console.log('📍 Storage ref:', storageRef);

      // Upload file with metadata for better compatibility
      const metadata = {
        contentType: file.type,
        customMetadata: {
          'uploadedBy': currentUser.uid,
          'uploadedAt': new Date().toISOString()
        }
      };

      // Upload file
      console.log('⬆️ Uploading to Firebase Storage...');
      console.log('📦 File blob:', file);
      console.log('📋 Metadata:', metadata);
      await uploadBytes(storageRef, file, metadata);
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
        errorMessage = 'Please log in again and try uploading.';
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
      // Reset file input
      event.target.value = '';
      console.log('🔄 Upload process complete');
    }
  };

  const handleCancel = () => {
    setDisplayName(currentUser?.displayName || '');
    setBio(currentUser?.bio || '');
    setIsEditing(false);
    setError('');
  };

  return (
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handlePhotoUpload}
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
              <p>{currentUser?.displayName || 'Not set'}</p>
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
                maxLength={150}
                rows={3}
              />
            ) : (
              <p className="profile-bio">{currentUser?.bio || 'Not set'}</p>
            )}
            {isEditing && (
              <span className="bio-char-count">{bio.length}/150</span>
            )}
          </div>

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
  );
};

export default UserProfile;
