# 🚀 Firebase Setup for Personalization Features

## Prerequisites
You need to enable two Firebase services:
1. **Firebase Storage** (for profile pictures)
2. **Firebase Realtime Database** (for user bios)

## Step-by-Step Setup

### 1. Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **Storage** in the left menu
4. Click **Get Started**
5. Choose **Start in test mode** (we'll secure it later)
6. Select a location (choose closest to your users)
7. Click **Done**

### 2. Enable Firebase Realtime Database

1. In Firebase Console, click **Realtime Database** in the left menu
2. Click **Create Database**
3. Select a database location
4. Choose **Start in test mode** (we'll secure it later)
5. Click **Enable**

### 3. Get Database URL

1. In Realtime Database page, you'll see a URL like:
   ```
   https://your-project-id-default-rtdb.firebaseio.com
   ```
2. Copy this URL

### 4. Update Environment Variables

Add to your `.env` file:

```env
# Existing Firebase config...
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# NEW: Add this line
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
```

### 5. Set Up Security Rules

#### Firebase Storage Rules

1. Go to **Storage** → **Rules** tab
2. Replace with these secure rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Profile photos - users can only upload to their own folder
    match /profile-photos/{userId}/{allPaths=**} {
      // Anyone can read profile photos
      allow read: if true;
      
      // Only authenticated users can write to their own folder
      // Max file size: 5MB
      // Only images allowed
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

3. Click **Publish**

#### Firebase Realtime Database Rules

1. Go to **Realtime Database** → **Rules** tab
2. Replace with these secure rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        // Users can read any profile data
        ".read": "auth != null",
        
        // Users can only write to their own data
        ".write": "auth != null && auth.uid === $uid",
        
        "bio": {
          // Bio must be a string with max 150 characters
          ".validate": "newData.isString() && newData.val().length <= 150"
        }
      }
    }
  }
}
```

3. Click **Publish**

### 6. Test the Setup

Run your app:
```powershell
npm run dev
```

Test these features:
1. **Upload Profile Picture:**
   - Sign in
   - Click profile button
   - Click camera icon
   - Select an image
   - Should upload successfully

2. **Add Bio:**
   - Click "Edit Profile"
   - Add text to "Bio / Purpose" field
   - Click "Save"
   - Should save successfully

### 7. Verify in Firebase Console

#### Check Storage:
1. Go to **Storage** → **Files**
2. You should see:
   ```
   profile-photos/
     └── {your-user-id}/
         └── {timestamp}_filename.jpg
   ```

#### Check Database:
1. Go to **Realtime Database** → **Data**
2. You should see:
   ```json
   {
     "users": {
       "{your-user-id}": {
         "bio": "Your bio text here"
       }
     }
   }
   ```

## Troubleshooting

### "Permission Denied" Error

**Problem:** Can't upload photos or save bio

**Solutions:**
1. Check that you're signed in
2. Verify security rules are published
3. Make sure DATABASE_URL is in .env
4. Restart dev server after adding .env variable

### "File too large" Error

**Problem:** Can't upload photo

**Solution:** 
- Image must be under 5MB
- Compress image before uploading
- Or modify security rules to allow larger files

### "Invalid file type" Error

**Problem:** Can't upload file

**Solution:**
- Only image files allowed (jpg, png, gif, webp)
- Make sure you're selecting an image

### Database URL Not Found

**Problem:** App can't connect to database

**Solutions:**
1. Check VITE_FIREBASE_DATABASE_URL in .env
2. Restart dev server: `Ctrl+C` then `npm run dev`
3. Verify database URL is correct (from Firebase Console)

### Photo Doesn't Show After Upload

**Solutions:**
1. Check browser console for errors
2. Verify Storage rules allow read access
3. Check that photoURL was updated in Firebase Auth
4. Refresh the page

## Production Checklist

Before deploying to production:

- [ ] Storage security rules published
- [ ] Database security rules published
- [ ] Environment variables set on hosting platform
- [ ] Tested photo upload in production
- [ ] Tested bio save in production
- [ ] Verified files appear in Firebase Console
- [ ] Tested with multiple users
- [ ] Tested file size limits
- [ ] Tested on mobile devices

## Cost Considerations

### Firebase Storage (Profile Pictures)
- **Free tier:** 5GB storage, 1GB/day download
- **Typical usage:** ~100KB per photo
- **Estimate:** ~50,000 photos in free tier

### Firebase Realtime Database (Bios)
- **Free tier:** 1GB storage, 10GB/month download
- **Typical usage:** ~150 bytes per bio
- **Estimate:** ~6 million bios in free tier

**For most apps, this will be FREE!** 🎉

## Advanced: Custom Storage Location

If you want to organize photos differently:

```javascript
// In UserProfile.jsx, modify the filename:
const filename = `users/${currentUser.uid}/profile/avatar.jpg`;
```

This creates structure:
```
users/
  └── {userId}/
      └── profile/
          └── avatar.jpg
```

## Summary

After setup, users can:
- ✅ Upload custom profile pictures
- ✅ Add personal bios (150 chars)
- ✅ Edit anytime
- ✅ Data persists forever
- ✅ Secure and private

**Setup time: ~10 minutes** ⏱️

---

**You're all set!** Your users can now personalize their profiles! 🎉
