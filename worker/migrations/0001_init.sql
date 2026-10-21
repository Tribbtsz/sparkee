-- Sparkee 初始表结构。
-- 时间统一存 UTC ISO 字符串（YYYY-MM-DDTHH:MM:SS.sssZ），定宽、可字典序比较。

CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes (archived);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes (is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at);

CREATE TABLE IF NOT EXISTS todo_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER,
    content TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_todos_folder ON todos (folder_id);
CREATE INDEX IF NOT EXISTS idx_todos_done ON todos (is_done);
