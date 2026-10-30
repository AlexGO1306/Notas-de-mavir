import fs from 'fs';

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
let bottomContent = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

const cleanSheetRegex = /const cleanSheetData = \([\s\S]*?return cleanData;\s*\};/m;

const newCleanSheetData = `const cleanSheetData = (worksheet: any) => {
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  let headerRowIndex = -1;
  
  // Find the deepest row in the first 20 rows that looks like a header
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row)) continue;
    
    const isHeader = row.some(cell => {
      if (!cell) return false;
      const s = String(cell).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      return s.includes('nombre') || s.includes('estudiante') || s.includes('alumno') || s.includes('nomina') ||
             s.includes('semana') || s.includes('week') || s.includes('sem ') || s === 'sem' ||
             s.includes('investiga') || s.includes('aplica') || s.includes('quiz') || s.includes('a321') ||
             s.includes('promedio') || s.includes('total') || s.includes('name') || s.includes('student');
    });
    
    if (isHeader) {
      headerRowIndex = i;
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
       // If empty, look left for merged headers (like "Semana 1" spanning 4 columns)
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

fs.writeFileSync('src/App.tsx', appContent);
fs.writeFileSync('src/components/BottomExcelPanel.tsx', bottomContent);
