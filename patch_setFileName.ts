import fs from 'fs';
let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');
content = content.replace(/setFileName\(null\);/g, '');
fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
