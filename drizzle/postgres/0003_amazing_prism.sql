CREATE TABLE "academic_years" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text,
	"name" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_register" (
	"id" text PRIMARY KEY NOT NULL,
	"class_id" text NOT NULL,
	"date" text NOT NULL,
	"total_students" integer,
	"present_count" integer,
	"absent_count" integer,
	"late_count" integer,
	"locked" boolean DEFAULT false NOT NULL,
	"locked_at" text,
	"locked_by_id" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biometric_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"method" text NOT NULL,
	"status" text NOT NULL,
	"payload" text,
	"device_id" text,
	"confidence" double precision,
	"error_message" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"academic_year_id" text NOT NULL,
	"name" text NOT NULL,
	"grade_level" integer NOT NULL,
	"capacity" integer DEFAULT 40 NOT NULL,
	"room_number" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text,
	"department_id" text,
	"name" text NOT NULL,
	"section" text,
	"academic_year_id" text,
	"teacher_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credential_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text,
	"challenge" text NOT NULL,
	"type" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"relation" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"occupation" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution_encryption_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"algorithm" text DEFAULT 'AES-GCM-256' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "institution_encryption_keys_institution_id_unique" UNIQUE("institution_id")
);
--> statement-breakpoint
CREATE TABLE "nfc_card_history" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_id" text,
	"target_staff_id" text,
	"old_status" text,
	"new_status" text,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nfc_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"serial_number" text,
	"owner_type" text DEFAULT 'staff' NOT NULL,
	"owner_id" text,
	"status" text DEFAULT 'available' NOT NULL,
	"issued_by_id" text,
	"issued_at" text,
	"last_checked_at" text,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "nfc_cards_tag_id_unique" UNIQUE("tag_id")
);
--> statement-breakpoint
CREATE TABLE "student_attendance_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"class_id" text NOT NULL,
	"date" text NOT NULL,
	"status" text DEFAULT 'present' NOT NULL,
	"period" text,
	"check_in" text,
	"check_out" text,
	"marked_by_id" text,
	"method" text DEFAULT 'manual' NOT NULL,
	"reason" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_biometric_consents" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"guardian_id" text,
	"recorded_by_staff_id" text,
	"consent_method" text DEFAULT 'signed_paper_form' NOT NULL,
	"consented_at" text DEFAULT (current_timestamp) NOT NULL,
	"policy_version" text DEFAULT '1.0' NOT NULL,
	"revoked_at" text
);
--> statement-breakpoint
CREATE TABLE "student_guardians" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"guardian_id" text NOT NULL,
	"relationship" text,
	"can_pickup" boolean DEFAULT false NOT NULL,
	"is_emergency_contact" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" text PRIMARY KEY NOT NULL,
	"admission_no" text NOT NULL,
	"student_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" text,
	"gender" text,
	"email" text,
	"phone" text,
	"address" text,
	"avatar_url" text,
	"blood_group" text,
	"class_id" text,
	"academic_year_id" text,
	"institution_id" text NOT NULL,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"nfc_tag_id" text,
	"qr_code" text,
	"face_embedding" text,
	"model_version" text DEFAULT 'facenet-512d-v1',
	"biometric_enrolled_at" text,
	"biometric_status" text DEFAULT 'active',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webauthn_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"algorithm" integer NOT NULL,
	"transports" text DEFAULT '' NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"backup_eligible" boolean DEFAULT false NOT NULL,
	"backup_state" boolean DEFAULT false NOT NULL,
	"device_name" text,
	"last_used_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "webauthn_credentials_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fk";
--> statement-breakpoint
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_reviewed_by_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_departments" DROP CONSTRAINT "staff_departments_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_departments" DROP CONSTRAINT "staff_departments_department_id_departments_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_institutions" DROP CONSTRAINT "staff_institutions_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_institutions" DROP CONSTRAINT "staff_institutions_institution_id_institutions_id_fk";
--> statement-breakpoint
ALTER TABLE "task_comments" DROP CONSTRAINT "task_comments_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "task_comments" DROP CONSTRAINT "task_comments_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assigned_to_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assigned_by_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_department_id_departments_id_fk";
--> statement-breakpoint
ALTER TABLE "institutions" ADD COLUMN "allocated_budget" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "institutions" ADD COLUMN "fiscal_year" text;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "face_embedding" text;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "face_registered_at" text;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "fingerprint_hash" text;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "fingerprint_registered_at" text;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "biometric_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "model_version" text DEFAULT 'facenet-512d-v1';--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "biometric_status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_register" ADD CONSTRAINT "attendance_register_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_register" ADD CONSTRAINT "attendance_register_locked_by_id_staff_id_fk" FOREIGN KEY ("locked_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_logs" ADD CONSTRAINT "biometric_logs_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_staff_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_challenges" ADD CONSTRAINT "credential_challenges_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_encryption_keys" ADD CONSTRAINT "institution_encryption_keys_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfc_card_history" ADD CONSTRAINT "nfc_card_history_card_id_nfc_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."nfc_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfc_card_history" ADD CONSTRAINT "nfc_card_history_actor_id_staff_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfc_card_history" ADD CONSTRAINT "nfc_card_history_target_staff_id_staff_id_fk" FOREIGN KEY ("target_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfc_cards" ADD CONSTRAINT "nfc_cards_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfc_cards" ADD CONSTRAINT "nfc_cards_issued_by_id_staff_id_fk" FOREIGN KEY ("issued_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_attendance_logs" ADD CONSTRAINT "student_attendance_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_attendance_logs" ADD CONSTRAINT "student_attendance_logs_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_attendance_logs" ADD CONSTRAINT "student_attendance_logs_marked_by_id_staff_id_fk" FOREIGN KEY ("marked_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_biometric_consents" ADD CONSTRAINT "student_biometric_consents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_biometric_consents" ADD CONSTRAINT "student_biometric_consents_guardian_id_student_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."student_guardians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_biometric_consents" ADD CONSTRAINT "student_biometric_consents_recorded_by_staff_id_staff_id_fk" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_attendance_register_class_date" ON "attendance_register" USING btree ("class_id","date");--> statement-breakpoint
CREATE INDEX "idx_biometric_logs_staff_id" ON "biometric_logs" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_credential_challenges_expires" ON "credential_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_nfc_card_history_card_id" ON "nfc_card_history" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "idx_nfc_cards_status" ON "nfc_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_nfc_cards_owner" ON "nfc_cards" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_student_attendance_student_date" ON "student_attendance_logs" USING btree ("student_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_student_guardians_uniq" ON "student_guardians" USING btree ("student_id","guardian_id");--> statement-breakpoint
CREATE INDEX "idx_students_class" ON "students" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_students_institution" ON "students" USING btree ("institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_students_inst_admission_no" ON "students" USING btree ("institution_id","admission_no");--> statement-breakpoint
CREATE INDEX "idx_students_nfc_tag" ON "students" USING btree ("nfc_tag_id");--> statement-breakpoint
CREATE INDEX "idx_webauthn_staff_id" ON "webauthn_credentials" USING btree ("staff_id");--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_id_staff_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_departments" ADD CONSTRAINT "staff_departments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_departments" ADD CONSTRAINT "staff_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_institutions" ADD CONSTRAINT "staff_institutions_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_institutions" ADD CONSTRAINT "staff_institutions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_staff_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_by_id_staff_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_leave_requests_staff_created" ON "leave_requests" USING btree ("staff_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_leave_requests_status" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notifications_staff_created" ON "notifications" USING btree ("staff_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_staff_is_read" ON "notifications" USING btree ("staff_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_purchase_requests_requester_status" ON "purchase_requests" USING btree ("requester_id","status");--> statement-breakpoint
CREATE INDEX "idx_purchase_requests_status" ON "purchase_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pg_staff_departments_staff_id" ON "staff_departments" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_pg_staff_departments_dept_id" ON "staff_departments" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_pg_staff_institutions_staff_id" ON "staff_institutions" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_pg_staff_institutions_inst_id" ON "staff_institutions" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_assigned_to_status" ON "tasks" USING btree ("assigned_to_id","status");--> statement-breakpoint
CREATE INDEX "idx_tasks_department" ON "tasks" USING btree ("department_id");