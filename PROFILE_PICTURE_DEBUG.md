# Profile Picture Debugging Guide

## 🔍 Why Mobile User Doesn't Show Profile Picture

There are a few reasons why "Wavy" (the mobile user) might not be showing their profile picture:

### 1. **No Profile Picture Uploaded** ⭐ Most Likely
- The user needs to upload a profile picture BEFORE joining the room
- Profile metadata is sent when joining - if there's no photo at join time, it won't appear
- **Solution**: Have the mobile user:
  1. Leave the room
  2. Click their profile icon (top right)
  3. Upload a profile picture
  4. Rejoin the room

### 2. **Joined Before Uploading**
- If "Wavy" joined the room, THEN uploaded a profile picture, other users won't see it
- LiveKit metadata is set at join time and doesn't update automatically
- **Solution**: Rejoin the room after uploading

### 3. **Console Errors to Check**
Open browser console (F12) and look for:
- `📋 Parsed metadata for Wavy : { photoURL: null, bio: null }`
  - This means no photo was uploaded when joining
- `📋 Sending user metadata: { photoURL: null, bio: null }`
  - This means current user has no photo
- `📋 Current user photoURL: <url>`
  - This shows what's being sent

## ✅ How to Fix

### For Desktop User (Elijah):
1. Your photo works! ✅
2. You should see your own photo when camera is off

### For Mobile User (Wavy):
1. **Leave the room** (hang up)
2. **Click profile icon** (top right circle)
3. **Upload a profile picture**:
   - Click camera icon
   - Choose a photo
   - Save
4. **Rejoin the room** (enter same room number)
5. Now both users should see Wavy's profile picture! 🎉

## 🔄 Testing the Feature

### Test Steps:
1. **Both users upload profile pictures** (important!)
2. **Join a room**
3. **Turn camera off**
4. **See profile pictures** animate to center with pulsing effect

### What You Should See:
- ✅ Small profile picture next to name (always visible)
- ✅ Large profile picture in center when camera off (with pulse animation)
- ✅ Pulsing blue border
- ✅ Expanding ring animation

## 📋 Debugging Checklist

Run through this checklist:

- [ ] Mobile user has uploaded a profile picture
- [ ] Mobile user can see their own photo in profile modal
- [ ] Mobile user left and rejoined after uploading photo
- [ ] Check browser console for metadata logs
- [ ] Verify Firebase Storage rules allow reads
- [ ] Check that photo URL is accessible (not blocked by CORS)

## 🎯 Expected Console Output

When joining, you should see:
```
📋 Sending user metadata: { photoURL: "https://...", bio: "..." }
🎯 Getting token from backend...
📋 Current user photoURL: https://...
✅ Token received
```

When other user joins, you should see:
```
📋 Parsed metadata for Wavy : { photoURL: "https://...", bio: "..." }
```

## 💡 Pro Tip

**Always upload profile picture BEFORE joining a room!**
The metadata is sent at join time and doesn't auto-update during the call.

If you update your profile mid-call, you need to leave and rejoin for others to see it.

## 🐛 Still Not Working?

Check:
1. **Browser console** - Any errors?
2. **Network tab** - Is the image URL loading?
3. **Firebase Storage rules** - Can you read the images?
4. **Hard refresh** - Try Ctrl+Shift+R
5. **Clear cache** - Sometimes old metadata is cached

---

**Bottom Line**: Make sure "Wavy" uploads a profile picture, then rejoins the room! 🚀
