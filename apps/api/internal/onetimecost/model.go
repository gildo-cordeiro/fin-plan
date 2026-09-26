package onetimecost

type OneTimeCost struct {
	ID            string  `json:"id" bson:"_id"`
	Name          string  `json:"name" bson:"name"`
	Value         float64 `json:"value" bson:"value"`
	TargetMonthID *string `json:"targetMonthId,omitempty" bson:"targetMonthId,omitempty"`
	Off           *bool   `json:"off,omitempty" bson:"off,omitempty"`
	Notes         *string `json:"notes,omitempty" bson:"notes,omitempty"`
}

type UpdateOneTimeCostInput struct {
	Name               *string  `json:"name,omitempty"`
	Value              *float64 `json:"value,omitempty"`
	TargetMonthID      *string  `json:"targetMonthId,omitempty"`
	ClearTargetMonthID bool     `json:"clearTargetMonthId,omitempty"`
	Off                *bool    `json:"off,omitempty"`
	Notes              *string  `json:"notes,omitempty"`
}
