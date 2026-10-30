import fs from 'fs';

let content = fs.readFileSync('src/components/SubjectExcelViewer.tsx', 'utf-8');

const processFileReplacement = `  const processFile = async (file: File) => {
    try {
      setFileName(file.name);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (data.length > 0) {
        setColumns(Object.keys(data[0] as object));
        setParsedData(data);
      } else {
        setColumns([]);
        setParsedData([]);
      }
    } catch (error) {
      console.error("Error parsing Excel", error);
      alert("Hubo un error al leer el archivo. Asegúrate de que sea un archivo de Excel válido.");
      throw error;
    }
  };`;

const handleFileReplacement = `  const handleFile = async (file: File) => {
    setIsLoading(true);
    try {
      await processFile(file);
      await localforage.setItem(\`excel_\${subjectName}\`, file);
    } catch (error) {
      console.error("Error saving Excel", error);
      setFileName(null);
      setParsedData([]);
      setColumns([]);
    } finally {
      setIsLoading(false);
    }
  };`;

content = content.replace(
  /  const processFile = async \(file: File\) => \{[\s\S]*?^\s*  \};/m,
  processFileReplacement
);

content = content.replace(
  /  const handleFile = async \(file: File\) => \{[\s\S]*?^\s*  \};/m,
  handleFileReplacement
);

fs.writeFileSync('src/components/SubjectExcelViewer.tsx', content);
