import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, LogOut, Layers, CheckCircle2, Cloud, ChevronDown, GraduationCap, School } from 'lucide-react';
import { User } from 'firebase/auth';
import { Level, Student } from '../hooks/useFirebaseData';

interface TeacherProfileDropdownProps {
  user: User;
  levels: Level[];
  students: Student[];
  onOpenLevelManager: () => void;
  onSignOut: () => void;
  isSaving: boolean;
}

export function TeacherProfileDropdown({
  user,
  levels,
  students,
  onOpenLevelManager,
  onSignOut,
  isSaving,
}: TeacherProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user.displayName || user.email?.split('@')[0] || 'Docente';
  const email = user.email || '';
  const photoURL = user.photoURL;

  // Initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-800 transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        title="Perfil de docente y opciones"
        aria-expanded={isOpen}
      >
        {photoURL ? (
          <img
            src={photoURL}
            alt={displayName}
            className="w-8 h-8 rounded-full border border-blue-400/40 object-cover shrink-0 shadow-sm"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#144C8A] to-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-blue-300/30 shadow-sm">
            {getInitials(displayName)}
          </div>
        )}

        <div className="hidden md:flex flex-col">
          <span className="text-xs font-semibold text-white truncate max-w-[120px] leading-tight">
            {displayName}
          </span>
          <span className="text-[10px] text-blue-300/80 font-medium leading-none">
            Docente
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden sm:block ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* User Header */}
          <div className="p-4 bg-slate-800/80 border-b border-slate-700/60">
            <div className="flex items-center gap-3">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={displayName}
                  className="w-11 h-11 rounded-full border-2 border-blue-400/40 object-cover shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#144C8A] to-blue-500 text-white font-bold text-sm flex items-center justify-center shrink-0 border border-blue-300/30">
                  {getInitials(displayName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{displayName}</p>
                <p className="text-xs text-slate-400 truncate">{email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-400">
                    {isSaving ? 'Guardando cambios...' : 'Conectado a la nube'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/40 border-b border-slate-700/60 text-center">
            <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/40">
              <span className="text-base font-extrabold text-blue-400 block">{levels.length}</span>
              <span className="text-[10px] font-medium text-slate-400">Cursos / Niveles</span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/40">
              <span className="text-base font-extrabold text-emerald-400 block">{students.length}</span>
              <span className="text-[10px] font-medium text-slate-400">Total Alumnos</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2 space-y-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenLevelManager();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-left"
            >
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Administrar Cursos y Niveles</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
