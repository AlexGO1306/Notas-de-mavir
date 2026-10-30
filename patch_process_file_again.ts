import fs from 'fs';

let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

const regex = /const processFile = async \(file: File\) => \{[\s\S]*?const newFile = \{ fileName: file\.name, weeklyData \};/m;

const newProcessFile = `const processFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      let weeklyData: Record<string, { data: any[], columns: string[] }> = {};
      
      const isWeekTab = (name: string) => name.match(/(?:semana|sem|week)[\\s_-]*(\\d+)/i);
      const hasWeekTabs = workbook.SheetNames.some(isWeekTab);
      
      if (hasWeekTabs) {
          workbook.SheetNames.forEach(sheetName => {
            const match = isWeekTab(sheetName);
            if (match) {
              const weekNum = parseInt(match[1], 10).toString();
              const worksheet = workbook.Sheets[sheetName];
              const data = cleanSheetData(worksheet);
              if (data.length > 0) {
                const columns = Object.keys(data[0] as object);
                weeklyData[weekNum] = { data, columns };
              }
            }
          });
      } else {
          let combinedData: any[] = [];
          let allColsSet = new Set<string>();
          
          workbook.SheetNames.forEach(sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              const data = cleanSheetData(worksheet);
              if (data.length > 0) {
                  combinedData = combinedData.concat(data);
                  Object.keys(data[0] as object).forEach(c => allColsSet.add(c));
              }
          });
          
          const allColumns = Array.from(allColsSet);
          
          // Use word boundary to avoid matching "s" inside other words, but catch "s1", "sem 1", "semana 1"
          const weekColMatch = (c: string) => c.match(/(?:\\bsemana\\b|\\bsem\\b|\\bweek\\b|\\bs\\b)[ \\._-]*(\\d+)/i) || c.match(/semana[ \\._-]*(\\d+)/i);
          
          const hasHorizontalWeeks = allColumns.some(weekColMatch);
          
          if (hasHorizontalWeeks) {
              const baseCols = allColumns.filter(c => !weekColMatch(c));
              const weeksFound = new Set<string>();
              allColumns.forEach(c => {
                 const m = weekColMatch(c);
                 if (m) weeksFound.add(parseInt(m[1],10).toString());
              });
              
              weeksFound.forEach(w => {
                 const colsForWeek = allColumns.filter(c => {
                    const m = weekColMatch(c);
                    return m && parseInt(m[1],10).toString() === w;
                 });
                 weeklyData[w] = { data: combinedData, columns: [...baseCols, ...colsForWeek] };
              });
          } else {
              const weekCol = allColumns.find(col => col.toLowerCase() === 'semana' || col.toLowerCase() === 'week');
              if (weekCol) {
                  combinedData.forEach(row => {
                      const wVal = String((row as any)[weekCol]).trim();
                      const match = wVal.match(/(\\d+)/);
                      if (match) {
                          const w = parseInt(match[1], 10).toString();
                          if (!weeklyData[w]) weeklyData[w] = { data: [], columns: allColumns };
                          weeklyData[w].data.push(row);
                      }
                  });
              } else {
                  weeklyData["all"] = { data: combinedData, columns: allColumns };
              }
          }
      }
      
      const newFile = { fileName: file.name, weeklyData };`;

content = content.replace(regex, newProcessFile);
fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
