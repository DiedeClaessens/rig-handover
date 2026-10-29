import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

function nightFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(join(dir, '2026-01-01.jsonl'), content);
  return dir;
}

describe('readNight', () => {
  it('summarises 2026-10-28 into five jobs sorted by job and one bad line', () => {
    expect(readNight('runs', '2026-10-28')).toEqual({
      badLines: 1,
      rows: [
        {
          job: 'digest/render',
          owner: null,
          runs: 1,
          retries: 0,
          lastStatus: 'ok',
          lastError: null,
          firstAt: '2026-10-29T05:41:09+01:00',
          lastAt: '2026-10-29T05:41:09+01:00',
        },
        {
          job: 'fixtures/refresh',
          owner: 'rook',
          runs: 4,
          retries: 3,
          lastStatus: 'ok',
          lastError: null,
          firstAt: '2026-10-29T01:30:00+01:00',
          lastAt: '2026-10-29T01:37:00+01:00',
        },
        {
          job: 'lane/sync',
          owner: 'rook',
          runs: 8,
          retries: 1,
          lastStatus: 'ok',
          lastError: null,
          firstAt: '2026-10-28T23:00:06+01:00',
          lastAt: '2026-10-29T05:00:04+01:00',
        },
        {
          job: 'notes/backup',
          owner: 'lane-07',
          runs: 1,
          retries: 0,
          lastStatus: 'fail',
          lastError: 'quota exceeded',
          firstAt: '2026-10-29T04:00:01+01:00',
          lastAt: '2026-10-29T04:00:01+01:00',
        },
        {
          job: 'rig/rotate-logs',
          owner: 'lane-07',
          runs: 1,
          retries: 0,
          lastStatus: 'ok',
          lastError: null,
          firstAt: '2026-10-28T23:00:02+01:00',
          lastAt: '2026-10-28T23:00:02+01:00',
        },
      ],
    });
  });

  it('returns null when the night has no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
    expect(readNight('runs', '2026-10-27')).not.toBeNull();
  });

  it('returns no rows and no bad lines for an empty file', () => {
    expect(readNight(nightFile(''), '2026-01-01')).toEqual({ rows: [], badLines: 0 });
  });

  it('counts valid JSON with a missing field or unknown status as a bad line', () => {
    const dir = nightFile(
      [
        '{"at":"2026-01-01T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}',
        '{"at":"2026-01-01T02:00:00+01:00","job":"a","status":"ok"}',
        '{"at":"2026-01-01T03:00:00+01:00","job":"a","status":"skipped","owner":"rook"}',
        '[1,2]',
        '',
      ].join('\n'),
    );
    expect(readNight(dir, '2026-01-01')).toEqual({
      badLines: 3,
      rows: [
        {
          job: 'a',
          owner: 'rook',
          runs: 1,
          retries: 0,
          lastStatus: 'ok',
          lastError: null,
          firstAt: '2026-01-01T01:00:00+01:00',
          lastAt: '2026-01-01T01:00:00+01:00',
        },
      ],
    });
  });
});
