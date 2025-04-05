package seed

import (
	"log"
	"time"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/utils"
	"gorm.io/gorm"
)

func SeedUsers(db *gorm.DB) {
	users := []model.User{
		{Name: "Management", Email: "management1@getstok.com", Password: "password123", Role: "management"},
		{Name: "Driver", Email: "driver1@getstok.com", Password: "password123", Role: "driver"},
		{Name: "Planner", Email: "planner1@getstok.com", Password: "password123", Role: "planner"},
	}

	for _, user := range users {
		var existing model.User
		if err := db.Where("email = ?", user.Email).First(&existing).Error; err == gorm.ErrRecordNotFound {
			hashedPassword, err := utils.HashPassword(user.Password)
			if err != nil {
				log.Printf("Gagal hashing password untuk %s: %v", user.Email, err)
				continue
			}

			user.Password = hashedPassword
			user.CreatedAt = time.Now()
			user.UpdatedAt = time.Now()

			if err := db.Create(&user).Error; err != nil {
				log.Printf("Error seeding user %s: %v", user.Email, err)
			} else {
				log.Printf("Seeded user: %s", user.Email)
			}
		}
	}
}
