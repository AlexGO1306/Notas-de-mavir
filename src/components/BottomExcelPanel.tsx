import React, { useState, useEffect, useRef, useMemo } from 'react';
import localforage from 'localforage';
import {
  X,
  Upload,
  FileSpreadsheet,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../hooks/useFirebaseData';

interface BottomExcelPanelProps {
  subjectName: string;
  focusedStudentId: string | null;
  students: Student[];
  onClose: () => void;
  onAutoFill: (studentId: string, matchedRow: any, fileWeek: string, columns: string[]) => void;
  onAutoFillBatch?: (matches: { studentId: string; matchedRow: any }[]) => void;
}

interface ParsedFile {
  fileName: string;
  sheetNames: string[];
  activeSheet: string;
  weeklyData: Record<string, { data: any[]; columns: string[] }>;
  rawPreviewData: any[][];
  headerRowIndex: number;
  detectedColumns: { name: string; type: 'student' | 'week' | 'investiga' | 'aplica' | 'quiz' | 'a321' | 'other' }[];
}

export function BottomExcelPanel({
  subjectName,
  focusedStudentId,
  students,
  onClose,
  onAutoFill,
  onAutoFillBatch,
}: BottomExcelPanelProps) {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [matchedRow, setMatchedRow] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAutoFilledCount, setLastAutoFilledCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const focusedStudent = students.find((s) => s.id === focusedStudentId);

  // Normalized subject storage key (safe from Unicode NFC/NFD differences)
  const normalizedSubjectKey = subjectName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const storageKey = `excel_data_${normalizedSubjectKey}`;

  const isHumanistic = normalizedSubjectKey.includes('human') || normalizedSubjectKey.includes('social');

  useEffect(() => {
    loadExcel();
  }, [subjectName]);

  // When focused student changes, check match and update
  useEffect(() => {
    if (focusedStudent && files.length > 0) {
      const match = findMatch(focusedStudent);
      if (match) {
        onAutoFill(focusedStudent.id, match, '', []);
      }
    } else {
      setMatchedRow(null);
    }
  }, [focusedStudent, files]);

  const loadExcel = async () => {
    setIsLoading(true);
    try {
      let storedData = await localforage.getItem<any>(storageKey);
      if (!storedData) {
        storedData = await localforage.getItem<any>(`excel_data_${subjectName}`);
      }
      if (storedData) {
        let loadedFiles = storedData.files || [];
        if (storedData.fileName && storedData.weeklyData && !storedData.files) {
          loadedFiles = [
            {
              fileName: storedData.fileName,
              sheetNames: [storedData.sheetName || 'Hoja1'],
              activeSheet: storedData.sheetName || 'Hoja1',
              weeklyData: storedData.weeklyData,
              rawPreviewData: [],
              headerRowIndex: 0,
              detectedColumns: []
            }
          ];
        }
        setFiles(loadedFiles);
      } else {
        setFiles([]);
      }
    } catch (error) {
      console.error('Error loading excel data:', error);
    }
    setIsLoading(false);
  };

  const cleanTokens = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^\d+[\s._\-)\]]+/g, '') // remove leading sequence numbers "01. "
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((p) => p.length >= 2);
  };

  const extractWeekFromSheetName = (name: string): string | null => {
    const clean = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    // 1. "semana 1", "sem 1", "sem. 1", "week 1"
    const m1 = clean.match(/(?:semana|sem|week)[\s_.-]*(\d+)/i);
    if (m1) return parseInt(m1[1], 10).toString();
    // 2. "s1", "s 1", "s-1" (avoid "sheet1" or "hoja1")
    if (!clean.includes('sheet') && !clean.includes('hoja') && !clean.includes('seccion')) {
      const m2 = clean.match(/(?:^|[\s_.-])s[\s_.-]*(\d+)(?:$|[\s_.-])/i);
      if (m2) return parseInt(m2[1], 10).toString();
    }
    // 3. Tab is purely a number 1..52
    if (/^\d+$/.test(clean)) {
      const n = parseInt(clean, 10);
      if (n >= 1 && n <= 52) return n.toString();
    }
    return null;
  };

  const classifyColumnType = (headerStr: string): 'student' | 'week' | 'investiga' | 'aplica' | 'quiz' | 'a321' | 'other' => {
    const clean = headerStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    if (
      clean.includes('nombre') ||
      clean.includes('estudiante') ||
      clean.includes('alumno') ||
      clean.includes('nomina') ||
      clean.includes('apellidos') ||
      clean === 'cadete' ||
      clean === 'participante'
    ) {
      return 'student';
    }

    // 1. Actividad 321 (MUST be tested before generic 'actividad')
    if (/(?:3[\s.\-_,]*2[\s.\-_,]*1|\ba321\b|\br321\b|rutina[\s._-]*3|pensamiento[\s._-]*3)/i.test(clean)) {
      return 'a321';
    }

    // 2. Investigación (I)
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

    if (/(?:semana|sem|week|\bs)[\s_.-]*\d+/i.test(clean)) {
      return 'week';
    }

    return 'other';
  };

  const cleanSheetData = (worksheet: any) => {
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    if (!rawData || rawData.length === 0) {
      return { cleanData: [], rawData: [], headerRowIndex: -1, detectedColumns: [] };
    }

    let headerRowIndex = -1;
    let maxHeaderRowIndex = -1;

    // Smart header row finder: ignore institutional banners and single-cell rows
    for (let i = 0; i < Math.min(25, rawData.length); i++) {
      const row = rawData[i];
      if (!row || !Array.isArray(row)) continue;

      // Count non-empty cells
      const filledCellsCount = row.filter((c) => c !== undefined && c !== null && String(c).trim() !== '').length;

      // Real header rows have at least 2 or 3 filled columns, not just 1 title banner cell
      if (filledCellsCount < 2) continue;

      // Check if it's an administrative banner
      const isBannerRow = row.some((cell) => {
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

      const isHeader = row.some((cell) => {
        if (!cell) return false;
        const s = String(cell).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        return (
          s === 'nombre' ||
          s === 'nombres' ||
          s === 'estudiante' ||
          s === 'estudiantes' ||
          s === 'alumno' ||
          s === 'alumnos' ||
          s === 'nomina' ||
          s === 'name' ||
          s === 'student' ||
          s === 'apellidos' ||
          s === 'apellidos y nombres' ||
          s === 'nombres y apellidos' ||
          s === 'cadete' ||
          s === 'participante'
        );
      });

      if (isHeader) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Fallback: try finding any row with "I", "A", "Q" or "321" or student-like keys
      for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row)) continue;
        const hasTasks = row.some((c) => {
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
      const basicData = XLSX.utils.sheet_to_json(worksheet) as any[];
      return {
        cleanData: basicData,
        rawData,
        headerRowIndex: 0,
        detectedColumns: basicData[0] ? Object.keys(basicData[0]).map((k) => ({ name: k, type: classifyColumnType(k) })) : []
      };
    }

    // Determine if the rows right above contain week definitions (Semana 1, Sem 2, S1)
    let startHeaderRow = headerRowIndex;
    for (let r = headerRowIndex - 1; r >= Math.max(0, headerRowIndex - 3); r--) {
      const row = rawData[r];
      if (!row || !Array.isArray(row)) continue;
      const hasWeek = row.some((c) => {
        const s = String(c || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return /(?:semana|sem|week|\bs)[\s_.-]*\d+/i.test(s) || s.includes('parcial');
      });
      if (hasWeek) {
        startHeaderRow = r;
        break;
      }
      const isBanner = row.some((c) => {
        const s = String(c || '').toLowerCase();
        return s.includes('colegio') || s.includes('unidad educativa') || s.includes('docente');
      });
      if (isBanner) break;
    }

    // Check if the rows below are sub-headers (I, A, Q, 321, etc.)
    maxHeaderRowIndex = headerRowIndex;
    for (let i = headerRowIndex + 1; i <= Math.min(headerRowIndex + 2, rawData.length - 1); i++) {
      const row = rawData[i];
      if (!row || !Array.isArray(row)) continue;
      const hasSubHeader = row.some((cell) => {
        if (!cell) return false;
        const s = String(cell).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        return (
          s.includes('inv') ||
          s.includes('apl') ||
          s.includes('quiz') ||
          s.includes('321') ||
          /(?:3[\s.\-_,]*2[\s.\-_,]*1|\ba321\b|\br321\b)/.test(s) ||
          s.includes('actividad') ||
          s.includes('tarea') ||
          s.includes('taller') ||
          s.includes('deber') ||
          s.includes('consulta') ||
          s.includes('leccion') ||
          s.includes('evaluacion') ||
          s.includes('prueba') ||
          s.includes('feedback') ||
          s.includes('lectura') ||
          s.includes('ensayo') ||
          s.includes('redaccion') ||
          s === 'i' ||
          s === 'a' ||
          s === 'q' ||
          s.includes('prom') ||
          s.includes('total')
        );
      });

      const nameColIdx = rawData[headerRowIndex].findIndex((cell) => {
        if (!cell) return false;
        const s = String(cell).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        return (
          s === 'nombre' ||
          s === 'nombres' ||
          s.includes('estudiante') ||
          s.includes('alumno') ||
          s.includes('nomina') ||
          s === 'name' ||
          s === 'student' ||
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
    const numCols = Math.max(...rawData.slice(startHeaderRow, maxHeaderRowIndex + 1).map((r) => r?.length || 0));

    for (let c = 0; c < numCols; c++) {
      let colNameParts: string[] = [];
      for (let r = startHeaderRow; r <= maxHeaderRowIndex; r++) {
        let val = rawData[r] ? rawData[r][c] : '';
        if (val === undefined || val === null || String(val).trim() === '') {
          // Forward-fill merged cells from left
          for (let left = c - 1; left >= 0; left--) {
            const leftVal = rawData[r] ? rawData[r][left] : '';
            if (leftVal !== undefined && leftVal !== null && String(leftVal).trim() !== '') {
              const leftStr = String(leftVal).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              if (
                !leftStr.includes('nombre') &&
                !leftStr.includes('estudiante') &&
                !leftStr.includes('alumno') &&
                !leftStr.includes('nomina') &&
                !leftStr.includes('apellidos') &&
                leftStr !== 'n' &&
                leftStr !== 'no' &&
                leftStr !== 'num'
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

    const detectedColumns = compositeHeaders.map((h) => ({
      name: h,
      type: classifyColumnType(h)
    }));

    return {
      cleanData,
      rawData,
      headerRowIndex: startHeaderRow,
      detectedColumns
    };
  };

  const parseWorkbook = (workbook: XLSX.WorkBook, fileName: string): ParsedFile => {
    let weeklyData: Record<string, { data: any[]; columns: string[] }> = {};
    const sheetNames = workbook.SheetNames;

    // 1. Identify which sheet is most relevant
    // If there are week tabs:
    const hasWeekTabs = sheetNames.some((name) => extractWeekFromSheetName(name) !== null);

    let activeSheet = sheetNames[0];
    let rawPreviewData: any[][] = [];
    let detectedCols: { name: string; type: 'student' | 'week' | 'investiga' | 'aplica' | 'quiz' | 'a321' | 'other' }[] = [];
    let bestHeaderIndex = 0;

    if (hasWeekTabs) {
      sheetNames.forEach((sheetName) => {
        const weekNum = extractWeekFromSheetName(sheetName);
        if (weekNum) {
          const worksheet = workbook.Sheets[sheetName];
          const { cleanData, rawData, headerRowIndex, detectedColumns } = cleanSheetData(worksheet);
          if (cleanData.length > 0) {
            const columns = Object.keys(cleanData[0] as object);
            weeklyData[weekNum] = { data: cleanData, columns };
            if (rawPreviewData.length === 0) {
              rawPreviewData = rawData;
              detectedCols = detectedColumns;
              bestHeaderIndex = headerRowIndex;
              activeSheet = sheetName;
            }
          }
        }
      });
    } else {
      // Multiple sheets without week numbers (e.g. "Carátula", "Humanísticas", "Resumen")
      // Prioritize the sheet that matches "Humanísticas", "Sociales", "Lengua" or the subject
      const subjectMatchSheet = sheetNames.find((name) => {
        const cleanName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        return (
          cleanName.includes('human') ||
          cleanName.includes('social') ||
          cleanName.includes('lengua') ||
          cleanName.includes('literatura') ||
          cleanName === normalizedSubjectKey ||
          cleanName.includes(normalizedSubjectKey)
        );
      });

      const sheetsToProcess = subjectMatchSheet ? [subjectMatchSheet] : sheetNames;
      activeSheet = subjectMatchSheet || sheetNames[0];

      let combinedData: any[] = [];
      let allColsSet = new Set<string>();

      sheetsToProcess.forEach((sheetName) => {
        // Skip obvious non-grade sheets if there are multiple
        if (sheetsToProcess.length > 1) {
          const lower = sheetName.toLowerCase();
          if (
            lower.includes('caratula') ||
            lower.includes('portada') ||
            lower.includes('resumen') ||
            lower.includes('grafico') ||
            lower.includes('config') ||
            lower.includes('parametro')
          ) {
            return;
          }
        }

        const worksheet = workbook.Sheets[sheetName];
        const { cleanData, rawData, headerRowIndex, detectedColumns } = cleanSheetData(worksheet);

        if (rawPreviewData.length === 0 && rawData.length > 0) {
          rawPreviewData = rawData;
          detectedCols = detectedColumns;
          bestHeaderIndex = headerRowIndex;
          activeSheet = sheetName;
        }

        if (cleanData.length > 0) {
          const cols = Object.keys(cleanData[0] as object);
          cols.forEach((c) => allColsSet.add(c));
          combinedData = combinedData.concat(cleanData);
        }
      });

      const allColumns = Array.from(allColsSet);

      const weekColMatch = (c: string) => {
        const clean = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        return clean.match(/(?:\bsemana\b|\bsem\b|\bweek\b|\bs)[\s_.-]*(\d+)/i);
      };
      const hasHorizontalWeeks = allColumns.some(weekColMatch);

      if (hasHorizontalWeeks) {
        const baseCols = allColumns.filter((c) => !weekColMatch(c));
        const weeksFound = new Set<string>();
        allColumns.forEach((c) => {
          const m = weekColMatch(c);
          if (m) weeksFound.add(parseInt(m[1], 10).toString());
        });
        weeksFound.forEach((w) => {
          const colsForWeek = allColumns.filter((c) => {
            const m = weekColMatch(c);
            return m && parseInt(m[1], 10).toString() === w;
          });
          weeklyData[w] = { data: combinedData, columns: [...baseCols, ...colsForWeek] };
        });
      } else {
        const weekCol = allColumns.find(
          (col) => col.toLowerCase() === 'semana' || col.toLowerCase() === 'week'
        );
        if (weekCol) {
          combinedData.forEach((row) => {
            const w = row[weekCol];
            if (w) {
              const wStr = String(w).match(/\d+/)?.[0] || String(w);
              if (!weeklyData[wStr]) weeklyData[wStr] = { data: [], columns: allColumns };
              weeklyData[wStr].data.push(row);
            }
          });
        } else {
          weeklyData['all'] = { data: combinedData, columns: allColumns };
        }
      }
    }

    return {
      fileName,
      sheetNames,
      activeSheet,
      weeklyData,
      rawPreviewData,
      headerRowIndex: bestHeaderIndex,
      detectedColumns: detectedCols
    };
  };

  const handleFile = async (file: File) => {
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Handle both standard XLSX/XLS and CSV (detect semicolon vs comma)
      let workbook: XLSX.WorkBook;
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = new TextDecoder('utf-8').decode(arrayBuffer);
        // If file contains semicolons more than commas, specify delimiter
        const semicolonCount = (text.match(/;/g) || []).length;
        const commaCount = (text.match(/,/g) || []).length;
        if (semicolonCount > commaCount) {
          workbook = XLSX.read(text, { type: 'string', FS: ';' });
        } else {
          workbook = XLSX.read(arrayBuffer, { type: 'array' });
        }
      } else {
        workbook = XLSX.read(arrayBuffer, { type: 'array' });
      }

      const parsedFile = parseWorkbook(workbook, file.name);

      const updatedFiles = [parsedFile];
      setFiles(updatedFiles);

      await localforage.setItem(storageKey, {
        files: updatedFiles,
        week: '',
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error parsing excel:', error);
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async () => {
    await localforage.removeItem(storageKey);
    await localforage.removeItem(`excel_data_${subjectName}`);
    setFiles([]);
    setMatchedRow(null);
    setLastAutoFilledCount(null);
  };

  const findMatch = (student: Student) => {
    const studentTokens = cleanTokens(student.name);
    if (studentTokens.length === 0) return null;

    let masterRow: any = {};
    let foundAny = false;

    files.forEach((f) => {
      Object.keys(f.weeklyData).forEach((weekKey) => {
        const { data } = f.weeklyData[weekKey];

        let bestMatch: any = null;
        let bestScore = 0;

        for (const row of data) {
          // Identify cell specifically with student name
          let rowStudentName = '';
          for (const k of Object.keys(row)) {
            const cleanK = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (
              cleanK.includes('nombre') ||
              cleanK.includes('estudiante') ||
              cleanK.includes('alumno') ||
              cleanK.includes('nomina') ||
              cleanK.includes('apellidos') ||
              cleanK === 'cadete' ||
              cleanK === 'participante'
            ) {
              rowStudentName += ' ' + String(row[k] || '');
            }
          }

          const targetTokens = rowStudentName.trim()
            ? cleanTokens(rowStudentName)
            : cleanTokens(Object.values(row).map((v) => String(v || '')).join(' '));

          let matchedCount = 0;
          studentTokens.forEach((st) => {
            if (targetTokens.some((tt) => tt === st || tt.includes(st) || st.includes(tt))) {
              matchedCount++;
            }
          });

          const ratio = matchedCount / Math.min(studentTokens.length, targetTokens.length || 1);
          if (matchedCount >= 2 || (studentTokens.length === 1 && matchedCount === 1) || ratio >= 0.65) {
            if (matchedCount > bestScore) {
              bestScore = matchedCount;
              bestMatch = row;
            }
          }
        }

        if (bestMatch) {
          foundAny = true;
          if (weekKey !== 'all') {
            for (const k in bestMatch) {
              const cleanK = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              if (cleanK.match(/(?:\bsemana\b|\bsem\b|\bweek\b|\bs)[\s_.-]*\d+/i)) {
                masterRow[k] = bestMatch[k];
              } else {
                masterRow[`semana ${weekKey} ${k}`] = bestMatch[k];
              }
            }
          } else {
            for (const k in bestMatch) {
              masterRow[k] = bestMatch[k];
            }
          }
        }
      });
    });

    if (foundAny) {
      setMatchedRow(masterRow);
      return masterRow;
    }

    return null;
  };

  // Pre-calculate matches for all students in current course
  const matchedStudents = useMemo(() => {
    if (files.length === 0) return [];
    return students
      .map((s) => ({ student: s, match: findMatch(s) }))
      .filter((item): item is { student: Student; match: any } => !!item.match);
  }, [students, files]);

  const unmatchedStudents = useMemo(() => {
    if (files.length === 0) return students;
    const matchedIds = new Set(matchedStudents.map((m) => m.student.id));
    return students.filter((s) => !matchedIds.has(s.id));
  }, [students, matchedStudents, files]);

  const handleAutoFillAll = () => {
    if (matchedStudents.length === 0) return;

    if (onAutoFillBatch) {
      onAutoFillBatch(matchedStudents.map((m) => ({ studentId: m.student.id, matchedRow: m.match })));
    } else {
      matchedStudents.forEach((m) => {
        onAutoFill(m.student.id, m.match, '', []);
      });
    }
    setLastAutoFilledCount(matchedStudents.length);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-300 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-50">

      {/* Main Bottom Bar (Compact 48-52px) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left Side: Subject Badge & File Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center shrink-0 border border-amber-200 shadow-xs">
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Excel: <span className="text-amber-700">{subjectName}</span>
              </h2>
              {isHumanistic && (
                <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded border border-purple-200">
                  Actividad 321
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {files.length === 0
                ? 'Sube tu archivo .xlsx, .xls o .csv de Humanísticas'
                : `${files[0].fileName} · ${matchedStudents.length} de ${students.length} alumnos vinculados`}
            </div>
          </div>
        </div>

        {/* Middle: File upload / Drag drop or active file list */}
        <div className="flex items-center gap-2 flex-1 justify-center min-w-[240px]">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
          ) : files.length === 0 ? (
            <div
              className={`border border-dashed rounded-lg px-3 py-1 flex items-center gap-2 cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-amber-500 bg-amber-50 scale-102'
                  : 'border-slate-300 hover:border-amber-400 hover:bg-amber-50/40 text-slate-600'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-semibold">Clic o arrastra el archivo de {subjectName}</span>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
                  e.target.value = '';
                }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg p-1 border border-slate-200 text-xs">
              <span
                className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded truncate max-w-[160px]"
                title={files[0].fileName}
              >
                {files[0].fileName}
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 transition-colors"
                title="Cambiar archivo"
              >
                <Upload className="w-2.5 h-2.5" /> Reemplazar
              </button>
              <button
                onClick={handleDelete}
                className="text-[10px] bg-red-50 hover:bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 transition-colors"
                title="Quitar archivo actual"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
                  e.target.value = '';
                }}
              />
            </div>
          )}
        </div>

        {/* Right Side: 1-Click Autollenar Todo & Close */}
        <div className="flex items-center gap-2 shrink-0">
          {files.length > 0 && (
            <div className="flex items-center gap-1.5">
              {/* Prominent Autollenar Todo el Curso Button */}
              {matchedStudents.length > 0 ? (
                <button
                  onClick={handleAutoFillAll}
                  className="flex items-center gap-1.5 bg-[#144C8A] hover:bg-[#0f3d70] text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95"
                  title="Autollenar todos los alumnos identificados en la matriz"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Autollenar Curso ({matchedStudents.length})</span>
                </button>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-1 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>0 alumnos vinculados</span>
                </span>
              )}

              {/* Status for single student if one is clicked in matrix */}
              {focusedStudent && (
                <div className="hidden sm:flex items-center gap-1">
                  {matchedRow ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      {focusedStudent.name.split(' ')[0]} listo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      {focusedStudent.name.split(' ')[0]} no hallado
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Cerrar barra de Excel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
