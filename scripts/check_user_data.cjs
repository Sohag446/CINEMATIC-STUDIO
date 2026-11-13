const fs = require('fs');
const path = require('path');
const os = require('os');

const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const roamingAppData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');

function checkDirs(base) {
  if (!fs.existsSync(base)) return;
  const items = fs.readdirSync(base);
  items.forEach(item => {
    const full = path.join(base, item);
    if (item.toLowerCase().includes('google') || item.toLowerCase().includes('chrome') || item.toLowerCase().includes('brave')) {
      console.log(`Found relevant directory: ${full}`);
      try {
        const sub = fs.readdirSync(full);
        console.log(`  Subdirectories:`, sub);
      } catch (e) {}
    }
  });
}

console.log('Checking AppData/Local...');
checkDirs(localAppData);
console.log('Checking AppData/Roaming...');
checkDirs(roamingAppData);

