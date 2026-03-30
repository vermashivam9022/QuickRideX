type BookingTimePickerProps = {
  startLocal: string
  endLocal: string
  onChange: (next: { startLocal: string; endLocal: string }) => void
  startLabel?: string
  endLabel?: string
  disabled?: boolean
  helperText?: string | null
  startMin?: string
  endMin?: string
}

function splitLocalDateTime(value: string): { date: string; time: string } {
  if (!value || !value.includes('T')) {
    return { date: '', time: '' }
  }

  const [date, timeWithSeconds] = value.split('T')
  const time = (timeWithSeconds || '').slice(0, 5)
  return { date, time }
}

function joinLocalDateTime(date: string, time: string): string {
  if (!date || !time) return ''
  return `${date}T${time}`
}

function todayDateString(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function splitMin(value?: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  return splitLocalDateTime(value)
}

function buildTimeOptions(stepMinutes = 15): string[] {
  const out: string[] = []
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += stepMinutes) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      out.push(`${hh}:${mm}`)
    }
  }
  return out
}

function normalizeToAllowedTime(date: string, time: string, min?: string): string {
  if (!date || !time || !min) return time
  const minParts = splitLocalDateTime(min)
  if (date === minParts.date && minParts.time && time < minParts.time) {
    return minParts.time
  }
  return time
}

function openNativePicker(input: HTMLInputElement) {
  try {
    input.showPicker?.()
  } catch {
    // Ignore if browser blocks or does not support showPicker.
  }
}

export default function BookingTimePicker({
  startLocal,
  endLocal,
  onChange,
  startLabel,
  endLabel,
  disabled,
  helperText,
  startMin,
  endMin,
}: BookingTimePickerProps) {
  const startParts = splitLocalDateTime(startLocal)
  const endParts = splitLocalDateTime(endLocal)
  const startMinParts = splitMin(startMin)
  const endMinParts = splitMin(endMin)

  const fallbackStartDate = startParts.date || startMinParts.date || todayDateString()
  const fallbackEndDate = endParts.date || endMinParts.date || fallbackStartDate

  const fallbackStartTime = startParts.time || startMinParts.time || '00:00'
  const fallbackEndTime = endParts.time || endMinParts.time || '00:00'

  const timeOptions = buildTimeOptions(15)

  function updateStart(nextDate: string, nextTime: string) {
    const safeDate = nextDate || fallbackStartDate
    const safeTime = nextTime || fallbackStartTime
    const normalizedTime = normalizeToAllowedTime(safeDate, safeTime, startMin)
    onChange({
      startLocal: joinLocalDateTime(safeDate, normalizedTime),
      endLocal,
    })
  }

  function updateEnd(nextDate: string, nextTime: string) {
    const safeDate = nextDate || fallbackEndDate
    const safeTime = nextTime || fallbackEndTime
    const normalizedTime = normalizeToAllowedTime(safeDate, safeTime, endMin)
    onChange({
      startLocal,
      endLocal: joinLocalDateTime(safeDate, normalizedTime),
    })
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium ">{startLabel ?? 'Start time'}</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <input
            className="w-full cursor-pointer rounded border border-gray-300 bg-slate-50 px-3 py-2 text-gray-700"
            type="date"
            value={startParts.date || fallbackStartDate}
            min={startMinParts.date || todayDateString()}
            disabled={disabled}
            onClick={(e) => openNativePicker(e.currentTarget)}
            onChange={(e) => updateStart(e.target.value, startParts.time)}
          />
          <select
            className="w-full cursor-pointer rounded border border-gray-300 bg-slate-50 px-3 py-2 text-gray-700"
            value={normalizeToAllowedTime(startParts.date || fallbackStartDate, startParts.time || fallbackStartTime, startMin)}
            disabled={disabled}
            onChange={(e) => updateStart(startParts.date, e.target.value)}
          >
            {timeOptions.map((t) => {
              const blocked =
                Boolean(startMinParts.time) &&
                (startParts.date || fallbackStartDate) === startMinParts.date &&
                t < startMinParts.time

              return (
                <option key={`start-time-${t}`} value={t} disabled={blocked}>
                  {t}
                </option>
              )
            })}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">{endLabel ?? 'End time'}</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <input
            className="w-full cursor-pointer rounded border border-gray-300 bg-slate-50 px-3 py-2 text-gray-700"
            type="date"
            value={endParts.date || fallbackEndDate}
            min={endMinParts.date || (startMinParts.date || todayDateString())}
            disabled={disabled}
            onClick={(e) => openNativePicker(e.currentTarget)}
            onChange={(e) => updateEnd(e.target.value, endParts.time)}
          />
          <select
            className="w-full cursor-pointer rounded border border-gray-300 bg-slate-50 px-3 py-2 text-gray-700"
            value={normalizeToAllowedTime(endParts.date || fallbackEndDate, endParts.time || fallbackEndTime, endMin)}
            disabled={disabled}
            onChange={(e) => updateEnd(endParts.date, e.target.value)}
          >
            {timeOptions.map((t) => {
              const blocked =
                Boolean(endMinParts.time) &&
                (endParts.date || fallbackEndDate) === endMinParts.date &&
                t < endMinParts.time

              return (
                <option key={`end-time-${t}`} value={t} disabled={blocked}>
                  {t}
                </option>
              )
            })}
          </select>
        </div>
      </div>
      {helperText ? (
        <p className="col-span-1 text-sm text-gray-600 sm:col-span-2">{helperText}</p>
      ) : null}
    </div>
  )
}

