import { TaskCategory } from './types';

export const WEEKS = Array.from({ length: 36 }, (_, i) => i + 1);

export interface SubjectConfig {
  name: string;
  shortName: string;
  color: {
    bg: string;
    text: string;
    border: string;
    badge: string;
    accent: string;
  };
  has321: boolean;
}

export const SUBJECT_CONFIGS: SubjectConfig[] = [
  {
    name: 'Matemáticas',
    shortName: 'MAT',
    color: {
      bg: 'bg-blue-50',
      text: 'text-blue-900',
      border: 'border-blue-300',
      badge: 'bg-blue-600 text-white',
      accent: '#2563eb'
    },
    has321: false,
  },
  {
    name: 'Inglés',
    shortName: 'ING',
    color: {
      bg: 'bg-sky-50',
      text: 'text-sky-900',
      border: 'border-sky-300',
      badge: 'bg-sky-600 text-white',
      accent: '#0284c7'
    },
    has321: false,
  },
  {
    name: 'Humanísticas',
    shortName: 'HUM',
    color: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-300',
      badge: 'bg-amber-600 text-white',
      accent: '#d97706'
    },
    has321: true,
  },
  {
    name: 'Empresarial',
    shortName: 'EMP',
    color: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-900',
      border: 'border-emerald-300',
      badge: 'bg-emerald-600 text-white',
      accent: '#059669'
    },
    has321: false,
  },
  {
    name: 'Tecnología',
    shortName: 'TEC',
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-900',
      border: 'border-purple-300',
      badge: 'bg-purple-600 text-white',
      accent: '#9333ea'
    },
    has321: false,
  },
  {
    name: 'Ciencias Biológicas',
    shortName: 'BIO',
    color: {
      bg: 'bg-teal-50',
      text: 'text-teal-900',
      border: 'border-teal-300',
      badge: 'bg-teal-600 text-white',
      accent: '#0d9488'
    },
    has321: true,
  },
];

export const TASK_CATEGORIES: { id: TaskCategory; label: string; fullName: string }[] = [
  { id: 'investiga', label: 'I', fullName: 'Investigación' },
  { id: 'aplica', label: 'A', fullName: 'Aplicación' },
  { id: 'quiz', label: 'Q', fullName: 'Quiz' },
  { id: 'a321', label: '321', fullName: 'Actividad 321' },
];

export function getTasksForSubjectAndWeek(subjectName: string, week: number): { id: TaskCategory; label: string; fullName: string }[] {
  const sNorm = subjectName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const isHumanOrBio = sNorm.includes('human') || sNorm.includes('biolog');
  
  return TASK_CATEGORIES.filter(cat => {
    if (cat.id === 'a321' && !isHumanOrBio) return false;
    if (sNorm.includes('empresar') && week === 11 && cat.id === 'quiz') return false;
    return true;
  });
}
