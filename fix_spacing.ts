import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /<div className="flex-1 p-6 overflow-hidden flex flex-col bg-slate-100">/g;
const replacement = `<div className={\`flex-1 p-6 overflow-hidden flex flex-col bg-slate-100 \${excelViewerSubject ? 'pb-[320px] transition-all duration-300' : 'transition-all duration-300'}\`}>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', content);
