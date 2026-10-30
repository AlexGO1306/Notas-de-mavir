import fs from 'fs';

let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

// Add availableWeeks state
content = content.replace(
  /const \[fileWeek, setFileWeek\] = useState<string>\(''\);/,
  `const [fileWeek, setFileWeek] = useState<string>('');\n  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);`
);

// Update loadExcel to set availableWeeks
const loadExcelRegex = /const loadExcel = async \(\) => \{[\s\S]*?    \} finally \{/;
const newLoadExcel = `const loadExcel = async () => {
    setIsLoading(true);
    try {
      const storedData = await localforage.getItem<any>(String(\`excel_data_\${subjectName}\`));
      if (storedData) {
        setFileName(storedData.fileName);
        const targetWeek = storedData.week || "";
        setFileWeek(targetWeek);
        
        if (storedData.weeklyData) {
          const weeksList = Object.keys(storedData.weeklyData).filter(k => k !== "all").map(Number).sort((a,b) => a - b);
          setAvailableWeeks(weeksList);
          const weekData = storedData.weeklyData[targetWeek] || storedData.weeklyData["all"] || { data: [], columns: [] };
          setParsedData(weekData.data);
          setColumns(weekData.columns);
        } else {
          setAvailableWeeks([]);
          setParsedData(storedData.data || []);
          setColumns(storedData.columns || []);
        }
      } else {
        const oldFile = await localforage.getItem<File>(String(\`excel_\${subjectName}\`));
        if (oldFile) {
          await processFile(oldFile);
        } else {
          setFileName(null);
          setParsedData([]);
          setColumns([]);
          setAvailableWeeks([]);
        }
      }
    } catch (error) {
      console.error("Error loading Excel", error);
    } finally {`;
content = content.replace(loadExcelRegex, newLoadExcel);

// Update processFile
const processFileRegex = /const processFile = async \(file: File\) => \{[\s\S]*?^\s*  \};/m;
const newProcessFile = `const processFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      let weeklyData: Record<string, { data: any[], columns: string[] }> = {};
      
      if (workbook.SheetNames.length > 1) {
        workbook.SheetNames.forEach(sheetName => {
          // Detect "SEMANA 1", "Semana-2", "semana36", etc.
          const match = sheetName.match(/semana.*?(\\d+)/i) || sheetName.match(/^s0*(\\d+)$/i);
          if (match) {
            const weekNum = parseInt(match[1], 10).toString();
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            if (data.length > 0) {
              const columns = Object.keys(data[0] as object);
              weeklyData[weekNum] = { data, columns };
            }
          }
        });
      }
      
      if (Object.keys(weeklyData).length === 0) {
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        
        if (rawData.length > 0) {
          const allColumns = Object.keys(rawData[0] as object);
          const weekCol = allColumns.find(col => col.toLowerCase().includes('semana') || col.toLowerCase() === 'week');
          
          if (weekCol) {
            rawData.forEach(row => {
              const wVal = String((row as any)[weekCol]).trim();
              const match = wVal.match(/(\\d+)/);
              const w = match ? parseInt(match[1], 10).toString() : null;
              if (w) {
                if (!weeklyData[w]) weeklyData[w] = { data: [], columns: allColumns };
                weeklyData[w].data.push(row);
              }
            });
          } else {
            weeklyData["all"] = { data: rawData, columns: allColumns };
          }
        }
      }
      
      const availableWeeksStr = Object.keys(weeklyData).filter(k => k !== "all").sort((a,b) => parseInt(a) - parseInt(b));
      const availWeeksNum = availableWeeksStr.map(Number);
      setAvailableWeeks(availWeeksNum);
      
      const initialWeek = availableWeeksStr.length > 0 ? availableWeeksStr[0] : "all";
      const initialWeekStr = initialWeek === "all" ? "" : initialWeek;
      
      setFileName(file.name);
      setFileWeek(initialWeekStr);
      
      const currentData = weeklyData[initialWeek] || { data: [], columns: [] };
      setParsedData(currentData.data);
      setColumns(currentData.columns);
      
      await localforage.setItem(String(\`excel_data_\${subjectName}\`), {
        fileName: file.name,
        weeklyData: weeklyData,
        week: initialWeekStr
      });
      
    } catch (error) {
      console.error("Error parsing Excel", error);
      throw error;
    }
  };`;
content = content.replace(processFileRegex, newProcessFile);

// Clear availableWeeks on delete
content = content.replace(
  /setFileWeek\(''\);/,
  `setFileWeek('');\n    setAvailableWeeks([]);`
);

// Update HTML rendering for the input field to show min-max
const inputRegex = /<span className="text-\[10px\] font-bold text-slate-400 uppercase tracking-wider">Semana:<\/span>[\s\S]*?<\/div>/;
const newInput = `{availableWeeks.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Semana ({Math.min(...availableWeeks)}-{Math.max(...availableWeeks)}):
                    </span>
                  )}
                  {availableWeeks.length === 0 && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Semana:
                    </span>
                  )}
                  <input
                    type="number"
                    min={availableWeeks.length > 0 ? Math.min(...availableWeeks) : 1}
                    max={availableWeeks.length > 0 ? Math.max(...availableWeeks) : 52}
                    placeholder="Ej. 3"
                    value={fileWeek}
                    onChange={(e) => handleWeekChange(e.target.value)}
                    className="w-12 text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-green-400 text-slate-700 font-bold"
                  />
                </div>`;
content = content.replace(inputRegex, newInput);

fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
