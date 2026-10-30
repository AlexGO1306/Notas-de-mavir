import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Ensure that clicking anywhere on the td also focuses the input.
content = content.replace(
  /className=\{`p-0 align-middle border-r border-b \$\{\s+isLastCatInWeek \? 'border-r-2 border-r-slate-400' : 'border-r-slate-200'\s+\} border-b-slate-100 \$\{cellBg\} transition-colors select-none`\}/,
  `className={\`p-0 align-middle border-r border-b \${isLastCatInWeek ? 'border-r-2 border-r-slate-400' : 'border-r-slate-200'} border-b-slate-100 \${cellBg} transition-colors select-none cursor-text\`}\n                                            onClick={() => document.getElementById(\`input-\${student.id}-\${subject.name}-\${week}-\${cat.id}\`)?.focus()}`
);

fs.writeFileSync('src/App.tsx', content);
