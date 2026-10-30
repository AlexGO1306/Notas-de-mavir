import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace:
/*
      const assignTask = (w: number, task: string, val: any) => {
         if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
         if (!targetProgress[targetSubject][w]) {
            targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
         }
         const st = parseStatus(val);
         if (st) {
             targetProgress[targetSubject][w].tasks[task as any] = st;
             hasUpdates = true;
         }
      }
      };
*/
// With a clean one

content = content.replace(/const assignTask = \([\s\S]*?hasUpdates = true;\s*\}\s*\}\s*\};/g, `const assignTask = (w: number, task: string, val: any) => {
         if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
         if (!targetProgress[targetSubject][w]) {
            targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
         }
         const st = parseStatus(val);
         if (st) {
             targetProgress[targetSubject][w].tasks[task as any] = st;
             hasUpdates = true;
         }
      };`);

fs.writeFileSync('src/App.tsx', content);
