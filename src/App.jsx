import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SimpleLiveKitApp from './components/SimpleLiveKitApp';
import Auth from './components/Auth';

const AppContent = () => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{
                    width: '3rem',
                    height: '3rem',
                    border: '4px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                }} />
            </div>
        );
    }

    return currentUser ? <SimpleLiveKitApp /> : <Auth />;
};

const App = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;