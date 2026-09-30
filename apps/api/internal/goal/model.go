package goal

type GoalContribution struct {
	ID     string  `json:"id"`
	GoalID string  `json:"goalId,omitempty"`
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
	Note   *string `json:"note,omitempty"`
}

type Goal struct {
	ID            string             `json:"id"`
	Name          string             `json:"name"`
	Description   *string            `json:"description,omitempty"`
	TargetAmount  float64            `json:"targetAmount"`
	Color         *string            `json:"color,omitempty"`
	Status        string             `json:"status"`
	Contributions []GoalContribution `json:"contributions"`
}

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
