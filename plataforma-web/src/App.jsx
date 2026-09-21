import { useState } from 'react';
import './App.css';
import ChasideTest from './components/ChasideTest';
import LoginScreen from './components/LoginScreen';
import TestSuccessScreen from './components/TestSuccessScreen';

function App({ testApplicationId, studentId, distributorId }) {
  const [testResult, setTestResult] = useState(null);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const resolvedTestApplicationId = testApplicationId ?? import.meta.env.VITE_TEST_APPLICATION_ID;
  const resolvedStudentId = studentId ?? import.meta.env.VITE_STUDENT_ID;
  const resolvedDistributorId = distributorId ?? import.meta.env.VITE_DISTRIBUTOR_ID;

  if (testResult) {
    return <TestSuccessScreen />;
  }

  if (!authenticatedUser) {
    return <LoginScreen onLogin={setAuthenticatedUser} />;
  }

  if (authenticatedUser.role !== 'Estudiante') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-4 text-center text-white">
        <section className="w-full max-w-lg rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">{authenticatedUser.role}</p>
          <h1 className="text-3xl font-bold text-white">Acceso validado</h1>
          <p className="mt-4 text-slate-200">La vista de este perfil estará disponible próximamente.</p>
        </section>
      </main>
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