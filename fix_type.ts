import fs from 'fs';
let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');
content = content.replace(
  /getItem<\{fileName: string, data: any\[\], columns: string\[\]\}>/g,
  `getItem<{fileName: string, data: any[], columns: string[], week?: string}>`
);
fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
