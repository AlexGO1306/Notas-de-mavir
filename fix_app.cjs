const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

const startIndex = lines.findIndex(l => l.includes('{excelViewerSubject && ('));

const replacement = `      {excelViewerSubject && (
        <SubjectExcelViewer
          subjectName={excelViewerSubject}
          students={currentStudents}
          onClose={() => setExcelViewerSubject(null)}
        />
      )}

      {/* Report Modal */}
      {reportStudent && (
        <ReportModal
          studentName={reportStudent.name}
          levelName={currentLevel?.name}
          data={(() => {
            const effectiveProgress = pendingChanges[reportStudent.id] || reportStudent.progress || {};
            return Object.keys(effectiveProgress).reduce((acc, subject) => {
              acc[subject] = Object.keys(effectiveProgress[subject] || {}).reduce((weekAcc, weekStr) => {
                const week = parseInt(weekStr);
                if (week >= startWeek && week <= endWeek) {
                  weekAcc[week] = effectiveProgress[subject][week];
                }
                return weekAcc;
              }, {} as any);
              return acc;
            }, {} as ProgressData);
          })()}
          onClose={() => setReportStudent(null)}
        />
      )}
    </div>
  );
}`;

const endIndex = lines.length;

const newLines = [...lines.slice(0, startIndex), replacement];

fs.writeFileSync('src/App.tsx', newLines.join('\n'));
