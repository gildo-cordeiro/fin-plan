package budgetitem

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const CollectionName = "budget_items"

type Repository interface {
	Create(ctx context.Context, item *BudgetItem) error
	GetByID(ctx context.Context, id string) (*BudgetItem, error)
	List(ctx context.Context, itemType string) ([]BudgetItem, error)
	Update(ctx context.Context, id string, input *UpdateBudgetItemInput) (*BudgetItem, error)
	Delete(ctx context.Context, id string) error
}

type MongoRepository struct {
	collection *mongo.Collection
}

var _ Repository = (*MongoRepository)(nil)

func NewMongoRepository(client *mongo.Client, dbName string) *MongoRepository {
	return &MongoRepository{
		collection: client.Database(dbName).Collection(CollectionName),
	}
}

func NewRepository(db *mongo.Database) *MongoRepository {
	return &MongoRepository{
		collection: db.Collection(CollectionName),
	}
}

func (r *MongoRepository) Create(ctx context.Context, item *BudgetItem) error {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	if item.Values == nil {
		item.Values = make(map[string]float64)
	}

	opts := options.Update().SetUpsert(true)
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": item.ID}, bson.M{"$set": item}, opts)
	return err
}

func (r *MongoRepository) GetByID(ctx context.Context, id string) (*BudgetItem, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	var item BudgetItem
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&item)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *MongoRepository) List(ctx context.Context, itemType string) ([]BudgetItem, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	filter := bson.M{}
	if itemType != "" {
		filter["type"] = itemType
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var items []BudgetItem
	if err := cursor.All(ctx, &items); err != nil {
		return nil, err
	}
	if items == nil {
		items = []BudgetItem{}
	}
	return items, nil
}

func (r *MongoRepository) Update(ctx context.Context, id string, input *UpdateBudgetItemInput) (*BudgetItem, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	setFields := bson.M{}
	if input.Type != nil {
		setFields["type"] = *input.Type
	}
	if input.Name != nil {
		setFields["name"] = *input.Name
	}
	if input.Off != nil {
		setFields["off"] = *input.Off
	}
	if input.Notes != nil {
		setFields["notes"] = *input.Notes
	}
	if input.DueDate != nil {
		setFields["dueDate"] = *input.DueDate
	}
	if input.Values != nil {
		for k, v := range input.Values {
			setFields["values."+k] = v
		}
	}

	if len(setFields) == 0 {
		return r.GetByID(ctx, id)
	}

	after := options.After
	opts := options.FindOneAndUpdate().SetReturnDocument(after)

	var updated BudgetItem
	err := r.collection.FindOneAndUpdate(ctx, bson.M{"_id": id}, bson.M{"$set": setFields}, opts).Decode(&updated)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &updated, nil
}

func (r *MongoRepository) Delete(ctx context.Context, id string) error {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}
