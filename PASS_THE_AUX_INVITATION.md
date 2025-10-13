# Pass The Aux - Invitation System

## Overview
Added a complete invitation system for the Pass The Aux feature, replacing the manual "both users click and wait" workflow with a seamless invite-and-accept flow.

## Features

### 1. Smart Music Button Behavior
- **Solo Mode**: When no participants are in the room, clicking opens Pass The Aux directly
- **Invite Mode**: When participants are present, clicking sends an invitation to all participants
- **Active Mode**: When Pass The Aux is already open, clicking toggles it off
- **Visual Feedback**:
  - Default: White/transparent background
  - Active (Pass The Aux open): Purple background
  - Invitation Sent: Blue background with pulsing indicator dot
  - Haptic feedback on all interactions (mobile)

### 2. Real-time Data Channel Messaging
Implemented three message types over LiveKit data channels:
- **PASS_AUX_INVITE**: Sent to all participants when host clicks music button
  - Includes sender's display name
  - Shows animated toast notification to recipients
- **PASS_AUX_ACCEPT**: Sent back when recipient accepts
  - Opens Pass The Aux for both users automatically
  - Clears invitation state
- **PASS_AUX_DECLINE**: Sent back when recipient declines
  - Clears invitation state
  - Provides feedback to sender

### 3. Animated Invitation Toast
Beautiful notification that appears when receiving an invitation:
- **Design**:
  - Gradient purple-to-pink background
  - Music icon with white background circle
  - Sender's name displayed prominently
  - Accept and Decline buttons
  - Close button (X) in top-right
- **Animation**:
  - Slides down from top with scale effect
  - Fixed position at top-center of screen
  - Z-index 10000 ensures it appears above all other UI
- **Actions**:
  - **Accept**: Opens Pass The Aux for both users, sends confirmation
  - **Decline**: Dismisses toast, notifies sender
  - **Close (X)**: Dismisses without notifying sender

### 4. State Management
Three new state variables track invitation flow:
- `invitationSent`: Boolean - tracks if current user sent invitation (enables blue "waiting" state)
- `incomingInvitation`: Object `{ from, fromName }` - stores details of received invitation
- `showInvitationToast`: Boolean - controls toast visibility

## User Flow

### Sending an Invitation
1. User clicks music button when participant(s) are in room
2. Button changes to blue with pulsing indicator
3. Invitation message sent to all participants via data channel
4. Button title shows "Invitation sent..."
5. Sender waits for response

### Receiving an Invitation
1. Toast notification slides down from top
2. Shows sender's name and invitation message
3. User can:
   - Click **Accept**: Opens Pass The Aux for both users
   - Click **Decline**: Dismisses invitation, notifies sender
   - Click **X**: Dismisses without notification
4. Toast auto-includes haptic feedback on mobile

### Accepting an Invitation
1. Recipient clicks Accept button
2. Pass The Aux opens automatically for recipient
3. Acceptance message sent back to sender via data channel
4. Pass The Aux opens automatically for sender
5. Both users can now share music

### Declining an Invitation
1. Recipient clicks Decline button
2. Decline message sent back to sender
3. Sender's invitation state resets (button returns to normal)
4. Toast dismisses

## Technical Implementation

### Data Channel Message Format
```javascript
// Invitation
{
  type: 'PASS_AUX_INVITE',
  fromName: 'John Doe'
}

// Accept
{
  type: 'PASS_AUX_ACCEPT'
}

// Decline
{
  type: 'PASS_AUX_DECLINE'
}
```

### Key Functions

#### `sendPassTheAuxInvitation()`
- Encodes JSON message with type and sender name
- Uses `room.localParticipant.publishData()` with reliable delivery
- Sets `invitationSent` state to true
- Triggers haptic feedback

#### `acceptInvitation()`
- Sends PASS_AUX_ACCEPT message
- Opens `showPassTheAux` for recipient
- Clears invitation state
- Triple-vibrate haptic feedback

#### `declineInvitation()`
- Sends PASS_AUX_DECLINE message
- Clears invitation state
- Single-vibrate haptic feedback

### Event Listener
```javascript
newRoom.on(RoomEvent.DataReceived, (payload, participant) => {
  const decoder = new TextDecoder();
  const message = decoder.decode(payload);
  const data = JSON.parse(message);
  
  // Handle PASS_AUX_INVITE, PASS_AUX_ACCEPT, PASS_AUX_DECLINE
});
```

## Benefits

### Before
- Both users had to manually click the music button
- Users had to coordinate timing
- No clear indication of who initiated
- Required verbal/chat coordination

### After
- One user initiates with single click
- Other user receives clear notification
- Accept/decline choice with visual UI
- Automatic synchronization when accepted
- Real-time feedback for both users
- Professional, polished UX

## CSS Additions

### Animation Keyframes (`index.css`)
```css
@keyframes slide-down {
  0% {
    transform: translate(-50%, -120%) scale(0.9);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, 0) scale(1);
    opacity: 1;
  }
}

.animate-slide-down {
  animation: slide-down 0.4s ease-out;
}
```

## Future Enhancements (Optional)
- Add timeout for invitations (auto-dismiss after 30 seconds)
- Support group invitations (multiple participants)
- Add invitation history/log
- Toast sound effect option
- Invitation preview with participant avatar
- "Always accept from this person" preference
- Group broadcast mode (one sender, multiple acceptors join same session)

## Files Modified
- `/src/components/SimpleLiveKitApp.jsx`: Added invitation state, functions, UI, and event handling
- `/src/index.css`: Added slide-down animation keyframes

## Testing Notes
To test the invitation system:
1. Open app in two browser windows/tabs
2. Connect both to same room
3. Click music button in first window
4. Second window should show invitation toast
5. Click Accept in second window
6. Pass The Aux should open for both users
7. Test decline flow similarly

## Result
✅ Complete invitation system for Pass The Aux
✅ Eliminates manual coordination requirement
✅ Professional animated UI with toast notifications
✅ Real-time data channel messaging
✅ Haptic feedback on mobile
✅ Visual state indicators (colors, pulsing dot)
✅ Graceful handling of accept/decline flows
