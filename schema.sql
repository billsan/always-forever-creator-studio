CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  occasion TEXT NOT NULL DEFAULT 'memorial',
  project_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_updated
ON projects (owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS render_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_render_id TEXT,
  status TEXT NOT NULL,
  output_url TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_render_jobs_project
ON render_jobs (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS safe_music_tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  mood TEXT NOT NULL,
  occasions_json TEXT NOT NULL DEFAULT '[]',
  duration_seconds REAL NOT NULL DEFAULT 0,
  provider TEXT NOT NULL,
  license_reference TEXT NOT NULL,
  license_version TEXT NOT NULL DEFAULT '',
  platforms_json TEXT NOT NULL DEFAULT '[]',
  content_id_policy TEXT NOT NULL DEFAULT 'not-registered',
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','active')),
  stored TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_safe_music_status_title
ON safe_music_tracks (status, title);

CREATE TABLE IF NOT EXISTS studio_grants (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  order_id INTEGER NOT NULL DEFAULT 0,
  product_id INTEGER NOT NULL DEFAULT 0,
  photo_limit INTEGER NOT NULL DEFAULT 0,
  song_limit INTEGER NOT NULL DEFAULT 0,
  duration_limit REAL NOT NULL DEFAULT 0,
  project_limit INTEGER NOT NULL DEFAULT 1,
  projects_created INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_studio_grants_owner
ON studio_grants (owner_id, status);
