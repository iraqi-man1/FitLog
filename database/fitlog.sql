CREATE DATABASE IF NOT EXISTS `fitlog`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `fitlog`;

CREATE TABLE IF NOT EXISTS `days` (
  `date` DATE NOT NULL PRIMARY KEY,
  `gym` ENUM('completed','rest','missed') NULL,
  `diet` ENUM('followed','cheat_meal','cheat_day','missed') NULL,
  `weight_kg` DECIMAL(7,2) NULL,
  `notes` TEXT NULL,
  `energy` DECIMAL(4,1) NULL,
  `sleep_hours` DECIMAL(4,1) NULL,
  `water_liters` DECIMAL(5,2) NULL,
  `steps` INT UNSIGNED NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `exercises` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `weighted` TINYINT(1) NOT NULL DEFAULT 0,
  `notes` TEXT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `workouts` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `date` DATE NOT NULL,
  `type` VARCHAR(120) NOT NULL,
  `duration_minutes` SMALLINT UNSIGNED NULL,
  `quality` TINYINT UNSIGNED NULL,
  `notes` TEXT NULL,
  INDEX `workouts_date_idx` (`date`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `workout_exercises` (
  `workout_id` VARCHAR(191) NOT NULL,
  `exercise_id` VARCHAR(191) NOT NULL,
  `position` SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (`workout_id`, `position`),
  CONSTRAINT `workout_exercises_workout_fk` FOREIGN KEY (`workout_id`) REFERENCES `workouts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `workout_exercises_exercise_fk` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `workout_sets` (
  `workout_id` VARCHAR(191) NOT NULL,
  `exercise_position` SMALLINT UNSIGNED NOT NULL,
  `set_number` SMALLINT UNSIGNED NOT NULL,
  `reps` SMALLINT UNSIGNED NOT NULL,
  `weight_kg` DECIMAL(7,2) NULL,
  PRIMARY KEY (`workout_id`, `exercise_position`, `set_number`),
  CONSTRAINT `workout_sets_exercise_fk` FOREIGN KEY (`workout_id`, `exercise_position`) REFERENCES `workout_exercises` (`workout_id`, `position`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `measurements` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `date` DATE NOT NULL,
  `values_json` JSON NOT NULL,
  `custom_json` JSON NOT NULL,
  `notes` TEXT NULL,
  INDEX `measurements_date_idx` (`date`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `photos` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `date` DATE NOT NULL,
  `category` ENUM('Front','Side','Back','Other') NOT NULL,
  `weight_kg` DECIMAL(7,2) NULL,
  `body_fat` DECIMAL(5,2) NULL,
  `notes` TEXT NULL,
  `mime_type` VARCHAR(64) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  INDEX `photos_date_idx` (`date`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  `data_json` JSON NOT NULL
) ENGINE=InnoDB;
