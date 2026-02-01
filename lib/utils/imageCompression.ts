/**
 * Image compression utilities
 * Compresses images to reduce payload size for API calls
 */

export async function compressImage(
  file: File,
  options: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    quality?: number;
  } = {}
): Promise<string> {
  const {
    maxSizeMB = 4,
    maxWidthOrHeight = 2048,
    quality = 0.8,
  } = options;

  // Create image element to get dimensions
  const img = new Image();
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      // Calculate dimensions
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
        const ratio = Math.min(maxWidthOrHeight / width, maxWidthOrHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      // Compress using canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob and check size
      let finalQuality = quality;
      let blob: Blob | null = null;

      // Iteratively reduce quality if needed
      while (finalQuality >= 0.1) {
        blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(
            (blob) => resolve(blob!),
            'image/jpeg',
            finalQuality
          );
        });

        if ((blob.size / (1024 * 1024)) <= maxSizeMB) {
          break;
        }

        finalQuality -= 0.1;
      }

      if (!blob || (blob.size / (1024 * 1024)) > maxSizeMB) {
        reject(new Error(`Could not compress image below ${maxSizeMB}MB`));
        return;
      }

      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = () => {
        reject(new Error('Could not read compressed image'));
      };
      reader.readAsDataURL(blob);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Convert image file to base64 string with size checking
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Validate image file
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid image type. Supported: ${validTypes.join(', ')}`,
    };
  }

  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Image size exceeds 20MB limit`,
    };
  }

  return { valid: true };
}
