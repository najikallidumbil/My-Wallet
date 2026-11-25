const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST SUITE: Icon Assets & App Configuration ---');

const appJsonPath = path.resolve(__dirname, '../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// 1. Verify expo.icon
assert(appJson.expo?.icon, 'expo.icon is missing in app.json');
const mainIconPath = path.resolve(__dirname, '..', appJson.expo.icon);
assert(fs.existsSync(mainIconPath), `expo.icon file not found: ${mainIconPath}`);
const mainIconStat = fs.statSync(mainIconPath);
assert(mainIconStat.size > 50000, `expo.icon file size suspiciously small: ${mainIconStat.size} bytes`);
console.log(`✓ expo.icon configured at ${appJson.expo.icon} (${Math.round(mainIconStat.size / 1024)} KB)`);

// 2. Verify android.adaptiveIcon
const adaptive = appJson.expo?.android?.adaptiveIcon;
assert(adaptive, 'android.adaptiveIcon missing');
assert(adaptive.foregroundImage, 'android.adaptiveIcon.foregroundImage missing');
assert(adaptive.backgroundColor, 'android.adaptiveIcon.backgroundColor missing');
assert(adaptive.backgroundImage, 'android.adaptiveIcon.backgroundImage missing');

const fgPath = path.resolve(__dirname, '..', adaptive.foregroundImage);
const bgPath = path.resolve(__dirname, '..', adaptive.backgroundImage);
assert(fs.existsSync(fgPath), `foregroundImage file not found: ${fgPath}`);
assert(fs.existsSync(bgPath), `backgroundImage file not found: ${bgPath}`);
console.log(`✓ android.adaptiveIcon.foregroundImage: ${adaptive.foregroundImage} (${Math.round(fs.statSync(fgPath).size / 1024)} KB)`);
console.log(`✓ android.adaptiveIcon.backgroundImage: ${adaptive.backgroundImage} (${Math.round(fs.statSync(bgPath).size / 1024)} KB)`);
console.log(`✓ android.adaptiveIcon.backgroundColor: ${adaptive.backgroundColor}`);

// 3. Verify web favicon
assert(appJson.expo?.web?.favicon, 'web.favicon missing');
const favPath = path.resolve(__dirname, '..', appJson.expo.web.favicon);
assert(fs.existsSync(favPath), `web.favicon not found: ${favPath}`);
console.log(`✓ web.favicon: ${appJson.expo.web.favicon} (${fs.statSync(favPath).size} bytes)`);

// 4. Verify public assets for PWA / Web
const pubFav = path.resolve(__dirname, '../public/favicon.png');
const pub192 = path.resolve(__dirname, '../public/icon-192.png');
const pub512 = path.resolve(__dirname, '../public/icon-512.png');
assert(fs.existsSync(pubFav), 'public/favicon.png not found');
assert(fs.existsSync(pub192), 'public/icon-192.png not found');
assert(fs.existsSync(pub512), 'public/icon-512.png not found');
console.log('✓ public/favicon.png, public/icon-192.png, public/icon-512.png verified');

// 5. Verify index.html links
const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
assert(indexHtml.includes('/favicon.png'), 'index.html missing /favicon.png link');
assert(indexHtml.includes('/icon-192.png'), 'index.html missing /icon-192.png apple-touch-icon link');
console.log('✓ index.html properly references /favicon.png and /icon-192.png');

console.log('\n--- ALL ICON CONFIGURATION TESTS PASSED ---');
