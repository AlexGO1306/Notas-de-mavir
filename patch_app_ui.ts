import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Remove BottomExcelPanel imports and state
content = content.replace(/import \{ BottomExcelPanel \} from '\.\/components\/BottomExcelPanel';\n/, '');
content = content.replace(/const \[excelViewerSubject, setExcelViewerSubject\] = useState<string \| null>\(null\);\n/, '');

// 2. Replace the button with a file input label
const oldButton = `<button
                                onClick={() => setExcelViewerSubject(subject.name)}
                                className="bg-black/20 hover:bg-black/30 text-white p-1 rounded-md transition-colors"
                                title={\`Ver archivo Excel de \${subject.name}\`}
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                              </button>`;

const newButton = `<label
                                className="bg-black/20 hover:bg-black/30 text-white p-1 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                                title={\`Subir Excel para auto-rellenar \${subject.name}\`}
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept=".xlsx, .xls, .csv" 
                                  onChange={(e) => {
                                    handleExcelUpload(e, subject.name);
                                    e.target.value = ''; // Reset to allow same file upload again
                                  }} 
                                />
                              </label>`;

content = content.replace(oldButton, newButton);

// 3. Remove the BottomExcelPanel rendering
const oldPanel = /\{\/\* Bottom Excel Panel \*\/\}\s*\{excelViewerSubject && \([\s\S]*?\}\)\}/;
content = content.replace(oldPanel, '');

// Also catch the specific rendering if comments differ
const specificPanel = /\{excelViewerSubject && \(\s*<BottomExcelPanel[\s\S]*?onClose=\{[^}]+\}\s*\/>\s*\)\}/;
content = content.replace(specificPanel, '');

fs.writeFileSync('src/App.tsx', content);
