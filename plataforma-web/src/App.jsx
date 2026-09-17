import { useState } from 'react';
import './App.css';
import ChasideTest from './components/ChasideTest';
import VocationalReport from './VocationalReport';

function App({ testApplicationId, studentId, distributorId }) {
  const [testResult, setTestResult] = useState(null);
  const resolvedTestApplicationId = testApplicationId ?? import.meta.env.VITE_TEST_APPLICATION_ID;
  const resolvedStudentId = studentId ?? import.meta.env.VITE_STUDENT_ID;
  const resolvedDistributorId = distributorId ?? import.meta.env.VITE_DISTRIBUTOR_ID;

  if (testResult) {
    return (
      <VocationalReport
        responseId={testResult.responseId}
      />
    );
  }

  return (
    <ChasideTest
    onTestComplete={(responseId) => setTestResult({ responseId })}
      testApplicationId={resolvedTestApplicationId}
      studentId={resolvedStudentId}
      distributorId={resolvedDistributorId}
    />
  );
}

export default App;