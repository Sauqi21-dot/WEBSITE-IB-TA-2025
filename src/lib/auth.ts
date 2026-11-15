export const INTERNAL_EMAIL_DOMAIN = "3ib.internal";

/**
 * Memetakan NIM ke email internal Supabase Auth (Section 8 FR-07)
 * Contoh: 062530801574 -> 062530801574@3ib.internal
 */
export function nimToEmail(nim: string): string {
  const cleanNim = nim.trim().replace(/\s+/g, "");
  return `${cleanNim}@${INTERNAL_EMAIL_DOMAIN}`;
}

/**
 * Mengekstrak NIM dari email internal
 */
export function emailToNim(email: string): string {
  if (!email) return "";
  return email.split("@")[0] || "";
}

/**
 * Validasi aturan password baru (FR-07):
 * - Minimal 8 karakter
 * - Tidak boleh sama dengan NIM
 * - Tidak boleh sama dengan password default bersama
 */
export function validateNewPassword(params: {
  newPassword: string;
  confirmPassword: string;
  nim: string;
  defaultPassword?: string;
}): { valid: boolean; error?: string } {
  const { newPassword, confirmPassword, nim, defaultPassword } = params;

  if (!newPassword || newPassword.length < 8) {
    return {
      valid: false,
      error: "Password baru harus memiliki panjang minimal 8 karakter.",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      valid: false,
      error: "Konfirmasi password baru tidak cocok.",
    };
  }

  const cleanNim = nim.trim().replace(/\s+/g, "");
  if (newPassword === cleanNim) {
    return {
      valid: false,
      error: "Password baru tidak boleh sama dengan NIM Anda.",
    };
  }

  if (defaultPassword && newPassword === defaultPassword) {
    return {
      valid: false,
      error: "Password baru tidak boleh sama dengan password default awal.",
    };
  }

  return { valid: true };
}
