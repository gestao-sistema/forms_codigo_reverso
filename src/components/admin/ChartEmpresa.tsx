// ── Gráfico de pizza: proporção Alinare vs Novitah ───────────────────────────
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { type EmpresaDatum, COR_EMPRESA } from '../../services/analytics';

interface ChartEmpresaProps {
  data: EmpresaDatum[];
}

export default function ChartEmpresa({ data }: ChartEmpresaProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="quantidade"
          nameKey="empresa"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={2}
          stroke="#ffffff"
          strokeWidth={2}
          isAnimationActive={true}
          animationDuration={500}
          animationEasing="ease-out"
          animationBegin={0}
          // Rótulo com percentual em cada fatia (usa `percent` nativo do Recharts)
          label={((props: { name?: string; percent?: number }) =>
            `${props.name}: ${Math.round((props.percent ?? 0) * 100)}%`) as never}
          labelLine={false}
          style={{ fontSize: 12, fontWeight: 500 }}
        >
          {data.map((d) => (
            <Cell key={d.empresa} fill={COR_EMPRESA[d.empresa]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value} solicitações`, '']}
          contentStyle={{
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
            fontSize: 13,
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={24}
          iconType="circle"
          formatter={(value) => (
            <span style={{ color: '#475569', fontSize: 13 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
