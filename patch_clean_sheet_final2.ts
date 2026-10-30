import fs from 'fs';

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
let bottomContent = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

const cleanSheetRegex = /const cleanSheetData = \([\s\S]*?return cleanData;\s*\};/m;

const newCleanSheetData = `const cleanSheetData = (worksheet: any) => {
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
  let headerRowIndex = -1;
  let maxHeaderRowIndex = -1;
  
  // Buscar LA PRIMERA fila que tenga una columna de Nombres/Estudiantes
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row)) continue;
    
    const isHeader = row.some(cell => {
      if (!cell) return false;
      const s = String(cell).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
      return s === 'nombre' || s === 'nombres' || s.includes('estudiante') || s.includes('alumno') || s.includes('nomina') || s === 'name' || s === 'student' || s.includes('apellidos');
    });
    
    if (isHeader) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex !== -1) {
    maxHeaderRowIndex = headerRowIndex;
    for (let i = headerRowIndex + 1; i <= Math.min(headerRowIndex + 2, rawData.length - 1); i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row)) continue;
        const hasSubHeader = row.some(cell => {
            if (!cell) return false;
            const s = String(cell).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
            return s.includes('inv') || s.includes('apl') || s.includes('quiz') || s.includes('321') || s.includes('actividad') || s.includes('tarea') || s.includes('feedback') || s === 'i' || s === 'a' || s === 'q' || s.includes('prom') || s.includes('total');
        });
        
        const nameColIdx = rawData[headerRowIndex].findIndex(cell => {
           if (!cell) return false;
           const s = String(cell).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
           return s === 'nombre' || s === 'nombres' || s.includes('estudiante') || s.includes('alumno') || s.includes('nomina') || s === 'name' || s === 'student' || s.includes('apellidos');
        });
        
        const isNameCellEmpty = nameColIdx !== -1 && (!row[nameColIdx] || String(row[nameColIdx]).trim() === '');

        if (hasSubHeader || isNameCellEmpty) {
            maxHeaderRowIndex = i;
        } else {
            break; 
        }
    }
  }

  if (headerRowIndex === -1) {
    return XLSX.utils.sheet_to_json(worksheet) as any[];
  }

  const compositeHeaders: (string | null)[] = [];
  const numCols = Math.max(...rawData.slice(0, maxHeaderRowIndex + 1).map(r => r?.length || 0));

  for (let c = 0; c < numCols; c++) {
    let colNameParts: string[] = [];
    for (let r = 0; r <= maxHeaderRowIndex; r++) {
       let val = rawData[r] ? rawData[r][c] : "";
       
       if (val === undefined || val === null || String(val).trim() === '') {
          for (let left = c - 1; left >= 0; left--) {
             if (rawData[r] && rawData[r][left] !== undefined && rawData[r][left] !== null && String(rawData[r][left]).trim() !== '') {
                val = rawData[r][left];
                break;
             }
          }
       }
       if (val !== undefined && val !== null && String(val).trim() !== '') {
          colNameParts.push(String(val).trim());
       }
    }
    
    const rawHeader = Array.from(new Set(colNameParts)).join(' ');
    
    // Normalizar y filtrar el header según las especificaciones estrictas
    const norm = rawHeader.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    let finalHeader: string | null = null;
    
    if (norm.includes('nombre') || norm.includes('nomina') || norm.includes('estudiante') || norm === 'name' || norm === 'student' || norm.includes('apellidos')) {
      finalHeader = 'Nombre';
    } else if (norm.includes('comentario')) {
      finalHeader = 'Comentarios';
    } else {
      const modMatch = norm.match(/m[oó]dulo\\s*(\\d+)/i) || norm.match(/\\b(\\d+)\\s*middle\\b/i) || norm.match(/\\bm(\\d+)\\b/i) || rawHeader.match(/(\\d+)\\s*Middle/i);
      const semMatch = norm.match(/(?:semana|sem|s)\\s*(\\d+)/i) || norm.match(/\\bs(\\d+)\\b/i);
      
      if (semMatch) {
         const sem = semMatch[1];
         let mod = modMatch ? modMatch[1] : '';
         if (!mod) {
             const allNums = norm.match(/\\d+/g);
             if (allNums && allNums.length > 1 && norm.indexOf(allNums[0]) < norm.indexOf(sem)) {
                 mod = allNums[0];
             }
         }
         
         let task = '';
         if (norm.includes('inv') || norm.includes('investiga') || norm.match(/\\bi\\b/)) task = 'Investiga';
         else if (norm.includes('quiz') || norm.includes('prueba') || norm.match(/\\bq\\b/)) task = 'Quiz';
         else if (norm.includes('feedback') || norm.includes('apl') || norm.includes('aplica') || norm.match(/\\ba\\b/)) task = 'Feedback';
         
         if (task) {
            finalHeader = \`Módulo \${mod || '#'} Semana \${sem} \${task}\`;
         }
      }
    }
    
    compositeHeaders.push(finalHeader);
  }

  const cleanData: any[] = [];
  for (let i = maxHeaderRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;
    
    const obj: any = {};
    let hasData = false;
    compositeHeaders.forEach((header, index) => {
      if (header !== null && row[index] !== undefined && row[index] !== null && String(row[index]).trim() !== '') {
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

fs.writeFileSync('src/App.tsx', appContent);
fs.writeFileSync('src/components/BottomExcelPanel.tsx', bottomContent);
