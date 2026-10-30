import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  User, FileSpreadsheet, Save, Users,
  Upload, Search, CheckCircle, AlertCircle, X,
  LogOut, Plus, School, Filter,
  ArrowRight, Check, Award, BarChart2, Download, Trash2, Edit2,
  Layers, Settings2, AlertTriangle, GraduationCap, Edit3, Loader2, Sparkles, LayoutGrid
} from 'lucide-react';
import { TaskCategory, TaskStatus, ProgressData } from './types';
import { ReportModal } from './components/ReportModal';
import { BottomExcelPanel } from './components/BottomExcelPanel';
import { AuthScreen } from './components/AuthScreen';
import { TeacherProfileDropdown } from './components/TeacherProfileDropdown';
import { TeacherDashboard } from './components/TeacherDashboard';
import { useAuth } from './hooks/useAuth';
import { useFirebaseData, Student, Level } from './hooks/useFirebaseData';
import { LevelManagerModal } from './components/LevelManagerModal';
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
  const { levels, students, addLevel, updateLevelName, deleteLevel, 
    addStudent, 
    updateStudentProgress, 
    batchUpdateStudentProgress,
    updateStudentName,
    deleteStudent 
  } = useFirebaseData(user?.uid);

  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matrix' | 'dashboard'>('matrix');
  const [isLevelManagerOpen, setIsLevelManagerOpen] = useState(false);
  const [levelToDelete, setLevelToDelete] = useState<Level | null>(null);
  const [isDeletingLevel, setIsDeletingLevel] = useState(false);
  const [emptyStateLevelName, setEmptyStateLevelName] = useState('');
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
  const [excelViewerSubject, setExcelViewerSubject] = useState<string | null>(null);
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);

  // Modals & Notifications
  const [reportStudent, setReportStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (levels.length > 0) {
      const exists = levels.some(l => l.id === selectedLevelId);
      if (!selectedLevelId || !exists) {
        setSelectedLevelId(levels[0].id);
      }
    } else {
      if (selectedLevelId) {
        setSelectedLevelId(null);
      }
      setActiveTab('dashboard');
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

  const handleAddLevel = async (e?: React.FormEvent, customName?: string): Promise<string | undefined> => {
    if (e) e.preventDefault();
    const nameToUse = (customName !== undefined ? customName : newLevelName).trim();
    if (!nameToUse) {
      showNotification('Ingresa un nombre para el nivel.', 'error');
      return undefined;
    }
    if (nameToUse.length > 100) {
      showNotification('El nombre no puede superar los 100 caracteres.', 'error');
      return undefined;
    }

    const alreadyExists = levels.some(
      l => l.name.toLowerCase().trim() === nameToUse.toLowerCase()
    );
    if (alreadyExists) {
      showNotification(`Ya existe un nivel llamado "${nameToUse}". Por favor elige otro nombre.`, 'error');
      return undefined;
    }

    try {
      const newLevelId = await addLevel(nameToUse);
      setNewLevelName('');
      setEmptyStateLevelName('');
      if (newLevelId) {
        setSelectedLevelId(newLevelId);
        showNotification(`Nivel "${nameToUse}" creado e ingresado exitosamente.`, 'success');
      }
      return newLevelId;
    } catch (err) {
      console.error(err);
      showNotification('Error al crear el nivel.', 'error');
      return undefined;
    }
  };

  const handleConfirmDeleteLevel = async (levelOrId: Level | string): Promise<boolean> => {
    const targetId = typeof levelOrId === 'string' ? levelOrId : levelOrId.id;
    const targetLevel = levels.find(l => l.id === targetId) || (typeof levelOrId === 'object' ? levelOrId : null);
    const targetName = targetLevel?.name || 'Nivel';
    setIsDeletingLevel(true);
    try {
      const studentsInLevel = students.filter(s => s.levelId === targetId);
      if (studentsInLevel.length > 0) {
        setPendingChanges(prev => {
          const next = { ...prev };
          studentsInLevel.forEach(st => {
            delete next[st.id];
          });
          return next;
        });
      }

      const remaining = levels.filter(l => l.id !== targetId);
      if (selectedLevelId === targetId) {
        setSelectedLevelId(remaining.length > 0 ? remaining[0].id : null);
      }

      const ok = await deleteLevel(targetId);
      if (ok) {
        showNotification(`Nivel "${targetName}" y sus registros eliminados correctamente.`, 'success');
        setLevelToDelete(null);
        return true;
      } else {
        showNotification('Error al eliminar el nivel.', 'error');
        return false;
      }
    } catch (err) {
      console.error(err);
      showNotification('Error al eliminar el nivel.', 'error');
      return false;
    } finally {
      setIsDeletingLevel(false);
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

  const getStatusFromInput = (val: string): TaskStatus => {
    const s = val.trim().toLowerCase();
    if (['10', 'cumplido', 'c', '1', 'x'].includes(s)) return 'cumplido';
    if (['0', 'no_cumplido', 'n', 'falta'].includes(s)) return 'no_cumplido';
    if (['p', 'pendiente'].includes(s)) return 'pendiente';
    return null;
  };

  const handleCellChange = (student: Student, subjectName: string, week: number, taskId: TaskCategory, value: string) => {
    const currentProgress = pendingChanges[student.id] || student.progress || getInitialProgress();
    const subjectData = currentProgress[subjectName] || {};
    const weekData = subjectData[week] || { weekNumber: week, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
    const nextStatus = getStatusFromInput(value);

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

  const handleCellPaste = (e: React.ClipboardEvent<HTMLInputElement>, startStudentIdx: number, subjectName: string, week: number, taskId: TaskCategory) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    if (!text) return;

    // Split into rows and then into columns (TSV format from Excel/Google Sheets)
    const rows = text.split(/\r?\n/).filter(r => r.trim() !== '' || r.includes('\t'));
    if (rows.length === 0) return;

    // Build a flat list of all visible columns to navigate horizontally
    const allColumns: { subject: string, week: number, taskId: TaskCategory }[] = [];
    SUBJECT_CONFIGS.forEach(subject => {
      activeWeeks.forEach(w => {
        const tasks = getTasksForSubjectAndWeek(subject.name, w);
        tasks.forEach(cat => {
          allColumns.push({ subject: subject.name, week: w, taskId: cat.id });
        });
      });
    });

    const startColIdx = allColumns.findIndex(c => c.subject === subjectName && c.week === week && c.taskId === taskId);
    if (startColIdx === -1) return;

    setPendingChanges(prev => {
      const nextChanges = { ...prev };
      for (let r = 0; r < rows.length; r++) {
        const student = currentStudents[startStudentIdx + r];
        if (!student) break; // Out of bounds for students
        
        const cols = rows[r].split('\t');
        let currentProgress = nextChanges[student.id] || student.progress || getInitialProgress();
        
        for (let c = 0; c < cols.length; c++) {
          const colDef = allColumns[startColIdx + c];
          if (!colDef) break; // Out of bounds for columns

          const val = cols[c].trim();
          if (val === '') continue; // Skip empty pastes to avoid erasing data unintentionally

          const nextStatus = getStatusFromInput(val);
          const subjectData = currentProgress[colDef.subject] || {};
          const weekData = subjectData[colDef.week] || { weekNumber: colDef.week, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
          
          currentProgress = {
            ...currentProgress,
            [colDef.subject]: {
              ...subjectData,
              [colDef.week]: {
                ...weekData,
                tasks: {
                  ...weekData.tasks,
                  [colDef.taskId]: nextStatus
                }
              }
            }
          };
        }
        nextChanges[student.id] = currentProgress;
      }
      return nextChanges;
    });
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, subjectName: string, week: number, taskId: TaskCategory) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      
      const allColumns: { subject: string, week: number, taskId: TaskCategory }[] = [];
      SUBJECT_CONFIGS.forEach(subject => {
        activeWeeks.forEach(w => {
          const tasks = getTasksForSubjectAndWeek(subject.name, w);
          tasks.forEach(cat => {
            allColumns.push({ subject: subject.name, week: w, taskId: cat.id });
          });
        });
      });

      const startColIdx = allColumns.findIndex(c => c.subject === subjectName && c.week === week && c.taskId === taskId);
      if (startColIdx === -1) return;

      let nextRow = rowIdx;
      let nextCol = startColIdx;

      if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIdx - 1);
      if (e.key === 'ArrowDown') nextRow = Math.min(currentStudents.length - 1, rowIdx + 1);
      if (e.key === 'ArrowLeft') nextCol = Math.max(0, startColIdx - 1);
      if (e.key === 'ArrowRight') nextCol = Math.min(allColumns.length - 1, startColIdx + 1);

      if (nextRow !== rowIdx || nextCol !== startColIdx) {
        const nextStudent = currentStudents[nextRow];
        const nextColDef = allColumns[nextCol];
        if (nextStudent && nextColDef) {
          const nextId = `input-${nextStudent.id}-${nextColDef.subject}-${nextColDef.week}-${nextColDef.taskId}`;
          const el = document.getElementById(nextId);
          if (el) el.focus();
        }
      }
    }
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
      // The sticky column is 280px wide. Scroll exactly to the start of the subject minus the sticky width.
      tableContainerRef.current.scrollTo({
        left: Math.max(0, el.offsetLeft - 280),
        behavior: 'smooth'
      });
    }
  };

  // Helper to detect task category across all writing styles (especially Actividad 321 in Humanísticas)
  const detectTaskCategory = (headerStr: string): TaskCategory | null => {
    const clean = headerStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // 1. Actividad 321 (MUST BE CHECKED FIRST so 'actividad' or 'a' does not hijack it)
    // Supports: 321, 3.2.1, 3-2-1, 3 2 1, 3,2,1, a321, r321, rutina 321, etc.
    if (/(?:3[\s.\-_,]*2[\s.\-_,]*1|\ba321\b|\br321\b|rutina[\s._-]*3)/i.test(clean)) {
      return 'a321';
    }

    // 2. Investigación (I)
    // Supports: investiga, investigacion, inv, consulta, indaga, lectura, i
    if (
      clean.includes('investiga') ||
      clean.includes('inv') ||
      clean.includes('consulta') ||
      clean.includes('indaga') ||
      clean.includes('lectura') ||
      /\b(?:i|inv)\b/i.test(clean)
    ) {
      return 'investiga';
    }

    // 3. Quiz (Q)
    // Supports: quiz, prueba, leccion, evaluacion, cuestionario, examen, control, q
    if (
      clean.includes('quiz') ||
      clean.includes('prueba') ||
      clean.includes('leccion') ||
      clean.includes('evalua') ||
      clean.includes('cuestionario') ||
      clean.includes('examen') ||
      clean.includes('control') ||
      /\bq\b/i.test(clean)
    ) {
      return 'quiz';
    }

    // 4. Aplicación (A)
    // Supports: aplica, aplicacion, actividad, taller, tarea, deber, feedback, trabajo, ensayo, redaccion, comprension, a
    if (
      clean.includes('aplica') ||
      clean.includes('actividad') ||
      clean.includes('feedback') ||
      clean.includes('taller') ||
      clean.includes('tarea') ||
      clean.includes('deber') ||
      clean.includes('trabajo') ||
      clean.includes('ensayo') ||
      clean.includes('redaccion') ||
      clean.includes('comprension') ||
      clean.includes('practica') ||
      /\ba\b/i.test(clean)
    ) {
      return 'aplica';
    }

    return null;
  };

  const parseTaskStatus = (val: any, taskCat?: TaskCategory): TaskStatus | undefined => {
    if (val === undefined || val === null || String(val).trim() === '') return undefined;
    const s = String(val).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Check non-completion explicitly (including qualitative scales: NAR, I, NC, NE)
    if ([
      'no_cumplido', 'no cumplido', 'no', 'falta', 'false', '0', 'n', '❌', '✖', '✖️',
      'np', 'ne', 'nc', 'nar', 'no entrego', 'no entrega', 'no presento', 'no presenta',
      'sin entregar', 's/e', 'incompleto', 'reprobado'
    ].includes(s)) {
      return 'no_cumplido';
    }

    // Check pending explicitly (including qualitative scales: PAR, EP, PA, P)
    if ([
      'pendiente', 'proceso', 'in progress', 'pending', 'p', 'par', 'ep', 'pa', '-', '/',
      'en revision', 'revisar', 'recuperacion'
    ].includes(s)) {
      return 'pendiente';
    }

    // Check completed explicitly (including qualitative scales: DAR, AAR, D, A, C)
    if ([
      'cumplido', 'si', 'yes', 'completado', 'done', 'true', '1', '10', 'ok',
      '✓', '✔', '✅', '✔️', 'entregado', 'c', 'aprobado', 'x', 'dar', 'aar', 'd', 'a'
    ].includes(s)) {
      return 'cumplido';
    }

    // Check numeric grade (e.g. 10, 9.5, 8, 7, 0)
    const parsed = parseFloat(s.replace(',', '.'));
    if (!isNaN(parsed)) {
      // If task is Actividad 321 and scored on 1-3 scale
      if (taskCat === 'a321' && parsed <= 3) {
        if (parsed >= 2) return 'cumplido';
        if (parsed >= 1) return 'pendiente';
        if (parsed <= 0) return 'no_cumplido';
      }
      if (parsed >= 7 || parsed === 1) return 'cumplido';
      if (parsed > 0 && parsed < 7) return 'pendiente';
      if (parsed <= 0) return 'no_cumplido';
    }

    return 'cumplido';
  };

  const cleanNameTokens = (name: string): string[] => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^\d+[\s._\-)\]]+/g, '') // remove leading sequence numbers "01. "
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(p => p.length >= 2);
  };

  const findStudentNameInRow = (row: any): string | undefined => {
    // 1. Direct key match
    for (const key of Object.keys(row)) {
      const clean = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (
        clean === 'nombre' || clean === 'nombres' ||
        clean === 'estudiante' || clean === 'estudiantes' ||
        clean === 'alumno' || clean === 'alumnos' ||
        clean === 'nomina' || clean === 'name' || clean === 'student' ||
        clean === 'apellidos y nombres' || clean === 'nombres y apellidos' ||
        clean === 'apellidos'
      ) {
        if (row[key] && String(row[key]).trim() !== '') {
          return String(row[key]).trim();
        }
      }
    }

    // 2. Substring in composite keys (e.g. "Nómina de Estudiantes")
    for (const key of Object.keys(row)) {
      const clean = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (clean.includes('docente') || clean.includes('profesor') || clean.includes('materia') || clean.includes('asignatura')) {
        continue;
      }
      if (
        clean.includes('nomina') || clean.includes('estudiante') ||
        clean.includes('alumno') || clean.includes('apellidos') ||
        clean.includes('nombres') || clean.includes('nombre')
      ) {
        if (row[key] && String(row[key]).trim() !== '') {
          return String(row[key]).trim();
        }
      }
    }

    // 3. Fallback heuristic: find first cell containing a personal name format
    for (const key of Object.keys(row)) {
      const val = row[key];
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.length > 3 && !/^\d+$/.test(trimmed) && !/semana|week|promedio|total/i.test(trimmed)) {
          const words = trimmed.split(/\s+/);
          if (words.length >= 2 && !words.some(w => /^(nota|tarea|quiz|inv|apl|sem|\d+)$/i.test(w))) {
            return trimmed;
          }
        }
      }
    }

    return undefined;
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

      // Check subject if specified in the row, with full Humanísticas tolerance
      const rowSubject = normalizedRow['asignatura'] || normalizedRow['materia'];
      if (rowSubject) {
        const cleanRowSubj = String(rowSubject).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const cleanTarget = targetSubject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

        const isHumanMatch = cleanTarget.includes('human') && (
          cleanRowSubj.includes('human') ||
          cleanRowSubj.includes('social') ||
          cleanRowSubj.includes('lengua') ||
          cleanRowSubj.includes('literatura') ||
          cleanRowSubj.includes('historia') ||
          cleanRowSubj.includes('filosof') ||
          cleanRowSubj.includes('ciudadan')
        );

        if (!isHumanMatch && cleanRowSubj !== cleanTarget && !cleanRowSubj.includes(cleanTarget) && !cleanTarget.includes(cleanRowSubj)) {
          // Only skip if row explicitly specifies a completely different recognized subject
          const otherKnown = ['matematica', 'ingles', 'tecnologia', 'biolog', 'empresar'];
          if (otherKnown.some(k => cleanRowSubj.includes(k))) {
            return;
          }
        }
      }

      const nameRaw = findStudentNameInRow(normalizedRow) || findStudentNameInRow(row);
      if (!nameRaw) return;

      const rawTokens = cleanNameTokens(nameRaw);
      if (rawTokens.length === 0) return;

      // Smart match student in current level
      let student = allStudentsInLevel.find(s => {
        const sTokens = cleanNameTokens(s.name);
        if (sTokens.length === 0) return false;

        let matchCount = 0;
        rawTokens.forEach(rt => {
          if (sTokens.some(st => st === rt || st.includes(rt) || rt.includes(st))) {
            matchCount++;
          }
        });

        const ratio = matchCount / Math.min(rawTokens.length, sTokens.length);
        return matchCount >= 2 || (sTokens.length === 1 && matchCount === 1) || ratio >= 0.65;
      });

      let targetProgress = student ? { ...student.progress } : getInitialProgress();
      let hasUpdates = false;

      const assignTask = (w: number, task: TaskCategory, val: any) => {
        if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
        if (!targetProgress[targetSubject][w]) {
          targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
        }
        const st = parseTaskStatus(val);
        if (st) {
          targetProgress[targetSubject][w].tasks[task] = st;
          hasUpdates = true;
        }
      };

      // 1. Scan for explicitly named week columns in composite headers
      for (const key of Object.keys(normalizedRow)) {
        const val = normalizedRow[key];
        if (val === undefined || val === null || String(val).trim() === '') continue;

        const cleanKey = key.toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (cleanKey.includes('promedio') || cleanKey.includes('total') || cleanKey.includes('prom')) continue;

        const weekMatch = cleanKey.match(/(?:\bsemana\b|\bsem\b|\bweek\b|\bs)[\s_.-]*(\d+)/i);
        if (weekMatch) {
          const w = parseInt(weekMatch[1], 10);
          if (WEEKS.includes(w)) {
            const cat = detectTaskCategory(cleanKey);
            if (cat) {
              assignTask(w, cat, val);
            }
          }
        }
      }

      // 2. Fallback for files where weeks are just tab names
      if (!hasUpdates && defaultWeek && WEEKS.includes(defaultWeek)) {
        const w = defaultWeek;
        if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
        if (!targetProgress[targetSubject][w]) targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };

        for (const key of Object.keys(normalizedRow)) {
          const val = normalizedRow[key];
          if (val === undefined || val === null || String(val).trim() === '') continue;
          const cleanKey = key.toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (cleanKey.includes('promedio') || cleanKey.includes('total') || cleanKey.includes('prom')) continue;

          const cat = detectTaskCategory(cleanKey);
          if (cat) {
            assignTask(w, cat, val);
          }
        }
      }

      if (hasUpdates) {
        if (student) {
          setPendingChanges(prev => ({
            ...prev,
            [student.id]: targetProgress
          }));
        } else {
          addStudent(String(nameRaw).trim(), selectedLevelId, targetProgress);
        }
        loadedCount++;
      }
    });

    return loadedCount;
  };

  const handleAutoFill = (studentId: string, matchedRow: any, fileWeek: string, columns: string[]) => {
    setPendingChanges(prev => {
      const student = currentStudents.find(s => s.id === studentId);
      if (!student) return prev;

      const targetProgress = prev[studentId] ? { ...prev[studentId] } : { ...student.progress };
      let hasUpdates = false;
      const targetSubject = excelViewerSubject || '';
      if (!targetSubject) return prev;

      const assignTask = (w: number, task: TaskCategory, val: any) => {
        if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
        if (!targetProgress[targetSubject][w]) {
          targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
        }
        const st = parseTaskStatus(val);
        if (st) {
          targetProgress[targetSubject][w].tasks[task] = st;
          hasUpdates = true;
        }
      };

      for (const key of Object.keys(matchedRow)) {
        const val = matchedRow[key];
        if (val === undefined || val === null || String(val).trim() === '') continue;
        const cleanKey = key.toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (cleanKey.includes('promedio') || cleanKey.includes('total') || cleanKey.includes('prom')) continue;

        const weekMatch = cleanKey.match(/(?:\bsemana\b|\bsem\b|\bweek\b|\bs)[\s_.-]*(\d+)/i);
        if (weekMatch) {
          const w = parseInt(weekMatch[1], 10);
          if (w >= 1 && w <= 52) {
            const cat = detectTaskCategory(cleanKey);
            if (cat) assignTask(w, cat, val);
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
            const cleanKey = key.toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (cleanKey.includes('promedio') || cleanKey.includes('total') || cleanKey.includes('prom')) continue;

            const cat = detectTaskCategory(cleanKey);
            if (cat) assignTask(w, cat, val);
          }
        }
      }

      if (hasUpdates) {
        showNotification(`Notas cargadas para ${student.name} (en amarillo para guardar).`, 'success');
        return {
          ...prev,
          [studentId]: targetProgress
        };
      }

      return prev;
    });
  };

  // 1-Click Batch AutoFill for the entire course
  const handleAutoFillBatch = (updates: { studentId: string; matchedRow: any }[]) => {
    setPendingChanges(prev => {
      let next = { ...prev };
      let updatedCount = 0;
      const targetSubject = excelViewerSubject || '';
      if (!targetSubject) return prev;

      updates.forEach(({ studentId, matchedRow }) => {
        const student = currentStudents.find(s => s.id === studentId);
        if (!student) return;
        const targetProgress = next[studentId] ? { ...next[studentId] } : { ...student.progress };
        let hasUpdates = false;

        const assignTask = (w: number, task: TaskCategory, val: any) => {
          if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
          if (!targetProgress[targetSubject][w]) {
            targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
          }
          const st = parseTaskStatus(val);
          if (st) {
            targetProgress[targetSubject][w].tasks[task] = st;
            hasUpdates = true;
          }
        };

        for (const key of Object.keys(matchedRow)) {
          const val = matchedRow[key];
          if (val === undefined || val === null || String(val).trim() === '') continue;
          const cleanKey = key.toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (cleanKey.includes('promedio') || cleanKey.includes('total') || cleanKey.includes('prom')) continue;

          const weekMatch = cleanKey.match(/(?:\bsemana\b|\bsem\b|\bweek\b|\bs)[\s_.-]*(\d+)/i);
          if (weekMatch) {
            const w = parseInt(weekMatch[1], 10);
            if (w >= 1 && w <= 52) {
              const cat = detectTaskCategory(cleanKey);
              if (cat) assignTask(w, cat, val);
            }
          }
        }

        if (hasUpdates) {
          next[studentId] = targetProgress;
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        showNotification(`¡Éxito! ${updatedCount} estudiantes autollenados en ${targetSubject}.`, 'success');
      } else {
        showNotification(`No se encontraron columnas de semanas o tareas en el archivo para autollenar.`, 'error');
      }

      return next;
    });
  };



  const cleanSheetData = (worksheet: any) => {
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
    if (!rawData || rawData.length === 0) return [];

    let headerRowIndex = -1;
    let maxHeaderRowIndex = -1;

    // Buscar fila que contiene encabezados de estudiante evitando membretes
    for (let i = 0; i < Math.min(25, rawData.length); i++) {
      const row = rawData[i];
      if (!row || !Array.isArray(row)) continue;

      const filledCellsCount = row.filter(c => c !== undefined && c !== null && String(c).trim() !== '').length;
      if (filledCellsCount < 2) continue;

      const isBannerRow = row.some(cell => {
        const s = String(cell || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        return (
          s.includes('unidad educativa') ||
          s.includes('colegio fiscal') ||
          s.includes('instituto') ||
          s.includes('periodo lectivo') ||
          s.includes('ano lectivo') ||
          s.includes('nomina general') ||
          s.includes('reporte de calificaciones')
        );
      });
      if (isBannerRow) continue;

      const isHeader = row.some(cell => {
        if (!cell) return false;
        const s = String(cell).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        return (
          s === 'nombre' || s === 'nombres' ||
          s === 'estudiante' || s === 'estudiantes' ||
          s === 'alumno' || s === 'alumnos' ||
          s === 'nomina' || s === 'name' || s === 'student' ||
          s === 'apellidos' || s === 'apellidos y nombres' ||
          s === 'nombres y apellidos' || s === 'cadete' || s === 'participante'
        );
      });

      if (isHeader) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Intento secundario: buscar fila con I, A, Q, 321
      for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row)) continue;
        const hasTasks = row.some(c => {
          const s = String(c || '').toLowerCase().trim();
          return s === 'i' || s === 'a' || s === 'q' || s === '321' || s === 'quiz';
        });
        if (hasTasks) {
          headerRowIndex = i;
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      return XLSX.utils.sheet_to_json(worksheet) as any[];
    }

    // Determinar fila inicial de cabecera evitando banners institucionales superiores
    let startHeaderRow = headerRowIndex;
    for (let r = headerRowIndex - 1; r >= Math.max(0, headerRowIndex - 2); r--) {
      const row = rawData[r];
      if (!row || !Array.isArray(row)) continue;
      const hasWeek = row.some(c => {
        const s = String(c || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return /(?:semana|sem|week|\bs)[\s_.-]*\d+/i.test(s) || s.includes('parcial');
      });
      if (hasWeek) {
        startHeaderRow = r;
        break;
      }
      const isBanner = row.some(c => {
        const s = String(c || '').toLowerCase();
        return s.includes('colegio') || s.includes('unidad educativa') || s.includes('docente');
      });
      if (isBanner) break;
    }

    // Verificar si las filas inferiores son subcabeceras (I, A, Q, 321, etc.)
    maxHeaderRowIndex = headerRowIndex;
    for (let i = headerRowIndex + 1; i <= Math.min(headerRowIndex + 2, rawData.length - 1); i++) {
      const row = rawData[i];
      if (!row || !Array.isArray(row)) continue;
      const hasSubHeader = row.some(cell => {
        if (!cell) return false;
        const s = String(cell).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        return (
          s.includes('inv') || s.includes('apl') || s.includes('quiz') ||
          s.includes('321') || /(?:3[\s.\-_,]*2[\s.\-_,]*1|\ba321\b|\br321\b)/.test(s) ||
          s.includes('actividad') || s.includes('tarea') || s.includes('taller') ||
          s.includes('deber') || s.includes('consulta') || s.includes('leccion') ||
          s.includes('evaluacion') || s.includes('prueba') || s.includes('feedback') ||
          s.includes('lectura') || s.includes('ensayo') || s.includes('redaccion') ||
          s === 'i' || s === 'a' || s === 'q' || s.includes('prom') || s.includes('total')
        );
      });

      const nameColIdx = rawData[headerRowIndex].findIndex(cell => {
        if (!cell) return false;
        const s = String(cell).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        return (
          s === 'nombre' || s === 'nombres' ||
          s.includes('estudiante') || s.includes('alumno') ||
          s.includes('nomina') || s === 'name' || s === 'student' ||
          s.includes('apellidos')
        );
      });

      const isNameCellEmpty = nameColIdx !== -1 && (!row[nameColIdx] || String(row[nameColIdx]).trim() === '');

      if (hasSubHeader || isNameCellEmpty) {
        maxHeaderRowIndex = i;
      } else {
        break;
      }
    }

    const compositeHeaders: string[] = [];
    const numCols = Math.max(...rawData.slice(startHeaderRow, maxHeaderRowIndex + 1).map(r => r?.length || 0));

    for (let c = 0; c < numCols; c++) {
      let colNameParts: string[] = [];
      for (let r = startHeaderRow; r <= maxHeaderRowIndex; r++) {
        let val = rawData[r] ? rawData[r][c] : "";
        if (val === undefined || val === null || String(val).trim() === '') {
          // Rellenar celdas combinadas desde la izquierda
          for (let left = c - 1; left >= 0; left--) {
            const leftVal = rawData[r] ? rawData[r][left] : "";
            if (leftVal !== undefined && leftVal !== null && String(leftVal).trim() !== '') {
              const leftStr = String(leftVal).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              if (
                !leftStr.includes('nombre') &&
                !leftStr.includes('estudiante') &&
                !leftStr.includes('alumno') &&
                !leftStr.includes('nomina') &&
                !leftStr.includes('apellidos') &&
                leftStr !== 'n' && leftStr !== 'no' && leftStr !== 'num'
              ) {
                val = leftVal;
              }
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

    const cleanData: any[] = [];
    for (let i = maxHeaderRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const obj: any = {};
      let hasData = false;
      compositeHeaders.forEach((header, index) => {
        if (row[index] !== undefined && row[index] !== null && String(row[index]).trim() !== '') {
          obj[header] = row[index];
          hasData = true;
        }
      });
      if (hasData) cleanData.push(obj);
    }
    return cleanData;
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>, targetSubject: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        let workbook: XLSX.WorkBook;
        if (file.name.toLowerCase().endsWith('.csv')) {
          const text = new TextDecoder('utf-8').decode(data);
          const semicolonCount = (text.match(/;/g) || []).length;
          const commaCount = (text.match(/,/g) || []).length;
          if (semicolonCount > commaCount) {
            workbook = XLSX.read(text, { type: 'string', FS: ';' });
          } else {
            workbook = XLSX.read(data, { type: 'array' });
          }
        } else {
          workbook = XLSX.read(data, { type: 'array' });
        }
        let totalLoaded = 0;

        const extractWeekFromSheetName = (name: string): number | null => {
          const clean = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const m1 = clean.match(/(?:semana|sem|week)[\s_.-]*(\d+)/i);
          if (m1) return parseInt(m1[1], 10);
          if (!clean.includes('sheet') && !clean.includes('hoja') && !clean.includes('seccion')) {
            const m2 = clean.match(/(?:^|[\s_.-])s[\s_.-]*(\d+)(?:$|[\s_.-])/i);
            if (m2) return parseInt(m2[1], 10);
          }
          if (/^\d+$/.test(clean)) {
            const n = parseInt(clean, 10);
            if (n >= 1 && n <= 52) return n;
          }
          return null;
        };

        const hasWeekTabs = workbook.SheetNames.some(name => extractWeekFromSheetName(name) !== null);

        if (hasWeekTabs) {
          // Procesar pestañas detectadas como semanas
          for (const sheetName of workbook.SheetNames) {
            const sheetWeek = extractWeekFromSheetName(sheetName);
            if (sheetWeek) {
              const worksheet = workbook.Sheets[sheetName];
              const json = cleanSheetData(worksheet);
              totalLoaded += processImportData(json, targetSubject, sheetWeek);
            }
          }
        } else {
          // Si no hay pestañas con número de semana, buscar primero si hay una hoja con el nombre de la materia
          let combinedJson: any[] = [];
          const cleanTargetSubj = targetSubject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const targetLevelName = levels.find(l => l.id === selectedLevelId)?.name;

          // 1. Buscar pestaña que coincida con la materia (ej. "Humanísticas" o "Ciencias Sociales")
          const subjectSheetName = workbook.SheetNames.find(name => {
            const clean = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            if (cleanTargetSubj.includes('human')) {
              return clean.includes('human') || clean.includes('social') || clean.includes('lengua') || clean.includes('hum');
            }
            return clean === cleanTargetSubj || clean.includes(cleanTargetSubj);
          });

          // 2. O pestaña que coincida con el nivel/curso
          const courseSheetName = workbook.SheetNames.find(name => {
            if (!targetLevelName) return false;
            const n1 = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            const n2 = targetLevelName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            return n1 === n2 || n1.includes(n2) || n2.includes(n1);
          });

          const prioritizedSheet = subjectSheetName || courseSheetName;

          if (prioritizedSheet) {
            const worksheet = workbook.Sheets[prioritizedSheet];
            const json = cleanSheetData(worksheet);
            combinedJson = combinedJson.concat(json);
          } else {
            for (const sheetName of workbook.SheetNames) {
              const lower = sheetName.toLowerCase();
              if (lower.includes('caratula') || lower.includes('portada') || lower.includes('resumen') || lower.includes('grafico')) {
                continue;
              }
              const worksheet = workbook.Sheets[sheetName];
              const json = cleanSheetData(worksheet);
              combinedJson = combinedJson.concat(json);
            }
          }

          totalLoaded += processImportData(combinedJson, targetSubject);
        }

        if (totalLoaded > 0) {
          showNotification(`Archivo Excel procesado: ${totalLoaded} registros cargados para ${targetSubject}.`, 'success');
        } else {
          showNotification('No se encontraron registros válidos o no coinciden con los estudiantes de este nivel.', 'error');
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
    <div className="h-screen max-h-screen overflow-hidden bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-3 right-5 z-50 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl shadow-lg border backdrop-blur-md ${
            notification.type === 'success' 
              ? 'bg-green-50/95 border-green-200 text-green-900' 
              : 'bg-red-50/95 border-red-200 text-red-900'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span className="text-xs font-semibold">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-1 p-0.5 hover:bg-black/5 rounded-full transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white shadow-xs z-30 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2.5 border-b border-slate-800 shrink-0">
        {/* Brand & Home Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setSearchQuery('');
              setFocusedStudentId(null);
            }}
            className="flex items-center gap-2.5 group text-left focus:outline-none"
            title="Ir al Panel de Inicio"
          >
            <div className="bg-[#144C8A] group-hover:bg-[#0f3d70] p-2 rounded-xl shadow-md transition-colors flex items-center justify-center">
              <School className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-white group-hover:text-blue-300 transition-colors">
                  Mavir School
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-semibold border border-blue-400/20">
                  Académico
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Seguimiento Horizontal
              </p>
            </div>
          </button>

          {/* Quick Tab to switch between Inicio and Matriz */}
          <div className="hidden md:flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700/60 ml-2">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setSearchQuery('');
                setFocusedStudentId(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#144C8A] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Inicio / Resumen</span>
            </button>

            {levels.length > 0 && (
              <button
                onClick={() => {
                  if (!selectedLevelId && levels.length > 0) {
                    setSelectedLevelId(levels[0].id);
                  }
                  setActiveTab('matrix');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'matrix'
                    ? 'bg-[#144C8A] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Matriz de Notas</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: Interactive Level Switcher */}
        <div className="flex items-center gap-2">
          {levels.length > 0 ? (
            <div className="flex items-center gap-1.5 bg-slate-800/90 rounded-xl p-1 border border-slate-700/80 shadow-inner">
              <span className="text-[11px] font-semibold text-slate-400 pl-2 hidden lg:inline">
                Curso:
              </span>

              {/* Segmented quick tabs if 1 to 4 levels */}
              {levels.length <= 4 ? (
                <div className="flex items-center gap-1">
                  {levels.map((l) => {
                    const isCurr = l.id === selectedLevelId && activeTab === 'matrix';
                    const count = students.filter((s) => s.levelId === l.id).length;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setSelectedLevelId(l.id);
                          setActiveTab('matrix');
                          setSearchQuery('');
                          setFocusedStudentId(null);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                          isCurr
                            ? 'bg-[#144C8A] text-white shadow-sm ring-1 ring-blue-400/30'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                        }`}
                        title={`Ingresar a ${l.name} (${count} alumnos)`}
                      >
                        <span className="max-w-[120px] truncate">{l.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isCurr ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Select dropdown if > 4 levels */
                <select
                  value={selectedLevelId || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setSelectedLevelId(val);
                      setActiveTab('matrix');
                      setSearchQuery('');
                      setFocusedStudentId(null);
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white py-1 px-2.5 focus:ring-2 focus:ring-[#144C8A] outline-none min-w-[150px] cursor-pointer"
                >
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({students.filter((s) => s.levelId === l.id).length})
                    </option>
                  ))}
                </select>
              )}

              {/* Open Level Manager Modal */}
              <button
                type="button"
                onClick={() => setIsLevelManagerOpen(true)}
                className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-slate-700/80 rounded-lg transition-colors"
                title="Administrar todos los niveles y cursos"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsLevelManagerOpen(true)}
              className="flex items-center gap-1.5 bg-blue-600/30 text-blue-300 border border-blue-500/40 px-3 py-1 rounded-xl text-xs font-semibold hover:bg-blue-600/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Primer Nivel</span>
            </button>
          )}
        </div>

        {/* Right Side: Cloud Status & Teacher Profile */}
        <div className="flex items-center gap-3">
          {/* Cloud Sync indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
            <span className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-400 animate-spin' : 'bg-emerald-400 animate-pulse'}`} />
            <span className="text-[10px]">{isSaving ? 'Guardando...' : 'Nube activa'}</span>
          </div>

          {/* Teacher Profile Dropdown */}
          <TeacherProfileDropdown
            user={user}
            levels={levels}
            students={students}
            onOpenLevelManager={() => setIsLevelManagerOpen(true)}
            onSignOut={() => auth.signOut()}
            isSaving={isSaving}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'dashboard' || !selectedLevelId ? (
          <div className="flex-1 min-h-0 overflow-hidden bg-slate-100 p-2 sm:p-2.5 flex flex-col">
            <TeacherDashboard
              user={user}
              levels={levels}
              students={students}
              onSelectLevel={(id) => {
                setSelectedLevelId(id);
                setActiveTab('matrix');
                setSearchQuery('');
                setFocusedStudentId(null);
              }}
              onOpenLevelManager={() => setIsLevelManagerOpen(true)}
              onAddLevel={(name) => handleAddLevel(undefined, name)}
            />
          </div>
        ) : (
          <>
            {/* Secondary Control Bar (Weeks, Subjects Jump, Search & Quick Add Student) */}
            <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 shadow-xs shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Week Range Filter */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Semanas:</span>
                  <select
                    value={startWeek}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setStartWeek(val);
                      if (val > endWeek) setEndWeek(val);
                    }}
                    className="bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-700 py-0.5 px-1 focus:ring-1 focus:ring-[#144C8A] outline-none"
                  >
                    {WEEKS.map(w => <option key={w} value={w}>S{w}</option>)}
                  </select>
                  <span className="text-[10px] text-slate-400 font-bold">a</span>
                  <select
                    value={endWeek}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEndWeek(val);
                      if (val < startWeek) setStartWeek(val);
                    }}
                    className="bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-700 py-0.5 px-1 focus:ring-1 focus:ring-[#144C8A] outline-none"
                  >
                    {WEEKS.map(w => <option key={w} value={w}>S{w}</option>)}
                  </select>
                </div>

                {/* Quick jump to subjects */}
                <div className="hidden sm:flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Ir a:</span>
                  {SUBJECT_CONFIGS.map(subj => (
                    <button
                      key={subj.name}
                      onClick={() => scrollToSubject(subj.name)}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all border ${subj.color.bg} ${subj.color.text} ${subj.color.border} hover:opacity-80 active:scale-95`}
                    >
                      {subj.shortName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Quick Add Student Form - Compact, inside the bar! */}
                <form onSubmit={handleAddStudentInline} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newStudentInlineName}
                    onChange={(e) => setNewStudentInlineName(e.target.value)}
                    placeholder="+ Agregar alumno..."
                    className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-[#144C8A] focus:bg-white outline-none w-36 sm:w-44 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newStudentInlineName.trim()}
                    className="flex items-center gap-1 bg-[#144C8A] hover:bg-[#0f3d70] disabled:opacity-40 text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-xs transition-all"
                    title="Registrar nuevo alumno"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Agregar</span>
                  </button>
                </form>

                {/* Search Filter */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-1 focus:ring-[#144C8A] focus:bg-white outline-none w-24 sm:w-32 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md hidden lg:inline">
                  {currentStudents.length} alumnos
                </span>
              </div>
            </div>

            {/* Matrix Area */}
            <div className={`flex-1 min-h-0 p-1.5 sm:p-2 overflow-hidden flex flex-col bg-slate-100 ${excelViewerSubject ? 'pb-[65px] transition-all duration-300' : 'transition-all duration-300'}`}>
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 flex-1 flex flex-col overflow-hidden relative">
                {/* Matrix Table */}
                <div className="overflow-auto flex-1 relative" ref={tableContainerRef}>
                  <table className="w-full text-left align-middle border-collapse min-w-max relative z-0">
                    <thead>
                      {/* Row 1: Subjects Header */}
                      <tr className="bg-slate-800 text-white select-none">
                        {/* Sticky Student Header Corner */}
                        <th 
                          rowSpan={3} 
                          className="py-1.5 px-2.5 font-bold text-xs uppercase tracking-wider border-r-2 border-slate-600 sticky left-0 top-0 z-30 bg-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.15)] min-w-[270px] max-w-[285px]"
                        >
                          Estudiante & Reporte
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
                            className="py-1 px-2 text-center font-bold text-xs uppercase tracking-wider border-r-2 border-slate-700 sticky top-0 z-20"
                            style={{ backgroundColor: subject.color.accent }}
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <span>{subject.name}</span>
                              <button
                                onClick={() => setExcelViewerSubject(subject.name)}
                                className="bg-black/20 hover:bg-black/30 text-white p-0.5 rounded transition-colors"
                                title={`Ver archivo Excel de ${subject.name}`}
                              >
                                <FileSpreadsheet className="w-3 h-3" />
                              </button>
                              <span className="text-[0.62rem] bg-black/20 px-1 py-0.2 rounded font-bold">
                                S{startWeek}-S{endWeek}
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
                                className="py-0.5 px-1 text-center font-bold text-[0.68rem] uppercase tracking-wider border-r border-slate-600 last:border-r-2 sticky top-[29px] z-20 bg-slate-700"
                              >
                                Sem {week}
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
                                      className={`py-0.5 px-0.5 text-center text-[0.62rem] font-extrabold uppercase text-slate-700 border-r ${
                                        isLastCatInWeek ? 'border-r-2 border-slate-400' : 'border-slate-300'
                                      } w-8 min-w-[32px] max-w-[32px] sticky top-[51px] z-20 bg-slate-100`}
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
                        const hasPending = !!pendingChanges[student.id];
                        let rowBg = isFocused ? 'bg-blue-100' : (isEven ? 'bg-white' : 'bg-slate-50/70');
                        if (hasPending && !isFocused) rowBg = 'bg-yellow-50';
                        if (hasPending && isFocused) rowBg = 'bg-yellow-100';

                        return (
                          <tr
                            key={student.id}
                            className={`${rowBg} ${!isFocused && 'hover:bg-blue-50/60'} transition-colors group h-[36px]`}
                          >
                            {/* Sticky Left Column: Student Name & Report Button */}
                            <td
                              onClick={() => setFocusedStudentId(isFocused ? null : student.id)}
                              className={`py-0.5 px-2 border-r-2 ${isFocused ? 'border-r-[#144C8A]' : 'border-slate-300'} sticky left-0 z-10 ${rowBg} ${!isFocused && 'group-hover:bg-blue-50/95'} transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.06)] min-w-[270px] max-w-[285px] cursor-pointer`}
                            >
                              <div className="flex items-center justify-between gap-1.5 h-full">
                                {/* Index & Name */}
                                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                                  <span className="text-[0.65rem] font-bold text-slate-400 w-4 text-right shrink-0">
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
                                        className="text-xs py-0.5 px-1.5 border border-[#144C8A] rounded bg-white w-full outline-none font-semibold text-slate-800"
                                        autoFocus
                                      />
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSaveRename(student.id); }}
                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span 
                                      className="text-xs font-bold text-slate-800 truncate cursor-text"
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setEditingStudentId(student.id);
                                        setEditingStudentName(student.name);
                                      }}
                                      title={`${student.name} (Doble clic para editar)`}
                                    >
                                      {student.name}
                                    </span>
                                  )}
                                </div>

                                {/* Right Side Actions: Progress, Report, Delete */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <span
                                    className={`text-[9px] font-bold px-1 py-0.2 rounded ${
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

                                  {/* Compact Report Button */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setReportStudent(student); }}
                                    className="flex items-center gap-0.5 bg-[#144C8A] hover:bg-[#0f3d70] text-white px-1.5 py-0.5 rounded text-[9px] font-bold transition-all shadow-xs active:scale-95"
                                    title={`Generar reporte para ${student.name}`}
                                  >
                                    <FileSpreadsheet className="w-2.5 h-2.5" />
                                    <span>Rep</span>
                                  </button>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); setStudentToDelete(student); }}
                                    className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50"
                                    title="Eliminar estudiante"
                                  >
                                    <Trash2 className="w-3 h-3" />
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

                                        let cellBg = 'bg-transparent focus-within:bg-blue-50';
                                        let statusLabel = 'Sin calificar';
                                        let textColor = 'text-slate-800';
                                        let inputValue = '';

                                        if (status === 'cumplido') {
                                          cellBg = 'bg-green-100 focus-within:bg-green-200';
                                          statusLabel = 'Cumplido';
                                          textColor = 'text-green-800';
                                          inputValue = '10';
                                        } else if (status === 'pendiente') {
                                          cellBg = 'bg-yellow-100 focus-within:bg-yellow-200';
                                          statusLabel = 'Pendiente';
                                          textColor = 'text-yellow-800';
                                          inputValue = 'P';
                                        } else if (status === 'no_cumplido') {
                                          cellBg = 'bg-red-100 focus-within:bg-red-200';
                                          statusLabel = 'No cumplido';
                                          textColor = 'text-red-800';
                                          inputValue = '0';
                                        }

                                        return (
                                          <td
                                            key={`cell-${student.id}-${subject.name}-${week}-${cat.id}`}
                                            className={`p-0 align-middle border-r border-b ${isLastCatInWeek ? 'border-r-2 border-r-slate-400' : 'border-r-slate-200'} border-b-slate-100 ${cellBg} transition-colors select-none cursor-text`}
                                            onClick={() => document.getElementById(`input-${student.id}-${subject.name}-${week}-${cat.id}`)?.focus()}
                                            title={`${student.name} | ${subject.name} (S${week}) | ${cat.fullName}: ${statusLabel}`}
                                          >
                                            <input
                                              id={`input-${student.id}-${subject.name}-${week}-${cat.id}`}
                                              type="text"
                                              onFocus={() => setFocusedStudentId(student.id)}
                                              className={`w-full h-full min-h-[36px] flex items-center justify-center text-center text-xs font-bold ${textColor} bg-transparent outline-none`}
                                              value={inputValue}
                                              onChange={(e) => handleCellChange(student, subject.name, week, cat.id, e.target.value)}
                                              onPaste={(e) => handleCellPaste(e, studentIdx, subject.name, week, cat.id)}
                                              onKeyDown={(e) => handleKeyDown(e, studentIdx, subject.name, week, cat.id)}
                                            />
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
              <div className="px-3 py-1 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 text-xs z-30 relative shrink-0">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider hidden sm:inline">
                    Calificación:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-green-500 flex items-center justify-center text-white font-bold text-[8px] shadow-xs">✓</span>
                    <span className="font-semibold text-slate-700 text-[11px]">10 (Cumplido)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-yellow-400 flex items-center justify-center text-yellow-900 font-bold text-[8px] shadow-xs">•</span>
                    <span className="font-semibold text-slate-700 text-[11px]">P (Pendiente)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-red-500 flex items-center justify-center text-white font-bold text-[8px] shadow-xs">✕</span>
                    <span className="font-semibold text-slate-700 text-[11px]">0 (No Cumplido)</span>
                  </div>
                </div>

                <div className="text-slate-400 text-[10px] font-medium hidden md:block">
                  Auto-guardado en nube activo
                </div>
              </div>
            </div>
          </div>
        </>
      )}
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
                  setPendingChanges(prev => {
                    const next = { ...prev };
                    delete next[studentToDelete.id];
                    return next;
                  });
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

      

      
      {excelViewerSubject && (
        <BottomExcelPanel
          subjectName={excelViewerSubject}
          focusedStudentId={focusedStudentId}
          students={currentStudents}
          onClose={() => setExcelViewerSubject(null)}
          onAutoFill={handleAutoFill}
          onAutoFillBatch={handleAutoFillBatch}
        />
      )}

      {/* Level Manager Modal */}
      <LevelManagerModal
        isOpen={isLevelManagerOpen}
        onClose={() => setIsLevelManagerOpen(false)}
        levels={levels}
        students={students}
        selectedLevelId={selectedLevelId}
        onSelectLevel={(id) => {
          setSelectedLevelId(id);
          setSearchQuery('');
          setFocusedStudentId(null);
        }}
        onAddLevel={(name) => handleAddLevel(undefined, name)}
        onUpdateLevel={updateLevelName}
        onDeleteLevel={handleConfirmDeleteLevel}
        showNotification={showNotification}
      />

      {/* Level Delete Confirmation Modal (In-App) */}
      {levelToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              ¿Eliminar el nivel "{levelToDelete.name}"?
            </h3>
            <p className="text-sm text-slate-600 text-center mb-4">
              Esta acción eliminará de forma permanente este curso junto con{' '}
              <strong className="text-red-600">
                {students.filter(s => s.levelId === levelToDelete.id).length} estudiantes
              </strong>{' '}
              y todo su historial de calificaciones.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setLevelToDelete(null)}
                disabled={isDeletingLevel}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmDeleteLevel(levelToDelete)}
                disabled={isDeletingLevel}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeletingLevel && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeletingLevel ? 'Eliminando...' : 'Sí, eliminar nivel'}
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
          data={(() => {
            const effectiveProgress = pendingChanges[reportStudent.id] || reportStudent.progress || {};
            return Object.keys(effectiveProgress).reduce((acc, subject) => {
              acc[subject] = Object.keys(effectiveProgress[subject] || {}).reduce((weekAcc, weekStr) => {
                const week = parseInt(weekStr);
                if (week >= startWeek && week <= endWeek) {
                  weekAcc[week] = effectiveProgress[subject][week];
                }
                return weekAcc;
              }, {} as any);
              return acc;
            }, {} as ProgressData);
          })()}
          onClose={() => setReportStudent(null)}
        />
      )}
    </div>
  );
}