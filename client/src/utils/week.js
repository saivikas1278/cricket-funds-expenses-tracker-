export function getCurrentWeek(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum)

  const year = utcDate.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7)

  return `${year}-W${String(week).padStart(2, '0')}`
}

export function shiftWeekIdentifier(weekIdentifier, weekDelta) {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekIdentifier)
  if (!match) {
    return getCurrentWeek()
  }

  const year = Number(match[1])
  const week = Number(match[2])
  const baseDate = isoWeekToDate(year, week)
  baseDate.setUTCDate(baseDate.getUTCDate() + weekDelta * 7)
  return getCurrentWeek(baseDate)
}

function isoWeekToDate(year, week) {
  const januaryFourth = new Date(Date.UTC(year, 0, 4))
  const dayNum = januaryFourth.getUTCDay() || 7
  const weekOneMonday = new Date(januaryFourth)
  weekOneMonday.setUTCDate(januaryFourth.getUTCDate() - dayNum + 1)

  const target = new Date(weekOneMonday)
  target.setUTCDate(weekOneMonday.getUTCDate() + (week - 1) * 7)
  return target
}
