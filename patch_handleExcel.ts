import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const handleExcelUpload = \(e: React\.ChangeEvent<HTMLInputElement>, targetSubject: string\) => \{[\s\S]*?reader\.readAsArrayBuffer\(file\);\s*e\.target\.value = '';\s*\};/m;

const replacement = `const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>, targetSubject: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        let totalLoaded = 0;

        const weekRegex = /semana[\\s_-]*(\\d+)/i;
        const hasWeekTabs = workbook.SheetNames.some(name => weekRegex.test(name));

        if (hasWeekTabs) {
          // Si hay pestañas de semanas, procesamos solo esas, inyectando la semana
          for (const sheetName of workbook.SheetNames) {
            const sheetWeekMatch = sheetName.match(weekRegex);
            if (sheetWeekMatch) {
              const worksheet = workbook.Sheets[sheetName];
              const json = XLSX.utils.sheet_to_json(worksheet) as any[];
              const sheetWeek = parseInt(sheetWeekMatch[1], 10);
              totalLoaded += processImportData(json, targetSubject, sheetWeek);
            }
          }
        } else {
          // Si no hay pestañas con el formato 'SEMANA X', procesar todas como contenido único
          let combinedJson: any[] = [];
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet) as any[];
            combinedJson = combinedJson.concat(json);
          }
          totalLoaded += processImportData(combinedJson, targetSubject);
        }

        if (totalLoaded > 0) {
          showNotification(\`Archivo Excel procesado: \${totalLoaded} registros cargados para \${targetSubject}.\`, 'success');
        } else {
          showNotification('No se encontraron registros válidos o no coinciden con los estudiantes de este nivel.', 'error');
        }
      } catch (error) {
        showNotification('Error al leer el archivo Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', content);
