// ── Gráfico de barras: quantidade de solicitações por motivo ─────────────────
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { type MotivoDatum, COR_MOTIVO } from '../../services/analytics';

interface ChartMotivoProps {
  data: MotivoDatum[];
}

export default function ChartMotivo({ data }: ChartMotivoProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis
          dataKey="motivo"
          tick={{ fontSize: 11, fill: '#64748B' }}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={60}
          stroke="#CBD5E1"
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} stroke="#CBD5E1" />
        <Tooltip
          cursor={{ fill: 'rgba(148,163,184,0.1)' }}
          contentStyle={{
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
            fontSize: 13,
          }}
        />
        <Bar
          dataKey="quantidade"
          name="Solicitações"
          radius={[6, 6, 0, 0]}
          isAnimationActive={true}
          animationDuration={500}
          animationEasing="ease-out"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COR_MOTIVO[i % COR_MOTIVO.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
