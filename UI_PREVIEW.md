# Authentication UI Preview

## 🎨 What Users Will See

### 1. Login Screen (Default View)

```
┌────────────────────────────────────┐
│                                    │
│         [🔐 Login Icon]            │
│                                    │
│         Welcome Back               │
│      Sign in to continue           │
│                                    │
│  📧 Email                          │
│  [email input field.............]  │
│                                    │
│  🔒 Password               [👁]    │
│  [password field...............]   │
│                                    │
│        Forgot password?            │
│                                    │
│  ┌──────────────────────────────┐ │
│  │        Sign In               │ │
│  └──────────────────────────────┘ │
│                                    │
│  ────────────── or ───────────────│
│                                    │
│  ┌──────────────────────────────┐ │
│  │ [G] Continue with Google     │ │
│  └──────────────────────────────┘ │
│                                    │
│  Don't have an account? Sign up    │
│                                    │
└────────────────────────────────────┘
```

### 2. Sign Up Screen

```
┌────────────────────────────────────┐
│                                    │
│      [👤+ Create Icon]             │
│                                    │
│       Create Account               │
│     Sign up to get started         │
│                                    │
│  👤 Full Name                      │
│  [name input field..............]  │
│                                    │
│  📧 Email                          │
│  [email input field.............]  │
│                                    │
│  🔒 Password               [👁]    │
│  [password field...............]   │
│                                    │
│  🔒 Confirm Password       [👁]    │
│  [password field...............]   │
│                                    │
│  ┌──────────────────────────────┐ │
│  │         Sign Up              │ │
│  └──────────────────────────────┘ │
│                                    │
│  ────────────── or ───────────────│
│                                    │
│  ┌──────────────────────────────┐ │
│  │ [G] Continue with Google     │ │
│  └──────────────────────────────┘ │
│                                    │
│  Already have an account? Sign in  │
│                                    │
└────────────────────────────────────┘
```

### 3. Forgot Password Screen

```
┌────────────────────────────────────┐
│                                    │
│  [←]  Reset Password               │
│                                    │
│  Enter your email to receive a     │
│  password reset link               │
│                                    │
│  📧 Email                          │
│  [email input field.............]  │
│                                    │
│  ┌──────────────────────────────┐ │
│  │     Send Reset Link          │ │
│  └──────────────────────────────┘ │
│                                    │
└────────────────────────────────────┘
```

### 4. During Video Call - Profile Button

```
┌────────────────────────────────────┐
│  [Room 123]  [2 online]      [👤] │ ← Profile button
│                                    │
│                                    │
│     [Video Call Interface]         │
│                                    │
│                                    │
└────────────────────────────────────┘
```

### 5. User Profile Modal

```
        ┌──────────────────────┐
        │          [X]         │
        │                      │
        │     [👤 Avatar]      │
        │       Profile        │
        │                      │
        │  👤 Name             │
        │  [John Doe........]  │
        │                      │
        │  📧 Email            │
        │  john@example.com    │
        │                      │
        │  👤 Account Type     │
        │  Email Account       │
        │                      │
        │  ┌────────────────┐  │
        │  │ ✏️ Edit Profile│  │
        │  └────────────────┘  │
        │                      │
        │  ┌────────────────┐  │
        │  │ 🚪 Sign Out    │  │
        │  └────────────────┘  │
        │                      │
        └──────────────────────┘
```

### 6. Edit Profile Mode

```
        ┌──────────────────────┐
        │          [X]         │
        │                      │
        │     [👤 Avatar]      │
        │       Profile        │
        │                      │
        │  👤 Name             │
        │  [John Doe........]  │ ← Editable
        │                      │
        │  📧 Email            │
        │  john@example.com    │
        │                      │
        │  👤 Account Type     │
        │  Email Account       │
        │                      │
        │  ┌────┐  ┌────────┐  │
        │  │💾Save│  │ Cancel │  │
        │  └────┘  └────────┘  │
        │                      │
        └──────────────────────┘
```

## 🎨 Design Features

### Color Scheme
- **Primary**: Purple gradient (#667eea → #764ba2)
- **Success**: Green (#065f46)
- **Error**: Red (#991b1b)
- **Background**: White with gradient overlay
- **Dark mode**: Automatic support

### Animations
- ✨ Slide-up entrance animations
- 🔄 Smooth transitions
- 💫 Loading spinners
- 🌊 Glassmorphic blur effects
- 📱 Touch feedback on mobile

### Responsive Behavior

**Mobile (< 640px)**
- Smaller padding
- Stack buttons vertically
- Touch-optimized inputs
- Full-width forms

**Desktop (≥ 640px)**
- Larger padding
- Side-by-side buttons
- Hover effects
- Mouse-optimized

## 🚀 User Flow

```
Start App
    ↓
Not Logged In? → Show Auth Screen
    ↓
┌───────────────────────┐
│  Choose Option:       │
│  1. Sign Up           │
│  2. Sign In           │
│  3. Google Sign-In    │
└───────────────────────┘
    ↓
Authenticate
    ↓
Success! → SimpleLiveKitApp
    ↓
┌───────────────────────┐
│  Username auto-filled │
│  from user profile    │
└───────────────────────┘
    ↓
Join/Create Room
    ↓
In Call → Click Profile Button
    ↓
┌───────────────────────┐
│  View/Edit Profile    │
│  Sign Out Option      │
└───────────────────────┘
```

## 🔔 Notifications & Feedback

### Error Messages
- ❌ "Invalid email address"
- ❌ "Incorrect password"
- ❌ "Email already in use"
- ❌ "Password must be at least 6 characters"

### Success Messages
- ✅ "Password reset email sent!"
- ✅ "Profile updated successfully!"
- ✅ "Signed in successfully"

### Loading States
- 🔄 Spinner during authentication
- 🔄 Disabled buttons while processing
- 🔄 Loading overlay on app start

## 🎯 Key Interactive Elements

1. **Password Toggle** - Show/hide password with eye icon
2. **Mode Toggle** - Switch between login and signup
3. **Forgot Password** - Access reset flow
4. **Google Button** - Quick OAuth sign-in
5. **Profile Button** - Access profile from video call
6. **Edit Mode** - Toggle profile editing

---

All UI elements are fully functional and tested! 🎉
