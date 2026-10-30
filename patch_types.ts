import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/task as keyof WeekProgress\['tasks'\]/g, "task as any");
fs.writeFileSync('src/App.tsx', content);
