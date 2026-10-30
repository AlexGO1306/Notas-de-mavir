import fs from 'fs';

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
let bottomContent = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

const cleanSheetRegex = /const cleanSheetData = \([\s\S]*?return cleanData;\s*\};/m;

const newCleanSheetData = `const cleanSheetData = (worksheet: any) => {
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
  let headerRowIndex = -1;
  
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
      break; // ¡VITAL! Detenerse en cuanto encontramos la cabecera real
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
       let val = rawData[r] ? rawData[r][c] : "";
       
       // Si está vacío, miramos a la izquierda para soportar "Celdas Combinadas" (Merged Cells)
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

fs.writeFileSync('src/App.tsx', appContent);
fs.writeFileSync('src/components/BottomExcelPanel.tsx', bottomContent);
