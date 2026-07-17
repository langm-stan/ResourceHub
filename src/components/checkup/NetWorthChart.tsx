import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { fmtUSD, formatUSDCompact } from '../../lib/format'
import type { HistoryPoint } from '../../hooks/useFinancialSnapshot'
import { TrendingUp } from 'lucide-react'

function formatMonthDay(iso: string) {
  // Parse the YYYY-MM-DD snapshot date as local time — new Date(iso) would treat
  // it as UTC midnight and can display the previous day in western timezones.
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NetWorthChart({ history }: { history: HistoryPoint[] }) {
  if (history.length < 2) {
    return (
      <div className="h-48 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 flex flex-col items-center justify-center gap-2 text-center">
        <TrendingUp className="text-stone-300" size={22} />
        <p className="text-sm font-medium text-stone-600">
          {history.length === 0 ? 'Your trend will build here' : 'One point recorded so far'}
        </p>
        <p className="text-xs text-stone-400 max-w-xs">
          Each day you edit your numbers, that day's net worth is recorded in this browser. Check back
          after your next update to see the line take shape.
        </p>
      </div>
    )
  }

  const data = history.map((h) => ({ label: formatMonthDay(h.date), value: h.netWorth }))

  return (
    <div className="h-48 rounded-xl border border-stone-200 bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hairline)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatUSDCompact(Number(v))} />
          <Tooltip formatter={(v) => fmtUSD(Number(v))} />
          <Area type="monotone" dataKey="value" stroke="var(--accent)" fill="url(#netWorthFill)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
