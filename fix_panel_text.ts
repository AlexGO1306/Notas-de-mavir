import fs from 'fs';
let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

content = content.replace('Los cambios se resaltan en amarillo.', 'Los cambios se reflejarán inmediatamente con sus colores respectivos.');

fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
