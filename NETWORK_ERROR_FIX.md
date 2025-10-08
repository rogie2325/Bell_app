# Fix: "Network error please check your connection" on Mobile

## 🎯 The Problem

The error "Network error please check your connection and try again" (error code: `storage/unknown`) typically means:

1. **CORS blocking** - Firebase Storage is blocking requests from your ngrok domain
2. **Storage bucket URL is wrong**
3. **Storage not enabled** in Firebase Console
4. **Network connectivity** issue (less likely)

## ✅ Solution 1: Add ngrok Domain to Firebase CORS

Firebase Storage has CORS restrictions. Your ngrok domain needs to be whitelisted.

### **Option A: Using Firebase Console (Easiest)**

1. **Go to Firebase Console**: https://console.firebase.google.com/project/bell-live/storage
2. Click on your storage bucket: `bell-live.firebasestorage.app`
3. You should see files and folders here
4. Unfortunately, Firebase Console doesn't have a UI for CORS settings

### **Option B: Using Google Cloud Console (Correct Way)**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/storage/browser?project=bell-live
2. Find your bucket: `bell-live.firebasestorage.app`
3. Click on the bucket name
4. Go to **Permissions** tab
5. Click **Add**
6. Add: `allUsers` with role `Storage Object Viewer` (for reading photos)

### **Option C: Using cors.json File (Advanced)**

Create a file called `cors.json`:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

Then upload it using Google Cloud SDK:
```bash
gsutil cors set cors.json gs://bell-live.firebasestorage.app
```

**Note**: Using `"*"` allows all domains (good for testing, but in production you'd list specific domains)

---

## ✅ Solution 2: Verify Storage Bucket Name

The storage bucket in your `.env` is: `bell-live.firebasestorage.app`

### **Verify it's correct:**

1. Go to: https://console.firebase.google.com/project/bell-live/storage
2. Look at the top - you'll see something like:
   - `gs://bell-live.firebasestorage.app` ← This is your bucket

3. **If it's different**, update your `.env` file:
   ```
   VITE_FIREBASE_STORAGE_BUCKET=your-actual-bucket-name
   ```

---

## ✅ Solution 3: Make Sure Storage is Enabled

1. Go to: https://console.firebase.google.com/project/bell-live/storage
2. If you see "Get Started" button → Storage isn't enabled yet
3. Click "Get Started"
4. Choose location (e.g., `us-central1`)
5. Click "Done"

---

## ✅ Solution 4: Try Upload with Data URL (Workaround)

Instead of uploading the file directly, we can convert it to a base64 data URL first. This sometimes bypasses CORS issues.

I can update the code to use this method if the above solutions don't work.

---

## 🔧 Quick Test: Desktop vs Mobile

**Try this:**
1. Open the app on **desktop** (not mobile)
2. Try uploading a profile picture
3. Does it work?

**If YES on desktop but NO on mobile:**
→ It's a CORS issue with the ngrok domain

**If NO on both:**
→ It's a Storage configuration issue

---

## 🚀 Fastest Fix (Testing Mode)

For testing purposes, let's allow all origins in Firebase Storage:

### **Method 1: Update CORS using gsutil (Recommended)**

1. **Install Google Cloud SDK**: https://cloud.google.com/sdk/docs/install
2. **Login**: `gcloud auth login`
3. **Set project**: `gcloud config set project bell-live`
4. **Create cors.json**:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
5. **Apply CORS**:
   ```bash
   gsutil cors set cors.json gs://bell-live.firebasestorage.app
   ```

### **Method 2: Use Firebase Emulator (For Development)**

If you want to test locally without CORS issues:
```bash
npm install -g firebase-tools
firebase init emulators
firebase emulators:start
```

---

## 📱 Alternative: Use localhost Instead of ngrok

If possible, test on localhost first:
1. Open `http://localhost:5173` on desktop
2. Try uploading
3. If it works, the issue is definitely ngrok CORS

For mobile testing on localhost:
1. Find your computer's local IP (e.g., `192.168.1.100`)
2. Open `http://192.168.1.100:5173` on mobile
3. Make sure mobile is on same WiFi network
4. Try uploading

---

## 🎯 Expected Solution

After applying CORS settings:

1. Refresh mobile browser
2. Try uploading again
3. Should see upload progress
4. Success message!

---

## 📞 Still Not Working?

If after trying these solutions it still doesn't work, we can:

1. **Switch to a different upload method** (base64 data URL)
2. **Use a proxy server** to handle uploads
3. **Try Firebase Storage Emulator** for development
4. **Check browser console** for the exact CORS error message

Let me know which solution you want to try first! The fastest is probably:
1. Verify Storage is enabled
2. Try upload on desktop (to test if it's CORS)
3. Apply CORS settings if needed

🚀
