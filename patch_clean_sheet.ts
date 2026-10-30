import fs from 'fs';

const cleanSheetStr = `const cleanSheetData = (worksheet: any) => {
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

  const headers = rawData[headerRowIndex].map((h, idx) => h ? String(h).trim() : \`__EMPTY_\${idx}\`);
  const cleanData: any[] = [];
  
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;
    
    const obj: any = {};
    let hasData = false;
    headers.forEach((header, index) => {
      if (row[index] !== undefined && row[index] !== null && String(row[index]).trim() !== '') {
        obj[header] = row[index];
        hasData = true;
      }
    });
    if (hasData) cleanData.push(obj);
  }
  return cleanData;
};`;

// Patch App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
// Insert cleanSheetData just before handleExcelUpload
appContent = appContent.replace(/const handleExcelUpload = /g, cleanSheetStr + "\n\n  const handleExcelUpload = ");

// Replace sheet_to_json inside handleExcelUpload
appContent = appContent.replace(/XLSX\.utils\.sheet_to_json\(worksheet\) as any\[\]/g, "cleanSheetData(worksheet)");

// Improve processImportData to read week columns better.
const processImportDataRegex = /const processImportData = \([\s\S]*?return loadedCount;\s*\};/m;
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

      const nameRaw = normalizedRow['nombre'] || normalizedRow['estudiante'] || normalizedRow['alumno'] || normalizedRow['name'];
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

      const parseStatus = (val: any): TaskStatus | undefined => {
          const s = String(val !== undefined && val !== null ? val : '').toLowerCase().trim();
          if (['cumplido', 'sí', 'si', 'yes', 'completado', 'done', 'true', '1', 'x', '10'].includes(s)) return 'cumplido';
          if (['pendiente', 'proceso', 'in progress', 'pending', 'p'].includes(s)) return 'pendiente';
          if (['no_cumplido', 'no cumplido', 'no', 'falta', 'false', '0', 'n'].includes(s)) return 'no_cumplido';
          return undefined;
      };

      const week = parseInt(normalizedRow['semana'] || normalizedRow['week']) || defaultWeek;
      let hasUpdates = false;

      if (week && WEEKS.includes(week)) {
        if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
        targetProgress[targetSubject][week] = {
          weekNumber: week,
          tasks: { ...(targetProgress[targetSubject][week]?.tasks || { investiga: null, aplica: null, quiz: null, a321: null }) }
        };

        const inv = parseStatus(normalizedRow['investiga'] || normalizedRow['investigacion'] || normalizedRow['i']);
        const apl = parseStatus(normalizedRow['aplica'] || normalizedRow['aplicacion'] || normalizedRow['a']);
        const quiz = parseStatus(normalizedRow['quiz'] || normalizedRow['q']);
        const a321 = parseStatus(normalizedRow['321'] || normalizedRow['a321']);

        if (inv !== undefined) { targetProgress[targetSubject][week].tasks.investiga = { status: inv }; hasUpdates = true; }
        if (apl !== undefined) { targetProgress[targetSubject][week].tasks.aplica = { status: apl }; hasUpdates = true; }
        if (quiz !== undefined) { targetProgress[targetSubject][week].tasks.quiz = { status: quiz }; hasUpdates = true; }
        if (a321 !== undefined) { targetProgress[targetSubject][week].tasks.a321 = { status: a321 }; hasUpdates = true; }
      }
      
      // Check for columns named 'Semana X'
      for (const key of Object.keys(normalizedRow)) {
        const weekMatch = key.match(/semana\\s*(\\d+)/i);
        if (weekMatch) {
            const w = parseInt(weekMatch[1], 10);
            if (WEEKS.includes(w)) {
                if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
                if (!targetProgress[targetSubject][w]) {
                    targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
                }
                const val = normalizedRow[key];
                const gr = parseFloat(String(val).replace(',', '.'));
                if (!isNaN(gr)) {
                    targetProgress[targetSubject][w].tasks.aplica = { status: 'cumplido', grade: gr };
                    hasUpdates = true;
                } else {
                    const st = parseStatus(val);
                    if (st) {
                        targetProgress[targetSubject][w].tasks.aplica = { status: st };
                        hasUpdates = true;
                    }
                }
            }
        }
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

appContent = appContent.replace(processImportDataRegex, newProcessImportData);
fs.writeFileSync('src/App.tsx', appContent);

// Patch BottomExcelPanel.tsx
let bottomContent = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');
bottomContent = bottomContent.replace(/const processFile = async /g, cleanSheetStr + "\n\n  const processFile = async ");
bottomContent = bottomContent.replace(/XLSX\.utils\.sheet_to_json\(worksheet\)/g, "cleanSheetData(worksheet)");
fs.writeFileSync('src/components/BottomExcelPanel.tsx', bottomContent);

