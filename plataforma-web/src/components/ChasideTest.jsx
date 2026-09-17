import { useEffect, useState } from 'react';
import config from '../data/chaside_config.json';

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

export default function ChasideTest({ onComplete }) {
  const savedProgress = readProgress();
  const [answers, setAnswers] = useState(savedProgress.answers ?? {});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    Math.min(savedProgress.current_question_index ?? 0, CHASIDE_QUESTIONS.length - 1),
  );
  const [persistProgress, setPersistProgress] = useState(true);
  const [error, setError] = useState('');
  const preguntaActual = CHASIDE_QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === config.items.length - 1;
  const currentAnswer = answers[preguntaActual.id];
  const progressPercent = Math.round(((currentQuestionIndex + 1) / config.items.length) * 100);

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
          <span>Pregunta {preguntaActual.id} de {config.items.length}</span>
          <span>{progressPercent}% de avance</span>
        </div>
        <div
          className="chaside-test__progress-track"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax={config.items.length}
          aria-valuenow={preguntaActual.id}
          aria-label={`${progressPercent}% de avance`}
        >
          <div className="chaside-test__progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <p className="chaside-test__area">Área {preguntaActual.area}</p>
        <h2 key={preguntaActual.id} id="question-title">{preguntaActual.texto}</h2>

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