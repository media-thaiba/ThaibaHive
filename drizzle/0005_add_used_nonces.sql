CREATE TABLE `used_nonces` (
	`jti` text PRIMARY KEY NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
