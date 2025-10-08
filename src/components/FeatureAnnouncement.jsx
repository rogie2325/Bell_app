import React, { useState, useEffect } from 'react';
import './FeatureAnnouncement.css';

const FeatureAnnouncement = () => {
    const [showAnnouncement, setShowAnnouncement] = useState(false);

    useEffect(() => {
        // Check if user has seen this announcement
        const hasSeenAnnouncement = localStorage.getItem('hasSeenPassTheAuxAnnouncement');
        
        if (!hasSeenAnnouncement) {
            // Show announcement after a short delay
            setTimeout(() => {
                setShowAnnouncement(true);
            }, 1000);
        }
    }, []);

    const handleClose = () => {
        setShowAnnouncement(false);
        localStorage.setItem('hasSeenPassTheAuxAnnouncement', 'true');
    };

    const handleGetStarted = () => {
        handleClose();
    };

    if (!showAnnouncement) return null;

    return (
        <div className="announcement-overlay" onClick={handleClose}>
            <div className="announcement-modal" onClick={(e) => e.stopPropagation()}>
                
                {/* Close Button */}
                <button className="announcement-close-btn" onClick={handleClose}>✕</button>
                
                <div className="announcement-header">
                    <span className="announcement-icon">👑</span>
                    <h2>🎵 Pass The Aux 🎵</h2>
                    <p className="announcement-subtitle">Take control of the party!</p>
                </div>

                <div className="announcement-features">
                    <div className="feature-item highlight">
                        <span className="feature-icon">🎵</span>
                        <div className="feature-text">
                            <strong>Share Music:</strong> Upload MP3, WAV, M4A files and become the DJ
                        </div>
                    </div>

                    <div className="feature-item highlight">
                        <span className="feature-icon">�</span>
                        <div className="feature-text">
                            <strong>Aux Status:</strong> Everyone sees who's controlling the music!
                        </div>
                    </div>

                    <div className="feature-item highlight">
                        <span className="feature-icon">❤️</span>
                        <div className="feature-text">
                            <strong>React Together:</strong> Send ❤️ 🔥 👍 😂 and watch them float!
                        </div>
                    </div>
                </div>

                <div className="pro-tip-announcement">
                    <span className="tip-icon">✨</span>
                    <div>
                        <strong>How It Works</strong>
                        <p>Click the 🎵 button, upload your music, and everyone hears it in sync!</p>
                    </div>
                </div>

                <div className="announcement-buttons">
                    <button className="get-started-btn" onClick={handleGetStarted}>
                        🎉 Let's Go!
                    </button>

                    <button className="skip-btn" onClick={handleClose}>
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeatureAnnouncement;
