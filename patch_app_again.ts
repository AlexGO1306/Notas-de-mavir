import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add import back
content = content.replace(
  "import { ReportModal } from './components/ReportModal';",
  "import { ReportModal } from './components/ReportModal';\nimport { BottomExcelPanel } from './components/BottomExcelPanel';"
);

// 2. Add state back
content = content.replace(
  "const [editingStudentName, setEditingStudentName] = useState('');",
  "const [editingStudentName, setEditingStudentName] = useState('');\n  const [excelViewerSubject, setExcelViewerSubject] = useState<string | null>(null);"
);

// 3. Replace the label with the old button
const labelRegex = /<label[\s\S]*?Subir Excel para auto-rellenar[\s\S]*?<\/label>/m;
const oldButton = `<button
                                onClick={() => setExcelViewerSubject(subject.name)}
                                className="bg-black/20 hover:bg-black/30 text-white p-1 rounded-md transition-colors"
                                title={\`Ver archivo Excel de \${subject.name}\`}
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                              </button>`;
content = content.replace(labelRegex, oldButton);

// 4. Implement auto-fill handler inside App
const handleAutoFill = `  const handleAutoFill = (studentId: string, matchedRow: any, fileWeek: string, columns: string[]) => {
    setPendingChanges(prev => {
      const student = currentStudents.find(s => s.id === studentId);
      if (!student) return prev;
      
      const targetProgress = prev[studentId] ? { ...prev[studentId] } : { ...student.progress };
      let hasUpdates = false;
      const targetSubject = excelViewerSubject || '';
      if (!targetSubject) return prev;
      
      const parseStatus = (val: any): import('./types').TaskStatus | undefined => {
          const s = String(val !== undefined && val !== null ? val : '').toLowerCase().trim();
          if (['cumplido', 'sí', 'si', 'yes', 'completado', 'done', 'true', '1', 'x', '10', 'ok'].includes(s)) return 'cumplido';
          if (['pendiente', 'proceso', 'in progress', 'pending', 'p'].includes(s)) return 'pendiente';
          if (['no_cumplido', 'no cumplido', 'no', 'falta', 'false', '0', 'n'].includes(s)) return 'no_cumplido';
          return undefined;
      };
      
      const parseGrade = (val: any): number | undefined => {
          if (val === undefined || val === null || String(val).trim() === '') return undefined;
          const parsed = parseFloat(String(val).replace(',', '.'));
          return isNaN(parsed) ? undefined : parsed;
      };

      const assignTask = (w: number, task: string, val: any) => {
         if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
         if (!targetProgress[targetSubject][w]) {
            targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
         }
         const st = parseStatus(val);
         const gr = parseGrade(val);
         if (st || gr !== undefined) {
             const existingStatus = targetProgress[targetSubject][w].tasks[task as any]?.status;
             targetProgress[targetSubject][w].tasks[task as any] = {
                 status: st || existingStatus || 'cumplido',
                 grade: gr !== undefined ? gr : undefined
             };
             hasUpdates = true;
         }
      };

      for (const key of Object.keys(matchedRow)) {
        const val = matchedRow[key];
        if (val === undefined || val === null || String(val).trim() === '') continue;
        const cleanKey = key.toString().toLowerCase().trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        
        if (cleanKey.includes('promedio') || cleanKey.includes('total') || cleanKey.includes('prom')) continue;

        const weekMatch = cleanKey.match(/(?:semana|sem|s)[\\s_-]*(\\d+)/i);
        if (weekMatch) {
            const w = parseInt(weekMatch[1], 10);
            if (w >= 1 && w <= 52) {
                if (cleanKey.includes('investiga') || cleanKey.includes('inv') || cleanKey.match(/\\bi\\b/i)) {
                    assignTask(w, 'investiga', val);
                } else if (cleanKey.includes('quiz') || cleanKey.includes('prueba') || cleanKey.match(/\\bq\\b/i)) {
                    assignTask(w, 'quiz', val);
                } else if (cleanKey.includes('321') || cleanKey.includes('a321')) {
                    assignTask(w, 'a321', val);
                } else if (cleanKey.includes('aplica') || cleanKey.includes('actividad') || cleanKey.includes('feedback') || cleanKey.match(/\\ba\\b/i)) {
                    assignTask(w, 'aplica', val);
                }
            }
        }
      }
      
      // Fallback for fileWeek
      if (!hasUpdates && fileWeek) {
          const w = parseInt(fileWeek, 10);
          if (w >= 1 && w <= 52) {
             for (const key of Object.keys(matchedRow)) {
                const val = matchedRow[key];
                if (val === undefined || val === null || String(val).trim() === '') continue;
                const cleanKey = key.toString().toLowerCase().trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
                
                if (cleanKey.includes('promedio') || cleanKey.includes('total') || cleanKey.includes('prom')) continue;
                
                if (cleanKey.includes('investiga') || cleanKey.includes('inv') || cleanKey === 'i') assignTask(w, 'investiga', val);
                if (cleanKey.includes('aplica') || cleanKey.includes('aplicacion') || cleanKey.includes('feedback') || cleanKey === 'a') assignTask(w, 'aplica', val);
                if (cleanKey.includes('quiz') || cleanKey === 'q') assignTask(w, 'quiz', val);
                if (cleanKey.includes('321') || cleanKey === 'a321') assignTask(w, 'a321', val);
             }
          }
      }

      if (hasUpdates) {
        showNotification('Datos encontrados y autollenados en la matriz (marcados en amarillo).', 'success');
        return {
          ...prev,
          [studentId]: targetProgress
        };
      }
      
      return prev;
    });
  };
`;

content = content.replace("const handlePasteProcess = () => {", handleAutoFill + "\n\n  const handlePasteProcess = () => {");

// 5. Render BottomExcelPanel
const panelRender = `
      {excelViewerSubject && (
        <BottomExcelPanel
          subjectName={excelViewerSubject}
          focusedStudentId={focusedStudentId}
          students={currentStudents}
          onClose={() => setExcelViewerSubject(null)}
          onAutoFill={handleAutoFill}
        />
      )}

      {/* Report Modal */}`;
content = content.replace("{/* Report Modal */}", panelRender);

fs.writeFileSync('src/App.tsx', content);
