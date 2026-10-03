package entry

type PatchEntryRequest struct {
	PlannedAmount *float64 `json:"plannedAmount,omitempty"`
	DueDate       *string  `json:"dueDate,omitempty"`
}

type ConfirmEntryRequest struct {
	ActualAmount *float64 `json:"actualAmount,omitempty"`
	PaidDate     *string  `json:"paidDate,omitempty"`
}
