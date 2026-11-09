// The Coptic calendar: thirteen months (twelve of 30 days and the little
// month of Nasie), counted from the Era of the Martyrs (AM, from AD 284).
// Conversions use fixed day numbers (Rata Die) after Reingold & Dershowitz,
// Calendrical Calculations.

export const COPTIC_MONTHS = [
  "Thout",
  "Paopi",
  "Hathor",
  "Kiahk",
  "Toba",
  "Amshir",
  "Baramhat",
  "Baramouda",
  "Bashans",
  "Paona",
  "Epep",
  "Mesra",
  "Nasie",
];
const COPTIC_EPOCH = 103605; // 29 August 284 (Julian)
const DAY = 86400000;
const UNIX_EPOCH_RD = 719163; // 1 January 1970

const toFixed = (date) =>
  Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY,
  ) + UNIX_EPOCH_RD;
const fromFixed = (rd) => {
  const d = new Date((rd - UNIX_EPOCH_RD) * DAY);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
const fixedFromCoptic = (year, month, day) =>
  COPTIC_EPOCH -
  1 +
  365 * (year - 1) +
  Math.floor(year / 4) +
  30 * (month - 1) +
  day;

export function copticDate(date = new Date()) {
  const rd = toFixed(date);
  const year = Math.floor((4 * (rd - COPTIC_EPOCH) + 1463) / 1461);
  const month = Math.floor((rd - fixedFromCoptic(year, 1, 1)) / 30) + 1;
  const day = rd + 1 - fixedFromCoptic(year, month, 1);
  return { year, month, day, monthName: COPTIC_MONTHS[month - 1] };
}
export const formatCoptic = ({ day, monthName, year }) =>
  `${day} ${monthName} ${year} AM`;

// Gregorian date of a Coptic date in the Coptic year that contains `near`.
function gregorianOf(month, day, near) {
  const { year } = copticDate(near);
  return fromFixed(fixedFromCoptic(year, month, day));
}

// Orthodox Pascha: the Julian computus, shifted to the Gregorian calendar.
export function orthodoxPascha(year) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const julianOffset = Math.floor(year / 100) - Math.floor(year / 400) - 2;
  return new Date(year, month - 1, day + julianOffset);
}

const addDays = (date, n) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const sameDay = (a, b) => toFixed(a) === toFixed(b);
const within = (date, start, end) =>
  toFixed(date) >= toFixed(start) && toFixed(date) <= toFixed(end);

// Feasts on fixed Coptic dates, and seasons of the year, as kept in the Coptic Orthodox Church.
// The Nativity and Theophany are publicly kept on 7 and 19 January every year,
// so they are pinned to those Gregorian dates rather than computed.
const FIXED_FEASTS = [
  {
    month: 1,
    day: 1,
    name: "Nayrouz",
    note: "The Coptic New Year, remembering the martyrs.",
  },
  {
    month: 1,
    day: 17,
    name: "Feast of the Cross",
    note: "Remembering the finding of the Holy Cross.",
  },
  {
    gregorian: [1, 7],
    month: 4,
    day: 29,
    name: "Feast of the Nativity",
    note: "Christmas in the Coptic Church.",
  },
  {
    gregorian: [1, 19],
    month: 5,
    day: 11,
    name: "Feast of Theophany",
    note: "The baptism of Christ in the Jordan.",
  },
  {
    month: 7,
    day: 29,
    name: "Feast of the Annunciation",
    note: "Gabriel's message to the Virgin Mary.",
  },
  {
    month: 9,
    day: 24,
    name: "Entry of the Lord into Egypt",
    note: "The Holy Family's flight into Egypt.",
  },
  {
    month: 11,
    day: 5,
    name: "Feast of Saints Peter and Paul",
    note: "The Apostles' Fast ends today.",
  },
  {
    month: 12,
    day: 16,
    name: "Feast of the Assumption",
    note: "Remembering the Virgin Mary.",
  },
];

const feastDate = (f, near) =>
  f.gregorian
    ? new Date(near.getFullYear(), f.gregorian[0] - 1, f.gregorian[1])
    : gregorianOf(f.month, f.day, near);
// 25 November to 6 January, across the turn of the year.
function nativityFast(date) {
  const year =
    date.getMonth() >= 10 ? date.getFullYear() : date.getFullYear() - 1;
  return { start: new Date(year, 10, 25), end: new Date(year + 1, 0, 6) };
}

export function churchSeason(date = new Date()) {
  const feast = FIXED_FEASTS.find((f) => sameDay(date, feastDate(f, date)));
  const pascha = orthodoxPascha(date.getFullYear());
  const lent = addDays(pascha, -55);
  const movable = [
    {
      start: addDays(lent, -14),
      end: addDays(lent, -12),
      name: "Fast of Nineveh",
      note: "Three days remembering Jonah's call to repentance.",
    },
    {
      start: lent,
      end: addDays(pascha, -9),
      name: "Great Lent",
      note: "Fifty-five days of fasting before Pascha.",
    },
    {
      start: addDays(pascha, -8),
      end: addDays(pascha, -8),
      name: "Lazarus Saturday",
      note: "Remembering the raising of Lazarus.",
    },
    {
      start: addDays(pascha, -7),
      end: addDays(pascha, -7),
      name: "Palm Sunday",
      note: "The Lord's entry into Jerusalem.",
    },
    {
      start: addDays(pascha, -6),
      end: addDays(pascha, -1),
      name: "Holy Week",
      note: "The week of the Passion.",
    },
    {
      start: pascha,
      end: pascha,
      name: "Feast of the Resurrection",
      note: "Christ is risen!",
    },
    {
      start: addDays(pascha, 39),
      end: addDays(pascha, 39),
      name: "Feast of the Ascension",
      note: "Forty days after the Resurrection.",
    },
    {
      start: addDays(pascha, 49),
      end: addDays(pascha, 49),
      name: "Feast of Pentecost",
      note: "The Holy Spirit descends on the apostles.",
    },
    {
      start: addDays(pascha, 1),
      end: addDays(pascha, 48),
      name: "The Holy Fifty Days",
      note: "The joyful season after the Resurrection.",
    },
    {
      start: addDays(pascha, 50),
      end: gregorianOf(11, 4, pascha),
      name: "The Apostles' Fast",
      note: "Fasting until the feast of Saints Peter and Paul.",
    },
  ];
  const fixedSeasons = [
    {
      start: gregorianOf(12, 1, date),
      end: gregorianOf(12, 15, date),
      name: "The Fast of the Virgin Mary",
      note: "Fifteen days before the feast of the Assumption.",
    },
    {
      ...nativityFast(date),
      name: "The Nativity Fast",
      note: "Forty-three days of preparation for the Nativity.",
    },
  ];
  const season = [...movable, ...fixedSeasons].find((s) =>
    within(date, s.start, s.end),
  );
  const day =
    feast || (season && sameDay(season.start, season.end) ? season : null);
  return {
    coptic: copticDate(date),
    feast: day ? { name: day.name, note: day.note } : null,
    season:
      season && !sameDay(season.start, season.end)
        ? { name: season.name, note: season.note }
        : null,
  };
}

// Days until the next fixed feast, for a gentle "coming up" line.
export function nextFeast(date = new Date()) {
  const today = toFixed(date);
  const candidates = FIXED_FEASTS.flatMap((f) => {
    const thisYear = toFixed(feastDate(f, date));
    const nextYear = toFixed(feastDate(f, addDays(date, 366)));
    return [thisYear, nextYear]
      .filter((rd) => rd > today)
      .map((rd) => ({ ...f, rd }));
  });
  const soonest = candidates.sort((a, b) => a.rd - b.rd)[0];
  return soonest
    ? {
        name: soonest.name,
        days: soonest.rd - today,
        date: fromFixed(soonest.rd),
      }
    : null;
}

// Local calendar day as YYYY-MM-DD.
export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const isoWeek = (date = new Date()) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / DAY + 1) / 7);
};
