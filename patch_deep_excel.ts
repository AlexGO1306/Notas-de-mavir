import fs from 'fs';

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
let bottomContent = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

const cleanSheetRegex = /const cleanSheetData = \([\s\S]*?return cleanData;\s*\};/m;

const newCleanSheetData = `const cleanSheetData = (worksheet: any) => {
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  let headerRowIndex = -1;

  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row)) continue;
    const hasNameCol = row.some(cell => {
      if (!cell) return false;
      const s = String(cell).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      return s.includes('nombre') || s.includes('estudiante') || s.includes('alumno') || s.includes('nomina');
    });
    if (hasNameCol) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    return XLSX.utils.sheet_to_json(worksheet) as any[];
  }

  const compositeHeaders: string[] = [];
  const numCols = Math.max(...rawData.slice(0, headerRowIndex + 1).map(r => r.length));

  for (let c = 0; c < numCols; c++) {
    let colNameParts: string[] = [];
    for (let r = 0; r <= headerRowIndex; r++) {
       let val = rawData[r][c];
       if (val === undefined || val === null || String(val).trim() === '') {
          for (let left = c - 1; left >= 0; left--) {
             if (rawData[r][left] !== undefined && rawData[r][left] !== null && String(rawData[r][left]).trim() !== '') {
                val = rawData[r][left];
                break;
             }
          }
       }
       if (val !== undefined && val !== null && String(val).trim() !== '') {
          colNameParts.push(String(val).trim());
       }
    }
    const uniqueParts = Array.from(new Set(colNameParts));
    compositeHeaders.push(uniqueParts.join(' ') || \`__EMPTY_\${c}\`);
  }

  const cleanData: any[] = [];
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;
    
    const obj: any = {};
    let hasData = false;
    compositeHeaders.forEach((header, index) => {
      if (row[index] !== undefined && row[index] !== null && String(row[index]).trim() !== '') {
        obj[header] = row[index];
        hasData = true;
      }
    });
    if (hasData) cleanData.push(obj);
  }
  return cleanData;
};`;

appContent = appContent.replace(cleanSheetRegex, newCleanSheetData);
bottomContent = bottomContent.replace(cleanSheetRegex, newCleanSheetData);

const processImportRegex = /const processImportData = \([\s\S]*?return loadedCount;\s*\};/m;

const newProcessImportData = `const processImportData = (rows: any[], targetSubject: string, defaultWeek?: number) => {
    if (!selectedLevelId) {
      showNotification('Selecciona un nivel antes de importar datos.', 'error');
      return 0;
    }

    let loadedCount = 0;
    const allStudentsInLevel = students.filter(s => s.levelId === selectedLevelId);

    rows.forEach(row => {
      const normalizedRow: any = {};
      for (const key in row) {
        const cleanKey = key.toString().toLowerCase().trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        normalizedRow[cleanKey] = row[key];
        normalizedRow[key.toString().toLowerCase().trim()] = row[key];
      }

      const rowSubject = normalizedRow['asignatura'] || normalizedRow['materia'];
      if (rowSubject && String(rowSubject).toLowerCase().trim() !== targetSubject.toLowerCase()) return;

      const nameRaw = normalizedRow['nombre'] || normalizedRow['estudiante'] || normalizedRow['alumno'] || normalizedRow['name'] || normalizedRow['nomina'];
      if (!nameRaw) return;

      const normalizeString = (s: string) => String(s).trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      const nameString = normalizeString(nameRaw);
      
      let student = allStudentsInLevel.find(s => {
        const sName = normalizeString(s.name);
        if (sName === nameString) return true;
        if (sName.includes(nameString) || nameString.includes(sName)) return true;
        const sParts = sName.split(' ').filter(p => p.length > 2);
        const nParts = nameString.split(' ').filter(p => p.length > 2);
        if (sParts.length > 0 && nParts.length > 0) {
           const [shorter, longer] = sParts.length < nParts.length ? [sParts, nParts] : [nParts, sParts];
           if (shorter.every(part => longer.some(lp => lp.includes(part)))) {
               return true;
           }
        }
        return false;
      });

      let targetProgress = student ? { ...student.progress } : getInitialProgress();
      let hasUpdates = false;

      const parseStatus = (val: any): TaskStatus | undefined => {
          const s = String(val !== undefined && val !== null ? val : '').toLowerCase().trim();
          if (['cumplido', 'sí', 'si', 'yes', 'completado', 'done', 'true', '1', 'x', '10', 'ok'].includes(s)) return 'cumplido';
          if (['pendiente', 'proceso', 'in progress', 'pending', 'p'].includes(s)) return 'pendiente';
          if (['no_cumplido', 'no cumplido', 'no', 'falta', 'false', '0', 'n'].includes(s)) return 'no_cumplido';
          return undefined;
      };

      const parseGrade = (val: any): number | undefined => {
          if (val === undefined || val === null || String(val).trim() === '') return undefined;
          const parsed = parseFloat(String(val).replace(',', '.'));
          return isNaN(parsed) ? undefined : parsed;
      };

      const assignTask = (w: number, task: string, val: any) => {
         if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
         if (!targetProgress[targetSubject][w]) {
            targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
         }
         
         const st = parseStatus(val);
         const gr = parseGrade(val);
         if (st || gr !== undefined) {
             const existingStatus = targetProgress[targetSubject][w].tasks[task as keyof WeekProgress['tasks']]?.status;
             targetProgress[targetSubject][w].tasks[task as keyof WeekProgress['tasks']] = {
                 status: st || existingStatus || 'cumplido',
                 grade: gr !== undefined ? gr : undefined
             };
             hasUpdates = true;
         }
      };

      // 1. Scan for explicitly named week columns in the composite headers
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
      }

      if (hasUpdates) {
        if (student) {
          updateStudentProgress(student.id, targetProgress);
        } else {
          addStudent(String(nameRaw).trim(), selectedLevelId, targetProgress);
        }
        loadedCount++;
      }
    });

    return loadedCount;
  };`;

appContent = appContent.replace(processImportRegex, newProcessImportData);

fs.writeFileSync('src/App.tsx', appContent);
fs.writeFileSync('src/components/BottomExcelPanel.tsx', bottomContent);
