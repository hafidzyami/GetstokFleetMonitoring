package service

import (
	"errors"
	"time"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/utils"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
)

type AuthService interface {
	Register(req model.RegisterRequest) (*model.AuthResponse, error)
	Login(req model.LoginRequest) (*model.AuthResponse, error)
	GetUserByID(id uint) (*model.UserResponse, error)
}

type authService struct {
	userRepo repository.UserRepository
}

func NewAuthService(userRepo repository.UserRepository) AuthService {
	return &authService{
		userRepo: userRepo,
	}
}

// Register registers a new user
func (s *authService) Register(req model.RegisterRequest) (*model.AuthResponse, error) {
	// Check if email already exists
	existingUser, err := s.userRepo.FindByEmail(req.Email)
	if err == nil && existingUser != nil {
		return nil, errors.New("email already exists")
	}
	
	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}
	
	// Create user
	user := model.User{
		Name:      req.Name,
		Email:     req.Email,
		Password:  hashedPassword,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	
	// Save user to database
	err = s.userRepo.Create(&user)
	if err != nil {
		return nil, err
	}
	
	// Generate token
	token, err := utils.GenerateToken(user)
	if err != nil {
		return nil, err
	}
	
	// Clean up password before returning user
	user.Password = ""
	
	// Return auth response
	return &model.AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

// Login authenticates user and returns token
func (s *authService) Login(req model.LoginRequest) (*model.AuthResponse, error) {
	// Find user by email
	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}
	
	// Check password
	if !utils.CheckPassword(req.Password, user.Password) {
		return nil, errors.New("invalid email or password")
	}
	
	// Generate token
	token, err := utils.GenerateToken(*user)
	if err != nil {
		return nil, err
	}
	
	// Clean up password before returning user
	user.Password = ""
	
	// Return auth response
	return &model.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

// GetUserByID finds user by ID
func (s *authService) GetUserByID(id uint) (*model.UserResponse, error) {
	// Find user by ID
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	
	// Convert to response
	response := user.ToUserResponse()
	
	return &response, nil
}