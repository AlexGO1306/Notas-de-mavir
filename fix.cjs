const fs = require('fs');
['src/components/SubjectExcelViewer.tsx', 'src/App.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/\\\$/g, '$');
  fs.writeFileSync(file, content);
});
