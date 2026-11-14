/**
 * CINEMATIC STUDIO — Media URL Resolution Utility
 * Converts local file paths and proxies to valid URLs for HTML5 <video> and <img>
 * Supports Tauri 2 convertFileSrc (asset://) and browser object URLs / blob fallbacks
 */

export function resolveMediaUrl(filePath?: string | null, proxyPath?: string | null): string {
  // 1. If a valid blob:, http:, or data: proxy path exists, prefer it for instant preview
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

  // 2. If no filePath, return empty
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

  // 4. In Tauri environment, attempt convertFileSrc
  if (typeof window !== 'undefined') {
    const tauriInternals = (window as any).__TAURI_INTERNALS__;
    if (tauriInternals && typeof tauriInternals.convertFileSrc === 'function') {
      try {
        return tauriInternals.convertFileSrc(filePath, 'asset');
      } catch (err) {
        console.warn('Tauri convertFileSrc failed, falling back:', err);
      }
    }
  }

  // 5. Standard Tauri 2 Windows asset URL fallback
  const normalizedPath = filePath.replace(/\\/g, '/');
  return `http://asset.localhost/${encodeURI(normalizedPath)}`;
}
