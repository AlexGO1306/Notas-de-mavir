import fs from 'fs';

let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

// Update State definitions if needed
// We don't strictly need to add new states if we just reload from localforage, 
// but let's keep parsedData and columns as the CURRENT week's data.

// Update loadExcel
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
          const weekData = storedData.weeklyData[targetWeek] || storedData.weeklyData["all"] || { data: [], columns: [] };
          setParsedData(weekData.data);
          setColumns(weekData.columns);
        } else {
          // Fallback for old data
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
          const match = sheetName.match(/semana\\s*0*(\\d+)/i) || sheetName.match(/^s0*(\\d+)$/i);
          if (match) {
            const weekNum = match[1];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            if (data.length > 0) {
              const columns = Object.keys(data[0] as object);
              weeklyData[weekNum] = { data, columns };
            }
          }
        });
      }
      
      // If no valid weekly sheets found, or just 1 sheet
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
              const w = match ? match[1] : wVal;
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
      
      const availableWeeks = Object.keys(weeklyData).filter(k => k !== "all").sort((a,b) => parseInt(a) - parseInt(b));
      const initialWeek = availableWeeks.length > 0 ? availableWeeks[0] : "all";
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

// Update handleWeekChange
const handleWeekRegex = /const handleWeekChange = async \(newWeek: string\) => \{[\s\S]*?^\s*\};\s*const normalize/m;
const newHandleWeek = `const handleWeekChange = async (newWeek: string) => {
    setFileWeek(newWeek);
    const storedData = await localforage.getItem<any>(String(\`excel_data_\${subjectName}\`));
    if (storedData) {
      if (storedData.weeklyData) {
        const targetWeek = newWeek || "all";
        const weekData = storedData.weeklyData[targetWeek] || storedData.weeklyData["all"] || { data: [], columns: [] };
        setParsedData(weekData.data);
        setColumns(weekData.columns);
      }
      await localforage.setItem(String(\`excel_data_\${subjectName}\`), {
        ...storedData,
        week: newWeek
      });
    }
  };

  const normalize`;
content = content.replace(handleWeekRegex, newHandleWeek);

fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
