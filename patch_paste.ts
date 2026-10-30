import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const newPasteCode = `  const handleCellPaste = (e: React.ClipboardEvent<HTMLInputElement>, startStudentIdx: number, subjectName: string, week: number, taskId: TaskCategory) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    if (!text) return;

    // Split into rows and then into columns (TSV format from Excel/Google Sheets)
    const rows = text.split(/\\r?\\n/).filter(r => r.trim() !== '' || r.includes('\\t'));
    if (rows.length === 0) return;

    // Build a flat list of all visible columns to navigate horizontally
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

    setPendingChanges(prev => {
      const nextChanges = { ...prev };
      for (let r = 0; r < rows.length; r++) {
        const student = currentStudents[startStudentIdx + r];
        if (!student) break; // Out of bounds for students
        
        const cols = rows[r].split('\\t');
        let currentProgress = nextChanges[student.id] || student.progress || getInitialProgress();
        
        for (let c = 0; c < cols.length; c++) {
          const colDef = allColumns[startColIdx + c];
          if (!colDef) break; // Out of bounds for columns

          const val = cols[c].trim();
          if (val === '') continue; // Skip empty pastes to avoid erasing data unintentionally

          const nextStatus = getStatusFromInput(val);
          const subjectData = currentProgress[colDef.subject] || {};
          const weekData = subjectData[colDef.week] || { weekNumber: colDef.week, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
          
          currentProgress = {
            ...currentProgress,
            [colDef.subject]: {
              ...subjectData,
              [colDef.week]: {
                ...weekData,
                tasks: {
                  ...weekData.tasks,
                  [colDef.taskId]: nextStatus
                }
              }
            }
          };
        }
        nextChanges[student.id] = currentProgress;
      }
      return nextChanges;
    });
  };`;

content = content.replace(
  /  const handleCellPaste = \([^)]+\) => \{[\s\S]*?(?=  const handleSaveChanges)/,
  newPasteCode + '\n\n'
);

fs.writeFileSync('src/App.tsx', content);
