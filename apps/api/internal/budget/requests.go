package budget

type CreateBudgetRequest struct {
	Year                           int      `json:"year"`
	InitialBalance                 *float64 `json:"initialBalance,omitempty"`
	EmergencyReserveTarget         *float64 `json:"emergencyReserveTarget,omitempty"`
	EmergencyReserveInitialBalance *float64 `json:"emergencyReserveInitialBalance,omitempty"`
}

type PatchBudgetRequest struct {
	InitialBalance                 *float64 `json:"initialBalance,omitempty"`
	EmergencyReserveTarget         *float64 `json:"emergencyReserveTarget,omitempty"`
	EmergencyReserveInitialBalance *float64 `json:"emergencyReserveInitialBalance,omitempty"`
}
