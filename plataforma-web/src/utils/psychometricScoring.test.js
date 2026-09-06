import { describe, expect, it } from 'vitest';
import {
  analizarResultadosPsicometricos,
  calcularResultadosChaside,
} from './psychometricScoring';

describe('analizarResultadosPsicometricos', () => {
  it('identifica un perfil Logico/Ingenieria con Top 1 I y Top 2 D', () => {
    const resultado = analizarResultadosPsicometricos({
      chaside: {
        C: 31,
        H: 24,
        A: 42,
        S: 36,
        I: 96,
        D: 88,
        E: 51,
      },
      triadic: {
        left: 92,
        central: 38,
        right: 54,
      },
    });

    expect(resultado.chasideTop).toEqual([
      { area: 'I', score: 96 },
      { area: 'D', score: 88 },
    ]);
    expect(resultado.triadicRanking[0]).toEqual({ area: 'Lógico', score: 92 });
  });

  it('identifica un perfil Emocional/Artistico con Top 1 A y Top 2 S', () => {
    const resultado = analizarResultadosPsicometricos({
      chaside: [
        { area: 'C', score: 28 },
        { area: 'H', score: 74 },
        { area: 'A', score: 97 },
        { area: 'S', score: 91 },
        { area: 'I', score: 43 },
        { area: 'D', score: 35 },
        { area: 'E', score: 82 },
      ],
      triadic: [
        { name: 'Lógico', value: 34 },
        { name: 'Emocional', value: 94 },
        { name: 'Operativo', value: 57 },
      ],
    });

    expect(resultado.chasideTop).toEqual([
      { area: 'A', score: 97 },
      { area: 'S', score: 91 },
    ]);
    expect(resultado.triadicRanking[0]).toEqual({ area: 'Emocional', score: 94 });
  });

  it('suma intereses y aptitudes y desempata por aptitud', () => {
    const resultado = calcularResultadosChaside({
      interests: { C: [8], H: [4], A: [3], S: [2], I: [7], D: [7], E: [1] },
      aptitudes: { C: [7], H: [4], A: [2], S: [1], I: [5], D: [8], E: [2] },
    });

    expect(resultado.topAreas.slice(0, 2)).toEqual([
      { area: 'D', interestScore: 7, aptitudeScore: 8, totalScore: 15, score: 15 },
      { area: 'C', interestScore: 8, aptitudeScore: 7, totalScore: 15, score: 15 },
    ]);
  });

  it('detiene el análisis ante respuestas en blanco', () => {
    const resultado = calcularResultadosChaside({
      interests: { C: [8], H: [''], A: [3] },
      aptitudes: { C: [7], H: [4], A: [2] },
    });

    expect(resultado.status).toBe('INVALID_RESPONSES');
    expect(resultado.results).toEqual([]);
  });

  it('detiene el análisis cuando al menos 60% de respuestas son negativas', () => {
    const resultado = calcularResultadosChaside({
      interests: { C: [false], H: [false], A: [false], S: ['no'] },
      aptitudes: { C: [false], H: [true], A: [true], S: [true] },
    });

    expect(resultado.status).toBe('INCONSISTENT_RESPONSES');
    expect(resultado.message).toBe('Inconsistencia en los datos: Por favor repite la prueba');
  });

  it('solicita desempate manual cuando total y aptitud son iguales', () => {
    const resultado = calcularResultadosChaside({
      interests: { C: [5], H: [5], A: [1], S: [1], I: [1], D: [1], E: [1] },
      aptitudes: { C: [5], H: [5], A: [1], S: [1], I: [1], D: [1], E: [1] },
    });

    expect(resultado.status).toBe('REQUIERE_DESEMPATE_MANUAL');
    expect(resultado.topAreas[0].totalScore).toBe(resultado.topAreas[1].totalScore);
  });
});
