export type TaskCategory = 'investiga' | 'aplica' | 'quiz' | 'a321';
export type TaskStatus = 'cumplido' | 'pendiente' | 'no_cumplido' | null;

export interface WeekData {
  weekNumber: number;
  tasks: Record<TaskCategory, TaskStatus>;
}

export type ProgressData = Record<string, Record<number, WeekData>>;
