import fs from 'fs';

let content = fs.readFileSync('src/components/BottomExcelPanel.tsx', 'utf-8');

const regex = /let firstCols: string\[\] = \[\];\s*for \(const f of ([a-zA-Z0-9_.]+)\) \{\s*const fw = f\.weeklyData\[([a-zA-Z0-9_.]+)\] \|\| f\.weeklyData\["all"\];\s*if \(fw && fw\.columns && fw\.columns\.length > 0\) \{\s*firstCols = fw\.columns;\s*break;\s*\}\s*\}\s*setParsedData\((.*?)\);\s*setColumns\(firstCols\);/g;

const replacement = `let allCols = new Set<string>();
          for (const f of $1) {
             const fw = f.weeklyData[$2] || f.weeklyData["all"];
             if (fw && fw.columns) {
                 fw.columns.forEach((c: string) => allCols.add(c));
             }
          }
          setParsedData($3);
          setColumns(Array.from(allCols));`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/BottomExcelPanel.tsx', content);
