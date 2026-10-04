-- +goose Up
-- +goose StatementBegin
UPDATE item SET type = 'cartao' WHERE LOWER(type) IN ('cartoes', 'cartões');
UPDATE item SET type = 'variavel' WHERE LOWER(type) IN ('var', 'vars', 'variável');
UPDATE item SET type = 'fixa' WHERE LOWER(type) IN ('fixas');
UPDATE item SET type = 'renda' WHERE LOWER(type) IN ('rendas');

-- Ensure all remaining types are lowercase and canonical
UPDATE item SET type = LOWER(type) WHERE type != LOWER(type);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Down migration is intentionally left blank since this is a data cleanup
-- +goose StatementEnd
