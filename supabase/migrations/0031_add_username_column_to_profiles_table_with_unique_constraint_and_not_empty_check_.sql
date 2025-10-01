ALTER TABLE profiles
ADD COLUMN username TEXT UNIQUE,
ADD CONSTRAINT username_not_empty CHECK (username <> '');