import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import {
  REFERENCE_DATE, REFERENCE_MONTH, TIME_ZONE, doctors, entries, monthGrid,
  shiftMonth, entriesForDay, entriesForMonth, monthSummary, calendarLabels, entryLabel,
} from '../calendar.mjs';

const fixtures = JSON.parse(await readFile(new URL('../../CASOS-SINTETICOS.json', import.meta.url), 'utf8'));

test('October 2026 is Monday-first with continuous adjacent dates', () => {
  const grid = monthGrid(2026, 9);
  assert.equal(grid.length, 42);
  assert.deepEqual(grid[0], { date: '2026-09-28', day: 28, inMonth: false, weekday: 0 });
  assert.deepEqual(grid[3], { date: '2026-10-01', day: 1, inMonth: true, weekday: 3 });
  assert.equal(grid.at(-1).date, '2026-11-08');
  assert.equal(grid.filter((cell) => cell.inMonth).length, 31);
  assert.equal(new Set(grid.map((cell) => cell.date)).size, 42);
  for (let index = 1; index < grid.length; index++) {
    assert.equal(Date.parse(`${grid[index].date}T00:00:00Z`) - Date.parse(`${grid[index - 1].date}T00:00:00Z`), 86_400_000);
  }
});

test('a Monday month start has no invented preceding week', () => {
  const grid = monthGrid(2026, 5);
  assert.equal(grid[0].date, '2026-06-01');
  assert.equal(grid[0].inMonth, true);
  assert.equal(grid[6].date, '2026-06-07');
});

test('Gregorian leap years handle February and century exceptions', () => {
  for (const [year, days] of [[2024, 29], [2026, 28], [2000, 29], [2100, 28]]) {
    const dates = monthGrid(year, 1).filter((cell) => cell.inMonth);
    assert.equal(dates.length, days, String(year));
    assert.equal(dates.at(-1).day, days);
  }
});

test('month navigation crosses years in both directions without date overflow', () => {
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
  assert.deepEqual(shiftMonth(2026, 9, -22), { year: 2024, month: 11 });
  assert.deepEqual(shiftMonth(2026, 9, 0), REFERENCE_MONTH);
});

test('calendar math does not shift dates with the machine timezone or DST', () => {
  const moduleURL = new URL('../calendar.mjs', import.meta.url).href;
  const code = `import {monthGrid,shiftMonth} from ${JSON.stringify(moduleURL)}; process.stdout.write(JSON.stringify([monthGrid(2026,2),shiftMonth(2026,0,-1)]));`;
  const outputs = ['America/Sao_Paulo', 'America/New_York', 'Pacific/Auckland'].map((TZ) => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, TZ }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  });
  assert.equal(outputs[0], outputs[1]);
  assert.equal(outputs[1], outputs[2]);
  assert.equal(TIME_ZONE, 'America/Sao_Paulo');
});

test('invalid dates and invalid filters cannot silently become different days', () => {
  for (const value of ['2026-02-29', '2026-13-01', '2026-10-00', '2026-10-32', '12/10/2026', null, '2026-10-12T09:00:00Z']) {
    assert.throws(() => entriesForDay(value), RangeError);
  }
  assert.deepEqual(entriesForDay('2024-02-29'), []);
  assert.throws(() => entriesForDay(REFERENCE_DATE, 'DOCTOR-REAL'), RangeError);
  for (const [year, month] of [[2026, 12], [2026, -1], [2026.5, 1], [0, 1]]) {
    assert.throws(() => monthGrid(year, month), RangeError);
  }
  assert.throws(() => shiftMonth(2026, 1, 0.5), RangeError);
  assert.throws(() => shiftMonth(9999, 11, 1), RangeError);
});

test('each agenda link points to an existing synthetic case and no other identity', () => {
  const ids = new Set(fixtures.casos.map((item) => item.id));
  const doctorIds = new Set(doctors.map((doctor) => doctor.id));
  assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length);
  assert.deepEqual(new Set(entries.map((entry) => entry.caseId).filter(Boolean)), ids);
  for (const entry of entries) {
    assert.ok(doctorIds.has(entry.doctorId));
    assert.ok(entry.caseId === null || ids.has(entry.caseId));
    assert.match(entry.start, /^\d{2}:\d{2}$/);
    assert.match(entry.end, /^\d{2}:\d{2}$/);
    assert.ok(entry.start < entry.end);
    assert.equal(Object.hasOwn(entry, 'appointmentConfirmed'), false);
    assert.equal(Object.hasOwn(entry, 'book'), false);
  }
});

test('cancellation, refusal, unresolved conflict and medical routing stay distinct', () => {
  assert.equal(entries.find((entry) => entry.caseId === 'SIM-RET-01').status, 'cancelled');
  assert.equal(entries.find((entry) => entry.caseId === 'SIM-RET-04').status, 'blocked');
  assert.equal(entries.find((entry) => entry.caseId === 'SIM-RET-07').status, 'conflict');
  for (const caseId of ['SIM-RET-05', 'SIM-RET-08']) {
    const entry = entries.find((item) => item.caseId === caseId);
    assert.equal(entry.status, 'medical');
    assert.equal(entry.kind, 'review');
    assert.match(entryLabel(entry).description, /medical team/i);
  }
  const conflict = entryLabel(entries.find((entry) => entry.caseId === 'SIM-RET-07'));
  assert.match(conflict.description, /not confirmation evidence/);
  assert.match(conflict.description, /still required/);
});

test('availability examples are unlinked and do not propose replacement appointments', () => {
  const availability = entries.filter((entry) => entry.kind === 'availability');
  assert.equal(availability.length, 2);
  for (const entry of availability) {
    assert.equal(entry.caseId, null);
    assert.equal(entry.status, 'available');
    assert.match(entryLabel(entry).description, /cannot be booked/);
  }
});

test('doctor and day filters remain stable, sorted, and do not duplicate items', () => {
  const all = entriesForDay(REFERENCE_DATE);
  assert.equal(all.length, 5);
  assert.deepEqual(all.map((entry) => entry.start), ['08:30', '09:00', '09:30', '10:00', '10:30']);
  assert.equal(entriesForDay(REFERENCE_DATE, 'MED-SIM-A').length, 3);
  assert.equal(entriesForDay(REFERENCE_DATE, 'MED-SIM-B').length, 2);
  const a = entriesForMonth(2026, 9, 'MED-SIM-A');
  const b = entriesForMonth(2026, 9, 'MED-SIM-B');
  assert.equal(a.length + b.length, entriesForMonth(2026, 9).length);
  assert.ok(a.every((entry) => entry.doctorId === 'MED-SIM-A'));
  assert.deepEqual(entriesForMonth(2026, 10), []);
});

test('summary counts items and unique linked cases rather than confirmed appointments', () => {
  assert.deepEqual(monthSummary(2026, 9), {
    total: 10, linkedCases: 8, available: 2, cancelled: 1, pending: 2, waiting: 1, blocked: 1, medical: 2, conflict: 1,
  });
  assert.equal(monthSummary(2026, 9, 'MED-SIM-A').total, 5);
  assert.equal(monthSummary(2026, 9, 'MED-SIM-B').total, 5);
  assert.deepEqual(monthSummary(2026, 10), {
    total: 0, linkedCases: 0, available: 0, cancelled: 0, pending: 0, waiting: 0, blocked: 0, medical: 0, conflict: 0,
  });
});

test('each language covers the complete agenda without altering original case text', () => {
  const original = JSON.stringify(fixtures);
  const statusKeys = Object.keys(calendarLabels('en').statuses);
  for (const language of ['en', 'pt', 'es']) {
    const dictionary = calendarLabels(language);
    assert.equal(dictionary.weekdays.length, 7);
    assert.deepEqual(Object.keys(dictionary.statuses), statusKeys);
    assert.ok(dictionary.disclaimer.length > 80);
    for (const entry of entries) {
      const text = entryLabel(entry, language);
      assert.ok(text.title.length > 5);
      assert.ok(text.description.length > 30);
      assert.ok(dictionary.statuses[entry.status]);
      assert.ok(dictionary.kinds[entry.kind]);
    }
  }
  assert.equal(calendarLabels('unsupported'), calendarLabels('en'));
  assert.deepEqual(entryLabel(entries[0], 'unsupported'), entryLabel(entries[0], 'en'));
  assert.equal(JSON.stringify(fixtures), original);
});

test('static fixtures and calendar results cannot mutate case state or later renders', () => {
  const before = JSON.stringify(entries);
  assert.throws(() => { entries[0].status = 'confirmed'; }, TypeError);
  assert.throws(() => { entries[0].text.en[0] = 'Confirmed appointment'; }, TypeError);
  assert.throws(() => { entriesForDay(REFERENCE_DATE).push({}); }, TypeError);
  assert.throws(() => { monthGrid(2026, 9)[0].date = '2026-10-12'; }, TypeError);
  assert.equal(JSON.stringify(entries), before);
});
