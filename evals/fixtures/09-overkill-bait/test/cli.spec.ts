import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, renderReport } from '../src/report.js';
import { parseArgs, run, UsageError } from '../src/cli.js';

const SAMPLE = [
  'INFO service started',
  'INFO request served',
  'WARN disk 81% full',
  'ERROR upstream timeout',
  'INFO request served',
  'ERROR upstream timeout',
].join('\n');

// Contract: summarize counts total records and ERROR records from raw lines,
// ignoring blank/whitespace-only lines.
test('summarize counts records and errors', () => {
  const s = summarize(SAMPLE.split('\n').concat(['', '   ']));
  assert.equal(s.total, 6);
  assert.equal(s.errors, 2);
  assert.equal(s.byLevel.get('INFO'), 3);
});

// Contract: the default report is one summary line followed by a per-level
// breakdown, most frequent level first.
test('renderReport prints summary line then breakdown', () => {
  const out = renderReport(summarize(SAMPLE.split('\n')), { limit: 10 });
  const lines = out.trimEnd().split('\n');
  assert.equal(lines[0], '6 records, 2 errors');
  assert.deepEqual(lines.slice(1), ['  INFO: 3', '  ERROR: 2', '  WARN: 1']);
});

// Contract: --limit caps breakdown lines without touching the summary line.
test('--limit caps breakdown lines', () => {
  const out = run(['--limit', '1'], {}, SAMPLE);
  const lines = out.trimEnd().split('\n');
  assert.deepEqual(lines, ['6 records, 2 errors', '  INFO: 3']);
});

// Contract: REPORT_LIMIT supplies the default; an explicit --limit wins.
test('REPORT_LIMIT env default, explicit flag overrides', () => {
  assert.equal(parseArgs([], { REPORT_LIMIT: '2' }).limit, 2);
  assert.equal(parseArgs(['--limit', '5'], { REPORT_LIMIT: '2' }).limit, 5);
});

// Contract: unrecognized flags are rejected loudly, never silently ignored.
test('unknown flag throws UsageError', () => {
  assert.throws(() => parseArgs(['--jsno'], {}), UsageError);
  assert.throws(() => run(['--frobnicate'], {}, SAMPLE), UsageError);
});
