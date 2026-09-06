import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function toChasideData(data) {
  if (Array.isArray(data)) {
    return data
      .map((item) => ({
        area: item.area ?? item.name ?? item.key,
        score: Number(item.score ?? item.value ?? 0),
      }))
      .filter((item) => item.area);
  }

  return Object.entries(data ?? {}).map(([area, score]) => ({
    area,
    score: Number(score) || 0,
  }));
}

export default function ChasideScoresBarChart({ data }) {
  const chartData = toChasideData(data);

  return (
    <div
      className="h-80 min-h-[20rem] min-w-0 w-full"
      style={{ height: 320, minHeight: 320, minWidth: 1, width: '100%' }}
      aria-label="Gráfica de barras de puntajes CHASIDE"
    >
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={320}>
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="area" tick={{ fill: '#475569', fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip formatter={(value) => [`${value}%`, 'Puntaje']} />
            <Bar dataKey="score" name="Puntaje" fill="#0f766e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="flex h-full items-center justify-center text-sm text-slate-500">Sin puntajes CHASIDE</p>
      )}
    </div>
  );
}
