/**
 * Builds a wa.me link from a Brazilian phone number as typed by the user
 * (any format: with/without DDD parentheses, dashes, spaces, with/without
 * the +55 country code). Returns null when the number doesn't look usable.
 */
export function whatsappLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;

  // Already has the country code (55 + 10 or 11 digits).
  if (digits.length >= 12 && digits.startsWith("55")) {
    return `https://wa.me/${digits}`;
  }
  // Local Brazilian number (DDD + number): prefix the country code.
  if (digits.length === 10 || digits.length === 11) {
    return `https://wa.me/55${digits}`;
  }
  // Already has some other country code.
  return `https://wa.me/${digits}`;
}
