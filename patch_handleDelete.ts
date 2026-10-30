import fs from 'fs';

let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

const regex = /const handleDelete = async \(\) => \{[\s\S]*?^\s*  \};/m;

const replacement = `const handleDelete = async () => {
    await localforage.removeItem(String(\`excel_\${subjectName}\`));
    await localforage.removeItem(String(\`excel_data_\${subjectName}\`));
    setFiles([]);
    setParsedData([]);
    setColumns([]);
    setFileWeek('');
    setAvailableWeeks([]);
    setMatchedRow(null);
  };`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
