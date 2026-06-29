/**
 * Safe encoding and decoding of Unicode JSON objects to and from Base64.
 * This is 100% safe for Russian Cyrillic letters.
 */

export function encodeData(data: any): string {
  try {
    const jsonStr = JSON.stringify(data);
    const utf8Bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    const len = utf8Bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''); // URL-safe base64
  } catch (e) {
    console.error('Encoding error:', e);
    return '';
  }
}

export function decodeData(base64: string): any {
  if (!base64) return null;
  try {
    // Restore standard base64 characters
    let normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
    while (normalized.length % 4) {
      normalized += '=';
    }
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Decoding error:', e);
    return null;
  }
}
