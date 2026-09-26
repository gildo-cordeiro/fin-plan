package budget

import (
	"context"
	"time"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/goal"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	CollectionBudgets     = "budgets"
	CollectionBudgetYears = CollectionBudgets
)

type Repository interface {
	CreateYear(ctx context.Context, y *BudgetYear) error
	GetYearByYear(ctx context.Context, year int) (*BudgetYear, error)
	ListYears(ctx context.Context) ([]BudgetYear, error)
	UpdateSimulation(ctx context.Context, year int, input *UpdateSimulationInput) (*BudgetYear, error)
	AddMonthToYear(ctx context.Context, year int, m *Month) error
	GetYearViewModel(ctx context.Context, year int) (*YearViewModel, error)
}

type MongoRepository struct {
	db        *mongo.Database
	yearsColl *mongo.Collection
	itemsColl *mongo.Collection
	costsColl *mongo.Collection
	goalsColl *mongo.Collection
}

var _ Repository = (*MongoRepository)(nil)

func NewMongoRepository(client *mongo.Client, dbName string) *MongoRepository {
	db := client.Database(dbName)
	return &MongoRepository{
		db:        db,
		yearsColl: db.Collection(CollectionBudgets),
		itemsColl: db.Collection(item.CollectionName),
		costsColl: db.Collection(cost.CollectionName),
		goalsColl: db.Collection(goal.CollectionName),
	}
}

func NewRepository(db *mongo.Database) *MongoRepository {
	return &MongoRepository{
		db:        db,
		yearsColl: db.Collection(CollectionBudgets),
		itemsColl: db.Collection(item.CollectionName),
		costsColl: db.Collection(cost.CollectionName),
		goalsColl: db.Collection(goal.CollectionName),
	}
}

func (r *MongoRepository) CreateYear(ctx context.Context, y *BudgetYear) error {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	now := time.Now().UTC()
	if y.CreatedAt.IsZero() {
		y.CreatedAt = now
	}
	y.UpdatedAt = now
	if y.Months == nil {
		y.Months = []Month{}
	}

	opts := options.Update().SetUpsert(true)
	_, err := r.yearsColl.UpdateOne(ctx, bson.M{"_id": y.ID}, bson.M{"$set": y}, opts)
	return err
}

func (r *MongoRepository) GetYearByYear(ctx context.Context, year int) (*BudgetYear, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	var y BudgetYear
	err := r.yearsColl.FindOne(ctx, bson.M{"year": year}).Decode(&y)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &y, nil
}

func (r *MongoRepository) ListYears(ctx context.Context) ([]BudgetYear, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "year", Value: 1}})
	cursor, err := r.yearsColl.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var years []BudgetYear
	if err := cursor.All(ctx, &years); err != nil {
		return nil, err
	}
	if years == nil {
		years = []BudgetYear{}
	}
	return years, nil
}

func (r *MongoRepository) UpdateSimulation(ctx context.Context, year int, input *UpdateSimulationInput) (*BudgetYear, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	setFields := bson.M{
		"updatedAt": time.Now().UTC(),
	}

	if input.VarsPercent != nil {
		setFields["simulation.varsPercent"] = *input.VarsPercent
	}
	if input.RendaPercent != nil {
		setFields["simulation.rendaPercent"] = *input.RendaPercent
	}
	if input.OneTimeMarginPercent != nil {
		setFields["simulation.oneTimeMarginPercent"] = *input.OneTimeMarginPercent
	}
	if input.InitialBalance != nil {
		setFields["simulation.initialBalance"] = *input.InitialBalance
	}
	if input.EmergencyReserve != nil {
		setFields["simulation.emergencyReserve"] = *input.EmergencyReserve
	}

	after := options.After
	opts := options.FindOneAndUpdate().SetReturnDocument(after)

	var updated BudgetYear
	err := r.yearsColl.FindOneAndUpdate(ctx, bson.M{"year": year}, bson.M{"$set": setFields}, opts).Decode(&updated)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &updated, nil
}

func (r *MongoRepository) AddMonthToYear(ctx context.Context, year int, m *Month) error {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	// Atualização posicional caso o mês já exista no array
	filter := bson.M{
		"year":      year,
		"months.id": m.ID,
	}
	res, err := r.yearsColl.UpdateOne(ctx, filter, bson.M{
		"$set": bson.M{
			"months.$":  m,
			"updatedAt": time.Now().UTC(),
		},
	})
	if err != nil {
		return err
	}
	if res.MatchedCount > 0 {
		return nil
	}

	// Adiciona no array caso não exista
	pushFilter := bson.M{"year": year}
	pushUpdate := bson.M{
		"$push": bson.M{"months": m},
		"$set":  bson.M{"updatedAt": time.Now().UTC()},
	}
	res, err = r.yearsColl.UpdateOne(ctx, pushFilter, pushUpdate)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return ErrYearNotFound
	}
	return nil
}

func (r *MongoRepository) GetYearViewModel(ctx context.Context, year int) (*YearViewModel, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	budgetYear, err := r.GetYearByYear(ctx, year)
	if err != nil {
		return nil, err
	}
	if budgetYear == nil {
		return nil, nil
	}

	months := budgetYear.Months
	if months == nil {
		months = []Month{}
	}

	// Buscar todos os itens de orçamento
	cursorItems, err := r.itemsColl.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursorItems.Close(ctx)

	var items []item.BudgetItem
	if err := cursorItems.All(ctx, &items); err != nil {
		return nil, err
	}
	if items == nil {
		items = []item.BudgetItem{}
	}

	// Buscar custos pontuais do ano ou sem mês atribuído
	monthIDs := make([]string, len(months))
	for i, m := range months {
		monthIDs[i] = m.ID
	}

	costFilter := bson.M{
		"$or": []bson.M{
			{"targetMonthId": bson.M{"$in": monthIDs}},
			{"targetMonthId": nil},
			{"targetMonthId": ""},
			{"targetMonthId": bson.M{"$exists": false}},
		},
	}
	cursorCosts, err := r.costsColl.Find(ctx, costFilter)
	if err != nil {
		return nil, err
	}
	defer cursorCosts.Close(ctx)

	var costs []cost.OneTimeCost
	if err := cursorCosts.All(ctx, &costs); err != nil {
		return nil, err
	}
	if costs == nil {
		costs = []cost.OneTimeCost{}
	}

	// Buscar todas as metas financeiras
	cursorGoals, err := r.goalsColl.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursorGoals.Close(ctx)

	var goals []goal.Goal
	if err := cursorGoals.All(ctx, &goals); err != nil {
		return nil, err
	}
	if goals == nil {
		goals = []goal.Goal{}
	}

	return &YearViewModel{
		Year:         *budgetYear,
		Months:       months,
		Items:        items,
		OneTimeCosts: costs,
		Goals:        goals,
	}, nil
}
