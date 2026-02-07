'use client';

import { useRef, useState } from 'react';
import GlassCard from './GlassCard';
import Button from './Button';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  onClose: () => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
}

/**
 * File upload component for images and documents
 */
export default function FileUpload({
  onFilesSelected,
  onClose,
  acceptedTypes = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',  // Images
    '.pdf',                                      // PDF
    '.docx', '.doc',                            // Word
    '.xlsx', '.xls',                            // Excel
    '.csv',                                      // CSV
    '.txt', '.md',                              // Text files
  ],
  maxSize = 20,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    processFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (fileList: FileList) => {
    const files = Array.from(fileList);
    const validFiles: File[] = [];
    let errorMsg = '';

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!acceptedTypes.includes(ext)) {
        errorMsg = `File type ${ext} not supported. Accepted: ${acceptedTypes.join(', ')}`;
        continue;
      }

      if (file.size > maxSize * 1024 * 1024) {
        errorMsg = `File size exceeds ${maxSize}MB limit`;
        continue;
      }

      validFiles.push(file);
    }

    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GlassCard className="w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Upload Files</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${
                dragActive
                  ? 'border-blue-400 bg-blue-400/10'
                  : 'border-gray-400 bg-gray-400/5 hover:border-blue-400'
              }
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg
              className="w-12 h-12 mx-auto mb-2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8l-6-4m6 4l6-4"
              />
            </svg>
            <p className="text-white font-medium mb-1">Drag files here or click to browse</p>
            <p className="text-sm text-gray-400">
              Supported: Images, PDF, Word, Excel, CSV, Text files
            </p>
            <p className="text-xs text-gray-500 mt-2">Max size: {maxSize}MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleChange}
            className="hidden"
          />

          {error && (
            <div className="mt-4 p-3 bg-red-400/20 border border-red-400/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
