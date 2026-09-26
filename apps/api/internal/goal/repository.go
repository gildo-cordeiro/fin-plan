package goal

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const CollectionName = "goals"

type Repository interface {
	Create(ctx context.Context, goal *Goal) error
	GetByID(ctx context.Context, id string) (*Goal, error)
	List(ctx context.Context, status string) ([]Goal, error)
	Update(ctx context.Context, id string, input *UpdateGoalInput) (*Goal, error)
	Delete(ctx context.Context, id string) error
	AddContribution(ctx context.Context, goalID string, contribution *GoalContribution) (*Goal, error)
	DeleteContribution(ctx context.Context, goalID string, contributionID string) (*Goal, error)
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

func (r *MongoRepository) Create(ctx context.Context, g *Goal) error {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	if g.Contributions == nil {
		g.Contributions = []GoalContribution{}
	}

	opts := options.Update().SetUpsert(true)
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": g.ID}, bson.M{"$set": g}, opts)
	return err
}

func (r *MongoRepository) GetByID(ctx context.Context, id string) (*Goal, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	var g Goal
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&g)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &g, nil
}

func (r *MongoRepository) List(ctx context.Context, status string) ([]Goal, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	filter := bson.M{}
	if status != "" {
		filter["status"] = status
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var items []Goal
	if err := cursor.All(ctx, &items); err != nil {
		return nil, err
	}
	if items == nil {
		items = []Goal{}
	}
	return items, nil
}

func (r *MongoRepository) Update(ctx context.Context, id string, input *UpdateGoalInput) (*Goal, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	setFields := bson.M{}
	if input.Name != nil {
		setFields["name"] = *input.Name
	}
	if input.Description != nil {
		setFields["description"] = *input.Description
	}
	if input.TargetAmount != nil {
		setFields["targetAmount"] = *input.TargetAmount
	}
	if input.Icon != nil {
		setFields["icon"] = *input.Icon
	}
	if input.Color != nil {
		setFields["color"] = *input.Color
	}
	if input.Status != nil {
		setFields["status"] = *input.Status
	}

	if len(setFields) == 0 {
		return r.GetByID(ctx, id)
	}

	after := options.After
	opts := options.FindOneAndUpdate().SetReturnDocument(after)

	var updated Goal
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

func (r *MongoRepository) AddContribution(ctx context.Context, goalID string, contribution *GoalContribution) (*Goal, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	after := options.After
	opts := options.FindOneAndUpdate().SetReturnDocument(after)

	var updated Goal
	err := r.collection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": goalID},
		bson.M{"$push": bson.M{"contributions": contribution}},
		opts,
	).Decode(&updated)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &updated, nil
}

func (r *MongoRepository) DeleteContribution(ctx context.Context, goalID string, contributionID string) (*Goal, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	after := options.After
	opts := options.FindOneAndUpdate().SetReturnDocument(after)

	var updated Goal
	err := r.collection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": goalID},
		bson.M{"$pull": bson.M{"contributions": bson.M{"id": contributionID}}},
		opts,
	).Decode(&updated)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &updated, nil
}
