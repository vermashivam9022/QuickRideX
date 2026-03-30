type StatusBadgeProps = {
  status?: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status?.toLowerCase()
  let className = 'border-gray-200 bg-gray-50 text-gray-700'

  if (normalized === 'confirmed' || normalized === 'verified' || normalized === 'completed' || normalized === 'running') {
    className = 'border-green-200 bg-green-50 text-green-800'
  } else if (normalized === 'pending') {
    className = 'border-amber-200 bg-amber-50 text-amber-800'
  } else if (normalized === 'cancelled') {
    className = 'border-red-200 bg-red-50 text-red-800'
  }

  return (
    <span
      className={[
        'inline-flex items-center rounded border px-3 py-1 text-xs font-medium',
        className,
      ].join(' ')}
    >
      {status ?? '—'}
    </span>
  )
}

