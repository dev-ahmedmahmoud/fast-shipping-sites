-- Each published request keeps the exact file text before and after, so Undo can restore deleted points.
ALTER TABLE requests ADD COLUMN files_json TEXT;
