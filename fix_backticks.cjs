const fs = require('fs');
let content = fs.readFileSync('src/components/SubjectExcelViewer.tsx', 'utf-8');
content = content.replace(/\\`/g, '`');
fs.writeFileSync('src/components/SubjectExcelViewer.tsx', content);
