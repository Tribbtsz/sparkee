-- 待办与文件夹加外键级联，并把历史遗留的孤立行清掉。
-- SQLite 不能给已有表补外键，只能重建。

DELETE FROM todos
WHERE folder_id IS NOT NULL
  AND folder_id NOT IN (SELECT id FROM todo_folders);

CREATE TABLE todos_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER REFERENCES todo_folders (id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO todos_new (id, folder_id, content, is_done, created_at, updated_at)
SELECT id, folder_id, content, is_done, created_at, updated_at FROM todos;

DROP TABLE todos;
ALTER TABLE todos_new RENAME TO todos;

CREATE INDEX IF NOT EXISTS idx_todos_folder ON todos (folder_id);
CREATE INDEX IF NOT EXISTS idx_todos_done ON todos (is_done);
