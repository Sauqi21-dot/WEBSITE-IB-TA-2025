/**
 * Helper untuk optimasi gambar galeri kelas (Admin):
 * - Memeriksa format: JPG, PNG, atau WebP
 * - Memeriksa batas ukuran: maksimal 5 MB
 * - Mengubah resolusi ke maksimal 1600x1600 px (mempertahankan rasio)
 * - Mengonversi ke format WebP berkualitas optimal (0.85)
 * - Menghapus metadata lokasi (EXIF) secara otomatis via rendering HTML5 Canvas
 */

export interface ProcessedGalleryImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export const MAX_GALLERY_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function processGalleryImage(file: File, maxDim = 1600): Promise<ProcessedGalleryImage> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Format foto tidak didukung. Harap unggah berkas JPG, PNG, atau WebP.");
  }

  if (file.size > MAX_GALLERY_SIZE) {
    throw new Error("Ukuran berkas melebihi batas 5 MB. Silakan pilih foto dengan ukuran lebih kecil.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          // Render ke HTML5 Canvas (EXIF otomatis hilang)
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Gagal menginisialisasi canvas grafis peramban.");
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Ekspor ke WebP dengan kualitas 0.85
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Gagal mengonversi gambar ke WebP."));
                return;
              }
              const dataUrl = canvas.toDataURL("image/webp", 0.85);
              resolve({
                blob,
                dataUrl,
                width,
                height,
                sizeBytes: blob.size,
              });
            },
            "image/webp",
            0.85
          );
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error("Gagal membaca berkas gambar. Pastikan berkas tidak rusak."));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Gagal membaca berkas dari perangkat."));
    };

    reader.readAsDataURL(file);
  });
}
