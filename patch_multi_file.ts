import fs from 'fs';

let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

// Add files state
content = content.replace(
  /const \[fileName, setFileName\] = useState<string \| null>\(null\);/,
  `const [files, setFiles] = useState<any[]>([]);`
);

// Update loadExcel
const loadExcelRegex = /const loadExcel = async \(\) => \{[\s\S]*?    \} finally \{/;
const newLoadExcel = `const loadExcel = async () => {
    setIsLoading(true);
    try {
      const storedData = await localforage.getItem<any>(String(\`excel_data_\${subjectName}\`));
      if (storedData) {
        let loadedFiles = storedData.files || [];
        // Migration from old single-file format
        if (storedData.fileName && storedData.weeklyData && !storedData.files) {
          loadedFiles = [{ fileName: storedData.fileName, weeklyData: storedData.weeklyData }];
        }
        
        setFiles(loadedFiles);
        const targetWeek = storedData.week || "";
        setFileWeek(targetWeek);
        
        if (loadedFiles.length > 0) {
          const weeksSet = new Set<number>();
          loadedFiles.forEach((f: any) => {
            Object.keys(f.weeklyData).filter(k => k !== "all").forEach(k => weeksSet.add(Number(k)));
          });
          const weeksList = Array.from(weeksSet).sort((a,b) => a - b);
          setAvailableWeeks(weeksList);
          
          const combinedData = loadedFiles.flatMap((f: any) => (f.weeklyData[targetWeek] || f.weeklyData["all"] || { data: [] }).data);
          let firstCols: string[] = [];
          for (const f of loadedFiles) {
             const fw = f.weeklyData[targetWeek] || f.weeklyData["all"];
             if (fw && fw.columns && fw.columns.length > 0) {
                 firstCols = fw.columns;
                 break;
             }
          }
          setParsedData(combinedData);
          setColumns(firstCols);
        } else {
          setAvailableWeeks([]);
          setParsedData([]);
          setColumns([]);
        }
      } else {
        setFiles([]);
        setParsedData([]);
        setColumns([]);
        setAvailableWeeks([]);
      }
    } catch (error) {
      console.error("Error loading Excel", error);
    } finally {`;
content = content.replace(loadExcelRegex, newLoadExcel);

fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
