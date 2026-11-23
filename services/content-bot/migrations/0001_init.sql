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

-- One request typed in the app = one run of the site agent (Claude Code routine).
CREATE TABLE requests (
  id TEXT PRIMARY KEY,                   -- short id, e.g. K7M2QX (branch: claude/content-k7m2qx)
  person_id INTEGER NOT NULL REFERENCES people(id),
  text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('working','checking','building','done','refused','failed','aborted','reverting','reverted')),
  message TEXT,                          -- shown to the person (why refused / failed)
  session_url TEXT,                      -- the agent run, for Ahmed only (admin log)
  edits_json TEXT,                       -- [{file, locator, old, new, page}] once checked
  live_commit TEXT,
  revert_commit TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  checked_at INTEGER NOT NULL DEFAULT 0,
  building_since INTEGER
);
CREATE INDEX requests_status ON requests(status, created_at);
CREATE INDEX requests_person ON requests(person_id, created_at);

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
