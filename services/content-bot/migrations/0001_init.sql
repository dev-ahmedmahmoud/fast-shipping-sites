-- People allowed to talk to the bot. Phone numbers live ONLY here (never in git, never in commit messages).
CREATE TABLE people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,            -- digits only, with country code, e.g. 201012345678
  role TEXT NOT NULL CHECK (role IN ('client','cabinet')),
  lang TEXT NOT NULL DEFAULT 'ar' CHECK (lang IN ('ar','en')),
  active INTEGER NOT NULL DEFAULT 1,
  last_inbound_at INTEGER,               -- unix seconds, for the 24h WhatsApp window
  created_at INTEGER NOT NULL
);
-- Exactly one active client.
CREATE UNIQUE INDEX one_active_client ON people(role) WHERE role = 'client' AND active = 1;

CREATE TABLE changes (
  id TEXT PRIMARY KEY,                   -- short id shown on WhatsApp, e.g. K7M2QX
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

-- Short memory so the bot can ask a question and understand the answer.
CREATE TABLE convo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX convo_person ON convo(person_id, created_at);

-- WhatsApp retries webhooks: remember message ids already handled.
CREATE TABLE seen_messages (
  wamid TEXT PRIMARY KEY,
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
  actor TEXT NOT NULL,                   -- person name, or "unknown:<8 hex of salted hash>" (never a raw number)
  event TEXT NOT NULL,
  change_id TEXT,
  detail TEXT,
  commit_sha TEXT
);
CREATE INDEX audit_change ON audit(change_id);
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
