export interface UpdateReleaseInfo {
  version: string;
  tagName: string;
  releaseDate: string;
  releaseNotes: string;
  htmlUrl: string;
  installerUrl?: string;
  msiUrl?: string;
  extensionZipUrl?: string;
  hasUpdate: boolean;
}

export const updateService = {
  CURRENT_VERSION: '2.0.1',
  REPO_OWNER: 'Sohag446',
  REPO_NAME: 'CINEMATIC-STUDIO',

  async checkForUpdates(): Promise<UpdateReleaseInfo> {
    const defaultInfo: UpdateReleaseInfo = {
      version: this.CURRENT_VERSION,
      tagName: `v${this.CURRENT_VERSION}`,
      releaseDate: 'November 2026',
      releaseNotes: 'CINEMATIC STUDIO v2.0.1 Master Release with Native Host Repair & Installation Hardening.',
      htmlUrl: `https://github.com/${this.REPO_OWNER}/${this.REPO_NAME}/releases`,
      installerUrl: `https://github.com/${this.REPO_OWNER}/${this.REPO_NAME}/releases/download/v${this.CURRENT_VERSION}/Cinematic.Studio_${this.CURRENT_VERSION}_x64-setup.exe`,
      msiUrl: `https://github.com/${this.REPO_OWNER}/${this.REPO_NAME}/releases/download/v${this.CURRENT_VERSION}/Cinematic.Studio_${this.CURRENT_VERSION}_x64_en-US.msi`,
      extensionZipUrl: `https://github.com/${this.REPO_OWNER}/${this.REPO_NAME}/releases/download/v${this.CURRENT_VERSION}/cinematic-studio-chrome-extension.zip`,
      hasUpdate: false
    };

    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/releases/latest`,
        { headers: { 'Accept': 'application/vnd.github.v3+json' } }
      );

      if (!response.ok) {
        return defaultInfo;
      }

      const data = await response.json();
      const latestTag = data.tag_name || `v${this.CURRENT_VERSION}`;
      const latestVersion = latestTag.replace(/^v/, '');

      const hasUpdate = this.compareVersions(latestVersion, this.CURRENT_VERSION) > 0;

      let installerUrl: string | undefined;
      let msiUrl: string | undefined;
      let extensionZipUrl: string | undefined;

      if (Array.isArray(data.assets)) {
        for (const asset of data.assets) {
          if (asset.name.endsWith('-setup.exe') || (asset.name.endsWith('.exe') && !asset.name.includes('host'))) {
            installerUrl = asset.browser_download_url;
          } else if (asset.name.endsWith('.msi')) {
            msiUrl = asset.browser_download_url;
          } else if (asset.name.endsWith('.zip')) {
            extensionZipUrl = asset.browser_download_url;
          }
        }
      }

      return {
        version: latestVersion,
        tagName: latestTag,
        releaseDate: data.published_at ? new Date(data.published_at).toLocaleDateString() : 'Recent',
        releaseNotes: data.body || 'New features, stability improvements, and security updates.',
        htmlUrl: data.html_url || defaultInfo.htmlUrl,
        installerUrl: installerUrl || defaultInfo.installerUrl,
        msiUrl: msiUrl || defaultInfo.msiUrl,
        extensionZipUrl: extensionZipUrl || defaultInfo.extensionZipUrl,
        hasUpdate
      };
    } catch (e) {
      console.warn('Could not check for remote updates:', e);
      return defaultInfo;
    }
  },

  compareVersions(v1: string, v2: string): number {
    const p1 = v1.split('.').map(n => parseInt(n, 10) || 0);
    const p2 = v2.split('.').map(n => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }
};
