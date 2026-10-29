// Plan morning-digest. The contract every part of section 2 builds against.
export type RunStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  // Times keep the offset from the log, never converted to UTC.
  firstAt: string;
  lastAt: string;
};

// Rows come back sorted by job. The page and the JSON show them in this order and never re-sort.
export type Night = { rows: DigestRow[]; badLines: number };

// null: the night has no file. An empty file is { rows: [], badLines: 0 }.
export type ReadNight = (runsDir: string, night: string) => Night | null;
