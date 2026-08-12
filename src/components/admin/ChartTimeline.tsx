// ── Gráfico de área: volume de solicitações ao longo do tempo ────────────────
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TimelineDatum } from '../../services/analytics';

interface ChartTimelineProps {
  data: TimelineDatum[];
}

export default function ChartTimeline({ data }: ChartTimelineProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -16 }}>
        <defs>
          <linearGradient id="gradVolume" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis
          dataKey="dataLabel"
          tick={{ fontSize: 12, fill: '#64748B' }}
          stroke="#CBD5E1"
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} stroke="#CBD5E1" />
        <Tooltip
          contentStyle={{
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
            fontSize: 13,
          }}
          labelFormatter={(label) => `Data: ${label}`}
        />
        <Area
          type="monotone"
          dataKey="quantidade"
          name="Solicitações"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="url(#gradVolume)"
          dot={{ r: 3, fill: '#3B82F6' }}
          activeDot={{ r: 5 }}
          isAnimationActive={true}
          animationDuration={500}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
