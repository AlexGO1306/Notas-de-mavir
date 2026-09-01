import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  User, FileText, Settings, HelpCircle, Save, Users, RotateCcw, 
  Upload, Search, CheckCircle, AlertCircle, X, ClipboardPaste, 
  LogOut, Plus, ChevronLeft, ChevronRight, School, Filter,
  ArrowRight, Check, Award, BarChart2, Download, Trash2, Edit2
} from 'lucide-react';
import { TaskCategory, TaskStatus, ProgressData } from './types';
import { ReportModal } from './components/ReportModal';
import { AuthScreen } from './components/AuthScreen';
import { useAuth } from './hooks/useAuth';
import { useFirebaseData, Student } from './hooks/useFirebaseData';
import { auth } from './firebase';
import { WEEKS, SUBJECT_CONFIGS, TASK_CATEGORIES, getTasksForSubjectAndWeek } from './constants';
import * as XLSX from 'xlsx';

export function getInitialProgress(): ProgressData {
  const initial: ProgressData = {};
  SUBJECT_CONFIGS.forEach(subject => {
    initial[subject.name] = {};
    WEEKS.forEach(week => {
      initial[subject.name][week] = {
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
  const { user, loading: authLoading } = useAuth();
  const { 
    levels, 
    students, 
    addLevel, 
    deleteLevel, 
    addStudent, 
    updateStudentProgress, 
    batchUpdateStudentProgress,
    updateStudentName,
    deleteStudent 
  } = useFirebaseData(user?.uid);

  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, ProgressData>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Filter & Week Navigation State
  const [searchQuery, setSearchQuery] = useState('');
  const [startWeek, setStartWeek] = useState<number>(1);
  const [endWeek, setEndWeek] = useState<number>(10);

  // Inputs
  const [newLevelName, setNewLevelName] = useState('');
  const [newStudentInlineName, setNewStudentInlineName] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentName, setEditingStudentName] = useState('');
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);

  // Modals & Notifications
  const [reportStudent, setReportStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteTargetSubject, setPasteTargetSubject] = useState<string>(SUBJECT_CONFIGS[0].name);
  const [pasteText, setPasteText] = useState('');
  const [pasteWeek, setPasteWeek] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (levels.length > 0 && !selectedLevelId) {
      setSelectedLevelId(levels[0].id);
    }
  }, [levels, selectedLevelId]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const currentLevel = levels.find(l => l.id === selectedLevelId);
  const currentStudents = useMemo(() => {
    if (!selectedLevelId) return [];
    return students
      .filter(s => s.levelId === selectedLevelId)
      .filter(s => searchQuery.trim() === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedLevelId, searchQuery]);

  const activeWeeks = useMemo(() => {
    return WEEKS.filter(w => w >= startWeek && w <= endWeek);
  }, [startWeek, endWeek]);

  // Calculate compliance statistics for a student within active weeks
  const getStudentStats = (student: Student) => {
    let evaluated = 0;
    let completed = 0;
    
    const effectiveProgress = pendingChanges[student.id] || student.progress || {};

    SUBJECT_CONFIGS.forEach(subject => {
      activeWeeks.forEach(week => {
        const tasks = getTasksForSubjectAndWeek(subject.name, week);
        tasks.forEach(cat => {
          const status = effectiveProgress[subject.name]?.[week]?.tasks?.[cat.id];
          if (status) {
            evaluated++;
            if (status === 'cumplido') completed++;
          }
        });
      });
    });

    const percentage = evaluated > 0 ? Math.round((completed / evaluated) * 100) : 0;
    return { evaluated, completed, percentage };
  };

  const handleAddLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLevelName.trim();
    if (trimmed) {
      const newLevelId = await addLevel(trimmed);
      setNewLevelName('');
      if (newLevelId) {
        setSelectedLevelId(newLevelId);
      }
      showNotification(`Nivel "${trimmed}" creado exitosamente.`, 'success');
    }
  };

  const handleAddStudentInline = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStudentInlineName.trim();
    if (!trimmed || !selectedLevelId) return;

    addStudent(trimmed, selectedLevelId, getInitialProgress());
    setNewStudentInlineName('');
    showNotification(`Estudiante "${trimmed}" agregado exitosamente.`, 'success');
  };

  const handleSaveRename = (studentId: string) => {
    const trimmed = editingStudentName.trim();
    if (trimmed) {
      updateStudentName(studentId, trimmed);
      showNotification(`Nombre actualizado a "${trimmed}".`, 'success');
    }
    setEditingStudentId(null);
    setEditingStudentName('');
  };

  const handleCellClick = (student: Student, subjectName: string, week: number, taskId: TaskCategory) => {
    const currentProgress = pendingChanges[student.id] || student.progress || getInitialProgress();
    const subjectData = currentProgress[subjectName] || {};
    const weekData = subjectData[week] || { weekNumber: week, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
    const currentStatus = weekData.tasks?.[taskId] || null;

    let nextStatus: TaskStatus = null;
    if (currentStatus === null) nextStatus = 'cumplido';
    else if (currentStatus === 'cumplido') nextStatus = 'pendiente';
    else if (currentStatus === 'pendiente') nextStatus = 'no_cumplido';
    else if (currentStatus === 'no_cumplido') nextStatus = null;

    const nextProgress: ProgressData = {
      ...currentProgress,
      [subjectName]: {
        ...subjectData,
        [week]: {
          ...weekData,
          tasks: {
            ...weekData.tasks,
            [taskId]: nextStatus
          }
        }
      }
    };

    setPendingChanges(prev => ({
      ...prev,
      [student.id]: nextProgress
    }));
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    setIsSaving(true);
    const success = await batchUpdateStudentProgress(pendingChanges);
    if (success) {
      setPendingChanges({});
      showNotification('Cambios guardados correctamente.', 'success');
    } else {
      showNotification('Error al guardar los cambios.', 'error');
    }
    setIsSaving(false);
  };

  const scrollToSubject = (subjectName: string) => {
    const el = document.getElementById(`subject-header-${subjectName}`);
    if (el && tableContainerRef.current) {
      // The sticky column is 350px wide. Scroll exactly to the start of the subject minus the sticky width.
      tableContainerRef.current.scrollTo({
        left: el.offsetLeft - 350,
        behavior: 'smooth'
      });
    }
  };

  const processImportData = (rows: any[], targetSubject: string, defaultWeek?: number) => {
    if (!selectedLevelId) {
      showNotification('Selecciona un nivel antes de importar datos.', 'error');
      return 0;
    }

    let loadedCount = 0;
    const allStudentsInLevel = students.filter(s => s.levelId === selectedLevelId);

    rows.forEach(row => {
      const normalizedRow: any = {};
      for (const key in row) {
        const cleanKey = key.toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        normalizedRow[cleanKey] = row[key];
        normalizedRow[key.toString().toLowerCase().trim()] = row[key];
      }

      const rowSubject = normalizedRow['asignatura'] || normalizedRow['materia'];
      if (rowSubject && String(rowSubject).toLowerCase().trim() !== targetSubject.toLowerCase()) return;

      const nameRaw = normalizedRow['nombre'] || normalizedRow['estudiante'] || normalizedRow['alumno'] || normalizedRow['name'];
      if (!nameRaw) return;

      const nameString = String(nameRaw).trim().toLowerCase();
      let student = allStudentsInLevel.find(s => s.name.toLowerCase() === nameString);

      let targetProgress = student ? { ...student.progress } : getInitialProgress();

      const week = parseInt(normalizedRow['semana'] || normalizedRow['week']) || defaultWeek;
      if (week && WEEKS.includes(week)) {
        if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
        targetProgress[targetSubject][week] = {
          weekNumber: week,
          tasks: { ...(targetProgress[targetSubject][week]?.tasks || { investiga: null, aplica: null, quiz: null, a321: null }) }
        };

        const parseStatus = (val: any): TaskStatus | undefined => {
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

        if (student) {
          updateStudentProgress(student.id, targetProgress);
        } else {
          addStudent(String(nameRaw).trim(), selectedLevelId, targetProgress);
        }
        loadedCount++;
      }
    });

    return loadedCount;
  };

  const handlePasteProcess = () => {
    if (!pasteText.trim()) return;

    const lines = pasteText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      showNotification('Pega al menos dos filas (incluyendo encabezados).', 'error');
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
    const loadedCount = processImportData(json, pasteTargetSubject, defaultWeek);

    if (loadedCount > 0) {
      showNotification(`Se importaron exitosamente ${loadedCount} registros para ${pasteTargetSubject}.`, 'success');
      setPasteModalOpen(false);
      setPasteText('');
      setPasteWeek('');
    } else {
      showNotification('No se encontraron registros válidos coincidentes.', 'error');
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>, targetSubject: string) => {
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
          totalLoaded += processImportData(json, targetSubject, sheetWeek);
        }

        if (totalLoaded > 0) {
          showNotification(`Archivo Excel procesado: ${totalLoaded} registros cargados para ${targetSubject}.`, 'success');
        } else {
          showNotification('No se encontraron registros válidos en el archivo Excel.', 'error');
        }
      } catch (error) {
        showNotification('Error al leer el archivo Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-[#144C8A] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-300 font-medium">Cargando Sistema Académico...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md ${
            notification.type === 'success' 
              ? 'bg-green-50/95 border-green-200 text-green-900' 
              : 'bg-red-50/95 border-red-200 text-red-900'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span className="text-sm font-semibold">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header - Replaces Sidebar */}
      <header className="bg-slate-900 text-white shadow-md z-30 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#144C8A] p-2.5 rounded-xl shadow-md flex items-center justify-center">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Mavir School</h1>
            <p className="text-xs text-slate-400 font-medium">Sistema de Seguimiento Horizontal</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Level Selector */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1.5 border border-slate-700">
            <span className="text-xs font-semibold text-slate-400 pl-2">Nivel:</span>
            {levels.length > 0 ? (
              <select
                value={selectedLevelId || ''}
                onChange={(e) => setSelectedLevelId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-md text-sm font-semibold text-white py-1 px-3 focus:ring-2 focus:ring-[#144C8A] outline-none min-w-[150px]"
              >
                {levels.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-slate-500 px-3 italic">Sin niveles</span>
            )}
            
            {/* Delete current level */}
            {selectedLevelId && (
              <button
                onClick={async () => {
                  if (window.confirm(`¿Eliminar nivel "${currentLevel?.name}" y todos sus alumnos?`)) {
                    const success = await deleteLevel(selectedLevelId);
                    if (success) {
                      setSelectedLevelId(null);
                      showNotification(`Nivel "${currentLevel?.name}" eliminado correctamente.`, 'success');
                    } else {
                      showNotification(`Error al eliminar el nivel.`, 'error');
                    }
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-700 transition-colors"
                title="Eliminar nivel actual"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Add New Level */}
          <form onSubmit={handleAddLevel} className="flex items-center gap-2">
            <input
              type="text"
              value={newLevelName}
              onChange={(e) => setNewLevelName(e.target.value)}
              placeholder="Crear nuevo nivel..."
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#144C8A] outline-none w-48"
            />
            <button
              type="submit"
              disabled={!newLevelName.trim()}
              className="bg-[#144C8A] hover:bg-[#0f3d70] disabled:opacity-50 text-white p-1.5 rounded-lg transition-colors"
              title="Crear Nivel"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          {/* User & Logout */}
          <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
            <button
              onClick={() => auth.signOut()}
              className="flex items-center gap-2 text-slate-300 hover:text-red-400 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0">
        
        {/* Secondary Control Bar (Weeks, Filters, Subjects Jump, Import) */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Week Range Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <span className="text-xs font-bold text-slate-500 uppercase px-1.5">Semanas:</span>
              <select
                value={startWeek}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setStartWeek(val);
                  if (val > endWeek) setEndWeek(val);
                }}
                className="bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 py-1 px-2 focus:ring-1 focus:ring-[#144C8A] outline-none"
              >
                {WEEKS.map(w => <option key={w} value={w}>S{w}</option>)}
              </select>
              <span className="text-xs text-slate-400 font-bold">a</span>
              <select
                value={endWeek}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setEndWeek(val);
                  if (val < startWeek) setStartWeek(val);
                }}
                className="bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 py-1 px-2 focus:ring-1 focus:ring-[#144C8A] outline-none"
              >
                {WEEKS.map(w => <option key={w} value={w}>S{w}</option>)}
              </select>
            </div>

            {/* Quick jump to subjects */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-2">Ir a:</span>
              {SUBJECT_CONFIGS.map(subj => (
                <button
                  key={subj.name}
                  onClick={() => scrollToSubject(subj.name)}
                  className={`text-[0.65rem] font-bold px-2 py-1 rounded transition-all border ${subj.color.bg} ${subj.color.text} ${subj.color.border} hover:opacity-80 active:scale-95`}
                >
                  {subj.shortName}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar alumno..."
                className="pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-1 focus:ring-[#144C8A] focus:bg-white outline-none w-48 sm:w-60 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Import / Paste Button */}
            <button
              onClick={() => setPasteModalOpen(true)}
              className="flex items-center gap-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all active:scale-95"
            >
              <ClipboardPaste className="w-4 h-4" />
              Importar / Pegar
            </button>
          </div>
        </div>

        {/* Matrix Area */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col bg-slate-100">
          {!selectedLevelId ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto my-auto">
              <div className="bg-[#144C8A]/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#144C8A]">
                <School className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Ningún Nivel Seleccionado</h2>
              <p className="text-sm text-slate-500 mb-6">
                Selecciona un nivel en la barra superior o crea uno nuevo para comenzar.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden relative">
              {/* Add Student Bar (Sticky Top below the header inside the table) */}
              <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center gap-4 sticky left-0 z-40">
                <form onSubmit={handleAddStudentInline} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newStudentInlineName}
                    onChange={(e) => setNewStudentInlineName(e.target.value)}
                    placeholder="Agregar nuevo alumno (Nombre y Apellido)..."
                    className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#144C8A] outline-none w-64 md:w-80"
                  />
                  <button
                    type="submit"
                    disabled={!newStudentInlineName.trim()}
                    className="flex items-center gap-1.5 bg-[#144C8A] hover:bg-[#0f3d70] disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar
                  </button>
                </form>
                <div className="text-xs text-slate-500 font-medium">
                  {currentStudents.length} alumnos registrados en este nivel
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-auto flex-1 relative" ref={tableContainerRef}>
                <table className="w-full text-left align-middle border-collapse min-w-max relative z-0">
                  <thead>
                    {/* Row 1: Subjects Header */}
                    <tr className="bg-slate-800 text-white select-none">
                      {/* Sticky Student Header Corner */}
                      <th 
                        rowSpan={3} 
                        className="py-3 px-4 font-bold text-sm uppercase tracking-wider border-r-2 border-slate-600 sticky left-0 top-0 z-30 bg-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.15)] min-w-[320px] max-w-[350px]"
                      >
                        Estudiante y Opciones de Reporte
                      </th>

                      {SUBJECT_CONFIGS.map(subject => {
                        let totalCols = 0;
                        activeWeeks.forEach(w => {
                          totalCols += getTasksForSubjectAndWeek(subject.name, w).length;
                        });

                        return (
                          <th
                            key={subject.name}
                            id={`subject-header-${subject.name}`}
                            colSpan={totalCols}
                            className="py-2.5 px-3 text-center font-bold text-xs uppercase tracking-wider border-r-2 border-slate-700 sticky top-0 z-20"
                            style={{ backgroundColor: subject.color.accent }}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span>{subject.name}</span>
                              <span className="text-[0.65rem] bg-black/20 px-1.5 py-0.5 rounded font-bold">
                                Semanas {startWeek}-{endWeek}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>

                    {/* Row 2: Weeks Header */}
                    <tr className="bg-slate-700 text-slate-200 select-none">
                      {SUBJECT_CONFIGS.map(subject => (
                        <React.Fragment key={`weeks-${subject.name}`}>
                          {activeWeeks.map(week => {
                            const tasks = getTasksForSubjectAndWeek(subject.name, week);
                            return (
                              <th
                                key={`subj-${subject.name}-w-${week}`}
                                colSpan={tasks.length}
                                className="py-1.5 px-1 text-center font-bold text-[0.7rem] uppercase tracking-wider border-r border-slate-600 last:border-r-2 sticky top-[41px] z-20 bg-slate-700"
                              >
                                Semana {week}
                              </th>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tr>

                    {/* Row 3: Task Categories Header (I, A, Q, 321) */}
                    <tr className="bg-slate-100 text-slate-700 border-b-2 border-slate-300 select-none">
                      {SUBJECT_CONFIGS.map(subject => (
                        <React.Fragment key={`tasks-${subject.name}`}>
                          {activeWeeks.map(week => {
                            const tasks = getTasksForSubjectAndWeek(subject.name, week);
                            return (
                              <React.Fragment key={`subj-${subject.name}-w-${week}-tasks`}>
                                {tasks.map((cat, catIdx) => {
                                  const isLastCatInWeek = catIdx === tasks.length - 1;
                                  return (
                                    <th
                                      key={`${subject.name}-${week}-${cat.id}`}
                                      className={`py-1.5 px-0.5 text-center text-[0.65rem] font-extrabold uppercase text-slate-700 border-r ${
                                        isLastCatInWeek ? 'border-r-2 border-slate-400' : 'border-slate-300'
                                      } w-8 min-w-[32px] max-w-[32px] sticky top-[69px] z-20 bg-slate-100`}
                                      title={`${subject.name} - Semana ${week} - ${cat.fullName}`}
                                    >
                                      {cat.label}
                                    </th>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>

                  {/* Body: Students as Rows */}
                  <tbody className="divide-y divide-slate-200">
                    {currentStudents.length === 0 ? (
                      <tr>
                        <td colSpan={100} className="p-8 text-center text-slate-500 italic bg-white sticky left-0">
                          Agrega estudiantes para comenzar a calificar.
                        </td>
                      </tr>
                    ) : (
                      currentStudents.map((student, studentIdx) => {
                        const stats = getStudentStats(student);
                        const effectiveProgress = pendingChanges[student.id] || student.progress || {};
                        const isEven = studentIdx % 2 === 0;
                        const isFocused = focusedStudentId === student.id;
                        const rowBg = isFocused ? 'bg-blue-100' : (isEven ? 'bg-white' : 'bg-slate-50/70');

                        return (
                          <tr
                            key={student.id}
                            className={`${rowBg} ${!isFocused && 'hover:bg-blue-50/60'} transition-colors group h-[42px]`}
                          >
                            {/* Sticky Left Column: Student Name & Report Button */}
                            <td
                              onClick={() => setFocusedStudentId(isFocused ? null : student.id)}
                              className={`py-1.5 px-3 border-r-2 ${isFocused ? 'border-r-[#144C8A]' : 'border-slate-300'} sticky left-0 z-10 ${rowBg} ${!isFocused && 'group-hover:bg-blue-50/95'} transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.06)] min-w-[320px] max-w-[350px] cursor-pointer`}
                            >
                              <div className="flex items-center justify-between gap-3 h-full">
                                {/* Index & Name */}
                                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                  <span className="text-[0.7rem] font-bold text-slate-400 w-5 text-right flex-shrink-0">
                                    {studentIdx + 1}.
                                  </span>

                                  {editingStudentId === student.id ? (
                                    <div className="flex items-center gap-1 flex-1">
                                      <input
                                        type="text"
                                        value={editingStudentName}
                                        onChange={(e) => setEditingStudentName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveRename(student.id);
                                          if (e.key === 'Escape') setEditingStudentId(null);
                                        }}
                                        className="text-xs py-1 px-2 border border-[#144C8A] rounded bg-white w-full outline-none font-semibold text-slate-800"
                                        autoFocus
                                      />
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSaveRename(student.id); }}
                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span 
                                        className="text-[0.8rem] font-bold text-slate-800 truncate cursor-text"
                                        onDoubleClick={(e) => {
                                          e.stopPropagation();
                                          setEditingStudentId(student.id);
                                          setEditingStudentName(student.name);
                                        }}
                                        title={`${student.name} (Doble clic para editar)`}
                                      >
                                        {student.name}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Right Side Actions: Progress, Report, Delete */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span
                                    className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full ${
                                      stats.percentage >= 90
                                        ? 'bg-green-100 text-green-800 border border-green-200'
                                        : stats.percentage >= 75
                                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                        : stats.percentage > 0
                                        ? 'bg-red-100 text-red-800 border border-red-200'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                    }`}
                                    title={`${stats.completed} de ${stats.evaluated} tareas cumplidas`}
                                  >
                                    {stats.percentage}%
                                  </span>

                                  {/* THE REPORT BUTTON - Explicitly clear and large */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setReportStudent(student); }}
                                    className="flex items-center gap-1.5 bg-[#144C8A] hover:bg-[#0f3d70] text-white px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm active:scale-95"
                                    title={`Generar reporte automático para ${student.name}`}
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Reporte</span>
                                  </button>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); setStudentToDelete(student); }}
                                    className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-50"
                                    title="Eliminar estudiante"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Data Cells: Subjects x Weeks x Tasks */}
                            {SUBJECT_CONFIGS.map(subject => (
                              <React.Fragment key={`row-${student.id}-${subject.name}`}>
                                {activeWeeks.map(week => {
                                  const tasks = getTasksForSubjectAndWeek(subject.name, week);

                                  return (
                                    <React.Fragment key={`row-${student.id}-${subject.name}-w-${week}`}>
                                      {tasks.map((cat, catIdx) => {
                                        const status = effectiveProgress[subject.name]?.[week]?.tasks?.[cat.id] || null;
                                        const isLastCatInWeek = catIdx === tasks.length - 1;

                                        let cellBg = 'bg-transparent hover:bg-slate-200/80';
                                        let statusLabel = 'Sin calificar';
                                        let textColor = 'text-transparent';
                                        let icon = '';

                                        if (status === 'cumplido') {
                                          cellBg = 'bg-green-500 hover:bg-green-600';
                                          statusLabel = 'Cumplido';
                                          textColor = 'text-white';
                                          icon = '✓';
                                        } else if (status === 'pendiente') {
                                          cellBg = 'bg-yellow-400 hover:bg-yellow-500';
                                          statusLabel = 'Pendiente';
                                          textColor = 'text-yellow-900';
                                          icon = '•';
                                        } else if (status === 'no_cumplido') {
                                          cellBg = 'bg-red-500 hover:bg-red-600';
                                          statusLabel = 'No cumplido';
                                          textColor = 'text-white';
                                          icon = '✕';
                                        }

                                        return (
                                          <td
                                            key={`cell-${student.id}-${subject.name}-${week}-${cat.id}`}
                                            className={`p-0 align-middle border-r border-b ${
                                              isLastCatInWeek ? 'border-r-2 border-r-slate-400' : 'border-r-slate-200'
                                            } border-b-slate-100 ${cellBg} transition-colors cursor-pointer select-none`}
                                            onClick={() => handleCellClick(student, subject.name, week, cat.id)}
                                            title={`${student.name} | ${subject.name} (S${week}) | ${cat.fullName}: ${statusLabel}`}
                                          >
                                            <div className={`w-full h-full min-h-[42px] flex items-center justify-center text-[0.8rem] font-bold ${textColor}`}>
                                              {icon}
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </React.Fragment>
                                  );
                                })}
                              </React.Fragment>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Quick Legend */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs z-30 relative">
                <div className="flex items-center gap-5">
                  <span className="font-bold text-slate-500 uppercase text-[0.65rem] tracking-wider">Clic en casillas para calificar:</span>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-green-500 flex items-center justify-center text-white font-bold text-[0.65rem] shadow-sm">✓</span>
                    <span className="font-semibold text-slate-700">Cumplido</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-yellow-400 flex items-center justify-center text-yellow-900 font-bold text-[0.65rem] shadow-sm">•</span>
                    <span className="font-semibold text-slate-700">Pendiente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-red-500 flex items-center justify-center text-white font-bold text-[0.65rem] shadow-sm">✕</span>
                    <span className="font-semibold text-slate-700">No Cumplido</span>
                  </div>
                </div>

                <div className="text-slate-500 text-xs font-medium">
                  Los cambios se guardan automáticamente en la nube.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">¿Eliminar a {studentToDelete.name}?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Esta acción eliminará al estudiante y todo su historial de calificaciones permanentemente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteStudent(studentToDelete.id);
                  setStudentToDelete(null);
                  showNotification(`Estudiante eliminado.`, 'success');
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportStudent && (
        <ReportModal
          studentName={reportStudent.name}
          levelName={currentLevel?.name}
          data={Object.keys(reportStudent.progress || {}).reduce((acc, subject) => {
            acc[subject] = Object.keys(reportStudent.progress?.[subject] || {}).reduce((weekAcc, weekStr) => {
              const week = parseInt(weekStr);
              if (week >= startWeek && week <= endWeek) {
                weekAcc[week] = reportStudent.progress?.[subject]?.[week];
              }
              return weekAcc;
            }, {} as any);
            return acc;
          }, {} as ProgressData)}
          onClose={() => setReportStudent(null)}
        />
      )}

      {/* Import / Paste Modal */}
      {pasteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-[#144C8A]" />
                Importar Notas desde Excel
              </h2>
              <button
                onClick={() => {
                  setPasteModalOpen(false);
                  setPasteText('');
                  setPasteWeek('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-900">
                <p className="font-bold mb-2">Instrucciones rápidas:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Copia las celdas (incluyendo encabezados: Nombre, Semana, Investiga, Aplica, Quiz, 321).</li>
                  <li>Pega el contenido en la caja de abajo.</li>
                  <li>Los valores "10", "X", "Sí", "Cumplido" se marcarán como ✓ Cumplido.</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Materia Destino:</label>
                  <select
                    value={pasteTargetSubject}
                    onChange={(e) => setPasteTargetSubject(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-[#144C8A] outline-none"
                  >
                    {SUBJECT_CONFIGS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Semana (Opcional):</label>
                  <select
                    value={pasteWeek}
                    onChange={(e) => setPasteWeek(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-[#144C8A] outline-none"
                  >
                    <option value="">Detectar desde la columna "Semana"</option>
                    {WEEKS.map(w => <option key={w} value={w}>Semana {w}</option>)}
                  </select>
                </div>
              </div>

              <textarea
                className="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-[#144C8A] outline-none resize-y min-h-[140px]"
                placeholder="Nombre\tSemana\tInvestiga\tAplica..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />

              <div className="pt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[#144C8A] hover:underline">
                  <Upload className="w-4 h-4" />
                  Subir archivo .XLSX
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      handleExcelUpload(e, pasteTargetSubject);
                      setPasteModalOpen(false);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setPasteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasteProcess}
                className="px-4 py-2 text-sm font-medium text-white bg-[#144C8A] rounded-lg"
              >
                Procesar Notas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Button */}
      {Object.keys(pendingChanges).length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-lg font-bold transition-all hover:shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Save className={`w-5 h-5 ${isSaving ? 'animate-pulse' : ''}`} />
            {isSaving ? 'Guardando...' : `Guardar ${Object.keys(pendingChanges).length} cambios`}
          </button>
        </div>
      )}
    </div>
  );
}
