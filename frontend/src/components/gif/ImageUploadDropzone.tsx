import React, { useState, useRef } from 'react';

interface ImageUploadDropzoneProps {
  onFileSelected: (file: File) => void;
  isUploading: boolean;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  onFileSelected,
  isUploading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onFileSelected(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div
      className={`gif-dropzone ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div style={{ fontSize: 28, marginBottom: 8 }}>🖼️</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
        {isUploading ? 'UPLOADING & ANALYZING...' : 'DROP IMAGE HERE'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--gif-text-muted)' }}>
        Supports PNG, JPEG, GIF, WEBP up to 15MB
      </div>
    </div>
  );
};
