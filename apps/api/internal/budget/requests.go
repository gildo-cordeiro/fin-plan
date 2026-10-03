package budget

type CreateBudgetRequest struct {
	Year                   int      `json:"year"`
	InitialBalance         *float64 `json:"initialBalance,omitempty"`
	EmergencyReserveTarget *float64 `json:"emergencyReserveTarget,omitempty"`
}

type PatchBudgetRequest struct {
	InitialBalance         *float64 `json:"initialBalance,omitempty"`
	EmergencyReserveTarget *float64 `json:"emergencyReserveTarget,omitempty"`
}
