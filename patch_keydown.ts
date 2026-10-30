import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const keydownCode = `
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, subjectName: string, week: number, taskId: TaskCategory) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      
      const allColumns: { subject: string, week: number, taskId: TaskCategory }[] = [];
      SUBJECT_CONFIGS.forEach(subject => {
        activeWeeks.forEach(w => {
          const tasks = getTasksForSubjectAndWeek(subject.name, w);
          tasks.forEach(cat => {
            allColumns.push({ subject: subject.name, week: w, taskId: cat.id });
          });
        });
      });

      const startColIdx = allColumns.findIndex(c => c.subject === subjectName && c.week === week && c.taskId === taskId);
      if (startColIdx === -1) return;

      let nextRow = rowIdx;
      let nextCol = startColIdx;

      if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIdx - 1);
      if (e.key === 'ArrowDown') nextRow = Math.min(currentStudents.length - 1, rowIdx + 1);
      if (e.key === 'ArrowLeft') nextCol = Math.max(0, startColIdx - 1);
      if (e.key === 'ArrowRight') nextCol = Math.min(allColumns.length - 1, startColIdx + 1);

      if (nextRow !== rowIdx || nextCol !== startColIdx) {
        const nextStudent = currentStudents[nextRow];
        const nextColDef = allColumns[nextCol];
        if (nextStudent && nextColDef) {
          const nextId = \`input-\${nextStudent.id}-\${nextColDef.subject}-\${nextColDef.week}-\${nextColDef.taskId}\`;
          const el = document.getElementById(nextId);
          if (el) el.focus();
        }
      }
    }
  };
`;

content = content.replace(
  /  const handleSaveChanges = async \(\) => \{/,
  keydownCode + '\n  const handleSaveChanges = async () => {'
);

// Add id and onKeyDown to the input
content = content.replace(
  /type="text"\s+className=\{`w-full h-full/,
  `id={\`input-\${student.id}-\${subject.name}-\${week}-\${cat.id}\`}\n                                              type="text"\n                                              className={\`w-full h-full`
);

content = content.replace(
  /onPaste=\{\(e\) => handleCellPaste\(e, studentIdx, subject\.name, week, cat\.id\)\}/,
  `onPaste={(e) => handleCellPaste(e, studentIdx, subject.name, week, cat.id)}\n                                              onKeyDown={(e) => handleKeyDown(e, studentIdx, subject.name, week, cat.id)}`
);

fs.writeFileSync('src/App.tsx', content);
