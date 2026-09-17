import { useState } from 'react';
import './App.css';
import ChasideTest from './components/ChasideTest';
import VocationalReport from './VocationalReport';

function App() {
  const [testResult, setTestResult] = useState(null);

  if (testResult) {
    return (
      <VocationalReport
        localReportData={{
          responses: testResult.responses,
          students: {
            first_name: 'Estudiante',
            last_name: 'local',
            document_type: '',
            document_number: '',
            group_name: '',
          },
          test_applications: { is_report_allowed: true },
        }}
        chasideData={testResult.responses}
      />
    );
  }

  return (
    <ChasideTest onComplete={setTestResult} />
  );
}

export default App;