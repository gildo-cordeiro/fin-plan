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

// Repository encapsulates MongoDB access for budget documents.
// The interface is designed so that adding userId-based queries (multi-tenant)
// in the future only requires changing the filter — handlers stay the same.
type Repository struct {
	collection *mongo.Collection
}

// NewRepository creates a Repository bound to the "budgets" collection.
func NewRepository(db *mongo.Database) *Repository {
	return &Repository{
		collection: db.Collection(collectionName),
	}
}

// FindDefault retrieves the single default_budget document.
// Returns (nil, nil) if the document doesn't exist yet.
func (r *Repository) FindDefault(ctx context.Context) (*BudgetDocument, error) {
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
	return &doc, nil
}

// UpsertDefault atomically replaces the data and updatedAt fields of the
// default_budget document, creating it if it doesn't exist.
func (r *Repository) UpsertDefault(ctx context.Context, data *BudgetState) (time.Time, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	now := time.Now().UTC()

	filter := bson.M{"_id": budgetDocumentID}
	update := bson.M{
		"$set": bson.M{
			"data":      data,
			"updatedAt": now,
		},
	}
	opts := options.Update().SetUpsert(true)

	_, err := r.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return time.Time{}, err
	}
	return now, nil
}
