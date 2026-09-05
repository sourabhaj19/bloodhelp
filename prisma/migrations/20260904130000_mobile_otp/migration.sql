-- CreateTable
CREATE TABLE `mobile_verification_otps` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `mobile` VARCHAR(20) NOT NULL,
    `otp_hash` VARCHAR(255) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mobile_verification_otps_user_id_idx`(`user_id`),
    INDEX `mobile_verification_otps_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mobile_verification_otps` ADD CONSTRAINT `mobile_verification_otps_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
