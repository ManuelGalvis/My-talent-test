import chasideConfig from '../data/chaside_config.json';

const { chaside_areas: chasideAreas, items, scoring_rules: scoringRules } = chasideConfig;
export const CHASIDE_AREAS = scoringRules.columnas_resultado;
const TOP_AREAS_LIMIT = scoringRules.regla_determinacion_perfil.n_areas_perfil;

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

function isAffirmativeAnswer(answer) {
  return answer === true
    || answer === 1
    || answer === '1'
    || ['si', 'sí', 'yes', 'true'].includes(String(answer).toLowerCase());
}

function getItemAnswer(answer) {
  if (answer && typeof answer === 'object') return answer.answer ?? answer.score;
  return answer;
}

function getAnswerEntries(data) {
  if (Array.isArray(data?.answers)) {
    return new Map(data.answers.map((answer) => [Number(answer.questionId), getItemAnswer(answer)]));
  }

  const entries = new Map();
  const positions = {};
  items.forEach((item) => {
    const block = data?.[item.dimension] ?? data?.[item.dimension === 'intereses' ? 'interests' : item.dimension];
    const areaAnswers = block?.[item.area];
    const positionKey = `${item.dimension}:${item.area}`;
    const position = positions[positionKey] ?? 0;
    positions[positionKey] = position + 1;
    entries.set(item.id, Array.isArray(areaAnswers) ? areaAnswers[position] : areaAnswers);
  });
  return entries;
}

function scoreResponses(data) {
  const answersByItem = getAnswerEntries(data);
  return items.reduce((scores, item) => {
    if (isAffirmativeAnswer(answersByItem.get(item.id))) {
      scores[item.area][item.dimension] += scoringRules.valor_respuesta_afirmativa;
    }
    return scores;
  }, Object.fromEntries(CHASIDE_AREAS.map((area) => [area, { intereses: 0, aptitudes: 0 }])));
}

function hasItemResponses(data) {
  if (Array.isArray(data?.answers)) return true;

  const groupedAnswerCount = [data?.interests, data?.intereses, data?.aptitudes]
    .filter(Boolean)
    .reduce((total, block) => total + Object.values(block).reduce(
      (count, values) => count + (Array.isArray(values) ? values.length : 1),
      0,
    ), 0);
  return groupedAnswerCount >= items.length;
}

function scoreLegacyAggregates(data) {
  return Object.fromEntries(CHASIDE_AREAS.map((area) => {
    const interestValue = data?.interests?.[area] ?? 0;
    const aptitudeValue = data?.aptitudes?.[area] ?? 0;
    return [area, {
      intereses: Array.isArray(interestValue) ? interestValue.reduce((total, value) => total + (Number(value) || 0), 0) : Number(interestValue) || 0,
      aptitudes: Array.isArray(aptitudeValue) ? aptitudeValue.reduce((total, value) => total + (Number(value) || 0), 0) : Number(aptitudeValue) || 0,
    }];
  }));
}

export function validarRespuestasChaside({ interests, aptitudes, intereses, answers: rawAnswers } = {}) {
  const answers = Array.isArray(rawAnswers)
    ? rawAnswers.map(getItemAnswer)
    : [
      ...flattenAnswers(interests ?? intereses),
      ...flattenAnswers(aptitudes),
    ];
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

export function calcularResultadosChaside({ interests, aptitudes, intereses, answers } = {}) {
  const responseData = { interests, aptitudes, intereses, answers };
  const validacion = validarRespuestasChaside(responseData);
  if (!validacion.valid) return { ...validacion, results: [], topAreas: [] };

  const scores = hasItemResponses(responseData)
    ? scoreResponses({ ...responseData, intereses: intereses ?? interests })
    : scoreLegacyAggregates({ interests: intereses ?? interests, aptitudes });
  const results = CHASIDE_AREAS.map((area) => {
    const interestScore = scores[area].intereses;
    const aptitudeScore = scores[area].aptitudes;
    const areaConfig = chasideAreas[area];
    return {
      area,
      interestScore,
      aptitudeScore,
      totalScore: interestScore + aptitudeScore,
      score: interestScore + aptitudeScore,
      rasgos_intereses: areaConfig.rasgos_intereses,
      rasgos_aptitudes: areaConfig.rasgos_aptitudes,
    };
  }).sort((first, second) => second.totalScore - first.totalScore);

  const hasManualTie = results.length > 1 && results[0].totalScore === results[1].totalScore;

  return {
    ...validacion,
    status: hasManualTie ? 'REQUIERE_DESEMPATE_MANUAL' : 'VALID',
    results,
    topAreas: results.slice(0, TOP_AREAS_LIMIT),
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
