import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let runsDir = '';

const line = (job: string, status: string, at: string) =>
  JSON.stringify({ job, status, at, owner: 'lane-07' });

beforeAll(() => {
  runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-digest-'));
  fs.writeFileSync(
    path.join(runsDir, '2026-01-02.jsonl'),
    [
      line('zeta', 'ok', '2026-01-02T01:00:00+01:00'),
      line('alpha', 'ok', '2026-01-02T02:00:00+01:00'),
      line('mid', 'ok', '2026-01-02T03:00:00+01:00'),
    ].join('\n') + '\n',
  );
  fs.writeFileSync(path.join(runsDir, '2026-01-03.jsonl'), '');
  fs.writeFileSync(
    path.join(runsDir, '2026-01-04.jsonl'),
    [
      line('beta', 'ok', '2026-01-04T01:00:00+01:00'),
      'this is not json',
      line('alpha', 'ok', '2026-01-04T02:00:00+01:00'),
    ].join('\n') + '\n',
  );
});

afterAll(() => {
  fs.rmSync(runsDir, { recursive: true, force: true });
});

const app = () =>
  createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });

const jobsInPage = (html: string, jobs: string[]) =>
  jobs.map((j) => ({ j, i: html.indexOf(j) })).sort((a, b) => a.i - b.i).map((x) => x.j);

describe('GET /digest/:night', () => {
  it('renders the night as HTML with 200', async () => {
    const res = await app().request('/digest/2026-01-02');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('alpha');
    expect(html).toContain('zeta');
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app().request('/digest/2026-01-09');
    expect(res.status).toBe(404);
  });

  it('says nothing ran for an empty file', async () => {
    const res = await app().request('/digest/2026-01-03');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders the good rows when a line is bad', async () => {
    const res = await app().request('/digest/2026-01-04');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('alpha');
    expect(html).toContain('beta');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns rows in readNight order and a zero badLines count', async () => {
    const res = await app().request('/api/digest/2026-01-02');
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(res.status).toBe(200);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha', 'mid', 'zeta']);
    expect(body.badLines).toBe(0);
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app().request('/api/digest/2026-01-09');
    expect(res.status).toBe(404);
  });

  it('returns empty rows for an empty file', async () => {
    const res = await app().request('/api/digest/2026-01-03');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rows: [], badLines: 0 });
  });

  it('counts the bad line and keeps the good rows', async () => {
    const res = await app().request('/api/digest/2026-01-04');
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(body.rows.map((r) => r.job)).toEqual(['alpha', 'beta']);
    expect(body.badLines).toBe(1);
  });
});

describe('page and JSON agree', () => {
  it('shows the same jobs in the same order', async () => {
    const page = await (await app().request('/digest/2026-01-02')).text();
    const api = (await (await app().request('/api/digest/2026-01-02')).json()) as { rows: { job: string }[] };
    const jobs = api.rows.map((r) => r.job);
    expect(jobsInPage(page, jobs)).toEqual(['alpha', 'mid', 'zeta']);
    expect(jobsInPage(page, jobs)).toEqual(jobs);
  });
});
