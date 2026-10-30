const rawData = [
  ["Logo", "Colegio", "", ""],
  ["No.", "Nómina", "Semana 1", "", "", "Semana 2", "", ""],
  ["", "", "Inv", "Apl", "Quiz", "Inv", "Apl", "Quiz"],
  ["1", "Perez Juan", "10", "9", "8", "10", "10", "10"]
];

let headerRowIndex = -1;
let maxHeaderRowIndex = -1;

for (let i = 0; i < rawData.length; i++) {
  const row = rawData[i];
  if (!row) continue;
  const isHeader = row.some(cell => {
    if (!cell) return false;
    const s = String(cell).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return s === 'nombre' || s === 'nombres' || s.includes('estudiante') || s.includes('alumno') || s.includes('nomina') || s === 'name' || s === 'student' || s.includes('apellidos');
  });
  if (isHeader) {
    headerRowIndex = i;
    break;
  }
}

if (headerRowIndex !== -1) {
    maxHeaderRowIndex = headerRowIndex;
    // Check up to 2 rows below for sub-headers (Inv, Apl, Quiz)
    for (let i = headerRowIndex + 1; i <= Math.min(headerRowIndex + 2, rawData.length - 1); i++) {
        const row = rawData[i];
        const hasSubHeader = row.some(cell => {
            if (!cell) return false;
            const s = String(cell).toLowerCase().trim();
            return s.includes('inv') || s.includes('apl') || s.includes('quiz') || s.includes('321') || s.includes('actividad') || s.includes('tarea');
        });
        
        // Also check if the "nombre" column is empty in this row (which usually means it was merged vertically)
        // We need to know which column had "nombre"
        const nameColIdx = rawData[headerRowIndex].findIndex(cell => {
           if (!cell) return false;
           const s = String(cell).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
           return s === 'nombre' || s === 'nombres' || s.includes('estudiante') || s.includes('alumno') || s.includes('nomina');
        });
        
        const isNameCellEmpty = nameColIdx !== -1 && (!row[nameColIdx] || String(row[nameColIdx]).trim() === '');

        if (hasSubHeader || isNameCellEmpty) {
            maxHeaderRowIndex = i;
        } else {
            break;
        }
    }
}
console.log("Header starts at", headerRowIndex, "and ends at", maxHeaderRowIndex);
