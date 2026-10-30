import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const parseStatus = \(val: any\): import\('\.\/types'\)\.TaskStatus \| undefined => \{[\s\S]*?return undefined;\s*\};/g;

const newParseStatus = `const parseStatus = (val: any): import('./types').TaskStatus | undefined => {
          if (val === undefined || val === null || String(val).trim() === '') return undefined;
          const s = String(val).toLowerCase().trim();
          if (['cumplido', 'sí', 'si', 'yes', 'completado', 'done', 'true', '1', 'x', '10', 'ok'].includes(s)) return 'cumplido';
          if (['pendiente', 'proceso', 'in progress', 'pending', 'p'].includes(s)) return 'pendiente';
          if (['no_cumplido', 'no cumplido', 'no', 'falta', 'false', '0', 'n'].includes(s)) return 'no_cumplido';
          
          const parsed = parseFloat(s.replace(',', '.'));
          if (!isNaN(parsed)) {
             return parsed > 0 ? 'cumplido' : 'no_cumplido';
          }
          
          return 'cumplido'; // Fallback to fulfilled if they wrote something custom like "Entregado"
      };`;

content = content.replace(regex, newParseStatus);

const regex2 = /const parseStatus = \(val: any\): TaskStatus \| undefined => \{[\s\S]*?return undefined;\s*\};/g;
const newParseStatus2 = `const parseStatus = (val: any): TaskStatus | undefined => {
          if (val === undefined || val === null || String(val).trim() === '') return undefined;
          const s = String(val).toLowerCase().trim();
          if (['cumplido', 'sí', 'si', 'yes', 'completado', 'done', 'true', '1', 'x', '10', 'ok'].includes(s)) return 'cumplido';
          if (['pendiente', 'proceso', 'in progress', 'pending', 'p'].includes(s)) return 'pendiente';
          if (['no_cumplido', 'no cumplido', 'no', 'falta', 'false', '0', 'n'].includes(s)) return 'no_cumplido';
          
          const parsed = parseFloat(s.replace(',', '.'));
          if (!isNaN(parsed)) {
             return parsed > 0 ? 'cumplido' : 'no_cumplido';
          }
          
          return 'cumplido';
      };`;

content = content.replace(regex2, newParseStatus2);
fs.writeFileSync('src/App.tsx', content);
