import React, { useState, useRef } from 'react';
import { User, FileText, Settings, HelpCircle, Save, Users, RotateCcw, Eye, EyeOff, Upload, Search, CheckCircle, AlertCircle, X, ClipboardPaste } from 'lucide-react';
import { TaskCategory, TaskStatus, ProgressData } from './types';
import { StatusButtons } from './components/StatusButtons';
import { ReportModal } from './components/ReportModal';
import * as XLSX from 'xlsx';

const WEEKS = Array.from({ length: 36 }, (_, i) => i + 1);
const SUBJECTS = [
  'Matemáticas',
  'Inglés',
  'Humanísticas',
  'Empresarial',
  'Tecnología',
  'Ciencias Biológicas'
];
const TASK_CATEGORIES: { id: TaskCategory; label: string }[] = [
  { id: 'investiga', label: 'I' },
  { id: 'aplica', label: 'A' },
  { id: 'quiz', label: 'Q' },
  { id: 'a321', label: '321' },
];

function getInitialProgress(): ProgressData {
  const initial: ProgressData = {};
  SUBJECTS.forEach(subject => {
    initial[subject] = {};
    WEEKS.forEach(week => {
      initial[subject][week] = {
        weekNumber: week,
        tasks: {
          investiga: null,
          aplica: null,
          quiz: null,
          a321: null
        }
      };
    });
  });
  return initial;
}

export default function App() {
  const [searchInput, setSearchInput] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentsData, setStudentsData] = useState<Record<string, ProgressData>>({});
  const [showReport, setShowReport] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [startWeek, setStartWeek] = useState<number>(1);
  const [endWeek, setEndWeek] = useState<number>(36);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };


  const currentKey = studentName.trim().toLowerCase();
  
  const matchedKey = currentKey 
    ? (Object.keys(studentsData).find(k => k.includes(currentKey) || currentKey.includes(k)) || currentKey)
    : currentKey;
    
  const actualKey = matchedKey || 'general';

  const progress = studentsData[actualKey] || getInitialProgress();

  const setProgress = (updater: React.SetStateAction<ProgressData>) => {
    setStudentsData(prev => {
      const prevProgress = prev[actualKey] || getInitialProgress();
      const nextProgress = typeof updater === 'function' ? updater(prevProgress) : updater;
      return {
        ...prev,
        [actualKey]: nextProgress
      };
    });
  };

  const isSubjectComplete = (subject: string, data: ProgressData = progress) => {
    const activeWeeks = WEEKS.filter(w => w >= startWeek && w <= endWeek);
    return activeWeeks.every(week => {
      return TASK_CATEGORIES.every(cat => {
        const showCell = !(cat.id === 'a321' && subject !== 'Humanísticas' && subject !== 'Ciencias Biológicas') && !(subject === 'Empresarial' && week === 11 && cat.id === 'quiz');
        if (!showCell) return true;
        
        const status = data[subject]?.[week]?.tasks?.[cat.id];
        
        if (subject === 'Inglés' && cat.id === 'quiz' && (status === null || status === undefined)) {
          return true;
        }
        
        return status !== null && status !== undefined;
      });
    });
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStudentName(searchInput);
  };

  const handleReset = () => {
    setShowConfirmReset(false);
    setStudentsData({});
    setStudentName('');
    setSearchInput('');
  };

  const processJsonData = (jsonArray: any[], targetSubject: string, sheetWeek?: number) => {
    let loadedRows = 0;
    
    setStudentsData(prev => {
      const nextData = { ...prev };

      jsonArray.forEach(row => {
        // normalizar claves a minusculas y sin acentos
        const normalizedRow: any = {};
        for (const key in row) {
           const cleanKey = key.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
           normalizedRow[cleanKey] = row[key];
           normalizedRow[key.toString().toLowerCase().trim()] = row[key];
        }

        const rowSubject = normalizedRow['asignatura'] || normalizedRow['materia'];
        if (rowSubject && String(rowSubject).toLowerCase().trim() !== targetSubject.toLowerCase()) return; 

        const nameRaw = normalizedRow['nombre'] || normalizedRow['estudiante'] || normalizedRow['alumno'] || normalizedRow['name'];
        const rawNameString = nameRaw ? String(nameRaw).trim().toLowerCase() : currentKey;
        
        if (!nextData[rawNameString]) {
          nextData[rawNameString] = getInitialProgress();
        }

        const week = parseInt(normalizedRow['semana'] || normalizedRow['week']) || sheetWeek;
        
        if (week && WEEKS.includes(week)) {
          const targetProgress = { ...nextData[rawNameString] };
          targetProgress[targetSubject] = { ...targetProgress[targetSubject] };
          targetProgress[targetSubject][week] = { 
            ...targetProgress[targetSubject][week],
            tasks: { ...targetProgress[targetSubject][week].tasks }
          };

          const parseStatus = (val: string | undefined): TaskStatus | undefined => {
            const s = String(val !== undefined && val !== null ? val : '').toLowerCase().trim();
            if (['cumplido', 'sí', 'si', 'yes', 'completado', 'done', 'true', '1', 'x', '10'].includes(s)) return 'cumplido';
            if (['pendiente', 'proceso', 'in progress', 'pending', 'p'].includes(s)) return 'pendiente';
            if (['no_cumplido', 'no cumplido', 'no', 'falta', 'false', '0', 'n'].includes(s)) return 'no_cumplido';
            return undefined;
          };

          const inv = parseStatus(normalizedRow['investiga'] || normalizedRow['investigacion'] || normalizedRow['i']);
          const apl = parseStatus(normalizedRow['aplica'] || normalizedRow['aplicacion'] || normalizedRow['a']);
          const quiz = parseStatus(normalizedRow['quiz'] || normalizedRow['q']);
          const a321 = parseStatus(normalizedRow['321'] || normalizedRow['a321']);

          if (inv !== undefined) targetProgress[targetSubject][week].tasks.investiga = inv;
          if (apl !== undefined) targetProgress[targetSubject][week].tasks.aplica = apl;
          if (quiz !== undefined) targetProgress[targetSubject][week].tasks.quiz = quiz;
          if (a321 !== undefined) targetProgress[targetSubject][week].tasks.a321 = a321;
          
          nextData[rawNameString] = targetProgress;
          loadedRows++;
        }
      });
      
      return { nextData, loadedRows };
    });
    return loadedRows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, targetSubject: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        let totalLoaded = 0;
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          const sheetWeekMatch = sheetName.match(/semana\s*(\d+)/i);
          const sheetWeek = sheetWeekMatch ? parseInt(sheetWeekMatch[1], 10) : undefined;

          totalLoaded += processJsonData(json, targetSubject, sheetWeek);
        }
        
        if (totalLoaded > 0) {
          showNotification(`Archivo Excel procesado. Se leyeron ${totalLoaded} registros para ${targetSubject}.`, 'success');
        } else {
          showNotification(`No se encontraron datos válidos. Verifica las columnas de Excel.`, 'error');
        }
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        showNotification(`Hubo un error al leer el archivo Excel para ${targetSubject}.`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const [pasteModalSubject, setPasteModalSubject] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [pasteWeek, setPasteWeek] = useState<string>('');

  const handlePasteProcess = () => {
    if (!pasteModalSubject || !pasteText.trim()) return;
    
    // Parse TSV
    const lines = pasteText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      showNotification("Por favor pega más de una fila (debe incluir encabezados).", "error");
      return;
    }

    const headers = lines[0].split('\t').map(h => h.trim());
    const json: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split('\t');
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cells[idx] ? cells[idx].trim() : '';
      });
      json.push(rowObj);
    }

    const defaultWeek = pasteWeek ? parseInt(pasteWeek, 10) : undefined;
    const loadedRows = processJsonData(json, pasteModalSubject, defaultWeek);

    if (loadedRows > 0) {
      showNotification(`Notas procesadas correctamente. Se leyeron ${loadedRows} registros para ${pasteModalSubject}.`, 'success');
      setPasteModalSubject(null);
      setPasteText('');
      setPasteWeek('');
    } else {
      showNotification(`No se encontraron datos válidos. Verifica las columnas copiadas.`, 'error');
    }
  };

  const handleStatusChange = (subject: string, week: number, task: TaskCategory, status: TaskStatus) => {
    setProgress(prev => {
      const subjectData = prev[subject] || {};
      const weekData = subjectData[week] || { weekNumber: week, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
      
      const nextProgress = {
        ...prev,
        [subject]: {
          ...subjectData,
          [week]: {
            ...weekData,
            tasks: {
              ...weekData.tasks,
              [task]: status
            }
          }
        }
      };
      
      if (!isSubjectComplete(subject, prev) && isSubjectComplete(subject, nextProgress)) {
        setTimeout(() => {
          tableContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
        }, 150);
      }

      return nextProgress;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <span className="text-sm font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* The Spreadsheet / Table Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex-1 flex flex-col sm:flex-row gap-4 max-w-xl">
              <form onSubmit={handleSearch} className="flex-1 flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Nombre del Estudiante</span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Ej. Adriano Ayala"
                      className="pl-10 w-full border border-slate-300 rounded-lg py-2 focus:ring-2 focus:ring-[#144C8A] focus:border-[#144C8A] outline-none transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 bg-[#144C8A] hover:bg-[#0f3d70] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95"
                    title="Buscar estudiante"
                  >
                    <Search className="w-4 h-4" />
                    Buscar
                  </button>
                </div>
              </form>
              
              <div className="flex-none flex gap-3 w-full sm:w-auto">
                <label className="flex flex-col gap-1 w-full sm:w-32">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Desde</span>
                  <select
                    value={startWeek}
                    onChange={(e) => setStartWeek(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg py-2 pl-3 pr-8 focus:ring-2 focus:ring-[#144C8A] focus:border-[#144C8A] outline-none bg-white text-slate-700"
                  >
                    {WEEKS.map(w => <option key={w} value={w}>Semana {w}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 w-full sm:w-32">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Hasta</span>
                  <select
                    value={endWeek}
                    onChange={(e) => setEndWeek(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg py-2 pl-3 pr-8 focus:ring-2 focus:ring-[#144C8A] focus:border-[#144C8A] outline-none bg-white text-slate-700"
                  >
                    {WEEKS.map(w => <option key={w} value={w}>Semana {w}</option>)}
                  </select>
                </label>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfirmReset(true)}
                className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar
              </button>
              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-2 bg-[#144C8A] hover:bg-[#0f3d70] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap"
              >
                <FileText className="w-4 h-4" />
                Generar Informe
              </button>
            </div>
          </div>

          <div className="overflow-x-auto" ref={tableContainerRef}>
            <table className="w-full text-sm text-left align-middle border-collapse min-w-max">
              <thead>
                {/* Weeks Row */}
                <tr className="bg-white">
                  <th className="border-b-2 border-slate-300 py-2 px-2 font-semibold text-slate-800 uppercase tracking-wider text-[0.65rem] lg:text-xs border-r-2 sticky left-0 top-0 z-20 bg-white shadow-[1px_0_0_0_#cbd5e1]">
                    ASIGNATURA
                  </th>
                  {WEEKS.filter(w => w >= startWeek && w <= endWeek).map((week) => (
                    <th key={week} colSpan={TASK_CATEGORIES.length} className="border-b-2 border-slate-300 py-1 px-1 text-center font-bold text-slate-800 uppercase tracking-wider border-r-2 border-slate-300 last:border-r-0 text-[0.65rem] lg:text-xs">
                      S{week}
                    </th>
                  ))}
                </tr>
                {/* Tasks Header Row */}
                <tr className="bg-slate-50 border-b-2 border-slate-300">
                  <td className="py-1 px-2 border-r-2 border-slate-300 sticky left-0 z-10 bg-slate-50 shadow-[1px_0_0_0_#cbd5e1]"></td>
                  {WEEKS.filter(w => w >= startWeek && w <= endWeek).map((week) => (
                    <React.Fragment key={week}>
                      {TASK_CATEGORIES.map(cat => (
                        <th key={cat.id} className={`py-1 px-0.5 text-center text-[0.6rem] lg:text-[0.65rem] font-semibold uppercase text-slate-600 border-r ${cat.id === 'a321' ? 'border-r-2 border-slate-300' : 'border-slate-200'} w-7 min-w-[28px] max-w-[28px] lg:w-8 lg:min-w-[32px] lg:max-w-[32px]`}>
                          {cat.label}
                        </th>
                      ))}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 relative">
                {SUBJECTS.map((subject, index) => {
                  const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50";
                  return (
                  <tr key={subject} className={`${rowBg} hover:bg-slate-100/50 transition-colors group`}>
                    <td className={`py-2 px-2 border-r-2 border-slate-300 sticky left-0 z-10 ${rowBg} font-medium text-slate-900 text-xs sm:text-sm shadow-[1px_0_0_0_#cbd5e1] group-hover:bg-slate-100/50 transition-colors whitespace-nowrap`}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{subject}</span>
                      </div>
                    </td>
                    
                    {WEEKS.filter(w => w >= startWeek && w <= endWeek).map((week) => (
                      <React.Fragment key={week}>
                        {TASK_CATEGORIES.map(cat => {
                          const showCell = !(cat.id === 'a321' && subject !== 'Humanísticas' && subject !== 'Ciencias Biológicas') && !(subject === 'Empresarial' && week === 11 && cat.id === 'quiz');
                          const cellBg = !showCell 
                            ? 'bg-slate-100/40' 
                            : progress[subject]?.[week]?.tasks?.[cat.id] === 'cumplido' 
                              ? 'bg-green-500' 
                              : progress[subject]?.[week]?.tasks?.[cat.id] === 'pendiente' 
                                ? 'bg-yellow-400' 
                                : progress[subject]?.[week]?.tasks?.[cat.id] === 'no_cumplido' 
                                  ? 'bg-red-500' 
                                  : 'hover:bg-slate-200/50 transition-colors';
                                  
                          return (
                            <td key={cat.id} className={`p-0 align-middle border-r ${cat.id === 'a321' ? 'border-r-2 border-slate-300' : 'border-slate-200'} ${cellBg}`}>
                              {showCell && (
                                <StatusButtons
                                  status={progress[subject]?.[week]?.tasks?.[cat.id] || null}
                                  onChange={(status) => handleStatusChange(subject, week, cat.id, status)}
                                />
                              )}
                            </td>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Confirm Reset Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">¿Reiniciar todos los datos?</h3>
              <p className="text-slate-600 text-sm mb-6">
                Esta acción borrará el nombre del estudiante y todo el progreso de las actividades. No se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sí, reiniciar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render Modal */}
      {showReport && (
        <ReportModal 
          studentName={studentName} 
          data={Object.keys(progress).reduce((acc, subject) => {
            acc[subject] = Object.keys(progress[subject]).reduce((weekAcc, weekStr) => {
              const week = parseInt(weekStr);
              if (week >= startWeek && week <= endWeek) {
                weekAcc[week] = progress[subject][week];
              }
              return weekAcc;
            }, {} as any);
            return acc;
          }, {} as ProgressData)}
          onClose={() => setShowReport(false)} 
        />
      )}

      {/* Paste Modal */}
      {pasteModalSubject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-blue-600" />
                Pegar notas para {pasteModalSubject}
              </h2>
              <button 
                onClick={() => { setPasteModalSubject(null); setPasteText(''); setPasteWeek(''); }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
                <p className="font-semibold mb-1">Instrucciones:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Copia los datos de Excel (seleccionando las celdas y usando Ctrl+C) y pégalos en la caja de abajo.</li>
                  <li>La primera fila copiada <strong>debe ser de encabezados</strong>.</li>
                  <li>Columnas soportadas: <em>Nombre, Semana, Investiga, Aplica, Quiz, 321</em>.</li>
                  <li>Los valores numéricos "10" se cuentan como cumplidos, "0" como no cumplidos.</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Semana por defecto (Opcional):
                </label>
                <select
                  value={pasteWeek}
                  onChange={(e) => setPasteWeek(e.target.value)}
                  className="w-full sm:w-64 border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-slate-700"
                >
                  <option value="">Detectar desde columnas (o ninguna)</option>
                  {WEEKS.map(w => <option key={w} value={w}>Semana {w}</option>)}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Si tu Excel no tiene la columna "Semana", selecciona aquí a qué semana corresponden los datos pegados.
                </p>
              </div>

              <div className="flex-1 min-h-[200px] flex flex-col">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Datos de portapapeles:
                </label>
                <textarea 
                  className="flex-1 w-full border border-slate-300 rounded-lg p-3 text-sm font-mono whitespace-pre focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                  placeholder="Nombre	Semana	Investiga	Aplica	Quiz	321&#10;Adriano Ayala	8	10	10	10	10&#10;Bruno Pauta	8	0	10	... "
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => { setPasteModalSubject(null); setPasteText(''); setPasteWeek(''); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handlePasteProcess}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <ClipboardPaste className="w-4 h-4" />
                Procesar Notas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
