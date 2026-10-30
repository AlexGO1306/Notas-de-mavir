const rawData = [
  ["Logo", "Colegio", "", ""],
  ["No.", "Nómina", "Semana 1", "", "", "Semana 2", "", ""],
  ["", "", "Inv", "Apl", "Quiz", "Inv", "Apl", "Quiz"],
  ["1", "Perez Juan", "10", "9", "8", "10", "10", "10"]
];
let headerRowIndex = 1;
let maxHeaderRowIndex = 2;

const compositeHeaders: string[] = [];
const numCols = Math.max(...rawData.slice(0, maxHeaderRowIndex + 1).map(r => r.length));

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
const uniqueParts = Array.from(new Set(colNameParts));
compositeHeaders.push(uniqueParts.join(' ') || `__EMPTY_${c}`);
}
console.log(compositeHeaders);
