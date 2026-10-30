const parseStatus = (val: any): string | undefined => {
    const s = String(val !== undefined && val !== null ? val : '').toLowerCase().trim();
    if (['cumplido', 'sí', 'si', 'yes', 'completado', 'done', 'true', '1', 'x', '10', 'ok'].includes(s)) return 'cumplido';
    if (['pendiente', 'proceso', 'in progress', 'pending', 'p'].includes(s)) return 'pendiente';
    if (['no_cumplido', 'no cumplido', 'no', 'falta', 'false', '0', 'n'].includes(s)) return 'no_cumplido';
    
    // Check if it's a number
    const parsed = parseFloat(s.replace(',', '.'));
    if (!isNaN(parsed)) {
       return parsed > 0 ? 'cumplido' : 'no_cumplido';
    }
    
    // Maybe checking length if it's just some text that means they did it? No, keep it safe
    if (s.length > 0) return 'cumplido'; // Wait, should any text be cumplido? Let's just do numbers for now
    
    return undefined;
};
console.log("8 =>", parseStatus("8"));
console.log("0 =>", parseStatus("0"));
console.log("Text =>", parseStatus("Entregado con retraso"));
