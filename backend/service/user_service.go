package service

import (
	"errors"
	"time"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/utils"
)

type UserService interface {
	GetAllUsers(role string) ([]*model.UserResponse, error)
	ResetPassword(userID uint) error
	GetUserByID(userID uint) (*model.UserResponse, error)
	GetUserRoleByID(userID uint) (string, error)
}

type userService struct {
	userRepo repository.UserRepository
}

func NewUserService(userRepo repository.UserRepository) UserService {
	return &userService{
		userRepo: userRepo,
	}
}

// GetUserRoleByID returns the role of a user by ID
func (s *userService) GetUserRoleByID(userID uint) (string, error) {
	// Find user by ID
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", errors.New("user not found")
	}
	
	// Return the user's role
	return user.Role, nil
}

// GetAllUsers returns all users, optionally filtered by role
func (s *userService) GetAllUsers(role string) ([]*model.UserResponse, error) {
	var users []*model.User
	var err error

	// Get users based on role filter
	if role != "" {
		users, err = s.userRepo.FindByRole(role)
	} else {
		users, err = s.userRepo.FindAll()
	}

	if err != nil {
		return nil, err
	}

	// Convert to user response DTOs
	var userResponses []*model.UserResponse
	for _, user := range users {
		response := user.ToUserResponse()
		userResponses = append(userResponses, &response)
	}

	return userResponses, nil
}

// ResetPassword resets user password to default value
func (s *userService) ResetPassword(userID uint) error {
	// Find user by ID
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return errors.New("user not found")
	}

	// Default password
	const defaultPassword = "password123"

	// Hash password
	hashedPassword, err := utils.HashPassword(defaultPassword)
	if err != nil {
		return err
	}

	// Update user
	user.Password = hashedPassword
	user.PasswordChangedAt = time.Now()
	
	return s.userRepo.Update(user)
}

// GetUserByID returns user data by ID
func (s *userService) GetUserByID(userID uint) (*model.UserResponse, error) {
	// Find user by ID
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	
	// Convert to user response DTO
	response := user.ToUserResponse()
	
	return &response, nil
}