/** Lowercase letters and digits without look-alikes (0/o, 1/i/l), so slugs survive being typed. */
export const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const SLUG_LENGTH = 6;

const SLUG_PATTERN = new RegExp(`^[${SLUG_ALPHABET}]{${SLUG_LENGTH}}$`);

export function generateSlug(): string {
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % SLUG_ALPHABET.length);
  let slug = "";
  while (slug.length < SLUG_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(SLUG_LENGTH * 2))) {
      if (byte < limit && slug.length < SLUG_LENGTH) {
        slug += SLUG_ALPHABET.charAt(byte % SLUG_ALPHABET.length);
      }
    }
  }
  return slug;
}

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}
