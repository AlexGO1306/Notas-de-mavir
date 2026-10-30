import fs from 'fs';

let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

// Patch handleWeekChange
const weekChangeRegex = /const handleWeekChange = async \(newWeek: string\) => \{[\s\S]*?^\s*  \};/m;
const newWeekChange = `const handleWeekChange = async (newWeek: string) => {
    setFileWeek(newWeek);
    const storedData = await localforage.getItem<any>(String(\`excel_data_\${subjectName}\`));
    if (storedData && storedData.files) {
      const targetWeek = newWeek || "all";
      const combinedData = storedData.files.flatMap((f: any) => (f.weeklyData[targetWeek] || f.weeklyData["all"] || { data: [] }).data);
      let firstCols: string[] = [];
      for (const f of storedData.files) {
         const fw = f.weeklyData[targetWeek] || f.weeklyData["all"];
         if (fw && fw.columns && fw.columns.length > 0) {
             firstCols = fw.columns;
             break;
         }
      }
      setParsedData(combinedData);
      setColumns(firstCols);
      
      await localforage.setItem(String(\`excel_data_\${subjectName}\`), {
        ...storedData,
        week: newWeek
      });
    }
  };`;
content = content.replace(weekChangeRegex, newWeekChange);

// Patch UI to show files instead of fileName
const uiFileNameRegex = /\<div className="flex items-center gap-3 overflow-hidden px-2 w-full"\>\s*\<span className="text-xs font-medium text-slate-500 truncate max-w-\[100px\] sm:max-w-\[120px\]" title=\{fileName\}\>\{fileName\}\<\/span\>/;

const newUiFileName = `<div className="flex flex-col items-start gap-1 overflow-hidden px-2 w-full">
                <div className="flex flex-wrap gap-1">
                  {files.map((f, idx) => (
                    <span key={idx} className="text-[10px] font-medium text-slate-600 bg-slate-200/50 px-2 py-0.5 rounded-full truncate max-w-[100px]" title={f.fileName}>
                      {f.fileName}
                    </span>
                  ))}
                </div>`;
content = content.replace(uiFileNameRegex, newUiFileName);

// Change `!fileName` to `files.length === 0`
content = content.replace(/\!fileName \?/g, `files.length === 0 ?`);

// Fix UI delete button label
content = content.replace(/Cambiar Excel/g, "Borrar Archivos");

fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
