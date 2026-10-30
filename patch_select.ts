import fs from 'fs';

let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

const regex = /<div className="flex items-center gap-1\.5 shrink-0">[\s\S]*?<\/div>/;

const replacement = `<div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Semana:
                  </span>
                  {availableWeeks.length > 0 ? (
                    <select
                      value={fileWeek}
                      onChange={(e) => handleWeekChange(e.target.value)}
                      className="w-16 text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-green-400 text-slate-700 font-bold cursor-pointer"
                    >
                      {availableWeeks.map(week => (
                        <option key={week} value={week.toString()}>S{week}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="52"
                      placeholder="Ej. 3"
                      value={fileWeek}
                      onChange={(e) => handleWeekChange(e.target.value)}
                      className="w-12 text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-green-400 text-slate-700 font-bold"
                    />
                  )}
                </div>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
