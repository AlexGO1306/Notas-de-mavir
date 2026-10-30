const headers = [
  "Colegio Nómina",
  "1 Middle Semana 1 Inv",
  "Módulo 1 Semana 1 Quiz",
  "Semana 2 Feedback",
  "Promedio",
  "Total",
  "Comentarios del profesor"
];

const standardizeHeader = (h: string) => {
  const norm = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (norm.includes('nombre') || norm.includes('nomina') || norm.includes('estudiante') || norm === 'name' || norm === 'student' || norm.includes('apellidos')) {
    return 'Nombre';
  }
  
  if (norm.includes('comentario')) {
    return 'Comentarios';
  }
  
  const modMatch = norm.match(/m[oó]dulo\s*(\d+)/i) || norm.match(/\b(\d+)\s*middle\b/i) || norm.match(/\bm(\d+)\b/i);
  const semMatch = norm.match(/(?:semana|sem|s)\s*(\d+)/i) || norm.match(/\bs(\d+)\b/i);
  
  if (semMatch) {
     const sem = semMatch[1];
     // Try to find a module number, if not, maybe just extract the first number that is NOT the week number
     let mod = modMatch ? modMatch[1] : '';
     if (!mod) {
         const allNums = norm.match(/\d+/g);
         if (allNums && allNums.length > 1) {
             // Assume the first number is module if it's before week
             if (norm.indexOf(allNums[0]) < norm.indexOf(sem)) {
                 mod = allNums[0];
             }
         }
     }
     
     let task = '';
     if (norm.includes('inv') || norm.includes('investiga') || norm.match(/\bi\b/)) task = 'Investiga';
     else if (norm.includes('quiz') || norm.includes('prueba') || norm.match(/\bq\b/)) task = 'Quiz';
     else if (norm.includes('feedback') || norm.includes('apl') || norm.includes('aplica') || norm.match(/\ba\b/)) task = 'Feedback';
     else if (norm.includes('321')) task = '321';
     
     if (task) {
        return `Módulo ${mod || '#'} Semana ${sem} ${task}`;
     }
  }
  
  return null;
}

const standardizedHeaders = headers.map(standardizeHeader);
console.log(standardizedHeaders);
