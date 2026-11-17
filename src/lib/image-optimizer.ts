/**
 * Helper untuk optimasi gambar profil mahasiswa (FR-08):
 * - Memeriksa format: hanya JPG, PNG, atau WebP
 * - Memeriksa ukuran: maksimal 2 MB
 * - Mengubah resolusi ke maksimal 600x600 px (mempertahankan rasio)
 * - Mengonversi ke format WebP berkualitas optimal
 * - Menghapus metadata lokasi (EXIF) secara otomatis melalui rendering Canvas HTML5
 */

export interface ProcessedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function processProfileImage(file: File, maxDim = 600): Promise<ProcessedImage> {
  // 1. Validasi tipe MIME
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Format foto tidak didukung. Harap unggah berkas JPG, PNG, atau WebP.");
  }

  // 2. Validasi ukuran berkas asal
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Ukuran berkas melebihi batas 2 MB. Silakan pilih foto dengan ukuran lebih kecil.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          // 3. Hitung dimensi baru yang proporsional
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

          // 4. Render ke HTML5 Canvas (secara otomatis menghapus EXIF data)
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Gagal menginisialisasi canvas grafis peramban.");
          }

          ctx.drawImage(img, 0, 0, width, height);

          // 5. Ekspor ke WebP dengan kualitas 0.85
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
        reject(new Error("Gagal memuat berkas gambar. Pastikan berkas tidak rusak."));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Gagal membaca berkas dari perangkat."));
    };

    reader.readAsDataURL(file);
  });
}
