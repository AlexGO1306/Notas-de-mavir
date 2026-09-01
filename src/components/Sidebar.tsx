import React, { useState } from 'react';
import { User, Users, Plus, Trash2, ChevronRight, GraduationCap, School } from 'lucide-react';
import { Level, Student } from '../hooks/useFirebaseData';

interface SidebarProps {
  levels: Level[];
  students: Student[];
  selectedLevelId: string | null;
  selectedStudentId: string | null;
  onSelectLevel: (id: string | null) => void;
  onSelectStudent: (id: string | null) => void;
  onAddLevel: (name: string) => void;
  onAddStudent: (name: string) => void;
  onDeleteStudent: (id: string) => void;
  onDeleteLevel: (id: string) => void;
}

export function Sidebar({
  levels,
  students,
  selectedLevelId,
  selectedStudentId,
  onSelectLevel,
  onSelectStudent,
  onAddLevel,
  onAddStudent,
  onDeleteStudent,
  onDeleteLevel
}: SidebarProps) {
  const [newLevelName, setNewLevelName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');

  const handleAddLevel = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLevelName.trim();
    if (trimmed) {
      onAddLevel(trimmed);
      setNewLevelName('');
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStudentName.trim();
    if (trimmed && selectedLevelId) {
      onAddStudent(trimmed);
      setNewStudentName('');
    }
  };

  const filteredStudents = students.filter(s => s.levelId === selectedLevelId);

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto border-r border-slate-800 z-40">
      <div className="p-5 flex-1 flex flex-col">
        {/* Brand */}
        <div className="flex items-center gap-3 text-white mb-6 pb-4 border-b border-slate-800">
          <div className="bg-[#144C8A] p-2.5 rounded-xl shadow-md flex items-center justify-center">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block text-white">Mavir School</span>
            <span className="text-[0.7rem] text-slate-400 font-medium block">Sistema de Seguimiento</span>
          </div>
        </div>

        {/* Levels Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">Cursos / Niveles</h2>
            <span className="text-xs text-slate-500 font-medium">{levels.length}</span>
          </div>
          
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {levels.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2 px-2">No hay niveles creados aún.</p>
            ) : (
              levels.map(level => {
                const count = students.filter(s => s.levelId === level.id).length;
                const isSelected = selectedLevelId === level.id;
                return (
                  <div key={level.id} className="group flex items-center justify-between rounded-lg">
                    <button
                      onClick={() => {
                        onSelectLevel(level.id);
                        onSelectStudent(null);
                      }}
                      className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg transition-all text-xs font-medium ${
                        isSelected 
                          ? 'bg-[#144C8A] text-white shadow-sm' 
                          : 'hover:bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{level.name}</span>
                      </div>
                      <span className={`text-[0.65rem] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        if (window.confirm(`¿Eliminar el nivel "${level.name}" y sus registros?`)) {
                          onDeleteLevel(level.id);
                        }
                      }} 
                      className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 rounded"
                      title="Eliminar nivel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
          
          <form onSubmit={handleAddLevel} className="mt-3 flex gap-1.5">
            <input
              type="text"
              value={newLevelName}
              onChange={(e) => setNewLevelName(e.target.value)}
              placeholder="+ Nuevo nivel..."
              className="flex-1 bg-slate-800/80 text-xs border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-[#144C8A] focus:border-[#144C8A] outline-none"
            />
            <button 
              type="submit" 
              disabled={!newLevelName.trim()}
              className="bg-[#144C8A] hover:bg-[#0f3d70] disabled:opacity-40 disabled:hover:bg-[#144C8A] text-white p-1.5 rounded-lg transition-colors"
              title="Agregar nivel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Quick Students List for active level */}
        {selectedLevelId && (
          <div className="flex-1 flex flex-col min-h-0 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-[#F49F2D]" />
                Alumnos
              </h2>
              <span className="text-xs text-slate-500 font-medium">{filteredStudents.length}</span>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto pr-1">
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2 px-2">No hay alumnos en este nivel.</p>
              ) : (
                filteredStudents.map((student, idx) => (
                  <div key={student.id} className="group flex items-center justify-between rounded-lg">
                    <button
                      onClick={() => onSelectStudent(student.id)}
                      className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-xs text-left truncate ${
                        selectedStudentId === student.id 
                          ? 'bg-slate-800 text-white font-medium' 
                          : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-[0.65rem] text-slate-500 w-4">{idx + 1}.</span>
                      <span className="truncate">{student.name}</span>
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        if (window.confirm(`¿Eliminar al estudiante "${student.name}"?`)) {
                          onDeleteStudent(student.id);
                        }
                      }} 
                      className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      title="Eliminar alumno"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <form onSubmit={handleAddStudent} className="mt-3 flex gap-1.5 pt-2 border-t border-slate-800/60">
              <input
                type="text"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="+ Nuevo alumno..."
                className="flex-1 bg-slate-800/80 text-xs border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-[#144C8A] focus:border-[#144C8A] outline-none"
              />
              <button 
                type="submit" 
                disabled={!newStudentName.trim()}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white p-1.5 rounded-lg transition-colors"
                title="Agregar alumno"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

