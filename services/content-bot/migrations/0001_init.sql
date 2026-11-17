-- People allowed to use the app. No phone numbers are stored.
CREATE TABLE people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client','cabinet')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
-- Exactly one active client (the only one who can publish or undo).
CREATE UNIQUE INDEX one_active_client ON people(role) WHERE role = 'client' AND active = 1;

-- One-time invite links. Only a hash of the token is stored.
CREATE TABLE invites (
  token_hash TEXT PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

-- Logged-in devices. Only a hash of the cookie is stored.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id),
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);

-- Phone push-alert subscriptions.
CREATE TABLE push_subs (
  endpoint TEXT PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id),
  created_at INTEGER NOT NULL
);

-- The chat. kind: user = typed by the person, reply = bot answer, notice = change card / status note.
CREATE TABLE chat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id),
  kind TEXT NOT NULL CHECK (kind IN ('user','reply','notice')),
  text TEXT NOT NULL,
  change_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX chat_person ON chat(person_id, id);

CREATE TABLE changes (
  id TEXT PRIMARY KEY,                   -- short id, e.g. K7M2QX
  status TEXT NOT NULL CHECK (status IN ('pending','applying','live','rejected','expired','reverted','failed')),
  requester_id INTEGER NOT NULL REFERENCES people(id),
  approver_id INTEGER REFERENCES people(id),
  edits_json TEXT NOT NULL,              -- [{file, locator, old, new, page}]
  preview_branch TEXT,
  preview_url TEXT,
  live_commit TEXT,
  revert_commit TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  decided_at INTEGER,
  applying_op TEXT,                      -- 'approve' or 'undo' while status = 'applying'
  applying_since INTEGER
);
CREATE INDEX changes_status ON changes(status, expires_at);

-- Queue jobs already handled (a retried job is ignored).
CREATE TABLE seen_jobs (
  key TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE rate (
  key TEXT NOT NULL,
  window INTEGER NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (key, window)
);

-- Audit log: who asked what, who approved, commit hash, time. Append-only (enforced by triggers).
CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  actor TEXT NOT NULL,                   -- person name, 'bot', 'admin' or 'unknown'
  event TEXT NOT NULL,
  change_id TEXT,
  detail TEXT,
  commit_sha TEXT
);
CREATE INDEX audit_change ON audit(change_id);
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
