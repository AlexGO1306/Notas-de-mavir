import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const processImportData = \(rows: any\[\], targetSubject: string, defaultWeek\?: number\) => \{[\s\S]*?if \(isNew && \(hasStatusUpdate \|\| hasGradeUpdate\)\) \{[\s\S]*?\}\s*\}\);\s*return loadedCount;\s*\};/m;

const replacement = `const processImportData = (rows: any[], targetSubject: string, defaultWeek?: number) => {
    if (!selectedLevelId) {
      showNotification('Selecciona un nivel antes de importar datos.', 'error');
      return 0;
    }

    let loadedCount = 0;
    const allStudentsInLevel = students.filter(s => s.levelId === selectedLevelId);

    // Filter out rows that are completely empty or likely just title rows
    const validRows = rows.filter(row => {
      const vals = Object.values(row);
      return vals.filter(v => v !== null && v !== undefined && String(v).trim() !== '').length >= 2;
    });

    validRows.forEach(row => {
      const normalizedRow: any = {};
      for (const key in row) {
        const cleanKey = key.toString().toLowerCase().trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        normalizedRow[cleanKey] = row[key];
        normalizedRow[key.toString().toLowerCase().trim()] = row[key];
      }

      const rowSubject = normalizedRow['asignatura'] || normalizedRow['materia'];
      if (rowSubject && String(rowSubject).toLowerCase().trim() !== targetSubject.toLowerCase()) return;

      const nameRaw = normalizedRow['nombre'] || normalizedRow['estudiante'] || normalizedRow['alumno'] || normalizedRow['name'] || normalizedRow['nombres y apellidos'] || normalizedRow['nombres'];
      if (!nameRaw) return;

      const normalizeString = (s: string) => String(s).trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      const nameString = normalizeString(nameRaw);
      
      // More robust matching for student names
      let student = allStudentsInLevel.find(s => {
        const sName = normalizeString(s.name);
        if (sName === nameString) return true;
        // Check if one contains the other (useful if one has middle name and other doesn't)
        if (sName.includes(nameString) || nameString.includes(sName)) return true;
        
        // Check if all parts of the shorter name are in the longer name
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

      const week = parseInt(normalizedRow['semana'] || normalizedRow['week']) || defaultWeek;
      
      if (week && WEEKS.includes(week)) {
        if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
        targetProgress[targetSubject][week] = {
          weekNumber: week,
          tasks: { ...(targetProgress[targetSubject][week]?.tasks || { investiga: null, aplica: null, quiz: null, a321: null }) }
        };

        const parseStatus = (val: any): TaskStatus | undefined => {
          const s = String(val !== undefined && val !== null ? val : '').toLowerCase().trim();
          if (['cumplido', 'sí', 'si', 'yes', 'completado', 'done', 'true', '1', 'x', '10'].includes(s)) return 'cumplido';
          if (['pendiente', 'proceso', 'in progress', 'pending', 'p'].includes(s)) return 'pendiente';
          if (['no_cumplido', 'no cumplido', 'no', 'falta', 'false', '0', 'n'].includes(s)) return 'no_cumplido';
          return undefined;
        };

        const parseGrade = (val: any): number | undefined => {
          if (val === undefined || val === null || String(val).trim() === '') return undefined;
          const parsed = parseFloat(String(val).replace(',', '.'));
          return isNaN(parsed) ? undefined : parsed;
        };

        let hasStatusUpdate = false;
        let hasGradeUpdate = false;

        const findColumnValue = (taskName: string, type: 'estado' | 'nota') => {
            for (const key of Object.keys(normalizedRow)) {
               if (key.includes(taskName) && (key.includes(type) || key.includes(type === 'nota' ? 'calificacion' : 'status'))) {
                   return normalizedRow[key];
               }
            }
            // fallback exact match if not found by type
            for (const key of Object.keys(normalizedRow)) {
               if (key === taskName || key === \`\${taskName} \${type}\` || key === \`\${type} \${taskName}\`) {
                   return normalizedRow[key];
               }
            }
            return undefined;
        };

        ['investiga', 'aplica', 'quiz', 'a321'].forEach(task => {
          const t = task as keyof WeekProgress['tasks'];
          
          const statusVal = findColumnValue(t, 'estado');
          const gradeVal = findColumnValue(t, 'nota');

          const st = parseStatus(statusVal);
          const gr = parseGrade(gradeVal);

          if (st || gr !== undefined) {
            targetProgress[targetSubject][week].tasks[t] = {
              status: st || targetProgress[targetSubject][week].tasks[t]?.status || 'pendiente',
              grade: gr !== undefined ? gr : targetProgress[targetSubject][week].tasks[t]?.grade
            };
            if (st) hasStatusUpdate = true;
            if (gr !== undefined) hasGradeUpdate = true;
          }
        });

        // Also check if there's columns representing weeks directly e.g. "Semana 1", "Semana 2" containing grades
        // This is a common structure: columns are weeks, rows are students
        // We've already parsed 'semana' variable, but if it didn't exist...

        const isNew = !student;
        if (isNew) {
          student = {
            id: \`import-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
            name: String(nameRaw).trim(),
            levelId: selectedLevelId,
            progress: targetProgress,
            lastUpdate: new Date().toISOString()
          };
          setStudents(prev => [...prev, student!]);
          loadedCount++;
        } else if (hasStatusUpdate || hasGradeUpdate) {
          student.progress = targetProgress;
          student.lastUpdate = new Date().toISOString();
          setStudents(prev => prev.map(s => s.id === student!.id ? student! : s));
          loadedCount++;
        }
      } else {
         // If week is not defined explicitly, check if there are columns named like 'semana 1', 'semana 2' etc.
         let hasUpdates = false;
         for (const key of Object.keys(normalizedRow)) {
            const weekMatch = key.match(/semana\\s*(\\d+)/);
            if (weekMatch) {
               const w = parseInt(weekMatch[1], 10);
               if (WEEKS.includes(w)) {
                  if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
                  if (!targetProgress[targetSubject][w]) {
                      targetProgress[targetSubject][w] = {
                        weekNumber: w,
                        tasks: { investiga: null, aplica: null, quiz: null, a321: null }
                      };
                  }
                  
                  const val = normalizedRow[key];
                  // If it's a number, assume it's a grade for a general 'aplica' task or similar, or just a general grade
                  const gr = parseFloat(String(val).replace(',', '.'));
                  if (!isNaN(gr)) {
                     targetProgress[targetSubject][w].tasks.aplica = {
                         status: 'cumplido',
                         grade: gr
                     };
                     hasUpdates = true;
                  } else {
                     const statusMatch = String(val).toLowerCase().trim();
                     if (['cumplido', 'sí', 'si', 'yes', 'completado', 'done', 'true', '1', 'x', '10'].includes(statusMatch)) {
                         targetProgress[targetSubject][w].tasks.aplica = {
                            status: 'cumplido',
                            grade: undefined
                         };
                         hasUpdates = true;
                     }
                  }
               }
            }
         }

         if (hasUpdates) {
             if (!student) {
                student = {
                    id: \`import-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
                    name: String(nameRaw).trim(),
                    levelId: selectedLevelId,
                    progress: targetProgress,
                    lastUpdate: new Date().toISOString()
                };
                setStudents(prev => [...prev, student!]);
                loadedCount++;
             } else {
                student.progress = targetProgress;
                student.lastUpdate = new Date().toISOString();
                setStudents(prev => prev.map(s => s.id === student!.id ? student! : s));
                loadedCount++;
             }
         }
      }
    });

    return loadedCount;
  };`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', content);
