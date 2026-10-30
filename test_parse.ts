const targetSubject = "English";
let hasUpdates = false;
let targetProgress: any = {};

const parseStatus = (val: any) => {
    const s = String(val !== undefined && val !== null ? val : '').toLowerCase().trim();
    if (['cumplido', 'sí', 'si', 'yes', 'completado', 'done', 'true', '1', 'x', '10', 'ok'].includes(s)) return 'cumplido';
    if (['pendiente', 'proceso', 'in progress', 'pending', 'p'].includes(s)) return 'pendiente';
    if (['no_cumplido', 'no cumplido', 'no', 'falta', 'false', '0', 'n'].includes(s)) return 'no_cumplido';
    return undefined;
};
const parseGrade = (val: any) => {
    if (val === undefined || val === null || String(val).trim() === '') return undefined;
    const parsed = parseFloat(String(val).replace(',', '.'));
    return isNaN(parsed) ? undefined : parsed;
};

const assignTask = (w: number, task: string, val: any) => {
   if (!targetProgress[targetSubject]) targetProgress[targetSubject] = {};
   if (!targetProgress[targetSubject][w]) {
      targetProgress[targetSubject][w] = { weekNumber: w, tasks: { investiga: null, aplica: null, quiz: null, a321: null } };
   }
   
   const st = parseStatus(val);
   const gr = parseGrade(val);
   console.log(`Parsing ${task} in week ${w} with value ${val} -> status: ${st}, grade: ${gr}`);
   if (st || gr !== undefined) {
       const existingStatus = targetProgress[targetSubject][w].tasks[task as any]?.status;
       targetProgress[targetSubject][w].tasks[task as any] = {
           status: st || existingStatus || 'cumplido',
           grade: gr !== undefined ? gr : undefined
       };
       hasUpdates = true;
   }
};

const key = "modulo 1 semana 1 investiga";
const val = 10;
const weekMatch = key.match(/(?:semana|sem|s)[\s_-]*(\d+)/i);
if (weekMatch) {
    const w = parseInt(weekMatch[1], 10);
    assignTask(w, 'investiga', val);
}
console.log(hasUpdates, targetProgress);
