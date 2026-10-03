package goal

type CreateGoalRequest struct {
	Name         string  `json:"name"`
	Description  *string `json:"description,omitempty"`
	TargetAmount float64 `json:"targetAmount"`
	Color        *string `json:"color,omitempty"`
	Status       *string `json:"status,omitempty"`
}

type PatchGoalRequest struct {
	Name         *string  `json:"name,omitempty"`
	Description  *string  `json:"description,omitempty"`
	TargetAmount *float64 `json:"targetAmount,omitempty"`
	Color        *string  `json:"color,omitempty"`
	Status       *string  `json:"status,omitempty"`
}

type CreateContributionRequest struct {
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
	Note   *string `json:"note,omitempty"`
}
