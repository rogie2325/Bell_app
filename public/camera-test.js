// camera-test.js - Standalone camera test
console.log('🎥 Starting camera test...');

// Check if getUserMedia is supported
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  console.error('❌ getUserMedia not supported in this browser');
  alert('Camera not supported in this browser');
} else {
  console.log('✅ getUserMedia is supported');
  
  // Test camera access
  navigator.mediaDevices.getUserMedia({
    video: { 
      width: { ideal: 1280 }, 
      height: { ideal: 720 },
      facingMode: 'user'
    },
    audio: true
  })
  .then(stream => {
    console.log('🎉 Camera access granted!');
    console.log('📹 Video tracks:', stream.getVideoTracks().length);
    console.log('🎤 Audio tracks:', stream.getAudioTracks().length);
    
    // Create video element for testing
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.position = 'fixed';
    video.style.top = '10px';
    video.style.right = '10px';
    video.style.width = '300px';
    video.style.height = '200px';
    video.style.border = '2px solid green';
    video.style.zIndex = '9999';
    
    document.body.appendChild(video);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✅ Camera Working - Close';
    closeBtn.style.position = 'fixed';
    closeBtn.style.top = '220px';
    closeBtn.style.right = '10px';
    closeBtn.style.zIndex = '9999';
    closeBtn.style.padding = '10px';
    closeBtn.style.backgroundColor = 'green';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '5px';
    closeBtn.onclick = () => {
      stream.getTracks().forEach(track => track.stop());
      document.body.removeChild(video);
      document.body.removeChild(closeBtn);
    };
    
    document.body.appendChild(closeBtn);
    
    alert('✅ Camera test successful! Check top-right corner for video preview.');
  })
  .catch(error => {
    console.error('❌ Camera access failed:', error);
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    
    let errorMsg = '';
    if (error.name === 'NotAllowedError') {
      errorMsg = '❌ Camera permission denied. Click "Allow" when browser asks for camera access.';
    } else if (error.name === 'NotFoundError') {
      errorMsg = '❌ No camera found. Please check if your camera is connected.';
    } else if (error.name === 'NotReadableError') {
      errorMsg = '❌ Camera is being used by another application. Close other camera apps.';
    } else if (error.name === 'OverconstrainedError') {
      errorMsg = '❌ Camera constraints not supported. Try a different camera resolution.';
    } else {
      errorMsg = '❌ Camera error: ' + error.message;
    }
    
    alert(errorMsg);
    
    // Show detailed error info
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: #ff4444; color: white; padding: 20px; border-radius: 10px; 
                  z-index: 9999; max-width: 400px; text-align: center;">
        <h3>🎥 Camera Test Failed</h3>
        <p><strong>Error:</strong> ${error.name}</p>
        <p><strong>Message:</strong> ${error.message}</p>
        <p><strong>Solution:</strong> ${errorMsg}</p>
        <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; 
                background: white; color: #ff4444; border: none; border-radius: 5px; 
                cursor: pointer;">
          Try Again
        </button>
      </div>
    `;
    document.body.appendChild(errorDiv);
  });
}

// Also test HTTPS requirement
console.log('🔒 Protocol:', window.location.protocol);
console.log('🌐 Hostname:', window.location.hostname);
console.log('📱 User Agent:', navigator.userAgent);

if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  console.warn('⚠️ Camera may not work over HTTP on non-localhost domains');
}