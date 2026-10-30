import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /if \(hasWeekTabs\) \{[\s\S]*?\} else \{[\s\S]*?let combinedJson: any\[\] = \[\];\s*for \(const sheetName of workbook\.SheetNames\) \{\s*const worksheet = workbook\.Sheets\[sheetName\];\s*const json = cleanSheetData\(worksheet\);\s*combinedJson = combinedJson\.concat\(json\);\s*\}\s*totalLoaded \+= processImportData\(combinedJson, targetSubject\);\s*\}/m;

const replacement = `if (hasWeekTabs) {
          // Si hay pestañas de semanas, procesamos solo esas, inyectando la semana
          for (const sheetName of workbook.SheetNames) {
            const sheetWeekMatch = sheetName.match(weekRegex);
            if (sheetWeekMatch) {
              const worksheet = workbook.Sheets[sheetName];
              const json = cleanSheetData(worksheet);
              const sheetWeek = parseInt(sheetWeekMatch[1], 10);
              totalLoaded += processImportData(json, targetSubject, sheetWeek);
            }
          }
        } else {
          // Si no hay pestañas con el formato 'SEMANA X', procesar todas como contenido único
          let combinedJson: any[] = [];
          
          // Buscar si hay una pestaña que se llame EXACTAMENTE como el nivel/curso actual
          const targetLevelName = levels.find(l => l.id === selectedLevelId)?.name;
          
          const targetTabName = workbook.SheetNames.find(name => {
              if (!targetLevelName) return false;
              const n1 = name.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
              const n2 = targetLevelName.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
              return n1 === n2 || n1.includes(n2) || n2.includes(n1);
          });
          
          if (targetTabName) {
            const worksheet = workbook.Sheets[targetTabName];
            const json = cleanSheetData(worksheet);
            combinedJson = combinedJson.concat(json);
          } else {
            for (const sheetName of workbook.SheetNames) {
              const worksheet = workbook.Sheets[sheetName];
              const json = cleanSheetData(worksheet);
              combinedJson = combinedJson.concat(json);
            }
          }
          
          totalLoaded += processImportData(combinedJson, targetSubject);
        }`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', content);
