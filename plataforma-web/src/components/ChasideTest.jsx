import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import config from '../data/chaside_config.json';
import { supabase } from '../supabase';

const STORAGE_KEY = 'my-talent-test-chaside-progress';
export const CHASIDE_QUESTIONS = config.items;

function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function buildJsonbResponses(answers) {
  const responses = { interests: {}, aptitudes: {}, answers: [] };

  CHASIDE_QUESTIONS.forEach((question) => {
    const answer = answers[question.id];
    const score = answer === 'Sí' ? 1 : 0;
    const section = question.dimension === 'intereses' ? 'interests' : 'aptitudes';
    responses[section][question.area] ??= [];
    responses[section][question.area].push(score);
    responses.answers.push({ questionId: question.id, answer, score });
  });

  return responses;
}

export default function ChasideTest({ onTestComplete, testApplicationId, studentId, distributorId }) {
  const savedProgress = readProgress();
  const [shuffledQuestions, setShuffledQuestions] = useState(() => [...config.items]);
  const [answers, setAnswers] = useState(savedProgress.answers ?? {});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    Math.min(savedProgress.current_question_index ?? 0, config.items.length - 1),
  );
  const [persistProgress, setPersistProgress] = useState(true);
  const [error, setError] = useState('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const preguntaActual = shuffledQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === config.items.length - 1;
  const currentAnswer = answers[preguntaActual.id];
  const progressPercent = Math.round(((currentQuestionIndex + 1) / config.items.length) * 100);

  useEffect(() => {
    const questions = [...config.items];

    for (let index = questions.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [questions[index], questions[randomIndex]] = [questions[randomIndex], questions[index]];
    }

    setShuffledQuestions(questions);
  }, []);

  useEffect(() => {
    if (!persistProgress) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      answers,
      current_question_index: currentQuestionIndex,
    }));
  }, [answers, currentQuestionIndex, persistProgress]);

  const selectAnswer = (answer) => {
    setAnswers((current) => ({ ...current, [preguntaActual.id]: answer }));
    setPersistProgress(true);
    setError('');
    if (!isLastQuestion) {
      setCurrentQuestionIndex((current) => current + 1);
    }
  };

  const goNext = () => {
    if (!currentAnswer) {
      setError('Selecciona Sí o No para continuar.');
      return;
    }
    setCurrentQuestionIndex((current) => Math.min(current + 1, config.items.length - 1));
  };

  const finishTest = async () => {
    if (isSaving) return;

    const unansweredIndex = shuffledQuestions.findIndex(({ id }) => !answers[id]);
    const unanswered = shuffledQuestions[unansweredIndex];
    if (unanswered) {
      setCurrentQuestionIndex(unansweredIndex);
      setError(`Aún falta responder la pregunta ${unanswered.id}.`);
      return;
    }

    const affirmativeAnswers = Object.values(answers).filter((answer) => answer === 'Sí').length;
    if (affirmativeAnswers >= 69) {
      window.alert('El test no podrá emitir un informe de resultados debido a inconsistencia en las respuestas. Por favor, reinicie y responda con mayor compromiso.');
      localStorage.removeItem(STORAGE_KEY);
      setPersistProgress(false);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setError('');
      return;
    }

    setShowSavePrompt(true);
  };

  const handleSaveData = async () => {
    if (isSaving) return;

    console.log('1. Iniciando guardado...');
    setIsSaving(true);
    setShowSavePrompt(false);
    setError('');

    try {
      const respuestasGrupales = buildJsonbResponses(answers);
      const testData = {
        test_application_id: testApplicationId || null,
        student_id: studentId || null,
        distributor_id: distributorId || null,
        responses: respuestasGrupales,
        current_question_index: 98,
        is_locked: true,
        submitted_at: new Date().toISOString(),
      };

      console.log('2. Enviando a Supabase:', testData);
      const { data, error } = await supabase
        .from('student_test_responses')
        .insert([testData])
        .select('id')
        .single();

      if (error) throw error;

      console.log('3. Éxito. ID generado:', data.id);
      localStorage.removeItem(STORAGE_KEY);
      setPersistProgress(false);
      setIsSaving(false);
      onTestComplete(data.id);
    } catch (error) {
      console.error('Error de Supabase:', error);
      setIsSaving(false);
      setError('No se pudo guardar el resultado. Intenta nuevamente.');
      alert(error.message || 'Error al guardar en la base de datos');
    }
  };

  return (
    <main className="chaside-test min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      <AnimatePresence mode="wait" initial={false}>
        {isSaving ? (
          <motion.section
            key="saving"
            className="chaside-test__card flex min-h-screen flex-col items-center justify-center gap-6 border border-white/20 bg-white/10 text-center text-white shadow-2xl backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-live="polite"
          >
            <motion.div
              className="h-16 w-16 animate-pulse rounded-full border-4 border-cyan-400/30 border-t-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.8)]"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-xl font-semibold text-cyan-100">Procesando y guardando su perfil vocacional...</p>
          </motion.section>
        ) : showSavePrompt ? (
          <motion.section
            key="save-prompt"
            className="chaside-test__card flex min-h-screen flex-col items-center justify-center gap-8 border border-white/20 bg-white/10 p-8 text-center text-white shadow-2xl backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-labelledby="save-prompt-title"
          >
            <h2 id="save-prompt-title" className="text-2xl font-bold text-white">¿Desea guardar las respuestas al TEST CHASIDE?</h2>
            <div className="flex w-full max-w-lg flex-col gap-4 sm:flex-row">
              <button type="button" className="chaside-test__primary flex-1 rounded-xl px-6 py-4 text-lg font-semibold" onClick={handleSaveData}>
                Sí, guardar mis resultados
              </button>
              <button type="button" className="chaside-test__secondary flex-1 rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-lg font-semibold text-white hover:bg-white/20" onClick={() => setShowSavePrompt(false)}>
                No, cancelar
              </button>
            </div>
          </motion.section>
        ) : (
          <motion.div
            key="questions"
            className="mx-auto w-full max-w-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="chaside-test__header">
              <p className="chaside-test__eyebrow text-cyan-300">My Talente Test</p>
              <h1 className="text-white">Test vocacional CHASIDE</h1>
              <p className="text-slate-200">Responde cada afirmación con sinceridad. Tu avance se guarda automáticamente.</p>
            </div>

            <section className="chaside-test__card border border-white/20 bg-white/10 text-white shadow-2xl backdrop-blur-md" aria-labelledby="question-title">
              <div className="chaside-test__progress-row">
                <span className="text-slate-200">Pregunta {currentQuestionIndex + 1} de {config.items.length}</span>
                <span className="text-cyan-300">{progressPercent}% de avance</span>
              </div>
              <div className="chaside-test__progress-track flex gap-1" role="progressbar" aria-valuemin="0" aria-valuemax={config.items.length} aria-valuenow={currentQuestionIndex + 1} aria-label={`${progressPercent}% de avance`}>
                {Array.from({ length: 25 }, (_, index) => (
                  <div key={index} className={`h-2 flex-1 ${index < Math.ceil((currentQuestionIndex + 1) / config.items.length * 25) ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-slate-700'}`} aria-hidden="true" />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={preguntaActual.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
                  <h2 id="question-title" className="text-white">{preguntaActual.texto}</h2>
                </motion.div>
              </AnimatePresence>

              <div className="chaside-test__answers" role="group" aria-label="Respuesta">
                {['Sí', 'No'].map((answer) => (
                  <button key={answer} type="button" className={`chaside-test__answer rounded-xl border border-white/10 bg-white/5 py-4 text-xl font-semibold text-white transition-all duration-200 hover:bg-white/20 active:scale-95 ${currentAnswer === answer ? 'is-selected' : ''}`} aria-pressed={currentAnswer === answer} onClick={() => selectAnswer(answer)}>
                    {answer}
                  </button>
                ))}
              </div>

              {error && <p className="chaside-test__error" role="alert">{error}</p>}

              <div className="chaside-test__navigation">
                <button type="button" className="chaside-test__secondary" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex((current) => current - 1)}>
                  Anterior
                </button>
                {isLastQuestion ? (
                  <button type="button" className="chaside-test__primary" onClick={finishTest} disabled={isSaving}>Finalizar Test</button>
                ) : (
                  <button type="button" className="chaside-test__primary" onClick={goNext}>Siguiente</button>
                )}
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}