"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface ImageCropModalProps {
  file: File;
  // eslint-disable-next-line no-unused-vars
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => void;
  onCancel: () => void;
}

export default function ImageCropModal({
  file,
  onCropComplete,
  onCancel,
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Ukuran kanvas editor crop di layar (dalam piksel)
  const CROP_BOX_SIZE = 280;
  // Ukuran piksel output hasil crop (persegi 500x500 px format WebP)
  const OUTPUT_SIZE = 500;

  // 1. Muat file gambar ke DataURL
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        imageRef.current = img;
        // Inisialisasi posisi ke tengah
        setOffset({ x: 0, y: 0 });
        setZoom(1);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, [file]);

  // 2. Render live preview lingkaran
  const updateCircularPreview = useCallback(() => {
    if (!imageRef.current || !previewCanvasRef.current || imageSize.width === 0) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imageRef.current;
    const { width: imgW, height: imgH } = imageSize;

    // Hitung skala dasar agar gambar menutupi kotak crop
    const baseScale = Math.max(CROP_BOX_SIZE / imgW, CROP_BOX_SIZE / imgH);
    const currentScale = baseScale * zoom;

    const displayedW = imgW * currentScale;
    const displayedH = imgH * currentScale;

    // Bersihkan canvas preview
    canvas.width = 96;
    canvas.height = 96;
    ctx.clearRect(0, 0, 96, 96);

    // Buat kliping lingkaran
    ctx.save();
    ctx.beginPath();
    ctx.arc(48, 48, 48, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    // Petakan koordinat dari editor crop (280px) ke preview (96px)
    const previewScale = 96 / CROP_BOX_SIZE;
    const drawX = (CROP_BOX_SIZE / 2 - displayedW / 2 + offset.x) * previewScale;
    const drawY = (CROP_BOX_SIZE / 2 - displayedH / 2 + offset.y) * previewScale;

    ctx.drawImage(img, drawX, drawY, displayedW * previewScale, displayedH * previewScale);
    ctx.restore();
  }, [imageSize, zoom, offset]);

  useEffect(() => {
    updateCircularPreview();
  }, [updateCircularPreview]);

  // 3. Batasi perpindahan agar gambar tidak bergeser keluar dari area crop
  const clampOffset = (newX: number, newY: number, currentZoom: number) => {
    if (imageSize.width === 0) return { x: 0, y: 0 };
    const baseScale = Math.max(CROP_BOX_SIZE / imageSize.width, CROP_BOX_SIZE / imageSize.height);
    const currentScale = baseScale * currentZoom;
    const displayedW = imageSize.width * currentScale;
    const displayedH = imageSize.height * currentScale;

    const maxX = Math.max(0, (displayedW - CROP_BOX_SIZE) / 2);
    const maxY = Math.max(0, (displayedH - CROP_BOX_SIZE) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, newX)),
      y: Math.min(maxY, Math.max(-maxY, newY)),
    };
  };

  // 4. Penanganan Drag / Pan dengan Mouse atau Touch
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newRawX = e.clientX - dragStart.x;
    const newRawY = e.clientY - dragStart.y;
    const clamped = clampOffset(newRawX, newRawY, zoom);
    setOffset(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (containerRef.current) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // 5. Penanganan Perubahan Zoom
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, newZoom));
    setZoom(clampedZoom);
    // Sesuaikan offset agar tetap dalam batas saat zoom berubah
    setOffset((prev) => clampOffset(prev.x, prev.y, clampedZoom));
  };

  // 6. Eksekusi Crop & Konversi ke WebP Bersih (Hapus EXIF)
  const handleApplyCrop = () => {
    if (!imageRef.current || imageSize.width === 0) return;
    setIsProcessing(true);

    try {
      const img = imageRef.current;
      const { width: imgW, height: imgH } = imageSize;

      const baseScale = Math.max(CROP_BOX_SIZE / imgW, CROP_BOX_SIZE / imgH);
      const currentScale = baseScale * zoom;

      // Hitung koordinat gambar asal (source x, source y, source width, source height)
      // Hubungan: pusat kotak crop = (displayedW / 2 - offset.x) dalam piksel tampilan
      const displayedW = imgW * currentScale;
      const displayedH = imgH * currentScale;

      const cropLeftInDisplay = (displayedW - CROP_BOX_SIZE) / 2 - offset.x;
      const cropTopInDisplay = (displayedH - CROP_BOX_SIZE) / 2 - offset.y;

      // Konversikan piksel tampilan kembali ke piksel gambar asli
      const srcX = Math.max(0, cropLeftInDisplay / currentScale);
      const srcY = Math.max(0, cropTopInDisplay / currentScale);
      const srcW = Math.min(imgW - srcX, CROP_BOX_SIZE / currentScale);
      const srcH = Math.min(imgH - srcY, CROP_BOX_SIZE / currentScale);

      // Render ke Canvas HTML5 baru (bersih tanpa EXIF)
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = OUTPUT_SIZE;
      exportCanvas.height = OUTPUT_SIZE;

      const ctx = exportCanvas.getContext("2d");
      if (!ctx) throw new Error("Gagal menginisialisasi canvas.");

      // Gambar bagian crop ke kanvas 500x500 px
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      // Konversi ke format WebP kualitas 0.85
      exportCanvas.toBlob(
        (blob) => {
          if (!blob) {
            alert("Gagal memproses gambar.");
            setIsProcessing(false);
            return;
          }
          const dataUrl = exportCanvas.toDataURL("image/webp", 0.85);
          setIsProcessing(false);
          onCropComplete(blob, dataUrl);
        },
        "image/webp",
        0.85
      );
    } catch (err) {
      console.error("Gagal melakukan crop foto:", err);
      setIsProcessing(false);
      alert("Terjadi kesalahan saat memotong foto.");
    }
  };

  // Hitung transformasi gambar untuk tampilan editor
  const baseScale = imageSize.width > 0
    ? Math.max(CROP_BOX_SIZE / imageSize.width, CROP_BOX_SIZE / imageSize.height)
    : 1;
  const currentScale = baseScale * zoom;
  const displayedW = imageSize.width * currentScale;
  const displayedH = imageSize.height * currentScale;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 space-y-5 border border-ib-border animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="border-b border-ib-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-ib-dark">
              Sesuaikan Foto Profil
            </h3>
            <p className="text-xs text-ib-text/70 mt-0.5">
              Geser dan atur perbesaran foto. Hasil akan disimpan dalam rasio persegi format WebP.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-ib-text/60 hover:text-ib-dark text-lg font-bold p-1 leading-none"
            title="Tutup"
          >
            &times;
          </button>
        </div>

        {/* Area Editor Crop & Pratinjau */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {/* Kotak Crop Interaktif */}
          <div className="flex flex-col items-center">
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative overflow-hidden rounded bg-gray-900 select-none touch-none cursor-grab active:cursor-grabbing border-2 border-ib-dark shadow-inner"
              style={{ width: `${CROP_BOX_SIZE}px`, height: `${CROP_BOX_SIZE}px` }}
            >
              {/* Gambar yang di-pan dan di-zoom */}
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt="Crop preview"
                  draggable={false}
                  className="absolute pointer-events-none max-w-none transition-transform duration-75"
                  style={{
                    width: `${displayedW}px`,
                    height: `${displayedH}px`,
                    left: `${CROP_BOX_SIZE / 2 - displayedW / 2 + offset.x}px`,
                    top: `${CROP_BOX_SIZE / 2 - displayedH / 2 + offset.y}px`,
                  }}
                />
              )}

              {/* Overlay Grid Panduan */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/30">
                <div className="border-r border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-b border-white/20"></div>
                <div className="border-r border-white/20"></div>
                <div className="border-r border-white/20"></div>
                <div></div>
              </div>

              {/* Garis Panduan Lingkaran Halus di Kanvas */}
              <div className="absolute inset-0 pointer-events-none rounded-full border border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"></div>
            </div>
            <span className="text-[11px] text-ib-text/60 mt-1.5 flex items-center gap-1">
              <span>✥</span> Klik dan geser untuk memposisikan foto
            </span>
          </div>

          {/* Pratinjau Lingkaran Real-Time */}
          <div className="flex flex-col items-center justify-center p-3 bg-[#FAF8F2] border border-ib-border rounded w-36">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ib-dark mb-2">
              Pratinjau
            </span>
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-ib-dark shadow-sm bg-gray-200 flex items-center justify-center">
              <canvas
                ref={previewCanvasRef}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[10px] text-ib-text/65 mt-2 text-center">
              Tampilan profil bundar Anda
            </span>
          </div>
        </div>

        {/* Kontrol Perbesaran (Zoom) */}
        <div className="space-y-1.5 bg-[#FCFAF5] p-3 rounded border border-ib-border/70">
          <div className="flex items-center justify-between text-xs font-semibold text-ib-text">
            <span>Perbesaran (Zoom)</span>
            <span className="font-mono text-ib-dark">{zoom.toFixed(2)}x</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.2)}
              className="w-7 h-7 flex items-center justify-center rounded bg-white border border-ib-border hover:bg-gray-100 text-sm font-bold text-ib-dark"
              title="Perkecil"
            >
              −
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-full accent-ib-dark cursor-pointer h-1.5 bg-gray-200 rounded-lg"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.2)}
              className="w-7 h-7 flex items-center justify-center rounded bg-white border border-ib-border hover:bg-gray-100 text-sm font-bold text-ib-dark"
              title="Perbesar"
            >
              +
            </button>
          </div>
        </div>

        {/* Tombol Aksi Batal & Terapkan */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-ib-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="btn-secondary text-xs py-2 px-4"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={isProcessing || imageSize.width === 0}
            className="btn-primary text-xs py-2 px-5 font-semibold"
          >
            {isProcessing ? "Memproses WebP…" : "Gunakan Foto Ini"}
          </button>
        </div>
      </div>
    </div>
  );
}
