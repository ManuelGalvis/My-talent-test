import { useEffect, useState } from 'react';

const STORAGE_KEY = 'my-talent-test-chaside-progress';
const CHASIDE_AREAS = ['C', 'H', 'A', 'S', 'I', 'D', 'E'];

const exampleQuestions = [
  { id: 1, text: '¿Te interesa investigar cómo funcionan las cosas?', section: 'interests', area: 'C' },
  { id: 2, text: '¿Te gusta ayudar a otras personas a resolver sus problemas?', section: 'interests', area: 'H' },
  { id: 3, text: '¿Disfrutas crear o expresar ideas de forma artística?', section: 'interests', area: 'A' },
  { id: 4, text: '¿Te interesa trabajar en actividades que impliquen servicio a la comunidad?', section: 'interests', area: 'S' },
  { id: 5, text: '¿Te llaman la atención las actividades relacionadas con tecnología?', section: 'interests', area: 'I' },
];

export const CHASIDE_QUESTIONS = [
  ...exampleQuestions,
  ...Array.from({ length: 93 }, (_, index) => {
    const questionNumber = index + 6;
    const zeroBasedIndex = questionNumber - 1;
    return {
      id: questionNumber,
      text: `Pregunta CHASIDE ${questionNumber} (pendiente de completar)`,
      section: zeroBasedIndex < 49 ? 'interests' : 'aptitudes',
      area: CHASIDE_AREAS[zeroBasedIndex % CHASIDE_AREAS.length],
    };
  }),
];

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
    responses[question.section][question.area] ??= [];
    responses[question.section][question.area].push(score);
    responses.answers.push({ questionId: question.id, answer, score });
  });

  return responses;
}

export default function ChasideTest({ onComplete }) {
  const savedProgress = readProgress();
  const [answers, setAnswers] = useState(savedProgress.answers ?? {});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    Math.min(savedProgress.current_question_index ?? 0, CHASIDE_QUESTIONS.length - 1),
  );
  const [persistProgress, setPersistProgress] = useState(true);
  const [error, setError] = useState('');
  const question = CHASIDE_QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === CHASIDE_QUESTIONS.length - 1;
  const currentAnswer = answers[question.id];
  const progressPercent = Math.round(((currentQuestionIndex + 1) / CHASIDE_QUESTIONS.length) * 100);

  useEffect(() => {
    if (!persistProgress) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      answers,
      current_question_index: currentQuestionIndex,
    }));
  }, [answers, currentQuestionIndex, persistProgress]);

  const selectAnswer = (answer) => {
    setAnswers((current) => ({ ...current, [question.id]: answer }));
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
    setCurrentQuestionIndex((current) => Math.min(current + 1, CHASIDE_QUESTIONS.length - 1));
  };

  const finishTest = () => {
    const unanswered = CHASIDE_QUESTIONS.find(({ id }) => !answers[id]);
    if (unanswered) {
      setCurrentQuestionIndex(unanswered.id - 1);
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

    onComplete({
      responses: buildJsonbResponses(answers),
      completed_at: new Date().toISOString(),
    });
  };

  return (
    <main className="chaside-test">
      <div className="chaside-test__header">
        <p className="chaside-test__eyebrow">MyTalent Test</p>
        <h1>Test vocacional CHASIDE</h1>
        <p>Responde cada afirmación con sinceridad. Tu avance se guarda automáticamente.</p>
      </div>

      <section className="chaside-test__card" aria-labelledby="question-title">
        <div className="chaside-test__progress-row">
          <span>Pregunta {question.id} de {CHASIDE_QUESTIONS.length}</span>
          <span>{progressPercent}% de avance</span>
        </div>
        <div
          className="chaside-test__progress-track"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax={CHASIDE_QUESTIONS.length}
          aria-valuenow={question.id}
          aria-label={`${progressPercent}% de avance`}
        >
          <div className="chaside-test__progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <p className="chaside-test__area">Área {question.area}</p>
        <h2 key={question.id} id="question-title">{question.text}</h2>

        <div className="chaside-test__answers" role="group" aria-label="Respuesta">
          {['Sí', 'No'].map((answer) => (
            <button
              key={answer}
              type="button"
              className={`chaside-test__answer ${currentAnswer === answer ? 'is-selected' : ''}`}
              aria-pressed={currentAnswer === answer}
              onClick={() => selectAnswer(answer)}
            >
              {answer}
            </button>
          ))}
        </div>

        {error && <p className="chaside-test__error" role="alert">{error}</p>}

        <div className="chaside-test__navigation">
          <button
            type="button"
            className="chaside-test__secondary"
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex((current) => current - 1)}
          >
            Anterior
          </button>
          {isLastQuestion ? (
            <button type="button" className="chaside-test__primary" onClick={finishTest}>
              Finalizar Test
            </button>
          ) : (
            <button type="button" className="chaside-test__primary" onClick={goNext}>
              Siguiente
            </button>
          )}
        </div>
      </section>
    </main>
  );
}