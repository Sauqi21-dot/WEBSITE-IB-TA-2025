/**
 * Util bersama untuk validasi dan ekstraksi tautan sosial profil mahasiswa
 * Digunakan seragam di halaman Profil, Direktori Mahasiswa, dan validasi tampilan.
 */

export const INSTAGRAM_REGEX = /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?$/;
export const LINKEDIN_REGEX = /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9%_-]{3,100}\/?$/;
export const WEBSITE_REGEX = /^https:\/\/[A-Za-z0-9.-]+(:[0-9]+)?(\/[^\s]*)?$/;

/**
 * Validasi tautan sebelum dijadikan href (mencegah XSS, javascript:, dan malformed URL).
 * Mengembalikan string URL yang valid atau null jika tidak memenuhi syarat.
 */
export function validateSocialLink(
  type: "instagram" | "linkedin" | "website",
  url: string | null | undefined
): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Tolak scheme berbahaya
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return null;
  }

  if (type === "instagram") {
    return INSTAGRAM_REGEX.test(trimmed) ? trimmed : null;
  }

  if (type === "linkedin") {
    return LINKEDIN_REGEX.test(trimmed) ? trimmed : null;
  }

  if (type === "website") {
    // Tolak credentials user:password@
    try {
      const parsed = new URL(trimmed);
      if (parsed.username || parsed.password) return null;
    } catch {
      return null;
    }
    return WEBSITE_REGEX.test(trimmed) ? trimmed : null;
  }

  return null;
}

export function parseInstagramDisplay(url: string): string {
  return url.replace(/^https:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
}

export function parseLinkedinDisplay(url: string): string {
  return url.split("/in/")[1]?.replace(/\/$/, "") || "";
}

export function parseWebsiteDisplay(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
