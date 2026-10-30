import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace imports
content = content.replace(
  /import \{ SubjectPdfViewer \} from '\.\/components\/SubjectPdfViewer';/,
  `import { SubjectExcelViewer } from './components/SubjectExcelViewer';`
);

content = content.replace(
  /FileText,/,
  `FileText, FileSpreadsheet,`
);

// Replace state
content = content.replace(
  /const \[pdfViewerSubject, setPdfViewerSubject\] = useState<string \| null>\(null\);/,
  `const [excelViewerSubject, setExcelViewerSubject] = useState<string | null>(null);`
);

// Replace button onClick
content = content.replace(
  /onClick=\{\(\) => setPdfViewerSubject\(subject\.name\)\}/,
  `onClick={() => setExcelViewerSubject(subject.name)}`
);

// Replace title
content = content.replace(
  /title=\{`Ver documento guía de \$\{subject\.name\}`\}/,
  `title={\`Ver archivo Excel de \${subject.name}\`}`
);

// Replace Icon
content = content.replace(
  /<FileText className="w-3\.5 h-3\.5" \/>/g,
  `<FileSpreadsheet className="w-3.5 h-3.5" />`
);

// Replace component
content = content.replace(
  /\{pdfViewerSubject && \([\s\S]*?<SubjectPdfViewer[\s\S]*?subjectName=\{pdfViewerSubject\}[\s\S]*?students=\{currentStudents\}[\s\S]*?activeWeeks=\{activeWeeks\}[\s\S]*?pendingChanges=\{pendingChanges\}[\s\S]*?onClose=\{\(\) => setPdfViewerSubject\(null\)\}[\s\S]*?\/>[\s\S]*?\}\)/,
  `{excelViewerSubject && (
        <SubjectExcelViewer
          subjectName={excelViewerSubject}
          students={currentStudents}
          onClose={() => setExcelViewerSubject(null)}
        />
      )}`
);

fs.writeFileSync('src/App.tsx', content);
