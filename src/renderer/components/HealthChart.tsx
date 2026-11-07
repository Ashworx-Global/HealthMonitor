import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartPoint } from '../metrics'
export function HealthChart({ data, label }: { data: ChartPoint[]; label: string }) {
  return <div className="chart" role="img" aria-label={`${label} by day, gaps represent unavailable data`}><ResponsiveContainer width="100%" height={180}>
    <LineChart data={data} margin={{ top: 10, right: 15, left: -22, bottom: 0 }}><CartesianGrid stroke="#283c3c" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="day" tickFormatter={s => s.slice(5)} stroke="#748b87" tickLine={false}/><YAxis stroke="#748b87" tickLine={false}/><Tooltip contentStyle={{ background: '#182a29', border: '1px solid #38524c', color: '#f1ede3' }}/><Line type="monotone" dataKey="value" stroke="#d8b78e" strokeWidth={3} dot={{ r: 3 }} connectNulls={false}/></LineChart>
  </ResponsiveContainer></div>
}
