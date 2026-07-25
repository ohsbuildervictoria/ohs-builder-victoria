import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// "Incidents by Type" donut chart.
const COLORS = ["#f59e0b", "#22c55e", "#f97316", "#ef4444", "#0ea5e9", "#8b5cf6"];

export default function IncidentBar({ data, height = 240 }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* paddingAngle only makes sense with more than one slice. With a
              single incident type it ate the whole ring and left a 4-degree
              sliver that read as an empty chart. */}
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="50%"
            outerRadius="80%"
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
            verticalAlign="bottom"
            height={36}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
