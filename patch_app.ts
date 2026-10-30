import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Replace import and component name
content = content.replace(
  /import \{ SubjectExcelViewer \} from '\.\/components\/SubjectExcelViewer';/,
  `import { BottomExcelPanel } from './components/BottomExcelPanel';`
);

content = content.replace(
  /<SubjectExcelViewer\s+subjectName=\{excelViewerSubject\}\s+students=\{currentStudents\}\s+onClose=\{\(\) => setExcelViewerSubject\(null\)\}\s+\/>/m,
  `<BottomExcelPanel\n          subjectName={excelViewerSubject}\n          focusedStudentId={focusedStudentId}\n          students={currentStudents}\n          onClose={() => setExcelViewerSubject(null)}\n        />`
);

// 2. Modify the Table Row class for highlighted focus
content = content.replace(
  /<tr key=\{student\.id\} className="hover:bg-slate-50">/g,
  `<tr key={student.id} className={\`\${focusedStudentId === student.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'} group/row\`}>`
);

// 3. Modify the Student Name cell
const oldStudentCell = `<td className="px-4 py-2 border-r-2 border-r-slate-400 border-b border-b-slate-200 bg-white sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center justify-between group">
                              <div className="flex items-center gap-3 w-full">
                                <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                  {studentIdx + 1}
                                </div>
                                <button
                                  onClick={() => setReportStudent(student)}
                                  className="text-left w-full hover:bg-slate-100 p-2 rounded transition-colors"
                                >
                                  <span className="font-bold text-slate-800 text-sm">
                                    {student.name}
                                  </span>
                                </button>
                              </div>
                              
                              {/* Action buttons... */}`;

const newStudentCell = `<td className={\`px-4 py-2 border-r-2 border-r-slate-400 border-b border-b-slate-200 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] transition-colors \${focusedStudentId === student.id ? 'bg-blue-50' : 'bg-white'}\`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 w-full">
                                <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                  {studentIdx + 1}
                                </div>
                                <button
                                  onClick={() => setFocusedStudentId(student.id)}
                                  className="text-left w-full hover:bg-slate-100/50 p-1.5 -ml-1.5 rounded transition-colors"
                                >
                                  <span className="font-bold text-slate-800 text-sm">
                                    {student.name}
                                  </span>
                                </button>
                              </div>
                              
                              <button
                                onClick={() => setReportStudent(student)}
                                title="Ver reporte individual"
                                className="opacity-0 group-hover/row:opacity-100 p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-[#144C8A] transition-all shrink-0 mr-1"
                              >
                                <BarChart2 className="w-4 h-4" />
                              </button>
                              
                              {/* Action buttons... */}`;

content = content.replace(oldStudentCell, newStudentCell);

// 4. Update the input element to trigger focus
content = content.replace(
  /type="text"\n\s+className=\{`w-full h-full min-h-\[42px\]/g,
  `type="text"\n                                              onFocus={() => setFocusedStudentId(student.id)}\n                                              className={\`w-full h-full min-h-[42px]`
);

fs.writeFileSync('src/App.tsx', content);
