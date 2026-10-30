import React, { useState } from 'react';
import {
  School,
  GraduationCap,
  Users,
  Plus,
  ArrowRight,
  Layers,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Keyboard,
  ShieldCheck,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { Level, Student } from '../hooks/useFirebaseData';
import { SUBJECT_CONFIGS } from '../constants';
import { User } from 'firebase/auth';

interface TeacherDashboardProps {
  user: User;
  levels: Level[];
  students: Student[];
  onSelectLevel: (levelId: string) => void;
  onOpenLevelManager: () => void;
  onAddLevel: (name: string) => Promise<string | undefined>;
}

export function TeacherDashboard({
  user,
  levels,
  students,
  onSelectLevel,
  onOpenLevelManager,
  onAddLevel,
}: TeacherDashboardProps) {
  const [newCourseName, setNewCourseName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayName = user.displayName || user.email?.split('@')[0] || 'Docente';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCourseName.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    const newId = await onAddLevel(trimmed);
    if (newId) {
      setNewCourseName('');
      onSelectLevel(newId);
    }
    setIsSubmitting(false);
  };

  const suggestions = ['1ro Bach A', '2do Bach B', '3ro Técnico', '10mo EGB'];

  return (
    <div className="h-full max-h-full flex flex-col max-w-6xl mx-auto w-full gap-2.5 overflow-hidden animate-in fade-in duration-150">
      {/* Compact Top Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#144C8A] to-slate-900 text-white rounded-xl px-4 py-2.5 shadow-sm border border-slate-700/60 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-[#144C8A] p-2 rounded-lg shadow-sm border border-blue-400/20 shrink-0 flex items-center justify-center">
            <School className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight truncate">
                ¡Bienvenido, {displayName}!
              </h1>
              <span className="hidden md:inline-flex text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-semibold border border-blue-400/20">
                Perfil Docente
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate hidden sm:block">
              Mavir School · Seguimiento Semanal y Calificaciones
            </p>
          </div>
        </div>

        {/* Center / Right KPIs (compact inline) */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 bg-black/25 px-3 py-1 rounded-lg border border-white/10 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-xs">{levels.length}</span>
              <span className="text-[11px] text-blue-200">Cursos</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-xs">{students.length}</span>
              <span className="text-[11px] text-blue-200">Alumnos</span>
            </div>
            <span className="text-white/20 hidden md:inline">|</span>
            <div className="hidden md:flex items-center gap-1.5">
              <span className="font-extrabold text-white text-xs">{SUBJECT_CONFIGS.length}</span>
              <span className="text-[11px] text-blue-200">Materias</span>
            </div>
          </div>

          <button
            onClick={onOpenLevelManager}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-sm border border-white/15 transition-all shadow-xs active:scale-95 shrink-0"
            title="Administrar o reorganizar cursos"
          >
            <Layers className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Gestionar Niveles</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid (Fills remaining height without scrolling) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
        {/* Left Column (8 cols): Courses Section */}
        <div className="lg:col-span-8 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200/80 shadow-xs p-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#144C8A]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Tus Cursos y Grados
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {levels.length} curso{levels.length === 1 ? '' : 's'} registrado{levels.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Courses Container */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {levels.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                <div className="w-10 h-10 bg-blue-50 text-[#144C8A] rounded-xl flex items-center justify-center mb-2">
                  <School className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Aún no tienes cursos creados</h3>
                <p className="text-xs text-slate-500 max-w-xs mb-3">
                  Usa el panel de la derecha para crear tu primer grado e iniciar el registro de estudiantes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {levels.map((lvl) => {
                  const count = students.filter((s) => s.levelId === lvl.id).length;
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => onSelectLevel(lvl.id)}
                      className="p-3 rounded-xl bg-slate-50/70 hover:bg-blue-50/40 border border-slate-200 hover:border-[#144C8A] hover:shadow-xs transition-all text-left flex flex-col justify-between group h-[88px]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded inline-block mb-1">
                            Grado
                          </span>
                          <h3 className="font-bold text-slate-900 group-hover:text-[#144C8A] text-xs sm:text-sm truncate leading-tight transition-colors">
                            {lvl.name}
                          </h3>
                        </div>
                        <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 group-hover:bg-[#144C8A] group-hover:text-white group-hover:border-[#144C8A] flex items-center justify-center transition-colors shrink-0 text-slate-400">
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-200/60">
                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                          <Users className="w-3 h-3 text-slate-400" />
                          {count} estudiante{count === 1 ? '' : 's'}
                        </span>
                        <span className="text-[11px] font-bold text-[#144C8A] group-hover:underline flex items-center gap-0.5">
                          Abrir Matriz →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Quick Add & Hints */}
        <div className="lg:col-span-4 flex flex-col min-h-0 gap-2.5">
          {/* Quick Create Box */}
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs shrink-0">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider mb-2">
              <Plus className="w-3.5 h-3.5 text-[#144C8A]" />
              <span>Crear Nuevo Curso</span>
            </div>

            <form onSubmit={handleCreate} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="Ej: 1ro Bachillerato A"
                  maxLength={100}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-[#144C8A] focus:bg-white outline-none"
                />
                <button
                  type="submit"
                  disabled={!newCourseName.trim() || isSubmitting}
                  className="bg-[#144C8A] hover:bg-[#0f3d70] disabled:opacity-40 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-xs transition-all shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? '...' : 'Crear'}</span>
                </button>
              </div>

              {/* Suggestions chips in single row */}
              <div className="flex items-center gap-1 flex-wrap">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setNewCourseName(sug)}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Interactive Quick Tips & Shortcuts */}
          <div className="flex-1 min-h-0 bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between text-xs overflow-hidden">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Atajos y Funciones Rápidas</span>
              </div>

              {/* Keyboard shortcuts */}
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200/60 shadow-xs">
                  <span className="w-4 h-4 rounded bg-green-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0">10</span>
                  <span className="truncate"><strong>10</strong> o clic: Cumplido</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200/60 shadow-xs">
                  <span className="w-4 h-4 rounded bg-yellow-400 text-yellow-900 font-bold text-[9px] flex items-center justify-center shrink-0">P</span>
                  <span className="truncate"><strong>P</strong>: Pendiente</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200/60 shadow-xs">
                  <span className="w-4 h-4 rounded bg-red-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0">0</span>
                  <span className="truncate"><strong>0</strong>: No Cumplido</span>
                </div>
              </div>

              <div className="flex items-start gap-1.5 pt-1 text-[11px] text-slate-600 leading-tight">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Autollenado Excel:</strong> Usa el icono de hoja en cada materia para importar notas de todas las semanas a la vez.
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Nube Firebase en tiempo real</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sincronizado
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
