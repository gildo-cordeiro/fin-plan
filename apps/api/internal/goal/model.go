package goal

type GoalContribution struct {
	ID     string  `json:"id" bson:"id"`
	Date   string  `json:"date" bson:"date"`
	Amount float64 `json:"amount" bson:"amount"`
	Note   *string `json:"note,omitempty" bson:"note,omitempty"`
}

type Goal struct {
	ID            string             `json:"id" bson:"_id"`
	Name          string             `json:"name" bson:"name"`
	Description   *string            `json:"description,omitempty" bson:"description,omitempty"`
	TargetAmount  float64            `json:"targetAmount" bson:"targetAmount"`
	Icon          *string            `json:"icon,omitempty" bson:"icon,omitempty"`
	Color         *string            `json:"color,omitempty" bson:"color,omitempty"`
	Status        string             `json:"status" bson:"status"`
	Contributions []GoalContribution `json:"contributions" bson:"contributions"`
}

type UpdateGoalInput struct {
	Name         *string  `json:"name,omitempty"`
	Description  *string  `json:"description,omitempty"`
	TargetAmount *float64 `json:"targetAmount,omitempty"`
	Icon         *string  `json:"icon,omitempty"`
	Color        *string  `json:"color,omitempty"`
	Status       *string  `json:"status,omitempty"`
}

type AddContributionInput struct {
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
	Note   *string `json:"note,omitempty"`
}
