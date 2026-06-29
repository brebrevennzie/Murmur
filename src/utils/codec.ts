import LZString from 'lz-string';

/**
 * Safe encoding and decoding of Unicode JSON objects to and from Base64.
 * Uses lz-string for high-efficiency URL-safe compression.
 */

export function encodeData(data: any): string {
  try {
    const jsonStr = JSON.stringify(data);
    return LZString.compressToEncodedURIComponent(jsonStr);
  } catch (e) {
    console.error('Encoding error:', e);
    return '';
  }
}

export function decodeData(compressedBase64: string): any {
  if (!compressedBase64) return null;
  
  // 1. Try to decompress using lz-string
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(compressedBase64);
    if (decompressed) {
      return JSON.parse(decompressed);
    }
  } catch (e) {
    // If lz-string fails, we proceed to fallback base64 decoding
  }

  // 2. Fallback to old base64 decoding method for backward compatibility
  try {
    let normalized = compressedBase64.replace(/-/g, '+').replace(/_/g, '/');
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
    console.error('Decoding error in both lz-string and fallback:', e);
    return null;
  }
}

