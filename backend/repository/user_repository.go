package repository

import (
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
)

type UserRepository interface {
	Create(user *model.User) error
	FindByEmail(email string) (*model.User, error)
	FindByID(id uint) (*model.User, error)
	Update(user *model.User) error
	FindAll() ([]*model.User, error)
	FindByRole(role string) ([]*model.User, error)
}

type userRepository struct{}

func NewUserRepository() UserRepository {
	return &userRepository{}
}

// Create creates a new user in database
func (r *userRepository) Create(user *model.User) error {
	return config.DB.Create(user).Error
}

// FindByEmail finds user by email
func (r *userRepository) FindByEmail(email string) (*model.User, error) {
	var user model.User
	err := config.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByID finds user by ID
func (r *userRepository) FindByID(id uint) (*model.User, error) {
	var user model.User
	err := config.DB.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Update updates an existing user
func (r *userRepository) Update(user *model.User) error {
	return config.DB.Save(user).Error
}

// FindAll returns all users
func (r *userRepository) FindAll() ([]*model.User, error) {
	var users []*model.User
	err := config.DB.Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}

// FindByRole returns users with a specific role
func (r *userRepository) FindByRole(role string) ([]*model.User, error) {
	var users []*model.User
	err := config.DB.Where("role = ?", role).Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}