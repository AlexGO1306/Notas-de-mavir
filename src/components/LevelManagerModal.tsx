import React, { useState } from 'react';
import { School, Plus, Trash2, Edit3, Check, X, Users, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { Level, Student } from '../hooks/useFirebaseData';

interface LevelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  levels: Level[];
  students: Student[];
  selectedLevelId: string | null;
  onSelectLevel: (levelId: string) => void;
  onAddLevel: (name: string) => Promise<string | undefined>;
  onUpdateLevel: (levelId: string, newName: string) => Promise<boolean>;
  onDeleteLevel: (levelId: string) => Promise<boolean>;
  showNotification: (message: string, type: 'success' | 'error') => void;
}

export function LevelManagerModal({
  isOpen,
  onClose,
  levels,
  students,
  selectedLevelId,
  onSelectLevel,
  onAddLevel,
  onUpdateLevel,
  onDeleteLevel,
  showNotification,
}: LevelManagerModalProps) {
  const [newLevelName, setNewLevelName] = useState('');
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [levelToDelete, setLevelToDelete] = useState<Level | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLevelName.trim();
    if (!trimmed) {
      showNotification('Ingresa un nombre para el nivel.', 'error');
      return;
    }
    if (trimmed.length > 100) {
      showNotification('El nombre no puede superar los 100 caracteres.', 'error');
      return;
    }

    const duplicate = levels.some(
      (l) => l.name.toLowerCase().trim() === trimmed.toLowerCase()
    );
    if (duplicate) {
      showNotification(`Ya existe un nivel llamado "${trimmed}". Elige otro nombre.`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const id = await onAddLevel(trimmed);
      if (id) {
        setNewLevelName('');
        onSelectLevel(id);
        showNotification(`Nivel "${trimmed}" creado e ingresado.`, 'success');
      }
    } catch {
      showNotification('Error al crear el nivel.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (level: Level) => {
    setEditingLevelId(level.id);
    setEditingName(level.name);
  };

  const handleSaveEdit = async (levelId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      showNotification('El nombre no puede estar vacío.', 'error');
      return;
    }
    if (trimmed.length > 100) {
      showNotification('El nombre no puede superar los 100 caracteres.', 'error');
      return;
    }

    const duplicate = levels.some(
      (l) => l.id !== levelId && l.name.toLowerCase().trim() === trimmed.toLowerCase()
    );
    if (duplicate) {
      showNotification(`Ya existe otro nivel con el nombre "${trimmed}".`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onUpdateLevel(levelId, trimmed);
      if (ok) {
        showNotification(`Nivel renombrado a "${trimmed}".`, 'success');
        setEditingLevelId(null);
      } else {
        showNotification('No se pudo renombrar el nivel.', 'error');
      }
    } catch {
      showNotification('Error al actualizar el nivel.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!levelToDelete) return;
    setIsDeleting(true);
    const target = levelToDelete;
    try {
      const ok = await onDeleteLevel(target.id);
      if (ok) {
        showNotification(`Nivel "${target.name}" eliminado correctamente.`, 'success');
        setLevelToDelete(null);
      } else {
        showNotification('Error al eliminar el nivel.', 'error');
      }
    } catch {
      showNotification('Error al eliminar el nivel.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-[#144C8A] p-2 rounded-xl">
              <School className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Gestión de Cursos y Niveles</h2>
              <p className="text-xs text-slate-400">
                Crea, ingresa, edita o elimina los niveles educativos de tu institución
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Create Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#144C8A]" />
              Crear Nuevo Nivel
            </h3>
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                type="text"
                value={newLevelName}
                onChange={(e) => setNewLevelName(e.target.value)}
                placeholder="Ej. 1ro Bachillerato A, 10mo EGB, Primaria 3..."
                maxLength={100}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#144C8A] focus:border-[#144C8A] outline-none"
              />
              <button
                type="submit"
                disabled={!newLevelName.trim() || isSubmitting}
                className="bg-[#144C8A] hover:bg-[#0f3d70] disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Crear e Ingresar
              </button>
            </form>
          </div>

          {/* Levels List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Niveles Registrados ({levels.length})
              </h3>
              <span className="text-xs text-slate-400">
                Haz clic en "Ingresar" para seleccionar un curso
              </span>
            </div>

            {levels.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <School className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-slate-600">Aún no hay niveles registrados</p>
                <p className="text-xs text-slate-400 mt-1">
                  Usa el formulario superior para crear el primero.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {levels.map((level) => {
                  const isSelected = selectedLevelId === level.id;
                  const studentCount = students.filter((s) => s.levelId === level.id).length;
                  const isEditing = editingLevelId === level.id;

                  return (
                    <div
                      key={level.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-200 ring-1 ring-blue-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Name / Edit input */}
                      <div className="flex-1 mr-3 flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-[#144C8A] text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <School className="w-4 h-4" />
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(level.id);
                                if (e.key === 'Escape') setEditingLevelId(null);
                              }}
                              autoFocus
                              maxLength={100}
                              className="flex-1 bg-white border border-blue-400 rounded-md px-2.5 py-1 text-sm font-semibold text-slate-900 outline-none ring-2 ring-blue-200"
                            />
                            <button
                              onClick={() => handleSaveEdit(level.id)}
                              disabled={isSubmitting}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"
                              title="Guardar nombre"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingLevelId(null)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-800 truncate">
                                {level.name}
                              </span>
                              {isSelected && (
                                <span className="bg-[#144C8A] text-white text-[0.65rem] font-bold px-2 py-0.5 rounded-full">
                                  Nivel Actual
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span>{studentCount} estudiante{studentCount === 1 ? '' : 's'}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {!isSelected ? (
                            <button
                              onClick={() => {
                                onSelectLevel(level.id);
                                showNotification(`Ingresaste al nivel "${level.name}".`, 'success');
                                onClose();
                              }}
                              className="flex items-center gap-1 bg-[#144C8A] hover:bg-[#0f3d70] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                            >
                              Ingresar
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg">
                              Seleccionado
                            </span>
                          )}

                          <button
                            onClick={() => handleStartEdit(level)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Renombrar nivel"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setLevelToDelete(level)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar nivel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Total: {levels.length} cursos configurados</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-semibold text-slate-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Delete Confirmation In-App Modal */}
      {levelToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              ¿Eliminar el nivel "{levelToDelete.name}"?
            </h3>

            <p className="text-sm text-slate-600 text-center mb-4">
              Esta acción eliminará de forma irreversible este curso junto con{' '}
              <strong className="text-red-600">
                {students.filter((s) => s.levelId === levelToDelete.id).length} estudiantes
              </strong>{' '}
              y todas sus notas registradas.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-6">
              💡 Tip: Si solo querías corregir el nombre del curso, usa la opción de{' '}
              <strong>Renombrar (icono lápiz)</strong> para no perder los datos de tus alumnos.
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setLevelToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar nivel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
