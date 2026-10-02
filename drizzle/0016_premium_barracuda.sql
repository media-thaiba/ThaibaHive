PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_academic_years` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_academic_years`("id", "institution_id", "name", "start_date", "end_date", "is_active", "created_at", "updated_at") SELECT "id", "institution_id", "name", "start_date", "end_date", "is_active", "created_at", "updated_at" FROM `academic_years`;--> statement-breakpoint
DROP TABLE `academic_years`;--> statement-breakpoint
ALTER TABLE `__new_academic_years` RENAME TO `academic_years`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_announcement_reads` (
	`id` text PRIMARY KEY NOT NULL,
	`announcement_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`read_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_announcement_reads`("id", "announcement_id", "staff_id", "read_at") SELECT "id", "announcement_id", "staff_id", "read_at" FROM `announcement_reads`;--> statement-breakpoint
DROP TABLE `announcement_reads`;--> statement-breakpoint
ALTER TABLE `__new_announcement_reads` RENAME TO `announcement_reads`;--> statement-breakpoint
CREATE TABLE `__new_announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`target_role` text,
	`target_department_id` text,
	`target_institution_id` text,
	`created_by_id` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`pinned_until` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`target_department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`target_institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_announcements`("id", "title", "content", "priority", "target_role", "target_department_id", "target_institution_id", "created_by_id", "is_active", "pinned_until", "created_at", "updated_at") SELECT "id", "title", "content", "priority", "target_role", "target_department_id", "target_institution_id", "created_by_id", "is_active", "pinned_until", "created_at", "updated_at" FROM `announcements`;--> statement-breakpoint
DROP TABLE `announcements`;--> statement-breakpoint
ALTER TABLE `__new_announcements` RENAME TO `announcements`;--> statement-breakpoint
CREATE INDEX `idx_announcements_created_active` ON `announcements` (`created_at`,`is_active`);--> statement-breakpoint
CREATE TABLE `__new_attendance_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`institution_id` text,
	`nfc_tag_id` text,
	`qr_secret` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`latitude` real,
	`longitude` real,
	`radius` real,
	`accuracy` real,
	`wifi_ssids` text,
	`deleted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_attendance_locations`("id", "name", "institution_id", "nfc_tag_id", "qr_secret", "is_active", "latitude", "longitude", "radius", "accuracy", "wifi_ssids", "deleted_at", "created_at", "updated_at") SELECT "id", "name", "institution_id", "nfc_tag_id", "qr_secret", "is_active", "latitude", "longitude", "radius", "accuracy", "wifi_ssids", "deleted_at", "created_at", "updated_at" FROM `attendance_locations`;--> statement-breakpoint
DROP TABLE `attendance_locations`;--> statement-breakpoint
ALTER TABLE `__new_attendance_locations` RENAME TO `attendance_locations`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_location_nfc_tag` ON `attendance_locations` (`nfc_tag_id`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_location_qr_secret` ON `attendance_locations` (`qr_secret`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX `idx_location_active` ON `attendance_locations` (`institution_id`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE TABLE `__new_attendance_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`date` text NOT NULL,
	`check_in` text,
	`check_out` text,
	`method` text DEFAULT 'manual' NOT NULL,
	`nfc_tag_id` text,
	`qr_code` text,
	`status` text DEFAULT 'present' NOT NULL,
	`worked_minutes` integer,
	`late_minutes` integer DEFAULT 0,
	`early_exit_minutes` integer DEFAULT 0,
	`notes` text,
	`presence_status` text DEFAULT 'verified',
	`last_verified_at` text,
	`geofence_violations` integer DEFAULT 0,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_attendance_logs`("id", "staff_id", "date", "check_in", "check_out", "method", "nfc_tag_id", "qr_code", "status", "worked_minutes", "late_minutes", "early_exit_minutes", "notes", "presence_status", "last_verified_at", "geofence_violations", "created_at") SELECT "id", "staff_id", "date", "check_in", "check_out", "method", "nfc_tag_id", "qr_code", "status", "worked_minutes", "late_minutes", "early_exit_minutes", "notes", "presence_status", "last_verified_at", "geofence_violations", "created_at" FROM `attendance_logs`;--> statement-breakpoint
DROP TABLE `attendance_logs`;--> statement-breakpoint
ALTER TABLE `__new_attendance_logs` RENAME TO `attendance_logs`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_attendance_staff_date` ON `attendance_logs` (`staff_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_attendance_date` ON `attendance_logs` (`date`);--> statement-breakpoint
CREATE TABLE `__new_attendance_register` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`date` text NOT NULL,
	`total_students` integer,
	`present_count` integer,
	`absent_count` integer,
	`late_count` integer,
	`locked` integer DEFAULT false NOT NULL,
	`locked_at` text,
	`locked_by_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`locked_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_attendance_register`("id", "class_id", "date", "total_students", "present_count", "absent_count", "late_count", "locked", "locked_at", "locked_by_id", "created_at", "updated_at") SELECT "id", "class_id", "date", "total_students", "present_count", "absent_count", "late_count", "locked", "locked_at", "locked_by_id", "created_at", "updated_at" FROM `attendance_register`;--> statement-breakpoint
DROP TABLE `attendance_register`;--> statement-breakpoint
ALTER TABLE `__new_attendance_register` RENAME TO `attendance_register`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_attendance_register_class_date` ON `attendance_register` (`class_id`,`date`);--> statement-breakpoint
CREATE TABLE `__new_biometric_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`payload` text,
	`device_id` text,
	`confidence` real,
	`error_message` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_biometric_logs`("id", "staff_id", "method", "status", "payload", "device_id", "confidence", "error_message", "created_at") SELECT "id", "staff_id", "method", "status", "payload", "device_id", "confidence", "error_message", "created_at" FROM `biometric_logs`;--> statement-breakpoint
DROP TABLE `biometric_logs`;--> statement-breakpoint
ALTER TABLE `__new_biometric_logs` RENAME TO `biometric_logs`;--> statement-breakpoint
CREATE INDEX `idx_biometric_logs_staff_id` ON `biometric_logs` (`staff_id`);--> statement-breakpoint
CREATE TABLE `__new_circular_downloads` (
	`id` text PRIMARY KEY NOT NULL,
	`circular_id` text NOT NULL,
	`staff_id` text,
	`ip_address` text,
	`user_agent` text,
	`downloaded_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`circular_id`) REFERENCES `circulars`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_circular_downloads`("id", "circular_id", "staff_id", "ip_address", "user_agent", "downloaded_at") SELECT "id", "circular_id", "staff_id", "ip_address", "user_agent", "downloaded_at" FROM `circular_downloads`;--> statement-breakpoint
DROP TABLE `circular_downloads`;--> statement-breakpoint
ALTER TABLE `__new_circular_downloads` RENAME TO `circular_downloads`;--> statement-breakpoint
CREATE TABLE `__new_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text,
	`department_id` text,
	`name` text NOT NULL,
	`section` text,
	`academic_year_id` text,
	`teacher_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`teacher_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_classes`("id", "institution_id", "department_id", "name", "section", "academic_year_id", "teacher_id", "is_active", "created_at", "updated_at") SELECT "id", "institution_id", "department_id", "name", "section", "academic_year_id", "teacher_id", "is_active", "created_at", "updated_at" FROM `classes`;--> statement-breakpoint
DROP TABLE `classes`;--> statement-breakpoint
ALTER TABLE `__new_classes` RENAME TO `classes`;--> statement-breakpoint
CREATE TABLE `__new_daily_report_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`task_id` text,
	`description` text NOT NULL,
	`hours_spent` real,
	`status` text DEFAULT 'completed' NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `daily_reports`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_daily_report_tasks`("id", "report_id", "task_id", "description", "hours_spent", "status") SELECT "id", "report_id", "task_id", "description", "hours_spent", "status" FROM `daily_report_tasks`;--> statement-breakpoint
DROP TABLE `daily_report_tasks`;--> statement-breakpoint
ALTER TABLE `__new_daily_report_tasks` RENAME TO `daily_report_tasks`;--> statement-breakpoint
CREATE TABLE `__new_daily_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`date` text NOT NULL,
	`summary` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`reviewer_comment` text,
	`reviewed_by_id` text,
	`reviewed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_daily_reports`("id", "staff_id", "date", "summary", "status", "reviewer_comment", "reviewed_by_id", "reviewed_at", "created_at", "updated_at") SELECT "id", "staff_id", "date", "summary", "status", "reviewer_comment", "reviewed_by_id", "reviewed_at", "created_at", "updated_at" FROM `daily_reports`;--> statement-breakpoint
DROP TABLE `daily_reports`;--> statement-breakpoint
ALTER TABLE `__new_daily_reports` RENAME TO `daily_reports`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reports_staff_date` ON `daily_reports` (`staff_id`,`date`);--> statement-breakpoint
CREATE TABLE `__new_departments` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`head_user_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`head_user_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_departments`("id", "institution_id", "name", "code", "description", "head_user_id", "is_active", "created_at", "updated_at") SELECT "id", "institution_id", "name", "code", "description", "head_user_id", "is_active", "created_at", "updated_at" FROM `departments`;--> statement-breakpoint
DROP TABLE `departments`;--> statement-breakpoint
ALTER TABLE `__new_departments` RENAME TO `departments`;--> statement-breakpoint
CREATE TABLE `__new_event_rsvps` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`responded_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_event_rsvps`("id", "event_id", "staff_id", "status", "responded_at") SELECT "id", "event_id", "staff_id", "status", "responded_at" FROM `event_rsvps`;--> statement-breakpoint
DROP TABLE `event_rsvps`;--> statement-breakpoint
ALTER TABLE `__new_event_rsvps` RENAME TO `event_rsvps`;--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`event_type` text DEFAULT 'institution' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`location` text,
	`department_id` text,
	`institution_id` text,
	`created_by_id` text NOT NULL,
	`max_attendees` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_events`("id", "title", "description", "event_type", "start_date", "end_date", "location", "department_id", "institution_id", "created_by_id", "max_attendees", "is_active", "created_at", "updated_at") SELECT "id", "title", "description", "event_type", "start_date", "end_date", "location", "department_id", "institution_id", "created_by_id", "max_attendees", "is_active", "created_at", "updated_at" FROM `events`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
CREATE TABLE `__new_leave_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`leave_type_id` text NOT NULL,
	`total_days` real NOT NULL,
	`used_days` real DEFAULT 0 NOT NULL,
	`year` integer NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_leave_balances`("id", "staff_id", "leave_type_id", "total_days", "used_days", "year") SELECT "id", "staff_id", "leave_type_id", "total_days", "used_days", "year" FROM `leave_balances`;--> statement-breakpoint
DROP TABLE `leave_balances`;--> statement-breakpoint
ALTER TABLE `__new_leave_balances` RENAME TO `leave_balances`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leave_balances_staff_leave_year` ON `leave_balances` (`staff_id`,`leave_type_id`,`year`);--> statement-breakpoint
CREATE TABLE `__new_shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`grace_period_minutes` integer DEFAULT 15 NOT NULL,
	`department_id` text,
	`applicable_to_all` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_shifts`("id", "name", "start_time", "end_time", "grace_period_minutes", "department_id", "applicable_to_all", "is_active", "created_at", "updated_at") SELECT "id", "name", "start_time", "end_time", "grace_period_minutes", "department_id", "applicable_to_all", "is_active", "created_at", "updated_at" FROM `shifts`;--> statement-breakpoint
DROP TABLE `shifts`;--> statement-breakpoint
ALTER TABLE `__new_shifts` RENAME TO `shifts`;--> statement-breakpoint
CREATE TABLE `__new_staff_shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`shift_id` text NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_staff_shifts`("id", "staff_id", "shift_id", "effective_from", "effective_to") SELECT "id", "staff_id", "shift_id", "effective_from", "effective_to" FROM `staff_shifts`;--> statement-breakpoint
DROP TABLE `staff_shifts`;--> statement-breakpoint
ALTER TABLE `__new_staff_shifts` RENAME TO `staff_shifts`;--> statement-breakpoint
CREATE UNIQUE INDEX `staff_date_idx` ON `staff_shifts` (`staff_id`,`effective_from`);--> statement-breakpoint
CREATE TABLE `__new_student_attendance_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`class_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'present' NOT NULL,
	`period` text,
	`check_in` text,
	`check_out` text,
	`marked_by_id` text,
	`method` text DEFAULT 'manual' NOT NULL,
	`reason` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`marked_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_student_attendance_logs`("id", "student_id", "class_id", "date", "status", "period", "check_in", "check_out", "marked_by_id", "method", "reason", "created_at") SELECT "id", "student_id", "class_id", "date", "status", "period", "check_in", "check_out", "marked_by_id", "method", "reason", "created_at" FROM `student_attendance_logs`;--> statement-breakpoint
DROP TABLE `student_attendance_logs`;--> statement-breakpoint
ALTER TABLE `__new_student_attendance_logs` RENAME TO `student_attendance_logs`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_student_attendance_student_date` ON `student_attendance_logs` (`student_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_student_attendance_class_date` ON `student_attendance_logs` (`class_id`,`date`);--> statement-breakpoint
CREATE TABLE `__new_student_guardians` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`guardian_id` text NOT NULL,
	`relationship` text,
	`can_pickup` integer DEFAULT false NOT NULL,
	`is_emergency_contact` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guardian_id`) REFERENCES `guardians`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_student_guardians`("id", "student_id", "guardian_id", "relationship", "can_pickup", "is_emergency_contact") SELECT "id", "student_id", "guardian_id", "relationship", "can_pickup", "is_emergency_contact" FROM `student_guardians`;--> statement-breakpoint
DROP TABLE `student_guardians`;--> statement-breakpoint
ALTER TABLE `__new_student_guardians` RENAME TO `student_guardians`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_student_guardians_uniq` ON `student_guardians` (`student_id`,`guardian_id`);--> statement-breakpoint
CREATE TABLE `__new_students` (
	`id` text PRIMARY KEY NOT NULL,
	`admission_no` text NOT NULL,
	`student_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`date_of_birth` text,
	`gender` text,
	`email` text,
	`phone` text,
	`address` text,
	`avatar_url` text,
	`blood_group` text,
	`class_id` text,
	`academic_year_id` text,
	`institution_id` text NOT NULL,
	`emergency_contact_name` text,
	`emergency_contact_phone` text,
	`nfc_tag_id` text,
	`qr_code` text,
	`face_embedding` text,
	`model_version` text DEFAULT 'facenet-512d-v1',
	`biometric_enrolled_at` text,
	`biometric_status` text DEFAULT 'active',
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_students`("id", "admission_no", "student_id", "first_name", "last_name", "date_of_birth", "gender", "email", "phone", "address", "avatar_url", "blood_group", "class_id", "academic_year_id", "institution_id", "emergency_contact_name", "emergency_contact_phone", "nfc_tag_id", "qr_code", "face_embedding", "model_version", "biometric_enrolled_at", "biometric_status", "is_active", "created_at", "updated_at") SELECT "id", "admission_no", "student_id", "first_name", "last_name", "date_of_birth", "gender", "email", "phone", "address", "avatar_url", "blood_group", "class_id", "academic_year_id", "institution_id", "emergency_contact_name", "emergency_contact_phone", "nfc_tag_id", "qr_code", "face_embedding", "model_version", "biometric_enrolled_at", "biometric_status", "is_active", "created_at", "updated_at" FROM `students`;--> statement-breakpoint
DROP TABLE `students`;--> statement-breakpoint
ALTER TABLE `__new_students` RENAME TO `students`;--> statement-breakpoint
CREATE INDEX `idx_students_class` ON `students` (`class_id`);--> statement-breakpoint
CREATE INDEX `idx_students_institution` ON `students` (`institution_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_students_inst_admission_no` ON `students` (`institution_id`,`admission_no`);--> statement-breakpoint
CREATE INDEX `idx_students_nfc_tag` ON `students` (`nfc_tag_id`);--> statement-breakpoint
CREATE TABLE `__new_sub_departments` (
	`id` text PRIMARY KEY NOT NULL,
	`department_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sub_departments`("id", "department_id", "name", "code", "description", "is_active", "created_at", "updated_at") SELECT "id", "department_id", "name", "code", "description", "is_active", "created_at", "updated_at" FROM `sub_departments`;--> statement-breakpoint
DROP TABLE `sub_departments`;--> statement-breakpoint
ALTER TABLE `__new_sub_departments` RENAME TO `sub_departments`;