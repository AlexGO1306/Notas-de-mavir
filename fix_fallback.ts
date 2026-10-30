import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /if \(inv !== undefined \|\| invGrade !== undefined\) \{ targetProgress\[targetSubject\]\[w\]\.tasks\.investiga = \{ status: inv \|\| 'cumplido', grade: invGrade \}; hasUpdates = true; \}\s*if \(apl !== undefined \|\| aplGrade !== undefined\) \{ targetProgress\[targetSubject\]\[w\]\.tasks\.aplica = \{ status: apl \|\| 'cumplido', grade: aplGrade \}; hasUpdates = true; \}\s*if \(quiz !== undefined\) \{ targetProgress\[targetSubject\]\[w\]\.tasks\.quiz = \{ status: quiz \}; hasUpdates = true; \}\s*if \(a321 !== undefined\) \{ targetProgress\[targetSubject\]\[w\]\.tasks\.a321 = \{ status: a321 \}; hasUpdates = true; \}/g;

const newFallback = `if (inv !== undefined) { targetProgress[targetSubject][w].tasks.investiga = inv; hasUpdates = true; }
          if (apl !== undefined) { targetProgress[targetSubject][w].tasks.aplica = apl; hasUpdates = true; }
          if (quiz !== undefined) { targetProgress[targetSubject][w].tasks.quiz = quiz; hasUpdates = true; }
          if (a321 !== undefined) { targetProgress[targetSubject][w].tasks.a321 = a321; hasUpdates = true; }`;

content = content.replace(regex, newFallback);
fs.writeFileSync('src/App.tsx', content);
