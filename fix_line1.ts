import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
if (content.startsWith('if (inv !== undefined)')) {
  // Find where import React starts
  const importIdx = content.indexOf('import React');
  if (importIdx !== -1) {
    content = content.substring(importIdx);
    fs.writeFileSync('src/App.tsx', content);
  }
}
