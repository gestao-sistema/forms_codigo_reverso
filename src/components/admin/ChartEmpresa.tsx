// ── Gráfico de pizza: proporção Alinare vs Novitah ───────────────────────────
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
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
          label={false}
          labelLine={false}
          style={{ fontSize: 12, fontWeight: 500 }}
        >
          {data.map((d) => (
            <Cell key={d.empresa} fill={COR_EMPRESA[d.empresa]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name, props) => {
            const percent = (props as { payload?: { percent?: number } })?.payload?.percent || 0;
            return [`${Math.round(percent * 100)}% | ${value}`, name];
          }}
          contentStyle={{
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
            fontSize: 13,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
