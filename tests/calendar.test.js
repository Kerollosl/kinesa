import test from "node:test";
import assert from "node:assert/strict";
import {
  copticDate,
  formatCoptic,
  orthodoxPascha,
  churchSeason,
  nextFeast,
  dayKey,
} from "../src/calendar.js";

const d = (y, m, day) => new Date(y, m - 1, day);
const ymd = (date) => dayKey(date);

test("Gregorian dates convert to the Coptic calendar", () => {
  assert.equal(formatCoptic(copticDate(d(2025, 9, 11))), "1 Thout 1742 AM");
  assert.equal(formatCoptic(copticDate(d(2026, 1, 7))), "29 Kiahk 1742 AM");
  assert.equal(formatCoptic(copticDate(d(2026, 1, 19))), "11 Toba 1742 AM");
  assert.equal(formatCoptic(copticDate(d(2026, 11, 7))), "28 Paopi 1743 AM");
  // Coptic year 1739 began on 12 September 2022, before the Gregorian leap year 2024.
  assert.equal(formatCoptic(copticDate(d(2023, 9, 12))), "1 Thout 1740 AM");
  assert.equal(copticDate(d(2023, 9, 11)).monthName, "Nasie");
});

test("Orthodox Pascha matches published dates", () => {
  const known = {
    2023: "2023-04-16",
    2024: "2024-05-05",
    2025: "2025-04-20",
    2026: "2026-04-12",
    2027: "2027-05-02",
  };
  for (const [year, date] of Object.entries(known))
    assert.equal(ymd(orthodoxPascha(Number(year))), date);
});

test("church seasons and feasts follow the Coptic year", () => {
  assert.equal(
    churchSeason(d(2026, 4, 12)).feast.name,
    "Feast of the Resurrection",
  );
  assert.equal(churchSeason(d(2026, 2, 16)).season.name, "Great Lent");
  assert.equal(churchSeason(d(2026, 2, 2)).season.name, "Fast of Nineveh");
  assert.equal(churchSeason(d(2026, 4, 9)).season.name, "Holy Week");
  assert.equal(churchSeason(d(2026, 5, 1)).season.name, "The Holy Fifty Days");
  assert.equal(
    churchSeason(d(2026, 5, 21)).feast.name,
    "Feast of the Ascension",
  );
  assert.equal(churchSeason(d(2026, 6, 15)).season.name, "The Apostles' Fast");
  assert.equal(
    churchSeason(d(2026, 7, 12)).feast.name,
    "Feast of Saints Peter and Paul",
  );
  assert.equal(
    churchSeason(d(2026, 8, 10)).season.name,
    "The Fast of the Virgin Mary",
  );
  assert.equal(churchSeason(d(2026, 12, 1)).season.name, "The Nativity Fast");
  assert.equal(churchSeason(d(2027, 1, 7)).feast.name, "Feast of the Nativity");
  // 29 Kiahk fell on 8 January 2024, but the Nativity is kept on 7 January.
  assert.equal(churchSeason(d(2024, 1, 7)).feast.name, "Feast of the Nativity");
  assert.equal(churchSeason(d(2024, 1, 19)).feast.name, "Feast of Theophany");
  assert.equal(churchSeason(d(2026, 11, 25)).season.name, "The Nativity Fast");
  assert.equal(churchSeason(d(2027, 1, 6)).season.name, "The Nativity Fast");
  assert.equal(churchSeason(d(2026, 11, 24)).season, null);
  assert.equal(churchSeason(d(2026, 9, 11)).feast.name, "Nayrouz");
  const quiet = churchSeason(d(2026, 11, 7));
  assert.equal(quiet.feast, null);
  assert.equal(quiet.season, null);
});

test("the next fixed feast is counted in days", () => {
  const next = nextFeast(d(2026, 11, 7));
  assert.equal(next.name, "Feast of the Nativity");
  assert.equal(ymd(next.date), "2027-01-07");
  assert.equal(next.days, 61);
});
