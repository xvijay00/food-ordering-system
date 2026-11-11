const MAX_DIMENSION_PX = 800;

/**
 * Resizes and compresses an image File in the browser so its longest side
 * is at most 800px, returning a WebP (or JPEG fallback) File ready for upload.
 */
export async function compressImageToMax800(file: File): Promise<File> {
  if (typeof window === "undefined") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
            return;
          }
          canvas.toBlob((jpegResult) => resolve(jpegResult), "image/jpeg", 0.85);
        },
        "image/webp",
        0.82
      );
    });

    if (!blob) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "menu-item";
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${baseName}.${ext}`, {
      type: blob.type || "image/jpeg",
    });
  } finally {
    bitmap.close();
  }
}

