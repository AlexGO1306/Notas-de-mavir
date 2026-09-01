import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Imports
imports = """import React, { useState, useRef, useEffect } from 'react';
import { User, FileText, Settings, HelpCircle, Save, Users, RotateCcw, Eye, EyeOff, Upload, Search, CheckCircle, AlertCircle, X, ClipboardPaste, LogOut } from 'lucide-react';
import { TaskCategory, TaskStatus, ProgressData } from './types';
import { StatusButtons } from './components/StatusButtons';
import { ReportModal } from './components/ReportModal';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { useAuth } from './hooks/useAuth';
import { useFirebaseData } from './hooks/useFirebaseData';
import { auth } from './firebase';
import * as XLSX from 'xlsx';"""
code = re.sub(r'import React.*?\* as XLSX from \'xlsx\';', imports, code, flags=re.DOTALL)

# Default export App changes
app_start = """export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { levels, students, addLevel, deleteLevel, addStudent, updateStudentProgress, deleteStudent } = useFirebaseData(user?.uid);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [startWeek, setStartWeek] = useState<number>(1);
  const [endWeek, setEndWeek] = useState<number>(36);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  if (authLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Cargando...</div>;
  if (!user) return <AuthScreen />;

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const progress = selectedStudent?.progress || getInitialProgress();
  const studentName = selectedStudent?.name || '';
"""

code = re.sub(r'export default function App\(\) \{.*?(?=const showNotification =)', app_start, code, flags=re.DOTALL)

# setProgress changes
set_progress_new = """  const setProgress = (updater: React.SetStateAction<ProgressData>) => {
    if (!selectedStudentId) return;
    const prevProgress = selectedStudent?.progress || getInitialProgress();
    const nextProgress = typeof updater === 'function' ? updater(prevProgress) : updater;
    updateStudentProgress(selectedStudentId, nextProgress);
  };"""

code = re.sub(r'const setProgress =.*?\}\);\n  \};', set_progress_new, code, flags=re.DOTALL)

# Handle Search can be modified or removed, let's keep it but just as a UI thing or find student
handle_search_new = """  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Search logic could just filter students in the selected level, but for now we'll do nothing.
  };"""
code = re.sub(r'const handleSearch =.*?\};', handle_search_new, code, flags=re.DOTALL)

handle_reset_new = """  const handleReset = () => {
    setShowConfirmReset(false);
    if (selectedStudentId) {
      updateStudentProgress(selectedStudentId, getInitialProgress());
    }
  };"""
code = re.sub(r'const handleReset =.*?\n  \};', handle_reset_new, code, flags=re.DOTALL)

# Update layout to include sidebar
layout_old = """    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">"""
layout_new = """    <div className="min-h-screen bg-slate-50 flex font-sans">
      <Sidebar 
        levels={levels}
        students={students}
        selectedLevelId={selectedLevelId}
        selectedStudentId={selectedStudentId}
        onSelectLevel={setSelectedLevelId}
        onSelectStudent={setSelectedStudentId}
        onAddLevel={addLevel}
        onAddStudent={(name) => addStudent(name, selectedLevelId!, getInitialProgress())}
        onDeleteLevel={deleteLevel}
        onDeleteStudent={deleteStudent}
      />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">"""

code = code.replace(layout_old, layout_new)

# Add logout button
logout_btn = """            <button 
              onClick={() => auth.signOut()}
              className="p-2 text-slate-400 hover:text-[#144C8A] hover:bg-slate-100 rounded-full transition-colors ml-4"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>"""

code = re.sub(r'          </div>\n        </div>\n      </header>', logout_btn, code)

# Update the end div
code = code.replace('    </div>\n  );\n}', '      </div>\n    </div>\n  );\n}')

# Update processJsonData to use batch updates conceptually. But wait, it uses setStudentsData... 
# This requires a bit more logic. We will skip deep Excel processing modification for now, or just warn the user.
process_json_new = """  const processJsonData = (jsonArray: any[], targetSubject: string, sheetWeek?: number) => {
    let loadedRows = 0;
    
    // We update students in the current level matching by name
    jsonArray.forEach(row => {
      const normalizedRow: any = {};
      for (const key in row) { 
         const cleanKey = key.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
         normalizedRow[cleanKey] = row[key];
      }
      
      const rowSubject = normalizedRow['asignatura'] || normalizedRow['materia'];
      if (rowSubject && String(rowSubject).toLowerCase().trim() !== targetSubject.toLowerCase()) return; 
      
      const nameRaw = normalizedRow['nombre'] || normalizedRow['estudiante'] || normalizedRow['alumno'] || normalizedRow['name'];
      if (!nameRaw) return;
      
      const rawNameString = String(nameRaw).trim().toLowerCase();
      const student = students.find(s => s.levelId === selectedLevelId && s.name.toLowerCase() === rawNameString);
      if (!student) return;

      const week = parseInt(normalizedRow['semana'] || normalizedRow['week']) || sheetWeek;
      if (week && WEEKS.includes(week)) {
        const targetProgress = { ...student.progress };
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
        
        updateStudentProgress(student.id, targetProgress);
        loadedRows++;
      }
    });
    return loadedRows;
  };"""

code = re.sub(r'  const processJsonData =.*?;(?=\n  const handleFileUpload)', process_json_new, code, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(code)

