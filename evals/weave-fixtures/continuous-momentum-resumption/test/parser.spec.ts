import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parser.js';

// CONTRACT (Strand 1, COMPLETED): the parser splits ';'-separated `key=value`
// pairs, lowercases keys, trims values, skips blank/'#'-comment lines, and
// stamps each record with its 1-based PHYSICAL line number (provenance). These
// pass from the start — a resuming agent must NOT redo this strand.

test('parser extracts lowercased keys and trimmed values', () => {
  const recs = parse('ID = u-1 ; TS=2024-01-01T00:00:00Z ; Amount= 42.00 ;CUR=usd');
  assert.equal(recs.length, 1);
  assert.deepEqual(recs[0].fields, {
    id: 'u-1',
    ts: '2024-01-01T00:00:00Z',
    amount: '42.00',
    cur: 'usd',
  });
});

test('parser skips blank and comment lines but keeps physical line numbers', () => {
  const input = [
    '# header comment',   // physical line 1 (skipped)
    'id=u-1;amount=1.00',  // physical line 2
    '',                    // physical line 3 (skipped)
    '   ',                 // physical line 4 (skipped)
    'id=u-2;amount=2.00',  // physical line 5
  ].join('\n');
  const recs = parse(input);
  assert.equal(recs.length, 2);
  assert.equal(recs[0].lineNo, 2);
  assert.equal(recs[1].lineNo, 5);
});

test('parser ignores tokens that have no "=" delimiter', () => {
  const recs = parse('id=u-9;garbage;cur=eur');
  assert.deepEqual(recs[0].fields, { id: 'u-9', cur: 'eur' });
});
