/**
 * Resizes an image file to a thumbnail (max dimensions of 600px width/height)
 * using HTML Canvas, and returns the base64-encoded data URL string.
 */
export function resizeImageToThumbnail(file: File, maxDim: number = 600, quality: number = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if the file is an image
    if (!file.type.startsWith("image/")) {
      reject(new Error("File is not an image."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Scale down while preserving aspect ratio
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          // If 2D context fails, fallback to original loaded data URL
          resolve(e.target?.result as string);
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        // Export to compressed jpeg
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        // Fallback to original read if image load fails
        resolve(e.target?.result as string);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = (err) => {
      reject(err);
    };
    
    reader.readAsDataURL(file);
  });
}
