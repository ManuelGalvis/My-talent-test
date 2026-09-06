import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
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

export default function ChasideRadarChart({ data }) {
  const chartData = toChasideData(data);

  return (
    <div
      className="h-80 min-h-[20rem] min-w-0 w-full"
      style={{ height: 320, minHeight: 320, minWidth: 1, width: '100%' }}
      aria-label="Gráfica de radar del perfil CHASIDE"
    >
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={320}>
          <RadarChart data={chartData} outerRadius="72%">
            <PolarGrid stroke="#cbd5e1" />
            <PolarAngleAxis dataKey="area" tick={{ fill: '#475569', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip formatter={(value) => [`${value}%`, 'Puntaje']} />
            <Radar
              name="CHASIDE"
              dataKey="score"
              stroke="#2563eb"
              fill="#3b82f6"
              fillOpacity={0.45}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      ) : (
        <p className="flex h-full items-center justify-center text-sm text-slate-500">Sin datos CHASIDE</p>
      )}
    </div>
  );
}
