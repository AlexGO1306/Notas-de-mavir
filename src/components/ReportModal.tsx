import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import {
  Download,
  XIcon,
  Award,
  AlertCircle,
  Calendar,
  GraduationCap,
  UserCircle,
  Send,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ProgressData } from '../types';
import { SUBJECT_CONFIGS, TASK_CATEGORIES } from '../constants';

interface ReportModalProps {
  studentName: string;
  levelName?: string;
  data: ProgressData;
  onClose: () => void;
}

export function ReportModal({ studentName, levelName, data, onClose }: ReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showMessagePreview, setShowMessagePreview] = useState(false);

  const DREAMCLASS_URL = 'https://portal.mavir.org/teachers-app/periods/45/dashboard';

  const handleExport = async () => {
    if (!reportRef.current) return;
    try {
      setIsExporting(true);
      await new Promise(r => setTimeout(r, 150)); 
      
      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const link = document.createElement('a');
      link.download = `reporte-academico-${studentName || 'estudiante'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
    } finally {
      setIsExporting(false);
    }
  };

  const copyImageToClipboard = async (): Promise<boolean> => {
    if (!reportRef.current) return false;
    try {
      setIsCopyingImage(true);
      await new Promise(r => setTimeout(r, 120));
      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 4000);
        return true;
      } else {
        const link = document.createElement('a');
        link.download = `reporte-academico-${studentName || 'estudiante'}.png`;
        link.href = dataUrl;
        link.click();
        return true;
      }
    } catch (err) {
      console.error('Failed to copy image to clipboard', err);
      return false;
    } finally {
      setIsCopyingImage(false);
    }
  };

  const handleDispatchToDreamClass = async () => {
    await copyImageToClipboard();
    window.open(DREAMCLASS_URL, '_blank', 'noopener,noreferrer');
  };

  let totalEvaluated = 0;
  let totalCompleted = 0;
  let totalIncomplete = 0;
  
  const pendingTasksList: { subject: string; week: number; taskName: string; status: string }[] = [];
  const subjectSummary: { subject: string; completed: number; incomplete: number }[] = [];

  Object.entries(data).forEach(([subject, weeks]) => {
    let subCompleted = 0;
    let subIncomplete = 0;

    Object.entries(weeks).forEach(([weekStr, weekData]) => {
      const week = parseInt(weekStr);
      Object.entries(weekData.tasks).forEach(([taskKey, status]) => {
        if (status !== null) {
          totalEvaluated++;
          if (status === 'cumplido') {
            subCompleted++;
            totalCompleted++;
          } else if (status === 'no_cumplido' || status === 'pendiente') {
            subIncomplete++;
            totalIncomplete++;
            const taskLabel = TASK_CATEGORIES.find(c => c.id === taskKey)?.fullName || taskKey.toUpperCase();
            pendingTasksList.push({ subject, week, taskName: taskLabel, status });
          }
        }
      });
    });

    subjectSummary.push({
      subject,
      completed: subCompleted,
      incomplete: subIncomplete
    });
  });

  const pendingBySubject: Record<string, { subject: string; week: number; taskName: string; status: string }[]> = {};
  pendingTasksList.forEach(task => {
    if (!pendingBySubject[task.subject]) pendingBySubject[task.subject] = [];
    pendingBySubject[task.subject].push(task);
  });

  const percentage = totalEvaluated > 0 ? Math.round((totalCompleted / totalEvaluated) * 100) : 0;

  let observationText = '';
  if (percentage >= 90) {
    observationText = "Felicitamos al estudiante por su excelente compromiso, responsabilidad y constancia en el cumplimiento de las actividades académicas propuestas.";
  } else if (percentage >= 75) {
    observationText = "El estudiante presenta un buen nivel de cumplimiento. Se recomienda continuar fortaleciendo hábitos de organización y entrega oportuna de sus actividades.";
  } else {
    observationText = "Se sugiere reforzar el acompañamiento en casa para favorecer el cumplimiento de las actividades pendientes y fortalecer hábitos de estudio que contribuyan al desarrollo académico del estudiante.";
  }

  if (pendingTasksList.length > 0) {
    observationText += " Se requiere el apoyo familiar para poner al día las actividades no cumplidas a la brevedad posible.";
  }

  const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  const directedMessage = `Estimado(a) representante de ${studentName || 'el/la estudiante'}:

Reciba un cordial saludo de Mavir School. Le comparto el informe oficial de cumplimiento académico actualizado correspondiente al presente período formativo.
• Rendimiento global: ${percentage}% de actividades cumplidas.
• Actividades pendientes registradas: ${pendingTasksList.length}.

Le invitamos a revisar la imagen adjunta para conocer el detalle de cada asignatura y semana de estudio.

Atentamente,
Docente Mavir School`;

  const copyMessageToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(directedMessage);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between p-3.5 sm:p-4 border-b bg-slate-50 gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800">Vista Previa del Informe</h2>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold truncate max-w-[200px]">
              {studentName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDispatchToDreamClass}
              disabled={isCopyingImage}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-70"
              title="Copiar imagen del reporte y abrir DreamClass"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isCopyingImage ? 'Preparando...' : 'Despachar a DreamClass'}</span>
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 bg-[#144C8A] hover:bg-[#0f3d70] text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-70"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generando...' : 'Descargar Imagen'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DreamClass Quick Assistant Bar */}
        <div className="bg-emerald-50/80 border-b border-emerald-200 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-bold text-emerald-950">Despacho DreamClass Mavir:</span>
              <span className="text-[11px] text-emerald-800">
                1 clic copia la imagen y abre DreamClass. Solo haz <strong>Ctrl + V</strong> para pegar y enviar.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyMessageToClipboard}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-emerald-300 bg-white hover:bg-emerald-100/60 text-emerald-800 font-bold text-[11px] transition-all shadow-2xs active:scale-95"
              title="Copiar mensaje de texto personalizado para el representante"
            >
              {copiedText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedText ? '¡Mensaje Copiado!' : 'Copiar Mensaje'}</span>
            </button>

            <button
              onClick={copyImageToClipboard}
              disabled={isCopyingImage}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-emerald-300 bg-white hover:bg-emerald-100/60 text-emerald-800 font-bold text-[11px] transition-all shadow-2xs active:scale-95 disabled:opacity-70"
              title="Copiar imagen del reporte al portapapeles"
            >
              {copiedImage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedImage ? '¡Imagen Copiada!' : 'Copiar Imagen'}</span>
            </button>

            <a
              href={DREAMCLASS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md font-bold text-[11px] transition-all shadow-2xs"
              title="Ir a DreamClass en portal.mavir.org"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Abrir Portal</span>
            </a>

            <button
              onClick={() => setShowMessagePreview(!showMessagePreview)}
              className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-semibold ml-1"
            >
              {showMessagePreview ? 'Ocultar texto' : 'Ver texto'}
            </button>
          </div>
        </div>

        {/* Message Preview Drawer if toggled */}
        {showMessagePreview && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 text-xs">
            <div className="max-w-2xl mx-auto bg-white p-3 rounded-lg border border-emerald-200 text-slate-700 whitespace-pre-line font-sans shadow-2xs">
              <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Mensaje dirigido sugerido</span>
                <button
                  onClick={copyMessageToClipboard}
                  className="text-emerald-700 hover:underline flex items-center gap-0.5 lowercase"
                >
                  <Copy className="w-3 h-3" /> copiar
                </button>
              </div>
              {directedMessage}
            </div>
          </div>
        )}

        {/* Scrollable Report Content */}
        <div className="p-8 overflow-y-auto bg-slate-100 flex-1">
          {/* Real Report Canvas */}
          <div 
            ref={reportRef} 
            className="bg-white mx-auto shadow-sm relative"
            style={{ width: '800px', backgroundColor: '#ffffff' }}
          >
            {/* The color strip at the top */}
            <div className="absolute top-0 left-0 w-full h-3 bg-[#144C8A]"></div>

            <div className="p-12 pb-24">
              {/* Header */}
              <header className="flex flex-col items-center justify-center border-b-2 border-[#144C8A]/10 pb-4 mb-6 text-center pt-2">
                <div className="flex items-center gap-3 mb-2">
                  {/* LOGO */}
                  <svg viewBox="0 0 120 120" className="w-12 h-12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 25 L45 55 L60 85 L35 85 L20 60 Z" fill="#144C8A"/>
                    <path d="M20 85 L50 50 C60 60 70 70 65 85 Z" fill="#144C8A"/>
                    <path d="M100 25 L75 55 L60 85 L85 85 L100 60 Z" fill="#F49F2D"/>
                    <path d="M45 25 C55 25 65 20 70 30 C70 40 60 50 55 45 C50 40 45 35 45 25 Z" fill="#F49F2D"/>
                  </svg>
                  <div className="flex flex-col uppercase leading-none text-left">
                    <span className="font-bold text-2xl text-[#F49F2D] tracking-widest">Mavir</span>
                    <span className="font-bold text-sm text-[#144C8A] tracking-[0.25em] mt-0.5">School</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#144C8A] mb-1">INFORME DE CUMPLIMIENTO ACADÉMICO</h1>
                  <p className="text-slate-500 text-xs">Documento Oficial de Seguimiento Continuo</p>
                </div>
              </header>

              {/* Student Info */}
              <section className="bg-slate-50/50 border border-slate-100 rounded-lg p-4 mb-6 flex justify-between items-center">
                <div>
                  <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1">
                    <UserCircle className="w-3 h-3"/> Estudiante {levelName ? `• ${levelName}` : ''}
                  </p>
                  <p className="text-base font-semibold text-slate-800 uppercase">{studentName || 'No Especificado'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3"/> Fecha del informe
                  </p>
                  <p className="text-sm font-medium text-slate-700">{today}</p>
                </div>
              </section>



              {/* Resumen por Asignatura */}
              <section className="mb-10">
                <h3 className="text-base font-bold text-[#144C8A] bg-slate-50 border-l-4 border-[#F49F2D] px-3 py-1 mb-4 uppercase tracking-widest">
                  Resumen por Asignatura
                </h3>
                <div className="grid grid-cols-6 gap-3 page-break-inside-avoid">
                  {subjectSummary.map(row => {
                    const chartData = [
                      { name: 'Cumplidas', value: row.completed },
                      { name: 'No Cumplidas', value: row.incomplete }
                    ];
                    // If everything is 0, we can still show a gray circle
                    const isZero = row.completed === 0 && row.incomplete === 0;
                    
                    const subjConfig = SUBJECT_CONFIGS.find(s => s.name === row.subject);
                    const accentColor = subjConfig?.color.accent || '#22c55e';
                    
                    return (
                      <div key={row.subject} className={`bg-white border ${subjConfig ? subjConfig.color.border : 'border-slate-100'} rounded-lg p-2 text-center shadow-sm`}>
                        <h4 className={`text-[0.55rem] font-bold uppercase tracking-widest mb-1 truncate ${subjConfig ? subjConfig.color.text : 'text-slate-700'}`} title={row.subject}>{row.subject}</h4>
                        <div className="h-16 mb-2">
                          <ResponsiveContainer width="100%" height={64} minWidth={50} minHeight={50}>
                            <PieChart>
                              <Pie
                                data={isZero ? [{ name: 'Sin datos', value: 1 }] : chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={18}
                                outerRadius={28}
                                paddingAngle={2}
                                dataKey="value"
                                isAnimationActive={false}
                                stroke="none"
                              >
                                {isZero ? (
                                  <Cell fill="#f1f5f9" />
                                ) : (
                                  chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? accentColor : '#ef4444'} />
                                  ))
                                )}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-2 text-[0.6rem] font-bold uppercase tracking-wider">
                          <div className="flex items-center gap-1" style={{ color: accentColor }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></span>
                            {row.completed}
                          </div>
                          <div className="flex items-center gap-1 text-red-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            {row.incomplete}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Actividades Pendientes */}
              <section className="mb-10">
                <h3 className="text-base font-bold text-[#144C8A] bg-slate-50 border-l-4 border-[#F49F2D] px-3 py-1 mb-4 uppercase tracking-widest">
                  Actividades Pendientes
                </h3>
              {Object.keys(pendingBySubject).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(pendingBySubject).map(([subj, tasks]) => {
                    const subjConfig = SUBJECT_CONFIGS.find(s => s.name === subj);
                    return (
                    <div key={subj} className={`bg-white border ${subjConfig ? subjConfig.color.border : 'border-slate-200'} rounded-lg p-4 shadow-sm`}>
                      <h4 className={`text-sm font-bold mb-3 border-b pb-2 ${subjConfig ? subjConfig.color.text : 'text-slate-800'} ${subjConfig ? subjConfig.color.border : 'border-slate-100'}`}>{subj}</h4>
                      <div className="flex flex-wrap gap-2">
                        {tasks.map((task, i) => (
                          <span 
                            key={i} 
                            className={`flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${
                              task.status === 'no_cumplido' 
                                ? 'bg-red-50 text-red-700 border-red-100' 
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}
                          >
                            <span>S{task.week}</span>
                            <span className="opacity-50">•</span>
                            <span>{task.taskName}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )})}
                </div>
              ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <Award className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-green-800 font-bold uppercase tracking-wide mb-1">¡Excelente trabajo!</p>
                    <p className="text-sm text-green-700">El estudiante cumplió con todas las actividades registradas. No presenta actividades pendientes.</p>
                  </div>
                )}
              </section>

              {/* Observaciones */}
              <section className="mb-12 page-break-inside-avoid">
                 <div className={`p-6 border-l-4 ${percentage >= 90 ? 'bg-[#144C8A]/5 border-[#144C8A]' : percentage >= 75 ? 'bg-[#F49F2D]/10 border-[#F49F2D]' : 'bg-red-50 border-red-500'}`}>
                   <h4 className="text-xs font-bold uppercase tracking-widest text-slate-800 mb-2">Observación</h4>
                   <p className="text-slate-800 text-sm leading-relaxed font-medium">{observationText}</p>
                 </div>
                 
                 {pendingTasksList.length >= 2 && (
                   <div className="mt-4 bg-red-50 border-2 border-red-400 rounded-lg p-4 text-center">
                     <span className="flex items-center justify-center gap-2 font-bold text-red-700 uppercase tracking-widest text-sm mb-1">
                       <AlertCircle className="w-5 h-5" />
                       Aviso de Vencimiento
                     </span>
                     <p className="text-red-900 font-medium text-sm">
                       Debido al volumen de tareas pendientes, se recuerda que el plazo máximo e improrrogable para la recepción de estas actividades es el <strong>4 de septiembre del 2026</strong>.
                     </p>
                   </div>
                 )}
              </section>
            </div>

            {/* Footer */}
            <footer className="absolute bottom-0 left-0 w-full bg-[#144C8A] px-10 py-6 text-center">
              <p className="text-white/90 text-[0.8rem] leading-relaxed italic mx-auto max-w-2xl px-6">
                "Agradecemos el acompañamiento permanente de la familia en el proceso educativo. El trabajo conjunto entre hogar y escuela contribuye significativamente al desarrollo integral del estudiante."
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
