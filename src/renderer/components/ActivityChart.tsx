import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartPoint } from '../metrics'
export function ActivityChart({ data }: { data: ChartPoint[] }) {
  return <div className="chart" role="img" aria-label="Distance by day in kilometers"><ResponsiveContainer width="100%" height={230}>
    <AreaChart data={data} margin={{ top: 10, right: 15, left: -22, bottom: 0 }}>
      <defs><linearGradient id="rideFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8bc59c" stopOpacity={0.35}/><stop offset="100%" stopColor="#8bc59c" stopOpacity={0}/></linearGradient></defs>
      <CartesianGrid stroke="#283c3c" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="day" tickFormatter={s => s.slice(5)} stroke="#748b87" tickLine={false}/><YAxis stroke="#748b87" tickLine={false}/><Tooltip contentStyle={{ background: '#182a29', border: '1px solid #38524c', color: '#f1ede3' }} formatter={value => [`${value} km`, 'Distance']}/>
      <Area type="monotone" dataKey="value" stroke="#a8d7ad" strokeWidth={3} fill="url(#rideFill)" connectNulls={false}/>
    </AreaChart>
  </ResponsiveContainer></div>
}
