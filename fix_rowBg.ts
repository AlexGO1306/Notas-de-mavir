import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const isEven = studentIdx % 2 === 0;\s*const isFocused = focusedStudentId === student\.id;\s*const rowBg = isFocused \? 'bg-blue-100' : \(isEven \? 'bg-white' : 'bg-slate-50\/70'\);/g;

const newBg = `const isEven = studentIdx % 2 === 0;
                        const isFocused = focusedStudentId === student.id;
                        const hasPending = !!pendingChanges[student.id];
                        let rowBg = isFocused ? 'bg-blue-100' : (isEven ? 'bg-white' : 'bg-slate-50/70');
                        if (hasPending && !isFocused) rowBg = 'bg-yellow-50';
                        if (hasPending && isFocused) rowBg = 'bg-yellow-100';`;

content = content.replace(regex, newBg);
fs.writeFileSync('src/App.tsx', content);
