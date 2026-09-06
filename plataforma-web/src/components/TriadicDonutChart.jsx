import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#f97316', '#ec4899', '#14b8a6'];
const LABELS = {
  left: 'Lógico',
  central: 'Emocional',
  right: 'Operativo',
  lógico: 'Lógico',
  emocional: 'Emocional',
  operativo: 'Operativo',
};

function toTriadicData(data) {
  if (Array.isArray(data)) {
    return data
      .map((item) => ({
        name: item.name ?? item.area ?? item.key,
        value: Number(item.value ?? item.score ?? 0),
      }))
      .filter((item) => item.name);
  }

  return Object.entries(data ?? {}).map(([key, value]) => ({
    name: LABELS[key.toLowerCase()] ?? key,
    value: Number(value) || 0,
  }));
}

export default function TriadicDonutChart({ data }) {
  const chartData = toTriadicData(data);

  return (
    <div
      className="h-80 min-h-[20rem] min-w-0 w-full"
      style={{ height: 320, minHeight: 320, minWidth: 1, width: '100%' }}
      aria-label="Gráfica de dona de dominancia cerebral triádica"
    >
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={320}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="78%"
              paddingAngle={3}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value}%`, 'Dominancia']} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="flex h-full items-center justify-center text-sm text-slate-500">Sin datos triádicos</p>
      )}
    </div>
  );
}
