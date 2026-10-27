-- ============================================================================
-- A Proposed Waste Management System for Minglanilla, Cebu (ECO TRACK)
-- Pilot Area: Barangay Poblacion, Minglanilla, Cebu, Philippines
-- MySQL Database Schema Aligned with Deliverables No. 1 and No. 2
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `ecotrack_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ecotrack_db`;

DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `report_status_history`;
DROP TABLE IF EXISTS `task_assignments`;
DROP TABLE IF EXISTS `collection_schedules`;
DROP TABLE IF EXISTS `waste_reports`;
DROP TABLE IF EXISTS `users`;

-- 1. USERS TABLE (Residents, Garbage Collection Personnel, System Administrators)
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `username` VARCHAR(64) NOT NULL UNIQUE,
    `password_hash` VARCHAR(256) NOT NULL,
    `role` ENUM('resident', 'personnel', 'admin') NOT NULL DEFAULT 'resident',
    `phone_number` VARCHAR(20) NULL,
    `account_status` ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. WASTE REPORTS TABLE
-- Records report location (coordinates + description), photo, time submitted, and status
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
    `current_status` ENUM('Pending', 'Collected', 'Cleaned') NOT NULL DEFAULT 'Pending',
    `resolved_by_user_id` INT NULL,
    `resolved_timestamp` DATETIME NULL,
    `collection_notes` TEXT NULL,
    `collection_proof_photo` VARCHAR(255) NULL,
    `submission_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_updated_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_reports_status` (`current_status`),
    INDEX `idx_reports_resident` (`resident_id`),
    INDEX `idx_reports_resolved_by` (`resolved_by_user_id`),
    INDEX `idx_reports_coords` (`latitude`, `longitude`),
    CONSTRAINT `fk_reports_resident` FOREIGN KEY (`resident_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reports_resolved_by` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. REPORT STATUS HISTORY TABLE
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

-- 4. NOTIFICATIONS TABLE
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
