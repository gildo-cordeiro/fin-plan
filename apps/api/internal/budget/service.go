package budget

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/cost"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/goal"
	"github.com/gildo-cordeiro/fin-plan/apps/api/internal/item"
)

var (
	ErrYearNotFound = errors.New("ano orçamentário não encontrado")
	ErrInvalidYear  = errors.New("o ano informado é inválido")
)

var MonthNames = []string{
	"Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
	"Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
}

var MonthShortNames = []string{
	"Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
	"Jul", "Ago", "Set", "Out", "Nov", "Dez",
}

func DefaultMonthsForYear(year int) []Month {
	months := make([]Month, 12)
	shortYear := fmt.Sprintf("%02d", year%100)
	for i := 0; i < 12; i++ {
		monthPad := fmt.Sprintf("%02d", i+1)
		months[i] = Month{
			ID:         fmt.Sprintf("%d-%s", year, monthPad),
			Name:       fmt.Sprintf("%s %d", MonthNames[i], year),
			ShortName:  fmt.Sprintf("%s/%s", MonthShortNames[i], shortYear),
			MonthIndex: i,
		}
	}
	return months
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateYear(ctx context.Context, input *CreateBudgetYearInput) (*BudgetYear, error) {
	if input == nil || input.Year < 1900 || input.Year > 2200 {
		return nil, ErrInvalidYear
	}

	yearID := fmt.Sprintf("%d", input.Year)
	simulation := SimulationSettings{}
	if input.Simulation != nil {
		simulation = *input.Simulation
	}

	now := time.Now().UTC()
	bYear := &BudgetYear{
		ID:         yearID,
		Year:       input.Year,
		Simulation: simulation,
		Months:     DefaultMonthsForYear(input.Year),
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if err := s.repo.CreateYear(ctx, bYear); err != nil {
		return nil, err
	}

	return bYear, nil
}

func (s *Service) GetYear(ctx context.Context, year int) (*BudgetYear, error) {
	if year < 1900 || year > 2200 {
		return nil, ErrInvalidYear
	}

	y, err := s.repo.GetYearByYear(ctx, year)
	if err != nil {
		return nil, err
	}
	if y == nil {
		return nil, ErrYearNotFound
	}
	return y, nil
}

func (s *Service) ListYears(ctx context.Context) ([]BudgetYear, error) {
	return s.repo.ListYears(ctx)
}

func (s *Service) UpdateSimulation(ctx context.Context, year int, input *UpdateSimulationInput) (*BudgetYear, error) {
	if year < 1900 || year > 2200 {
		return nil, ErrInvalidYear
	}
	if input == nil {
		return nil, errors.New("dados de simulação não informados")
	}

	updated, err := s.repo.UpdateSimulation(ctx, year, input)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrYearNotFound
	}
	return updated, nil
}

func (s *Service) AddMonth(ctx context.Context, year int, input *CreateMonthInput) (*Month, error) {
	if year < 1900 || year > 2200 {
		return nil, ErrInvalidYear
	}
	if input == nil {
		return nil, errors.New("dados do mês não informados")
	}

	monthID := strings.TrimSpace(input.ID)
	monthIndex := input.MonthIndex
	if monthIndex < 0 {
		monthIndex = 0
	} else if monthIndex > 11 {
		monthIndex = 11
	}

	if monthID == "" {
		monthPad := fmt.Sprintf("%02d", monthIndex+1)
		monthID = fmt.Sprintf("%d-%s", year, monthPad)
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		name = fmt.Sprintf("%s %d", MonthNames[monthIndex], year)
	}

	shortName := strings.TrimSpace(input.ShortName)
	if shortName == "" {
		shortYear := fmt.Sprintf("%02d", year%100)
		shortName = fmt.Sprintf("%s/%s", MonthShortNames[monthIndex], shortYear)
	}

	m := &Month{
		ID:         monthID,
		Name:       name,
		ShortName:  shortName,
		MonthIndex: monthIndex,
	}

	if err := s.repo.AddMonthToYear(ctx, year, m); err != nil {
		return nil, err
	}

	return m, nil
}

func (s *Service) GetYearViewModel(ctx context.Context, year int) (*YearViewModel, error) {
	if year < 1900 || year > 2200 {
		return nil, ErrInvalidYear
	}

	vm, err := s.repo.GetYearViewModel(ctx, year)
	if err != nil {
		return nil, err
	}
	if vm == nil {
		// Se o ano ainda não existe, cria-o automaticamente com os 12 meses
		createdYear, err := s.CreateYear(ctx, &CreateBudgetYearInput{Year: year})
		if err != nil {
			return nil, err
		}
		return &YearViewModel{
			Year:         *createdYear,
			Months:       createdYear.Months,
			Items:        []item.BudgetItem{},
			OneTimeCosts: []cost.OneTimeCost{},
			Goals:        []goal.Goal{},
		}, nil
	}
	return vm, nil
}
