export const CHASIDE_AREAS = ['C', 'H', 'A', 'S', 'I', 'D', 'E'];

function isBlankAnswer(answer) {
  return answer === null || answer === undefined || answer === '';
}

function isNegativeAnswer(answer) {
  return answer === false || answer === 0 || answer === '0' || String(answer).toLowerCase() === 'no';
}

function flattenAnswers(matrix) {
  return Object.values(matrix ?? {}).flatMap((value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);
    return [value];
  });
}

function scoreValue(value) {
  if (Array.isArray(value)) {
    return value.reduce((total, answer) => total + (Number(answer) || 0), 0);
  }
  if (value && typeof value === 'object') {
    return Number(value.score ?? value.value ?? 0) || 0;
  }
  return Number(value) || 0;
}

export function validarRespuestasChaside({ interests, aptitudes, intereses } = {}) {
  const interestAnswers = flattenAnswers(interests ?? intereses);
  const aptitudeAnswers = flattenAnswers(aptitudes);
  const answers = [...interestAnswers, ...aptitudeAnswers];
  const blankCount = answers.filter(isBlankAnswer).length;
  const negativeCount = answers.filter(isNegativeAnswer).length;
  const totalAnswers = answers.length;

  if (!totalAnswers || blankCount > 0) {
    return {
      valid: false,
      status: 'INVALID_RESPONSES',
      message: 'Hay respuestas en blanco. El test no puede ser analizado.',
      blankCount,
      negativeCount,
      totalAnswers,
    };
  }

  if (negativeCount / totalAnswers >= 0.6) {
    return {
      valid: false,
      status: 'INCONSISTENT_RESPONSES',
      message: 'Inconsistencia en los datos: Por favor repite la prueba',
      blankCount,
      negativeCount,
      totalAnswers,
    };
  }

  return { valid: true, status: 'VALID', blankCount, negativeCount, totalAnswers };
}

export function normalizarChasideData(data) {
  if (Array.isArray(data)) {
    return data
      .map((item) => ({
        area: item.area ?? item.name ?? item.key,
        score: Number(item.score ?? item.value ?? 0),
      }))
      .filter((item) => item.area && Number.isFinite(item.score));
  }

  return Object.entries(data ?? {}).map(([area, score]) => ({
    area,
    score: Number(score) || 0,
  }));
}

export function obtenerTopAreasChaside(data, limit = 2) {
  return normalizarChasideData(data)
    .sort((first, second) => second.score - first.score)
    .slice(0, limit);
}

export function calcularResultadosChaside({ interests, aptitudes, intereses } = {}) {
  const validacion = validarRespuestasChaside({ interests, aptitudes, intereses });
  if (!validacion.valid) return { ...validacion, results: [], topAreas: [] };

  const interestMatrix = interests ?? intereses ?? {};
  const aptitudeMatrix = aptitudes ?? {};
  const results = CHASIDE_AREAS.map((area) => {
    const interestScore = scoreValue(interestMatrix[area]);
    const aptitudeScore = scoreValue(aptitudeMatrix[area]);
    return {
      area,
      interestScore,
      aptitudeScore,
      totalScore: interestScore + aptitudeScore,
      score: interestScore + aptitudeScore,
    };
  }).sort((first, second) => {
    const totalDifference = second.totalScore - first.totalScore;
    return totalDifference || second.aptitudeScore - first.aptitudeScore;
  });

  const hasManualTie = results.length > 1
    && results[0].totalScore === results[1].totalScore
    && results[0].aptitudeScore === results[1].aptitudeScore;

  return {
    ...validacion,
    status: hasManualTie ? 'REQUIERE_DESEMPATE_MANUAL' : 'VALID',
    results,
    topAreas: results.slice(0, 2),
  };
}

export function normalizarTriadicData(data) {
  const labels = {
    left: 'Lógico',
    central: 'Emocional',
    right: 'Operativo',
    lógico: 'Lógico',
    emocional: 'Emocional',
    operativo: 'Operativo',
  };

  if (Array.isArray(data)) {
    return data
      .map((item) => ({
        area: item.name ?? item.area ?? item.key,
        score: Number(item.value ?? item.score ?? 0),
      }))
      .filter((item) => item.area && Number.isFinite(item.score));
  }

  return Object.entries(data ?? {}).map(([key, score]) => ({
    area: labels[key.toLowerCase()] ?? key,
    score: Number(score) || 0,
  }));
}

export function analizarResultadosPsicometricos({ chaside, triadic }) {
  const chasideResult = chaside?.interests || chaside?.intereses || chaside?.aptitudes
    ? calcularResultadosChaside(chaside)
    : { valid: true, status: 'VALID', topAreas: obtenerTopAreasChaside(chaside) };

  return {
    chasideTop: chasideResult.topAreas,
    chasideStatus: chasideResult.status,
    chasideValidation: chasideResult,
    triadicRanking: normalizarTriadicData(triadic).sort(
      (first, second) => second.score - first.score,
    ),
  };
}
