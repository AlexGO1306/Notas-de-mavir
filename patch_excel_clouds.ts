import fs from 'fs';

let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

// Add fileWeek state
content = content.replace(
  /const \[columns, setColumns\] = useState<string\[\]>\(\[\]\);/,
  `const [columns, setColumns] = useState<string[]>([]);
  const [fileWeek, setFileWeek] = useState<string>('');`
);

// Update loadExcel to load week
content = content.replace(
  /const storedData = await localforage\.getItem<\{fileName: string, data: any\[\], columns: string\[\]\}>\([^)]+\);/,
  `const storedData = await localforage.getItem<{fileName: string, data: any[], columns: string[], week?: string}>(String(\`excel_data_\${subjectName}\`));`
);

content = content.replace(
  /setColumns\(storedData\.columns\);/,
  `setColumns(storedData.columns);\n        setFileWeek(storedData.week || '');`
);

// Update processFile to save empty week initially
content = content.replace(
  /columns: newColumns\n\s+\}\);/,
  `columns: newColumns,\n        week: ''\n      });\n      setFileWeek('');`
);

// Update handleDelete to clear week
content = content.replace(
  /setColumns\(\[\]\);/,
  `setColumns([]);\n    setFileWeek('');`
);

// Function to handle week change
content = content.replace(
  /const normalize = /,
  `const handleWeekChange = async (newWeek: string) => {
    setFileWeek(newWeek);
    const storedData = await localforage.getItem<{fileName: string, data: any[], columns: string[], week?: string}>(String(\`excel_data_\${subjectName}\`));
    if (storedData) {
      await localforage.setItem(String(\`excel_data_\${subjectName}\`), {
        ...storedData,
        week: newWeek
      });
    }
  };

  const normalize = `
);

// Add week input to UI
content = content.replace(
  /<div className="flex items-center gap-2 overflow-hidden px-2">/,
  `<div className="flex items-center gap-3 overflow-hidden px-2 w-full">`
);

content = content.replace(
  /<span className="text-xs font-medium text-slate-500 truncate" title=\{fileName\}>\{fileName\}<\/span>/,
  `<span className="text-xs font-medium text-slate-500 truncate max-w-[100px] sm:max-w-[120px]" title={fileName}>{fileName}</span>
                <div className="h-4 w-px bg-slate-200"></div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Semana:</span>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    placeholder="Ej. 3"
                    value={fileWeek}
                    onChange={(e) => handleWeekChange(e.target.value)}
                    className="w-12 text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-green-400 text-slate-700 font-bold"
                  />
                </div>`
);

// Filter columns in the mapping and show week
content = content.replace(
  /\{columns\.map\((col) => \{/g, // Actually the current code uses `col => {`
  `{columns.map(col => {`
);

const oldMap = `{columns.map(col => {
                      const val = matchedRow[col];
                      if (val === undefined || val === null || String(val).trim() === '') return null;
                      return (
                        <div key={col} className="bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-green-300 rounded-full px-3.5 py-1.5 flex items-center gap-2 transition-all cursor-default group">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest group-hover:text-green-500 transition-colors">{col}:</span>
                          <span className="text-sm font-black text-slate-700">{String(val)}</span>
                        </div>
                      );
                    })}`;

const newMap = `{columns.map(col => {
                      const excludeCols = ['nombre', 'name', 'correo', 'email', 'identificacion', 'cédula', 'cedula', 'id', 'estudiante', 'student'];
                      const isExcluded = excludeCols.some(ex => col.toLowerCase().includes(ex));
                      if (isExcluded) return null;

                      const val = matchedRow[col];
                      if (val === undefined || val === null || String(val).trim() === '') return null;
                      return (
                        <div key={col} className="bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-green-300 rounded-full px-3.5 py-1.5 flex items-center gap-2 transition-all cursor-default group relative">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest group-hover:text-green-500 transition-colors">{col}:</span>
                          <span className="text-sm font-black text-slate-700">{String(val)}</span>
                          {fileWeek && (
                            <span className="absolute -top-2 -right-2 bg-green-100 text-green-700 border border-green-200 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-sm">
                              S{fileWeek}
                            </span>
                          )}
                        </div>
                      );
                    })}`;

content = content.replace(oldMap, newMap);

fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
