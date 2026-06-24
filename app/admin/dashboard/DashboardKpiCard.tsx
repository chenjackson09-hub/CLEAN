import Link from 'next/link'

interface Props {
  href: string
  value: number | string
  label: string
  sub?: string
  highlight?: boolean
}

export function DashboardKpiCard({ href, value, label, sub, highlight = false }: Props) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow bg-white border ${
        highlight ? 'border-amber-300' : 'border-gray-100'
      }`}
    >
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-semibold text-gray-700 mt-1">{label}</div>
      {sub && <div className={`text-xs mt-0.5 ${highlight ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>{sub}</div>}
    </Link>
  )
}
