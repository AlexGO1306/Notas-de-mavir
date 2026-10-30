import fs from 'fs';
let content = fs.readFileSync('src/firebase.ts', 'utf-8');
content = content.replace(
  /experimentalAutoDetectLongPolling: true/,
  "experimentalForceLongPolling: true"
);
fs.writeFileSync('src/firebase.ts', content);
