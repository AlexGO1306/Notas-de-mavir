import fs from 'fs';

let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

const regex = /const availableWeeksStr = Object\.keys\(weeklyData\)\.filter[\s\S]*?\}\s*catch\s*\(error\)\s*\{/m;

const replacement = `const newFile = { fileName: file.name, weeklyData };
      const updatedFiles = [...files, newFile];
      
      const weeksSet = new Set<number>();
      updatedFiles.forEach(f => {
        Object.keys(f.weeklyData).filter(k => k !== "all").forEach(k => weeksSet.add(Number(k)));
      });
      const availWeeksNum = Array.from(weeksSet).sort((a,b) => a - b);
      setAvailableWeeks(availWeeksNum);
      
      let initialWeek = fileWeek;
      if (!initialWeek) {
        initialWeek = availWeeksNum.length > 0 ? availWeeksNum[0].toString() : "all";
      }
      if (initialWeek === "all") initialWeek = "";
      
      setFiles(updatedFiles);
      setFileWeek(initialWeek);
      
      const combinedData = updatedFiles.flatMap(f => (f.weeklyData[initialWeek] || f.weeklyData["all"] || { data: [] }).data);
      let firstCols: string[] = [];
      for (const f of updatedFiles) {
         const fw = f.weeklyData[initialWeek] || f.weeklyData["all"];
         if (fw && fw.columns && fw.columns.length > 0) {
             firstCols = fw.columns;
             break;
         }
      }
      setParsedData(combinedData);
      setColumns(firstCols);
      
      await localforage.setItem(String(\`excel_data_\${subjectName}\`), {
        files: updatedFiles,
        week: initialWeek
      });
      
    } catch (error) {`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
