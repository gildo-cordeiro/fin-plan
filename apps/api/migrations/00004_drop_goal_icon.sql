-- +goose Up
ALTER TABLE goal DROP COLUMN IF EXISTS icon;

-- +goose Down
ALTER TABLE goal ADD COLUMN icon VARCHAR(20);
