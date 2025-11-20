PRAGMA journal_mode = DELETE;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  summary TEXT NOT NULL,
  best_season TEXT NOT NULL,
  highlights TEXT NOT NULL
);
