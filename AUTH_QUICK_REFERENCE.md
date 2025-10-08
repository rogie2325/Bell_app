# 🔐 Authentication Quick Reference

## 🎯 User Actions

### For Users (What They Can Do)

| Action | How to Do It |
|--------|-------------|
| **Create Account** | Click "Sign up" → Enter name, email, password → Click "Sign Up" |
| **Sign In** | Enter email and password → Click "Sign In" |
| **Sign In with Google** | Click "Continue with Google" → Select account |
| **Reset Password** | Click "Forgot password?" → Enter email → Check email |
| **View Profile** | In video call → Click profile icon (top-right) |
| **Edit Name** | Open profile → Click "Edit Profile" → Change name → Click "Save" |
| **Sign Out** | Open profile → Click "Sign Out" |

## 💻 Developer Reference

### Import and Use Auth

```javascript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { currentUser, login, logout, signup } = useAuth();
  
  // Access current user
  console.log(currentUser.email);
  console.log(currentUser.displayName);
  console.log(currentUser.photoURL);
  
  // Check if user is authenticated
  if (currentUser) {
    // User is logged in
  }
}
```

### Available Auth Functions

```javascript
const {
  currentUser,        // Current user object or null
  loading,           // Auth initialization loading state
  error,             // Auth error messages
  signup,            // (email, password, displayName) => Promise
  login,             // (email, password) => Promise
  logout,            // () => Promise
  resetPassword,     // (email) => Promise
  updateUserProfile, // (updates) => Promise
  signInWithGoogle   // () => Promise
} = useAuth();
```

### User Object Properties

```javascript
currentUser: {
  uid: "unique-user-id",
  email: "user@example.com",
  displayName: "John Doe",
  photoURL: "https://...",
  emailVerified: true/false,
  providerData: [{
    providerId: "google.com" | "password"
  }]
}
```

## 🎨 UI Components

### Auth Component
- **File:** `src/components/Auth.jsx`
- **Purpose:** Login/signup form
- **Usage:** Automatically shown when user not authenticated

### UserProfile Component
- **File:** `src/components/UserProfile.jsx`
- **Props:** `onClose` - callback when modal closes
- **Usage:**
  ```javascript
  <UserProfile onClose={() => setShowProfile(false)} />
  ```

## 🔌 Integration Points

### Where Auth is Used

1. **App.jsx** - Main auth gate
   ```javascript
   {currentUser ? <SimpleLiveKitApp /> : <Auth />}
   ```

2. **SimpleLiveKitApp.jsx** - Username auto-fill
   ```javascript
   const [username, setUsername] = useState(
     currentUser?.displayName || 
     currentUser?.email?.split('@')[0] || 
     ''
   );
   ```

3. **Profile Button** - During video calls
   ```javascript
   <button onClick={() => setShowUserProfile(true)}>
     <User />
   </button>
   ```

## 🚨 Error Codes & Messages

| Firebase Code | User-Friendly Message |
|---------------|----------------------|
| `auth/invalid-email` | "Invalid email address" |
| `auth/user-disabled` | "This account has been disabled" |
| `auth/user-not-found` | "No account found with this email" |
| `auth/wrong-password` | "Incorrect password" |
| `auth/email-already-in-use` | "An account already exists with this email" |
| `auth/weak-password` | "Password should be at least 6 characters" |
| `auth/popup-closed-by-user` | "Sign-in popup was closed" |

## 🔄 Authentication Flow

```
App Starts
    ↓
AuthProvider initializes
    ↓
Check for existing session
    ↓
┌────────────────┐
│ User logged in?│
└────────────────┘
    ↓         ↓
   Yes        No
    ↓         ↓
Show App   Show Auth
    ↓         ↓
Auto-fill  User signs in
username       ↓
    ↓      Show App
    ↓         ↓
Both continue to video calling
```

## 📝 Code Patterns

### Protect a Component/Feature

```javascript
function ProtectedFeature() {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <div>Please sign in to access this feature</div>;
  }
  
  return <div>Protected content</div>;
}
```

### Sign Up New User

```javascript
async function handleSignup() {
  try {
    await signup(email, password, displayName);
    // User is now signed in automatically
  } catch (error) {
    console.error(error.message);
  }
}
```

### Sign In Existing User

```javascript
async function handleLogin() {
  try {
    await login(email, password);
    // User is now signed in
  } catch (error) {
    console.error(error.message);
  }
}
```

### Sign Out

```javascript
async function handleLogout() {
  try {
    await logout();
    // User is now signed out
  } catch (error) {
    console.error(error.message);
  }
}
```

### Update Profile

```javascript
async function updateName(newName) {
  try {
    await updateUserProfile({ displayName: newName });
    // Profile updated
  } catch (error) {
    console.error(error.message);
  }
}
```

### Reset Password

```javascript
async function handlePasswordReset() {
  try {
    await resetPassword(email);
    // Email sent successfully
  } catch (error) {
    console.error(error.message);
  }
}
```

## 🎨 Styling Classes

Key CSS classes you can modify:

- `.auth-container` - Main auth page wrapper
- `.auth-card` - Login/signup form card
- `.auth-submit-btn` - Primary action buttons
- `.google-signin-btn` - Google sign-in button
- `.user-profile-overlay` - Profile modal backdrop
- `.user-profile-card` - Profile modal content

## 🧪 Testing Checklist

Quick things to test:
- [ ] Sign up with new email
- [ ] Sign in with existing email
- [ ] Sign in with Google
- [ ] Wrong password shows error
- [ ] Invalid email shows error
- [ ] Password reset sends email
- [ ] Profile edit saves changes
- [ ] Sign out works
- [ ] Session persists on refresh
- [ ] Mobile responsive design

## 📞 Common Support Questions

**Q: "I forgot my password"**
A: Click "Forgot password?" on login screen, enter email, check inbox

**Q: "Can I change my email?"**
A: Not currently supported (Firebase requires re-authentication)

**Q: "How do I delete my account?"**
A: Not currently implemented (can be added in future)

**Q: "Why does Google sign-in redirect on mobile?"**
A: Mobile browsers handle popups differently; redirect provides better UX

**Q: "Can I use without creating an account?"**
A: No, authentication is required to use the app

---

**Made with ❤️ using Firebase Authentication**
