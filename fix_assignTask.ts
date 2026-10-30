import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// We need to fix assignTask in both handleAutoFill and processImportData
// to just assign the status string.

const regex = /const assignTask = \([\s\S]*?hasUpdates = true;\s*\n\s*\}/g;

const newAssignTask = `const assignTask = (w: number, task: string, val: any) => {
         if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
         if (!targetProgress[targetSubject][w]) {
            targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
         }
         const st = parseStatus(val);
         if (st) {
             targetProgress[targetSubject][w].tasks[task as any] = st;
             hasUpdates = true;
         }
      }`;

content = content.replace(regex, newAssignTask);

// Also need to fix the fallback where it assigns objects directly
const fallbackObj = /if \(inv !== undefined || invGrade !== undefined\) \{ targetProgress\[targetSubject\]\[w\]\.tasks\.investiga = \{ status: inv \|\| 'cumplido', grade: invGrade \}; hasUpdates = true; \}\s*if \(apl !== undefined || aplGrade !== undefined\) \{ targetProgress\[targetSubject\]\[w\]\.tasks\.aplica = \{ status: apl \|\| 'cumplido', grade: aplGrade \}; hasUpdates = true; \}\s*if \(quiz !== undefined\) \{ targetProgress\[targetSubject\]\[w\]\.tasks\.quiz = \{ status: quiz \}; hasUpdates = true; \}\s*if \(a321 !== undefined\) \{ targetProgress\[targetSubject\]\[w\]\.tasks\.a321 = \{ status: a321 \}; hasUpdates = true; \}/;

const newFallbackObj = `if (inv !== undefined) { targetProgress[targetSubject][w].tasks.investiga = inv; hasUpdates = true; }
          if (apl !== undefined) { targetProgress[targetSubject][w].tasks.aplica = apl; hasUpdates = true; }
          if (quiz !== undefined) { targetProgress[targetSubject][w].tasks.quiz = quiz; hasUpdates = true; }
          if (a321 !== undefined) { targetProgress[targetSubject][w].tasks.a321 = a321; hasUpdates = true; }`;

content = content.replace(fallbackObj, newFallbackObj);

fs.writeFileSync('src/App.tsx', content);
