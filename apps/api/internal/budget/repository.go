package budget

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	collectionName   = "budgets"
	budgetDocumentID = "default_budget"
)

type BudgetRepository interface {
	Get(ctx context.Context) (*BudgetState, error)
	Save(ctx context.Context, state *BudgetState) error
}

type MongoRepository struct {
	collection *mongo.Collection
}

var _ BudgetRepository = (*MongoRepository)(nil)

func NewMongoRepository(client *mongo.Client, dbName string) *MongoRepository {
	return &MongoRepository{
		collection: client.Database(dbName).Collection(collectionName),
	}
}

func NewRepository(db *mongo.Database) *MongoRepository {
	return &MongoRepository{
		collection: db.Collection(collectionName),
	}
}

func (r *MongoRepository) Get(ctx context.Context) (*BudgetState, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	filter := bson.M{"_id": budgetDocumentID}

	var doc BudgetDocument
	err := r.collection.FindOne(ctx, filter).Decode(&doc)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return doc.Data, nil
}

func (r *MongoRepository) Save(ctx context.Context, state *BudgetState) error {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	now := time.Now().UTC()

	filter := bson.M{"_id": budgetDocumentID}
	update := bson.M{
		"$set": bson.M{
			"data":      state,
			"updatedAt": now,
		},
	}
	opts := options.Update().SetUpsert(true)

	_, err := r.collection.UpdateOne(ctx, filter, update, opts)
	return err
}
