package migrations

import _ "embed"

//go:embed 000001_initial_schema.up.sql
var InitialSchemaSQL string
