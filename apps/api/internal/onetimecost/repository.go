package onetimecost

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const CollectionName = "one_time_costs"

type Repository interface {
	Create(ctx context.Context, item *OneTimeCost) error
	GetByID(ctx context.Context, id string) (*OneTimeCost, error)
	List(ctx context.Context, targetMonthId string) ([]OneTimeCost, error)
	Update(ctx context.Context, id string, input *UpdateOneTimeCostInput) (*OneTimeCost, error)
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

func (r *MongoRepository) Create(ctx context.Context, item *OneTimeCost) error {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	opts := options.Update().SetUpsert(true)
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": item.ID}, bson.M{"$set": item}, opts)
	return err
}

func (r *MongoRepository) GetByID(ctx context.Context, id string) (*OneTimeCost, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	var item OneTimeCost
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&item)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *MongoRepository) List(ctx context.Context, targetMonthId string) ([]OneTimeCost, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	filter := bson.M{}
	if targetMonthId != "" {
		filter["targetMonthId"] = targetMonthId
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var items []OneTimeCost
	if err := cursor.All(ctx, &items); err != nil {
		return nil, err
	}
	if items == nil {
		items = []OneTimeCost{}
	}
	return items, nil
}

func (r *MongoRepository) Update(ctx context.Context, id string, input *UpdateOneTimeCostInput) (*OneTimeCost, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	setFields := bson.M{}
	unsetFields := bson.M{}

	if input.Name != nil {
		setFields["name"] = *input.Name
	}
	if input.Value != nil {
		setFields["value"] = *input.Value
	}
	if input.ClearTargetMonthID {
		unsetFields["targetMonthId"] = ""
	} else if input.TargetMonthID != nil {
		setFields["targetMonthId"] = *input.TargetMonthID
	}
	if input.Off != nil {
		setFields["off"] = *input.Off
	}
	if input.Notes != nil {
		setFields["notes"] = *input.Notes
	}

	update := bson.M{}
	if len(setFields) > 0 {
		update["$set"] = setFields
	}
	if len(unsetFields) > 0 {
		update["$unset"] = unsetFields
	}

	if len(update) == 0 {
		return r.GetByID(ctx, id)
	}

	after := options.After
	opts := options.FindOneAndUpdate().SetReturnDocument(after)

	var updated OneTimeCost
	err := r.collection.FindOneAndUpdate(ctx, bson.M{"_id": id}, update, opts).Decode(&updated)
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
