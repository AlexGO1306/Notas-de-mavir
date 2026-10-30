import fs from 'fs';

let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

const regex = /\<button\s*onClick=\{handleDelete\}\s*className="text-\[10px\] bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1\.5 rounded-full font-bold transition-colors flex items-center gap-1\.5 shrink-0 shadow-sm"\s*\>\s*\<Trash2 className="w-3 h-3" \/\> Borrar Archivos\s*\<\/button\>/m;

const replacement = `<div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded-full font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-3 h-3" /> Añadir Otro
                </button>
                <button
                  onClick={handleDelete}
                  className="text-[10px] bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded-full font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3 h-3" /> Borrar Todos
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
                  e.target.value = '';
                }}
              />`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
