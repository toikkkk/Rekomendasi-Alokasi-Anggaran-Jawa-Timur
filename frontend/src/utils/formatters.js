// utils/formatters.js
// Helper fungsi format angka untuk tampilan UI.

/**
 * Format angka ke Rupiah miliar.
 * Contoh: 1234.56 → "Rp 1.234,56 M"
 */
export function formatRupiah(miliar) {
  if (miliar == null || isNaN(miliar)) return "-";
  return `Rp ${miliar.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
}

/**
 * Format angka ke persen dengan 2 desimal.
 * Contoh: 34.567 → "34,57%"
 */
export function formatPersen(value) {
  if (value == null || isNaN(value)) return "-";
  return `${value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/**
 * Format angka umum dengan pemisah ribuan (locale Indonesia).
 * Contoh: 12345678.9 → "12.345.678,9"
 */
export function formatAngka(value, decimals = 2) {
  if (value == null || isNaN(value)) return "-";
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format delta dengan tanda +/-.
 * Contoh: 0.3 → "+0,30" | -1.2 → "-1,20"
 */
export function formatDelta(value, decimals = 2) {
  if (value == null || isNaN(value)) return "-";
  const formatted = Math.abs(value).toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}
