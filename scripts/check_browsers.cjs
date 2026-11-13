const fs = require('fs');
const path = require('path');
const os = require('os');

const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

chromePaths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`[FOUND] Browser: ${p} (${fs.statSync(p).size} bytes)`);
  } else {
    console.log(`[NOT FOUND] Browser: ${p}`);
  }
});

// Also check Google Chrome directory in AppData
const googleDir = path.join(localAppData, 'Google');
if (fs.existsSync(googleDir)) {
  console.log('Contents of AppData/Local/Google:', fs.readdirSync(googleDir));
} else {
  console.log('AppData/Local/Google does not exist');
}

