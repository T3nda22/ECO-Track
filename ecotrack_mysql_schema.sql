-- ============================================================================
-- ECO TRACK: GIS-Based Waste Management System
-- Exclusively Serving Barangay Poblacion, Minglanilla, Cebu, Philippines
-- Academic BSIT Capstone Project MySQL Schema
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `ecotrack_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ecotrack_db`;

-- 1. USERS TABLE
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `report_status_history`;
DROP TABLE IF EXISTS `task_assignments`;
DROP TABLE IF EXISTS `waste_reports`;
DROP TABLE IF EXISTS `collection_schedules`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `username` VARCHAR(64) NOT NULL UNIQUE,
    `password_hash` VARCHAR(256) NOT NULL,
    `role` ENUM('resident', 'admin', 'personnel') NOT NULL DEFAULT 'resident',
    `phone_number` VARCHAR(20) NULL,
    `account_status` ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. WASTE REPORTS TABLE
CREATE TABLE `waste_reports` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tracking_code` VARCHAR(30) NOT NULL UNIQUE,
    `resident_id` INT NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `waste_category` VARCHAR(50) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `location_description` VARCHAR(255) NOT NULL,
    `photo_reference` VARCHAR(255) NULL,
    `current_status` ENUM('Pending', 'Verified', 'Assigned', 'In Progress', 'Collected', 'Completed', 'Rejected') NOT NULL DEFAULT 'Pending',
    `rejection_reason` TEXT NULL,
    `submission_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_updated_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_reports_status` (`current_status`),
    INDEX `idx_reports_resident` (`resident_id`),
    INDEX `idx_reports_coords` (`latitude`, `longitude`),
    CONSTRAINT `fk_reports_resident` FOREIGN KEY (`resident_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TASK ASSIGNMENTS TABLE
CREATE TABLE `task_assignments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `report_id` INT NOT NULL UNIQUE,
    `assigned_personnel_id` INT NOT NULL,
    `administrator_id` INT NOT NULL,
    `priority` ENUM('Normal', 'High', 'Urgent') NOT NULL DEFAULT 'Normal',
    `assignment_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `task_status` ENUM('Assigned', 'In Progress', 'Collected', 'Completed') NOT NULL DEFAULT 'Assigned',
    `collection_notes` TEXT NULL,
    `collection_proof_photo_reference` VARCHAR(255) NULL,
    `collection_timestamp` DATETIME NULL,
    INDEX `idx_tasks_personnel` (`assigned_personnel_id`),
    INDEX `idx_tasks_status` (`task_status`),
    CONSTRAINT `fk_tasks_report` FOREIGN KEY (`report_id`) REFERENCES `waste_reports` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_tasks_personnel` FOREIGN KEY (`assigned_personnel_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_tasks_admin` FOREIGN KEY (`administrator_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. REPORT STATUS HISTORY (AUDIT TRAIL)
CREATE TABLE `report_status_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `report_id` INT NOT NULL,
    `previous_status` VARCHAR(30) NOT NULL,
    `new_status` VARCHAR(30) NOT NULL,
    `updated_by_user_id` INT NOT NULL,
    `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `note` TEXT NULL,
    INDEX `idx_history_report` (`report_id`),
    INDEX `idx_history_user` (`updated_by_user_id`),
    CONSTRAINT `fk_history_report` FOREIGN KEY (`report_id`) REFERENCES `waste_reports` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_history_user` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. COLLECTION SCHEDULES TABLE
CREATE TABLE `collection_schedules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `service_area` VARCHAR(120) NOT NULL,
    `collection_day` VARCHAR(40) NOT NULL,
    `collection_time` VARCHAR(50) NOT NULL,
    `waste_type` VARCHAR(60) NOT NULL DEFAULT 'Biodegradable & Residual Waste',
    `schedule_notes` TEXT NULL,
    `created_by_user_id` INT NOT NULL,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_schedules_admin` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. NOTIFICATIONS TABLE
CREATE TABLE `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `recipient_user_id` INT NOT NULL,
    `related_report_id` INT NULL,
    `title` VARCHAR(120) NOT NULL,
    `notification_message` TEXT NOT NULL,
    `read_status` TINYINT(1) NOT NULL DEFAULT 0,
    `created_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_notifs_recipient` (`recipient_user_id`, `read_status`),
    CONSTRAINT `fk_notifs_user` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_notifs_report` FOREIGN KEY (`related_report_id`) REFERENCES `waste_reports` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
