/**
 * In-memory byte cache (tests + ephemeral web sessions).
 */

import type { ByteCache } from '../types.js';

function arrayBufferToDataUrl(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:model/gltf-binary;base64,${btoa(binary)}`;
}

export function createMemoryByteCache(): ByteCache {
  const store = new Map<string, ArrayBuffer>();

  return {
    async has(key) {
      return store.has(key);
    },
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, data) {
      store.set(key, data);
    },
    async toReadableUrl(_key, data) {
      if (typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
        try {
          const blob = new Blob([data], { type: 'model/gltf-binary' });
          return URL.createObjectURL(blob);
        } catch {
          // fall through
        }
      }
      return arrayBufferToDataUrl(data);
    },
  };
}
