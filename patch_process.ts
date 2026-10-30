import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const oldUpdate = `      if (hasUpdates) {
        if (student) {
          updateStudentProgress(student.id, targetProgress);
        } else {
          addStudent(String(nameRaw).trim(), selectedLevelId, targetProgress);
        }
        loadedCount++;
      }`;

const newUpdate = `      if (hasUpdates) {
        if (student) {
          setPendingChanges(prev => ({
             ...prev,
             [student.id]: targetProgress
          }));
        } else {
          addStudent(String(nameRaw).trim(), selectedLevelId, targetProgress);
        }
        loadedCount++;
      }`;

content = content.replace(oldUpdate, newUpdate);

fs.writeFileSync('src/App.tsx', content);
