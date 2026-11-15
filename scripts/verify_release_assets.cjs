const https = require('https');
const crypto = require('crypto');

const assets = [
  'SHA256SUMS.txt',
  'cinematic-studio-chrome-extension.zip',
  'cinematic-studio-host.exe',
  'Cinematic.Studio_4.0.1_x64-setup.exe',
  'Cinematic.Studio_4.0.1_x64_en-US.msi'
];

function downloadAndHash(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadAndHash(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const hash = crypto.createHash('sha256');
      let size = 0;
      let textContent = '';
      res.on('data', chunk => {
        size += chunk.length;
        hash.update(chunk);
        if (size < 2048) textContent += chunk.toString('utf8');
      });
      res.on('end', () => {
        resolve({
          sha256: hash.digest('hex').toUpperCase(),
          size,
          textContent: textContent
        });
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Downloading and verifying official v4.0.1 assets from GitHub Releases...\n');
  for (const name of assets) {
    const url = `https://github.com/Sohag446/CINEMATIC-STUDIO/releases/download/v4.0.1/${name}`;
    try {
      const result = await downloadAndHash(url);
      console.log(`Asset: ${name}`);
      console.log(`  Size: ${result.size} bytes`);
      console.log(`  SHA256: ${result.sha256}`);
      if (name === 'SHA256SUMS.txt') {
        console.log(`  Content:\n${result.textContent.trim()}`);
      }
      console.log('');
    } catch (e) {
      console.error(`Asset ${name} ERROR:`, e.message);
    }
  }
}

main().catch(console.error);

