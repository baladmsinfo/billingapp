// utils/dateRange.ts
export function getDateRange(period) {
  const now = new Date()
  let start

  switch (period) {
    case "thisMonth":
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case "thisQuarter":
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      break
    case "yearToDate":
    case "thisYear":
    default:
      start = new Date(now.getFullYear(), 0, 1)
  }

  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(now.getTime() / 1000),
  }
}
