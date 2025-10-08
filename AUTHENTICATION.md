# Authentication System Documentation

## Overview

The app now includes a full-featured authentication system with Firebase Authentication, supporting multiple sign-in methods and user profile management.

## Features

### 🔐 Authentication Methods

1. **Email & Password Sign-up/Sign-in**
   - Create account with email and password
   - Secure password validation (minimum 6 characters)
   - Display name during registration

2. **Google Sign-in**
   - One-click authentication with Google account
   - Works on both desktop (popup) and mobile (redirect)
   - Automatically syncs user profile and photo

3. **Password Reset**
   - Forgot password functionality
   - Email-based password reset links
   - Secure Firebase password recovery

### 👤 User Profile Management

- View and edit display name
- See account email
- View account type (Google or Email)
- Profile photo display (for Google accounts)
- Sign out functionality

### 🎨 UI/UX Features

- **Modern Design**
  - Gradient backgrounds
  - Glassmorphic cards
  - Smooth animations and transitions
  - Responsive layout (mobile & desktop)
  - Dark mode support

- **User Experience**
  - Loading states during authentication
  - Clear error messages
  - Success confirmations
  - Password visibility toggle
  - Form validation

## Components

### `AuthContext.jsx`
Context provider managing authentication state across the app.

**Exported Functions:**
- `useAuth()` - Hook to access auth context
- `signup(email, password, displayName)` - Create new account
- `login(email, password)` - Sign in with email/password
- `signInWithGoogle()` - Sign in with Google
- `logout()` - Sign out current user
- `resetPassword(email)` - Send password reset email
- `updateUserProfile(updates)` - Update user profile

**State:**
- `currentUser` - Current authenticated user object
- `loading` - Auth initialization state
- `error` - Auth error messages

### `Auth.jsx`
Authentication UI with login, signup, and password reset forms.

**Features:**
- Toggle between login and signup
- Google sign-in button
- Forgot password flow
- Real-time validation
- Error handling

### `UserProfile.jsx`
User profile modal for viewing and editing profile information.

**Features:**
- Display user information
- Edit display name
- Sign out button
- Modal overlay

## Usage

### Accessing Current User

```javascript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { currentUser, logout } = useAuth();
  
  return (
    <div>
      <p>Hello, {currentUser.displayName || currentUser.email}!</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### Protected Routes

The main `App.jsx` automatically shows the Auth component if no user is logged in:

```javascript
const AppContent = () => {
  const { currentUser, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  return currentUser ? <SimpleLiveKitApp /> : <Auth />;
};
```

### Using Username in LiveKit

The SimpleLiveKitApp component automatically uses the authenticated user's name:

```javascript
const [username, setUsername] = useState(
  currentUser?.displayName || 
  currentUser?.email?.split('@')[0] || 
  ''
);
```

## Firebase Setup

Make sure your `.env` file includes:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Enable Authentication Methods

In Firebase Console:
1. Go to Authentication → Sign-in method
2. Enable **Email/Password**
3. Enable **Google** (configure OAuth consent screen)

### Google Sign-in Setup

1. Enable Google provider in Firebase Console
2. Add authorized domains (localhost, your production domain)
3. Configure OAuth consent screen in Google Cloud Console
4. For production: Add privacy policy and terms of service URLs

## Security Features

- ✅ Email validation
- ✅ Password strength requirements
- ✅ Secure token-based authentication
- ✅ Protected routes (only authenticated users can access the app)
- ✅ Automatic session management
- ✅ Password reset via email
- ✅ HTTPS required for mobile devices

## Mobile Considerations

- Google Sign-in uses redirect flow on mobile (better UX)
- Touch-optimized buttons and inputs
- Responsive design adapts to screen size
- PWA-compatible authentication flow

## Error Handling

The system provides user-friendly error messages for common scenarios:
- Invalid email format
- Account not found
- Incorrect password
- Email already in use
- Weak password
- Network errors

## Future Enhancements

Potential features to add:
- [ ] Phone number authentication
- [ ] Facebook/Twitter sign-in
- [ ] Email verification requirement
- [ ] Two-factor authentication
- [ ] Account deletion
- [ ] Profile photo upload
- [ ] Username change history
- [ ] Session timeout settings

## Troubleshooting

### "Failed to sign in with Google"
- Check that Google provider is enabled in Firebase Console
- Verify authorized domains include your current domain
- For mobile: ensure using HTTPS

### "Email already in use"
- User already has an account with that email
- Try signing in instead
- Use password reset if forgot password

### "Popup closed by user"
- User closed Google sign-in popup before completing
- Try again or use email/password sign-in

## Testing

Test the authentication flow:
1. ✅ Sign up with email/password
2. ✅ Sign out
3. ✅ Sign in with same credentials
4. ✅ Test forgot password flow
5. ✅ Sign in with Google
6. ✅ Update profile name
7. ✅ Sign out from profile menu
8. ✅ Verify protected routes

---

**Note:** All authentication is handled securely by Firebase Authentication. User passwords are never stored in plain text.
