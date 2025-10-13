# Metadata Timing Fix - Dynamic Profile Update

## Problem Identified

From the console logs, we discovered that remote participants' metadata was `null`:

```
❌ No metadata found for Elijah
📋 Metadata: null
❌ Has photoURL: false
❌ Has bio: false
```

**Root Cause:** Participants were joining the LiveKit room **before** their profile data (photoURL and bio) was fully loaded from Firebase/localStorage. This resulted in empty metadata being sent to LiveKit, making remote participants unable to see each other's profiles when cameras were off.

## The Timing Issue

### Original Flow (Broken)
1. User loads page
2. Firebase Auth initializes (fast)
3. User clicks "Join Room"
4. Token requested with `currentUser.photoURL` and `currentUser.bio` ← **Both are null at this point!**
5. User joins room with empty metadata
6. **Later:** Profile data loads from Firebase Database/localStorage
7. But metadata was already set and won't update

### Problem Scenarios
- **Slow network:** Profile data takes longer to load
- **First-time users:** No cached profile data
- **Mobile devices:** Slower Firebase database access
- **Quick join:** User joins before profile fully loads

## Solution: Dynamic Metadata Update

Added a `useEffect` hook that monitors `currentUser`, `room`, and `isConnected` state. When profile data becomes available **after** joining the room, it automatically updates the local participant's metadata.

### New Flow (Fixed)
1. User loads page
2. Firebase Auth initializes
3. User clicks "Join Room"
4. Token requested (may have null profile data)
5. User joins room
6. **Profile data loads** from Firebase/localStorage
7. **useEffect detects change** in `currentUser`
8. **Automatically calls** `room.localParticipant.setMetadata()`
9. **LiveKit broadcasts** updated metadata to all participants
10. **Remote participants** now see the profile and bio! ✅

## Code Changes

### SimpleLiveKitApp.jsx

```javascript
// Update local participant metadata when currentUser or room changes
useEffect(() => {
  const updateLocalMetadata = async () => {
    if (room && currentUser && isConnected) {
      const metadata = JSON.stringify({
        photoURL: currentUser.photoURL || null,
        bio: currentUser.bio || null,
      });
      
      console.log('🔄 Updating local participant metadata:', metadata);
      
      try {
        await room.localParticipant.setMetadata(metadata);
        console.log('✅ Local participant metadata updated successfully');
      } catch (error) {
        console.error('❌ Failed to update local participant metadata:', error);
      }
    }
  };

  updateLocalMetadata();
}, [room, currentUser, isConnected]);
```

**How it works:**
- Runs whenever `room`, `currentUser`, or `isConnected` changes
- Checks if all three exist (user is in a room and connected)
- Stringifies the profile data (photoURL and bio)
- Calls `setMetadata()` on the local participant
- LiveKit automatically broadcasts to all remote participants

### api/token.js

Added logging to track what metadata is being sent:

```javascript
console.log('🎫 Token request received:');
console.log('   Room:', roomName);
console.log('   Participant:', participantName);
console.log('   Metadata:', metadata);
...
console.log('✅ Token created with metadata:', metadata || '(empty)');
```

This helps debug cases where metadata is missing during initial connection.

## Testing the Fix

### What You'll See in Console

**On page load:**
```
👤 User authenticated: user@example.com
✅ User token and profile data loaded successfully
📋 Profile data loaded:
   photoURL: https://firebasestorage.googleapis.com/...
   bio: Your bio text here
```

**When joining room:**
```
✅ Connecting with user profile:
   Photo URL: https://firebasestorage.googleapis.com/...
   Bio: Your bio text here
🔄 Updating local participant metadata: {"photoURL":"...","bio":"..."}
✅ Local participant metadata updated successfully
```

**On remote side (when you turn camera off):**
```
✅ Getting metadata for participant: YourName
   Raw metadata: {"photoURL":"...","bio":"..."}
✅ Parsed metadata for YourName: {photoURL: "...", bio: "..."}
📸 Photo URL found: https://...
✅ Displaying bio for YourName: Your bio text here
```

### Verification Steps

1. **Refresh both browser windows** to get the latest code
2. **Open console in both windows** (F12 or Cmd+Option+I)
3. **User A joins room first**
   - Look for `🔄 Updating local participant metadata` log
   - Should show your photoURL and bio
4. **User B joins room**
   - Should see User A's metadata in logs
   - User A should see User B's metadata
5. **Turn camera off**
   - Both users should see profile picture and bio
   - Check console for `✅ Displaying bio for [Name]`

## Benefits

### ✅ Reliability
- Works even if profile loads slowly
- Handles network delays gracefully
- No race conditions

### ✅ Real-time Updates
- If user updates profile mid-call, metadata updates automatically
- Leverages React's reactivity system
- No manual refresh needed

### ✅ Backwards Compatible
- Still sends metadata on initial connection (if available)
- Dynamic update acts as safety net
- No breaking changes

### ✅ Better UX
- Users see profiles immediately after data loads
- No need to rejoin room
- Seamless experience

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Profile loads before join | ✅ Metadata sent initially, updated after join (redundant but harmless) |
| Profile loads after join | ✅ Metadata updates automatically when profile loads |
| No profile picture/bio | ✅ Sends `null` values, shows generic avatar |
| User updates profile mid-call | ✅ Metadata updates, remote sees new info |
| Slow network | ✅ Updates whenever data becomes available |
| Mobile device | ✅ Works on all platforms |

## Troubleshooting

### If metadata still shows as `null`:

1. **Check Firebase Rules**
   ```javascript
   // Make sure your Firebase Database rules allow reads
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "auth != null",
           ".write": "auth != null && auth.uid == $uid"
         }
       }
     }
   }
   ```

2. **Check localStorage**
   ```javascript
   // Open console and run:
   localStorage.getItem('bell_profile_YOUR_USER_ID')
   ```

3. **Verify Profile Data Saved**
   - Go to Profile page
   - Make sure photo and bio are showing
   - Save again if needed

4. **Check Network Tab**
   - Look for `/api/token` request
   - Check the request body for metadata field
   - Should contain photoURL and bio

## Related Events

The fix works in conjunction with existing event listeners:

- `ParticipantMetadataChanged`: Fires when metadata updates, triggers re-render
- `TrackMuted`: Shows camera-off view where bio is displayed
- `TrackUnmuted`: Returns to video view

## Performance Impact

**Minimal:**
- useEffect only runs when dependencies change
- Metadata update is a single API call to LiveKit
- JSON stringification is negligible
- No continuous polling or timers

## Future Enhancements

1. **Retry Logic**: If metadata update fails, retry with exponential backoff
2. **Optimistic Updates**: Show local profile immediately, sync later
3. **Compression**: For long bios, compress before sending
4. **Validation**: Check metadata size limits
5. **Analytics**: Track how often late updates occur

## Conclusion

This fix ensures that **all participants can see each other's profile pictures and bios** when cameras are off, regardless of network speed or load timing. The dynamic update approach makes the app more robust and provides a better user experience.

🎉 **Remote participant profile display is now fully functional!**
