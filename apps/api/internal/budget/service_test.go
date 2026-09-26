package budget

import (
	"context"
	"errors"
	"testing"
)

type mockBudgetRepository struct {
	state   *BudgetState
	getErr  error
	saveErr error
}

func (m *mockBudgetRepository) Get(ctx context.Context) (*BudgetState, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	return m.state, nil
}

func (m *mockBudgetRepository) Save(ctx context.Context, state *BudgetState) error {
	if m.saveErr != nil {
		return m.saveErr
	}
	m.state = state
	return nil
}

func TestService_Get_Success(t *testing.T) {
	expected := &BudgetState{Version: 5}
	repo := &mockBudgetRepository{state: expected}
	svc := NewService(repo)

	actual, err := svc.Get(context.Background())
	if err != nil {
		t.Fatalf("esperava erro nil, obteve: %v", err)
	}
	if actual == nil || actual.Version != 5 {
		t.Fatalf("esperava version 5, obteve: %+v", actual)
	}
}

func TestService_Get_Error(t *testing.T) {
	repo := &mockBudgetRepository{getErr: errors.New("falha no banco")}
	svc := NewService(repo)

	actual, err := svc.Get(context.Background())
	if err == nil {
		t.Fatal("esperava erro, obteve nil")
	}
	if actual != nil {
		t.Fatalf("esperava nil state, obteve: %+v", actual)
	}
}

func TestService_Save_NilState(t *testing.T) {
	repo := &mockBudgetRepository{}
	svc := NewService(repo)

	err := svc.Save(context.Background(), nil)
	if err == nil {
		t.Fatal("esperava erro ao salvar estado nil")
	}
}

func TestService_Save_Success(t *testing.T) {
	repo := &mockBudgetRepository{}
	svc := NewService(repo)

	state := &BudgetState{Version: 5}
	err := svc.Save(context.Background(), state)
	if err != nil {
		t.Fatalf("esperava sucesso, obteve erro: %v", err)
	}
	if repo.state != state {
		t.Fatalf("esperava estado gravado no repo, obteve: %+v", repo.state)
	}
}

func TestService_Save_Error(t *testing.T) {
	repo := &mockBudgetRepository{saveErr: errors.New("disco cheio")}
	svc := NewService(repo)

	err := svc.Save(context.Background(), &BudgetState{Version: 5})
	if err == nil {
		t.Fatal("esperava erro ao persistir, obteve nil")
	}
}
