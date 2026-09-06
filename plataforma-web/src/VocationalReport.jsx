import { supabase } from './supabase';
import React, { useRef, useState, useEffect } from 'react';
import ChasideRadarChart from './components/ChasideRadarChart';
import ChasideScoresBarChart from './components/ChasideScoresBarChart';
import TriadicDonutChart from './components/TriadicDonutChart';
import { analizarResultadosPsicometricos } from './utils/psychometricScoring';

export default function VocationalReport({ 
  student, 
  institution, 
  chasideData, 
  triadicData, 
  topProfiles 
}) {
  const [datosReporte, setDatosReporte] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [respuestasDesempate, setRespuestasDesempate] = useState([]);
  const [areaDesempate, setAreaDesempate] = useState(null);
  const reporteRef = useRef(null);

  useEffect(() => {
    async function obtenerDatos() {
      // Consultamos la tabla de respuestas y "jalamos" automáticamente los datos del estudiante asociado
      const { data, error } = await supabase
        .from('student_test_responses')
        .select(`
          *,
          students:students!student_test_responses_student_id_fkey (*),
          test_applications (*)
        `)
        .order('last_saved_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error al cargar los datos de Supabase:", error);
      } else {
        console.log("Datos recuperados exitosamente:", data);
        setDatosReporte(data?.[0] ?? null);
      }
      setCargando(false);
    }

    obtenerDatos();
  }, []);
  const handleExportPdf = async () => {
    if (!reporteRef.current || exportando) return;

    setExportando(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const studentName = datosReporte.students?.first_name ?? 'estudiante';
      const fileName = `informe-vocacional-${studentName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;

      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(reporteRef.current)
        .save();
    } catch (error) {
      console.error('Error al generar el PDF:', error);
    } finally {
      setExportando(false);
    }
  };
  if (cargando) return <h3 style={{ color: 'white', textAlign: 'center' }}>Cargando resultados...</h3>;
  if (!datosReporte) return <h3 style={{ color: 'white', textAlign: 'center' }}>No hay datos para mostrar.</h3>;

  const respuestas = datosReporte.responses ?? {};
  const datosChaside = chasideData ?? respuestas.chaside ?? {};
  const datosTriadicos = triadicData ?? respuestas.triadic_brain_dominance ?? respuestas.triadic ?? {};
  const resultadoChaside = analizarResultadosPsicometricos({
    chaside: datosChaside,
    triadic: datosTriadicos,
  });
  const topAreasChaside = resultadoChaside.chasideTop ?? [];
  const datosChasideGrafica = resultadoChaside.chasideValidation?.results?.length
    ? resultadoChaside.chasideValidation.results
    : datosChaside;
  const areaUno = topAreasChaside[0]?.area;
  const areaDos = topAreasChaside[1]?.area;
  const mostrarDesempate = resultadoChaside.chasideStatus === 'REQUIERE_DESEMPATE_MANUAL';
  const respuestasValidas = resultadoChaside.chasideStatus === 'VALID';
  const mensajeValidacion = resultadoChaside.chasideValidation?.message;
  const reporteAutorizado = datosReporte.test_applications?.is_report_allowed === true;
  const confirmarDesempate = () => {
    const conteo = respuestasDesempate.reduce((totals, area) => ({
      ...totals,
      [area]: (totals[area] ?? 0) + 1,
    }), {});
    setAreaDesempate(conteo[areaUno] >= conteo[areaDos] ? areaUno : areaDos);
  };

  if (!reporteAutorizado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <div role="alert" className={`w-full max-w-2xl rounded-lg border p-6 ${
          respuestasValidas
            ? 'border-amber-300 bg-amber-50 text-amber-900'
            : 'border-red-300 bg-red-50 text-red-800'
        }`}>
          <h2 className="text-xl font-bold">
            {respuestasValidas ? 'Resultados pendientes de autorización' : 'No fue posible analizar tu prueba'}
          </h2>
          <p className="mt-2">
            {respuestasValidas
              ? 'Tus respuestas fueron almacenadas correctamente. Pronto publicaremos el informe individual.'
              : mensajeValidacion ?? 'Inconsistencia en los datos: Por favor repite la prueba'}
          </p>
          {!respuestasValidas && (
            <p className="mt-3 font-semibold">Puedes revisar tus respuestas y repetir la prueba antes de enviarla nuevamente.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 bg-gray-50 min-h-screen print:bg-white print:p-0">
      {/* Botón de acción (oculto en la impresión) */}
      <button 
        onClick={handleExportPdf}
        disabled={exportando}
        className="print:hidden mb-6 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition cursor-pointer"
      >
        {exportando ? 'Generando PDF...' : 'Guardar como PDF'}
      </button>

      {/* Contenedor principal del Informe */}
      <div ref={reporteRef} className="bg-white p-10 shadow-lg w-full max-w-4xl text-gray-800 border border-gray-200 print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">

        {!respuestasValidas && (
          <div role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {mensajeValidacion ?? 'No fue posible analizar las respuestas del test.'}
          </div>
        )}
        
        {/* Encabezado Institucional Multi-tenant */}
        <header className="border-b-4 border-blue-600 pb-4 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-700">Informe de Orientación Vocacional</h1>
            <h2 className="text-xl font-semibold mt-2 text-gray-900">{institution?.name || "Colegio Modelo"}</h2>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p><strong className="text-gray-800">Estudiante: {datosReporte.students.first_name} {datosReporte.students.last_name}</strong> {student?.firstName} {student?.lastName}</p>
            <p><strong className="text-gray-800">Documento:{datosReporte.students.document_type} {datosReporte.students.document_number}</strong> {student?.documentId}</p>
            <p><strong className="text-gray-800">Grado:</strong> {student?.grade} | <strong className="text-gray-800">Grupo:{datosReporte.students.group_name}</strong> {student?.groupName}</p>
          </div>
        </header>

        {/* Sección 1: Resultados CHASIDE */}
        <section className="mb-8 break-inside-avoid">
          <h3 className="text-2xl font-bold text-gray-700 mb-2">1. Perfil de Aptitudes e Intereses (CHASIDE)</h3>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-h-[20rem] min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4" style={{ minHeight: 352, minWidth: 1 }}>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Perfil general</h4>
              <ChasideRadarChart data={datosChasideGrafica} />
            </div>
            <div className="min-h-[20rem] min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4" style={{ minHeight: 352, minWidth: 1 }}>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Desglose por área</h4>
              <ChasideScoresBarChart data={datosChasideGrafica} />
            </div>
          </div>
        </section>

        {/* Sección 2: Cerebro Triádico */}
        <section className="mb-8 break-inside-avoid">
          <h3 className="text-2xl font-bold text-gray-700 mb-2">2. Dominancia Cerebral (Triádico)</h3>
          <div className="min-h-[20rem] min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4" style={{ minHeight: 352, minWidth: 1 }}>
            <TriadicDonutChart data={datosTriadicos} />
          </div>
        </section>

        {/* Sección 3: Perfiles Recomendados */}
        <section className="break-inside-avoid">
          <h3 className="text-2xl font-bold text-gray-700 mb-4">3. Opciones Profesionales Sugeridas</h3>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {topAreasChaside.map((area, index) => (
              <div key={area.area} className="rounded-lg border border-amber-200 bg-amber-50 p-5 break-inside-avoid">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Top {index + 1} CHASIDE</p>
                <h4 className="mt-1 text-xl font-bold text-amber-900">Área {area.area}</h4>
                <p className="mt-1 text-sm text-amber-800">Puntaje: {area.score}%</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6 print:grid-cols-2">
            {topProfiles?.map((profile, index) => (
              <div key={index} className="p-5 border border-blue-100 rounded-lg bg-blue-50 break-inside-avoid">
                <h4 className="text-xl font-bold text-blue-800 mb-2">
                  Opción {index + 1}: {profile.careerName}
                </h4>
                <p className="text-sm mb-3 text-gray-700 leading-relaxed">{profile.description}</p>
                <h5 className="font-semibold text-gray-700 mb-1 text-sm">Habilidades Blandas Clave:</h5>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-0.5">
                  {profile.softSkills?.map((skill, i) => (
                    <li key={i}>{skill}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

      </div>

      {mostrarDesempate && !areaDesempate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-labelledby="desempate-title">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 id="desempate-title" className="text-xl font-bold text-slate-900">Desempate de perfil vocacional</h3>
            <p className="mt-2 text-sm text-slate-600">Elige obligatoriamente el área que representa mejor cada situación.</p>
            <div className="mt-5 space-y-4">
              {[1, 2, 3].map((question) => (
                <fieldset key={question} className="rounded-lg border border-slate-200 p-3">
                  <legend className="px-1 text-sm font-semibold text-slate-700">Situación {question}</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[areaUno, areaDos].map((area) => (
                      <label key={area} className="cursor-pointer rounded border border-slate-300 p-2 text-center text-sm hover:border-blue-500">
                        <input
                          className="sr-only"
                          type="radio"
                          name={`desempate-${question}`}
                          value={area}
                          checked={respuestasDesempate[question - 1] === area}
                          onChange={() => setRespuestasDesempate((current) => {
                            const next = [...current];
                            next[question - 1] = area;
                            return next;
                          })}
                        />
                        {area}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <button
              type="button"
              disabled={respuestasDesempate.length !== 3 || respuestasDesempate.some((answer) => !answer)}
              className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              onClick={confirmarDesempate}
            >
              Confirmar desempate
            </button>
          </div>
        </div>
      )}

      {areaDesempate && (
        <div role="status" className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
          Desempate completado: área dominante {areaDesempate}.
        </div>
      )}
    </div>
  );
}