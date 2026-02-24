export type DateRange = {
  start: string;
  end: string;
};

export type LabeledDateRange = DateRange & {
  label: string;
};

export type WeeklyPeriods = {
  today: string;
  week1: DateRange;
  week2: DateRange;
  week3: DateRange;
  week4: DateRange;
};

export type MonthlyPeriods = {
  today: string;
  currentMonthStart: string;
  previousMonthStart: string;
  current: LabeledDateRange;
  minus1: LabeledDateRange;
  minus2: LabeledDateRange;
  minus3: LabeledDateRange;
};

const IST_TIME_ZONE = "Asia/Kolkata";

type YearMonthDay = {
  year: number;
  month: number;
  day: number;
};

function toIstYearMonthDay(date: Date): YearMonthDay {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const yearPart = parts.find((part) => part.type === "year")?.value;
  const monthPart = parts.find((part) => part.type === "month")?.value;
  const dayPart = parts.find((part) => part.type === "day")?.value;

  if (!yearPart || !monthPart || !dayPart) {
    throw new Error("Failed to derive IST date components.");
  }

  return {
    year: Number(yearPart),
    month: Number(monthPart),
    day: Number(dayPart),
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateKey(date: YearMonthDay): string {
  return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

function parseDateKey(dateKey: string): YearMonthDay {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  return {
    year: Number(yearRaw),
    month: Number(monthRaw),
    day: Number(dayRaw),
  };
}

function addDays(dateKey: string, days: number): string {
  const parsed = parseDateKey(dateKey);
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return toDateKey({
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  });
}

function shiftMonth(year: number, month: number, delta: number) {
  const absoluteMonth = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(absoluteMonth / 12);
  const nextMonth = (absoluteMonth % 12) + 1;
  return { year: nextYear, month: nextMonth };
}

function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

function lastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad2(month)}-${pad2(lastDay)}`;
}

function monthLabelFromDateKey(dateKey: string): string {
  const parsed = parseDateKey(dateKey);
  const utcDate = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));

  return new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(utcDate);
}

export function getCurrentIstDateKey(now = new Date()): string {
  return toDateKey(toIstYearMonthDay(now));
}

export function getWeeklyPeriods(now = new Date()): WeeklyPeriods {
  const today = getCurrentIstDateKey(now);

  return {
    today,
    week1: { start: addDays(today, -6), end: today },
    week2: { start: addDays(today, -13), end: addDays(today, -7) },
    week3: { start: addDays(today, -20), end: addDays(today, -14) },
    week4: { start: addDays(today, -27), end: addDays(today, -21) },
  };
}

export function getMonthlyPeriods(now = new Date()): MonthlyPeriods {
  const today = getCurrentIstDateKey(now);
  const parsedToday = parseDateKey(today);

  const currentMonthStart = firstDayOfMonth(parsedToday.year, parsedToday.month);

  const m1 = shiftMonth(parsedToday.year, parsedToday.month, -1);
  const m2 = shiftMonth(parsedToday.year, parsedToday.month, -2);
  const m3 = shiftMonth(parsedToday.year, parsedToday.month, -3);

  const minus1Start = firstDayOfMonth(m1.year, m1.month);
  const minus2Start = firstDayOfMonth(m2.year, m2.month);
  const minus3Start = firstDayOfMonth(m3.year, m3.month);

  const previousMonthStart = minus1Start;

  return {
    today,
    currentMonthStart,
    previousMonthStart,
    current: {
      label: monthLabelFromDateKey(currentMonthStart),
      start: currentMonthStart,
      end: today,
    },
    minus1: {
      label: monthLabelFromDateKey(minus1Start),
      start: minus1Start,
      end: lastDayOfMonth(m1.year, m1.month),
    },
    minus2: {
      label: monthLabelFromDateKey(minus2Start),
      start: minus2Start,
      end: lastDayOfMonth(m2.year, m2.month),
    },
    minus3: {
      label: monthLabelFromDateKey(minus3Start),
      start: minus3Start,
      end: lastDayOfMonth(m3.year, m3.month),
    },
  };
}

export function isDateWithinRange(
  dateKey: string,
  range: DateRange,
): boolean {
  return dateKey >= range.start && dateKey <= range.end;
}

