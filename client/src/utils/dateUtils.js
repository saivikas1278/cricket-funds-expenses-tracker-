export function getWednesday(date) {
  const d = new Date(date);
  const day = d.getDay(); 
  const diff = d.getDate() - day + (day === 0 ? -4 : 3);
  return new Date(d.setDate(diff));
}

export function formatMonthWeek(date) {
  const wed = getWednesday(date);
  const monthName = wed.toLocaleString('en-US', { month: 'long' });
  const year = wed.getFullYear();
  const weekNum = Math.min(4, Math.floor((wed.getDate() - 1) / 7) + 1);
  return `${monthName} ${year} - Week ${weekNum}`;
}

export function getCurrentWeekIdentifier(date = new Date()) {
  const now = new Date(date);
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const year = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function getISOWeekDate(isoWeek) {
  if (!isoWeek) return new Date();
  const parts = isoWeek.split('-W');
  if (parts.length !== 2) return new Date();
  
  const year = parseInt(parts[0], 10);
  const week = parseInt(parts[1], 10);
  
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4) {
      ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
      ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }
  
  const wednesday = new Date(ISOweekStart);
  wednesday.setUTCDate(wednesday.getUTCDate() + 2);
  return wednesday;
}

export function formatISOWeek(isoWeek) {
  const wednesday = getISOWeekDate(isoWeek);
  const monthName = wednesday.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const wYear = wednesday.getUTCFullYear();
  const weekNum = Math.min(4, Math.floor((wednesday.getUTCDate() - 1) / 7) + 1);
  return `${monthName} ${wYear} - Week ${weekNum}`;
}

export function generateWeekHistory(historyArray) {
  const currentWeekStr = getCurrentWeekIdentifier(new Date());
  
  let oldestStr = currentWeekStr;
  if (historyArray && historyArray.length > 0) {
     const weeks = historyArray.map(h => h.week_identifier);
     weeks.sort(); 
     oldestStr = weeks[0];
  }
  
  const oldestDate = getISOWeekDate(oldestStr);
  const currentDate = getISOWeekDate(currentWeekStr);
  
  const allWeeks = [];
  let runner = new Date(currentDate);
  
  let failsafe = 104; // Max 2 years tracking to avoid huge UI
  while (runner >= oldestDate && failsafe > 0) {
    allWeeks.push(getCurrentWeekIdentifier(runner));
    runner.setUTCDate(runner.getUTCDate() - 7);
    failsafe--;
  }
  
  // If player has literally 0 history, we just show current week
  if (allWeeks.length === 0) {
     allWeeks.push(currentWeekStr);
  }
  
  return allWeeks;
}
