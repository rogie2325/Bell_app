# Firebase Setup Guide for Bell App

## 🔥 Getting Your Firebase Configuration

### Step 1: Go to Firebase Console
1. Visit: https://console.firebase.google.com/
2. Click on your project (or create a new one)

### Step 2: Get Web App Config
1. Click the **⚙️ gear icon** → **Project settings**
2. Scroll down to **"Your apps"**
3. Click the **</> Web** icon to add a web app (if you haven't already)
4. Register app with name: **"Bell_live"**
5. Copy the `firebaseConfig` object

### Step 3: Update Your .env File
Replace the placeholder values in `.env` with your actual Firebase config:

```env
VITE_FIREBASE_API_KEY=AIza...your_actual_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 4: Enable Firebase Storage
1. In Firebase Console, click **Storage** in left sidebar
2. Click **Get Started**
3. Choose **Start in production mode** (we'll secure it next)
4. Click **Done**

### Step 5: Set Storage Security Rules
Go to **Storage** → **Rules** and paste this:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Music files - anyone in a room can upload/read
    match /music/{filename} {
      allow read: if true; // Public read for music sharing
      allow write: if request.auth != null; // Must be authenticated (later)
      allow write: if true; // For now, allow anyone to upload
    }
  }
}
```

**Note:** For now we allow anyone to upload. Later when you add Firebase Auth, change the last line to `allow write: if request.auth != null;`

### Step 6: Add to Railway Environment Variables
In Railway dashboard → Variables, add all 6 Firebase variables:
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN  
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID

### Step 7: Install Firebase Package
Run: `npm install firebase`

---

## ✅ Testing Locally

1. Update `.env` with your Firebase config
2. Run `npm run dev`
3. Join a room
4. Click Music button → Upload MP3
5. Watch Firebase console → Storage to see file appear!

---

## 🎯 What This Gives You:

✅ **No file size limits** (Firebase free tier: 5GB storage)
✅ **Fast CDN delivery** (files served from Google's CDN)
✅ **No chunking needed** (just share URLs)
✅ **Persistent storage** (files don't disappear)
✅ **Ready for auth** (when you add Firebase login later)

---

## 💰 Costs:

**Free Tier:**
- 5 GB storage
- 1 GB/day downloads
- Perfect for testing and small apps

**If you exceed:**
- $0.026/GB storage/month
- $0.12/GB downloaded
- Still very cheap for music sharing!

---

## 🔐 Security Note:

Right now storage is open. When you add Firebase Auth:
1. Users must login to upload
2. Anyone can still listen (public URLs)
3. Add user quotas to prevent abuse

---

## 🎵 Ready to Test!

After updating .env, commit and push to deploy! 🚀
