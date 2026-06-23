/**
 * Resizes an image file to a maximum dimension and compresses it.
 * Returns a Promise that resolves to a base64 JPEG data URL.
 * 
 * @param {File} file - The uploaded image file
 * @param {number} maxDimension - The maximum width or height of the resized image
 * @param {number} quality - Compression quality (0.0 to 1.0)
 * @returns {Promise<string>}
 */
export function resizeImage(file, maxDimension = 300, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const image = new Image();
      image.onload = () => {
        let width = image.width;
        let height = image.height;

        // Resize logic keeping aspect ratio
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas 2D context"));
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(image, 0, 0, width, height);

        // Convert canvas back to base64 JPEG data URL
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      image.onerror = (err) => reject(err);
      image.src = readerEvent.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
