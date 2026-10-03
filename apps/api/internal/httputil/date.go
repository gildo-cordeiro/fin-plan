package httputil

import "time"

// DateLayout é o formato de data aceito pela API (ISO 8601, YYYY-MM-DD).
const DateLayout = "2006-01-02"

// IsValidDate verifica se a string está no formato YYYY-MM-DD e é uma data real.
func IsValidDate(s string) bool {
	_, err := time.Parse(DateLayout, s)
	return err == nil
}
