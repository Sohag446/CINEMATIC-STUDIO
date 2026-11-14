/**
 * CINEMATIC STUDIO — Media URL Resolution Utility
 * Converts local file paths and proxies to valid URLs for HTML5 <video> and <img>
 * Supports Tauri 2 convertFileSrc (asset://) and browser object URLs / blob fallbacks
 */

import { convertFileSrc } from '@tauri-apps/api/core';

export function resolveMediaUrl(filePath?: string | null, proxyPath?: string | null): string {
  // 1. If a valid blob:, http:, https:, or data: proxy path exists, prefer it for instant preview
  if (proxyPath) {
    if (
      proxyPath.startsWith('blob:') ||
      proxyPath.startsWith('http://') ||
      proxyPath.startsWith('https://') ||
      proxyPath.startsWith('data:') ||
      proxyPath.startsWith('asset:')
    ) {
      return proxyPath;
    }
  }

  // 2. If no filePath, return proxyPath or empty string
  if (!filePath) {
    return proxyPath || '';
  }

  // 3. If filePath is already a valid URL scheme
  if (
    filePath.startsWith('blob:') ||
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('data:') ||
    filePath.startsWith('asset:')
  ) {
    return filePath;
  }

  // 4. In Tauri desktop context, use convertFileSrc
  try {
    return convertFileSrc(filePath);
  } catch {
    // 5. Standard Tauri 2 Windows asset URL fallback
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `https://asset.localhost/${encodeURI(normalizedPath)}`;
  }
}
