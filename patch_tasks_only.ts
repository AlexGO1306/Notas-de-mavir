import fs from 'fs';

// 1. Update App.tsx logic for processImportData
let appContent = fs.readFileSync('src/App.tsx', 'utf-8');

const oldAppBlock = `      // 1. Scan for explicitly named week columns in the composite headers
      for (const key of Object.keys(normalizedRow)) {
        const val = normalizedRow[key];
        if (val === undefined || val === null || String(val).trim() === '') continue;

        const weekMatch = key.match(/(?:semana|sem|s)[\\s_-]*(\\d+)/i);
        if (weekMatch) {
            const w = parseInt(weekMatch[1], 10);
            if (WEEKS.includes(w)) {
                if (key.includes('investiga') || key.includes('inv') || key.match(/\\bi\\b/i)) {
                    assignTask(w, 'investiga', val);
                } else if (key.includes('quiz') || key.includes('prueba') || key.match(/\\bq\\b/i)) {
                    assignTask(w, 'quiz', val);
                } else if (key.includes('321') || key.includes('a321')) {
                    assignTask(w, 'a321', val);
                } else if (key.includes('aplica') || key.includes('actividad') || key.match(/\\ba\\b/i)) {
                    assignTask(w, 'aplica', val);
                } else {
                    assignTask(w, 'aplica', val);
                }
            }
        }
      }

      // 2. Fallback for files where weeks are just tab names
      if (!hasUpdates && defaultWeek && WEEKS.includes(defaultWeek)) {
          const w = defaultWeek;
          if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
          if (!targetProgress[targetSubject][w]) targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };

          const inv = parseStatus(normalizedRow['investiga'] || normalizedRow['investigacion'] || normalizedRow['i']);
          const apl = parseStatus(normalizedRow['aplica'] || normalizedRow['aplicacion'] || normalizedRow['a']);
          const quiz = parseStatus(normalizedRow['quiz'] || normalizedRow['q']);
          const a321 = parseStatus(normalizedRow['321'] || normalizedRow['a321']);

          const invGrade = parseGrade(normalizedRow['investiga'] || normalizedRow['investigacion'] || normalizedRow['i']);
          const aplGrade = parseGrade(normalizedRow['aplica'] || normalizedRow['aplicacion'] || normalizedRow['a']);
          
          if (inv !== undefined || invGrade !== undefined) { targetProgress[targetSubject][w].tasks.investiga = { status: inv || 'cumplido', grade: invGrade }; hasUpdates = true; }
          if (apl !== undefined || aplGrade !== undefined) { targetProgress[targetSubject][w].tasks.aplica = { status: apl || 'cumplido', grade: aplGrade }; hasUpdates = true; }
          if (quiz !== undefined) { targetProgress[targetSubject][w].tasks.quiz = { status: quiz }; hasUpdates = true; }
          if (a321 !== undefined) { targetProgress[targetSubject][w].tasks.a321 = { status: a321 }; hasUpdates = true; }
      }`;

const newAppBlock = `      // 1. Scan for explicitly named week columns in the composite headers
      for (const key of Object.keys(normalizedRow)) {
        const val = normalizedRow[key];
        if (val === undefined || val === null || String(val).trim() === '') continue;

        // OMITIR promedios y totales
        if (key.includes('promedio') || key.includes('total') || key.includes('prom')) {
            continue;
        }

        const weekMatch = key.match(/(?:semana|sem|s)[\\s_-]*(\\d+)/i);
        if (weekMatch) {
            const w = parseInt(weekMatch[1], 10);
            if (WEEKS.includes(w)) {
                if (key.includes('investiga') || key.includes('inv') || key.match(/\\bi\\b/i)) {
                    assignTask(w, 'investiga', val);
                } else if (key.includes('quiz') || key.includes('prueba') || key.match(/\\bq\\b/i)) {
                    assignTask(w, 'quiz', val);
                } else if (key.includes('321') || key.includes('a321')) {
                    assignTask(w, 'a321', val);
                } else if (key.includes('aplica') || key.includes('actividad') || key.includes('feedback') || key.match(/\\ba\\b/i)) {
                    assignTask(w, 'aplica', val);
                }
                // ELIMINADO EL BLOQUE ELSE: Solo se leen las columnas explícitas
            }
        }
      }

      // 2. Fallback for files where weeks are just tab names
      if (!hasUpdates && defaultWeek && WEEKS.includes(defaultWeek)) {
          const w = defaultWeek;
          if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
          if (!targetProgress[targetSubject][w]) targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };

          const inv = parseStatus(normalizedRow['investiga'] || normalizedRow['investigacion'] || normalizedRow['i']);
          const apl = parseStatus(normalizedRow['aplica'] || normalizedRow['aplicacion'] || normalizedRow['feedback'] || normalizedRow['a']);
          const quiz = parseStatus(normalizedRow['quiz'] || normalizedRow['q']);
          const a321 = parseStatus(normalizedRow['321'] || normalizedRow['a321']);

          const invGrade = parseGrade(normalizedRow['investiga'] || normalizedRow['investigacion'] || normalizedRow['i']);
          const aplGrade = parseGrade(normalizedRow['aplica'] || normalizedRow['aplicacion'] || normalizedRow['feedback'] || normalizedRow['a']);
          
          if (inv !== undefined || invGrade !== undefined) { targetProgress[targetSubject][w].tasks.investiga = { status: inv || 'cumplido', grade: invGrade }; hasUpdates = true; }
          if (apl !== undefined || aplGrade !== undefined) { targetProgress[targetSubject][w].tasks.aplica = { status: apl || 'cumplido', grade: aplGrade }; hasUpdates = true; }
          if (quiz !== undefined) { targetProgress[targetSubject][w].tasks.quiz = { status: quiz }; hasUpdates = true; }
          if (a321 !== undefined) { targetProgress[targetSubject][w].tasks.a321 = { status: a321 }; hasUpdates = true; }
      }`;

appContent = appContent.replace(oldAppBlock, newAppBlock);

// 2. Update cleanSheetData in App.tsx and BottomExcelPanel.tsx to support 'feedback' in the subheader detection
const subheaderRegex = /return s\.includes\('inv'\) \|\| s\.includes\('apl'\) \|\| s\.includes\('quiz'\) \|\| s\.includes\('321'\) \|\| s\.includes\('actividad'\) \|\| s\.includes\('tarea'\) \|\| s === 'i' \|\| s === 'a' \|\| s === 'q' \|\| s\.includes\('prom'\) \|\| s\.includes\('total'\);/g;

const newSubheaderRegex = "return s.includes('inv') || s.includes('apl') || s.includes('quiz') || s.includes('321') || s.includes('actividad') || s.includes('tarea') || s.includes('feedback') || s === 'i' || s === 'a' || s === 'q' || s.includes('prom') || s.includes('total');";

appContent = appContent.replace(subheaderRegex, newSubheaderRegex);
fs.writeFileSync('src/App.tsx', appContent);

let bottomContent = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');
bottomContent = bottomContent.replace(subheaderRegex, newSubheaderRegex);
fs.writeFileSync('src/components/BottomExcelPanel.tsx', bottomContent);

