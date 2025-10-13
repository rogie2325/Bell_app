import React, { useState, useRef, useCallback } from 'react';
import { Crop, RotateCw, ZoomIn, ZoomOut, Check, X } from 'lucide-react';
import './ImageCropper.css';

const ImageCropper = ({ image, onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [crop, setCrop] = useState({
    x: 0,
    y: 0,
    width: 200,
    height: 200
  });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  console.log('🎨 ImageCropper rendered with image:', image);

  // Handle image load
  const handleImageLoad = () => {
    console.log('🖼️ Image loaded successfully');
    setImageLoaded(true);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - crop.x,
      y: e.clientY - crop.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setCrop(prev => ({
      ...prev,
      x: Math.max(0, Math.min(newX, 400 - prev.width)),
      y: Math.max(0, Math.min(newY, 400 - prev.height))
    }));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const cropImage = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    
    if (!canvas || !img) {
      console.error('❌ Canvas or image not available for cropping');
      return;
    }

    const ctx = canvas.getContext('2d');

    // Output size - circular crop area
    const outputSize = 300;
    canvas.width = outputSize;
    canvas.height = outputSize;

    console.log('🖼️ Cropping image with settings:', {
      zoom: zoom,
      rotation: rotation,
      imageNaturalSize: { width: img.naturalWidth, height: img.naturalHeight },
      imageDisplaySize: { width: img.width, height: img.height },
      outputSize: outputSize
    });

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Make it circular
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Move to center for transformations
    ctx.translate(outputSize / 2, outputSize / 2);
    
    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Apply zoom
    ctx.scale(zoom, zoom);

    // Calculate how to draw the image centered
    // We want to fit the image to fill the circular area
    const scale = Math.max(
      outputSize / img.naturalWidth,
      outputSize / img.naturalHeight
    );
    
    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;
    
    // Draw the image centered
    ctx.drawImage(
      img,
      -scaledWidth / 2 / zoom,
      -scaledHeight / 2 / zoom,
      scaledWidth / zoom,
      scaledHeight / zoom
    );

    // Restore context state
    ctx.restore();

    console.log('✂️ Image cropped to circular shape, converting to blob...');

    // Convert to blob and return
    canvas.toBlob((blob) => {
      if (blob) {
        console.log('✅ Blob created successfully:', blob.size, 'bytes');
        onSave(blob);
      } else {
        console.error('❌ Failed to create blob from canvas');
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="image-cropper-overlay">
      <div className="image-cropper-modal">
        <div className="cropper-header">
          <h3>✂️ Crop Your Profile Picture</h3>
          <button onClick={onCancel} className="cropper-close">
            <X size={20} />
          </button>
        </div>

        <div className="cropper-content">
          <div className="image-preview-container">
            <div className="image-preview">
              <img
                ref={imageRef}
                src={image}
                alt="Crop preview"
                onLoad={handleImageLoad}
                onError={(e) => {
                  console.error('❌ Image failed to load:', e);
                }}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  maxWidth: '100%',
                  maxHeight: '100%',
                  display: imageLoaded ? 'block' : 'none'
                }}
              />
              {!imageLoaded && (
                <div className="image-loading">
                  Loading image...
                </div>
              )}
            </div>
            
            {/* Circular crop overlay */}
            <div className="crop-overlay-circular">
              <div className="crop-frame-circular">
                <div className="crop-grid">
                  <div className="grid-line"></div>
                  <div className="grid-line"></div>
                  <div className="grid-line horizontal"></div>
                  <div className="grid-line horizontal"></div>
                </div>
              </div>
            </div>
            
            <div className="crop-hint">
              Drag to reposition • Use controls below to adjust
            </div>
          </div>

          <div className="cropper-controls">
            <div className="control-group">
              <label>🔍 Zoom</label>
              <div className="zoom-controls">
                <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
                  <ZoomOut size={16} />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                />
                <button onClick={() => setZoom(Math.min(3, zoom + 0.1))}>
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>

            <div className="control-group">
              <label>🔄 Rotation</label>
              <div className="rotation-controls">
                <button onClick={() => setRotation((rotation - 90) % 360)}>
                  <RotateCw size={16} style={{ transform: 'scaleX(-1)' }} />
                </button>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                />
                <button onClick={() => setRotation((rotation + 90) % 360)}>
                  <RotateCw size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="cropper-actions">
            <button className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={cropImage}
              disabled={!imageLoaded}
            >
              <Check size={16} /> Save Cropped Image
            </button>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default ImageCropper;