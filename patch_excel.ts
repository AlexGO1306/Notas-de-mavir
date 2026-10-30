import fs from 'fs';

let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

// 1. Replace loadExcel
content = content.replace(
  /  const loadExcel = async \(\) => \{[\s\S]*?    \} finally \{/m,
  `  const loadExcel = async () => {
    setIsLoading(true);
    try {
      const storedData = await localforage.getItem<{fileName: string, data: any[], columns: string[]}>(String(\`excel_data_\${subjectName}\`));
      if (storedData) {
        setFileName(storedData.fileName);
        setParsedData(storedData.data);
        setColumns(storedData.columns);
      } else {
        // Fallback for old version
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
    } finally {`
);

// 2. Replace processFile
content = content.replace(
  /  const processFile = async \(file: File\) => \{[\s\S]*?^\s*  \};/m,
  `  const processFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      let newColumns: string[] = [];
      if (data.length > 0) {
        newColumns = Object.keys(data[0] as object);
      }
      
      setFileName(file.name);
      setColumns(newColumns);
      setParsedData(data);
      
      await localforage.setItem(String(\`excel_data_\${subjectName}\`), {
        fileName: file.name,
        data: data,
        columns: newColumns
      });
      
    } catch (error) {
      console.error("Error parsing Excel", error);
      alert("Hubo un error al leer el archivo. Asegúrate de que sea un archivo de Excel válido o CSV.");
      throw error;
    }
  };`
);

// 3. Replace handleFile (remove the localforage.setItem since processFile does it)
content = content.replace(
  /  const handleFile = async \(file: File\) => \{[\s\S]*?^\s*  \};/m,
  `  const handleFile = async (file: File) => {
    setIsLoading(true);
    try {
      await processFile(file);
    } catch (error) {
      console.error("Error saving Excel", error);
      setFileName(null);
      setParsedData([]);
      setColumns([]);
    } finally {
      setIsLoading(false);
    }
  };`
);

// 4. Update handleDelete to remove both keys
content = content.replace(
  /await localforage\.removeItem\(\`excel_\$\{subjectName\}\`\);/,
  `await localforage.removeItem(String(\`excel_\${subjectName}\`));\n      await localforage.removeItem(String(\`excel_data_\${subjectName}\`));`
);

// 5. Update input onChange to reset target value
content = content.replace(
  /onChange=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*if \(e\.target\.files && e\.target\.files\[0\]\) handleFile\(e\.target\.files\[0\]\);\s*\}\}/,
  `onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                  e.target.value = '';
                }}`
);

fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
