# Remote Participant Bio Display Fix

## Issue
Users could only see their own profile bio when the camera was off, but could not see remote participants' bios when their cameras were turned off.

## Root Cause
The application was not listening for `TrackMuted` and `TrackUnmuted` events from LiveKit. When a remote participant turned their camera off, the component didn't re-render to show the camera-off view with the bio.

Additionally, there was no `ParticipantMetadataChanged` event listener to handle metadata updates dynamically.

## Solution

### 1. Added Track Muted/Unmuted Event Listeners
```javascript
newRoom.on(RoomEvent.TrackMuted, (publication, participant) => {
  console.log('🎥 Track muted:', publication.kind, 'from', participant.identity);
  // Force re-render to show camera-off view with bio
  const updatedParticipants = Array.from(newRoom.remoteParticipants.values());
  setParticipants([...updatedParticipants]);
});

newRoom.on(RoomEvent.TrackUnmuted, (publication, participant) => {
  console.log('🎥 Track unmuted:', publication.kind, 'from', participant.identity);
  // Force re-render to show video again
  const updatedParticipants = Array.from(newRoom.remoteParticipants.values());
  setParticipants([...updatedParticipants]);
});
```

**Why this works:**
- When a remote participant mutes their video track (turns camera off), the `TrackMuted` event fires
- This triggers a re-render of the participants array
- The `RemoteParticipantVideo` component re-renders and detects `hasVideo = false`
- The camera-off view is displayed, which includes the bio from participant metadata

### 2. Added Participant Metadata Changed Listener
```javascript
newRoom.on(RoomEvent.ParticipantMetadataChanged, (metadata, participant) => {
  console.log('📋 Metadata changed for:', participant.identity);
  console.log('📋 New metadata:', metadata);
  // Force re-render to show updated metadata
  const updatedParticipants = Array.from(newRoom.remoteParticipants.values());
  setParticipants([...updatedParticipants]);
});
```

**Why this is important:**
- If a participant updates their profile (photo or bio) while in a call
- The updated metadata will automatically propagate to all participants
- Ensures real-time synchronization of profile information

### 3. Enhanced Logging for Debugging
Added detailed console logging in the camera-off view rendering:
```javascript
console.log('🖼️ Rendering camera-off view for:', participant.identity);
console.log('📋 Metadata:', metadata);
console.log('🖼️ Has photoURL:', !!metadata?.photoURL);
console.log('📝 Has bio:', !!metadata?.bio);
```

This helps developers debug metadata issues and understand when bios are/aren't available.

## How Metadata Flows Through the System

1. **User Profile Setup**
   - User adds bio in UserProfile component
   - Bio saved to Firebase Database or localStorage
   - `currentUser.bio` updated in AuthContext

2. **Connection to Room**
   - When connecting to LiveKit room, metadata is sent in token request:
   ```javascript
   metadata: JSON.stringify({
     photoURL: currentUser?.photoURL || null,
     bio: currentUser?.bio || null,
   })
   ```

3. **Token Generation**
   - Backend (api/token.js) creates AccessToken with metadata
   - Token includes participant identity and metadata string

4. **Room Join**
   - Participant joins room with token
   - LiveKit attaches metadata to participant object
   - Other participants can access via `participant.metadata`

5. **Metadata Parsing**
   - `getParticipantMetadata()` helper function parses JSON metadata
   - Returns object with `photoURL` and `bio` properties

6. **Display**
   - When camera is off (`hasVideo = false`)
   - `RemoteParticipantVideo` component shows camera-off view
   - Bio is displayed from parsed metadata

## Testing Checklist

- [x] Local user bio displays when camera is off ✅
- [x] Remote participant bio displays when their camera is off ✅
- [x] Component re-renders when track is muted ✅
- [x] Component re-renders when track is unmuted ✅
- [x] Metadata changes propagate in real-time ✅
- [x] Multiple participants can see each other's bios ✅
- [x] Works on both desktop and mobile ✅

## Event Handling Summary

| Event | Purpose | Effect |
|-------|---------|--------|
| `ParticipantConnected` | Participant joins room | Add to participants list, log metadata |
| `ParticipantDisconnected` | Participant leaves room | Remove from participants list |
| `ParticipantMetadataChanged` | Profile updated mid-call | Re-render with new metadata |
| `TrackSubscribed` | New track available | Attach track, auto-play audio |
| `TrackMuted` | Camera/mic turned off | Re-render, show camera-off view |
| `TrackUnmuted` | Camera/mic turned on | Re-render, show video stream |

## Code Changes
- **File Modified:** `src/components/SimpleLiveKitApp.jsx`
- **Lines Added:** ~30 lines (event listeners + logging)
- **Breaking Changes:** None
- **Dependencies:** No new dependencies required

## User Experience Improvements

**Before:**
- ❌ Remote participants showed generic "Camera Off" placeholder
- ❌ No way to see who the person was or their bio when camera off
- ❌ Felt impersonal and disconnected

**After:**
- ✅ Remote participants' profile pictures visible when camera off
- ✅ Bios displayed in camera-off view
- ✅ Pulsing animations around profile pictures
- ✅ More personal and engaging experience
- ✅ Consistent experience for both local and remote users

## Related Features
- Profile picture upload (UserProfile component)
- Bio editing (UserProfile component)
- Camera toggle functionality (SimpleLiveKitApp)
- LiveKit metadata transmission (api/token.js)

## Future Enhancements
1. Show typing indicator when bio is being edited
2. Display "Bio updated" toast when metadata changes
3. Add emoji reactions to profile pictures
4. Rich bio formatting (bold, italic, links)
5. Character limit indicator for bio field
6. Bio translation for international users
