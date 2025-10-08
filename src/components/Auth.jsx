import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup, resetPassword, signInWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (showForgotPassword) {
      // Handle password reset
      if (!email) {
        setError('Please enter your email address');
        return;
      }

      setLoading(true);
      try {
        await resetPassword(email);
        setMessage('Password reset email sent! Check your inbox.');
        setTimeout(() => {
          setShowForgotPassword(false);
          setMessage('');
        }, 3000);
      } catch (error) {
        setError(getErrorMessage(error.code));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin) {
      if (!displayName) {
        setError('Please enter your name');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, displayName);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed';
      case 'auth/cancelled-popup-request':
        return 'Sign-in cancelled';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setMessage('');
    setShowForgotPassword(false);
  };

  const toggleForgotPassword = () => {
    setShowForgotPassword(!showForgotPassword);
    setError('');
    setMessage('');
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-gradient"></div>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          {showForgotPassword ? (
            <>
              <button 
                className="back-button"
                onClick={toggleForgotPassword}
                disabled={loading}
              >
                <ArrowLeft size={20} />
              </button>
              <h1>Reset Password</h1>
              <p>Enter your email to receive a password reset link</p>
            </>
          ) : (
            <>
              <div className="auth-icon">
                {isLogin ? <LogIn size={24} /> : <UserPlus size={24} />}
              </div>
              <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
              <p>{isLogin ? 'Sign in to continue' : 'Join Bell today!'}</p>
            </>
          )}
        </div>

        {error && (
          <div className="auth-alert auth-alert-error">
            {error}
          </div>
        )}

        {message && (
          <div className="auth-alert auth-alert-success">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && !showForgotPassword && (
            <div className="form-group">
              <label htmlFor="displayName">
                <User size={18} />
                Full Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={18} />
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          {!showForgotPassword && (
            <>
              <div className="form-group">
                <label htmlFor="password">
                  <Lock size={18} />
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    <Lock size={18} />
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    disabled={loading}
                  />
                </div>
              )}
            </>
          )}

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner"></span>
            ) : showForgotPassword ? (
              'Send Reset Link'
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Sign Up'
            )}
          </button>

          {!showForgotPassword && (
            <>
              {isLogin && (
                <button
                  type="button"
                  className="forgot-password-btn"
                  onClick={toggleForgotPassword}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              )}

              <div className="auth-divider">
                <span>or</span>
              </div>

              <button
                type="button"
                className="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="auth-toggle">
                {isLogin ? (
                  <>
                    Don't have an account?{' '}
                    <button type="button" onClick={toggleMode} disabled={loading}>
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button type="button" onClick={toggleMode} disabled={loading}>
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default Auth;
