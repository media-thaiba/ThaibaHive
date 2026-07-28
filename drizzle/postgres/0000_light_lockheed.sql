CREATE TABLE "access_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"app_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"assigned_role_id" text,
	"routed_to_id" text,
	"reviewed_at" text,
	"review_notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement_reads" (
	"id" text PRIMARY KEY NOT NULL,
	"announcement_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"read_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"target_role" text,
	"target_department_id" text,
	"target_institution_id" text,
	"created_by_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"pinned_until" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_default_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"role_name" text NOT NULL,
	"permissions" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_delegations" (
	"id" text PRIMARY KEY NOT NULL,
	"delegator_id" text NOT NULL,
	"delegate_id" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"reason" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_service_history" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"service_date" text NOT NULL,
	"description" text NOT NULL,
	"cost" double precision,
	"serviced_by" text,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"model" text,
	"serial_number" text,
	"institution_id" text,
	"assigned_to_id" text,
	"location" text,
	"purchase_date" text,
	"purchase_cost" double precision,
	"warranty_end" text,
	"status" text DEFAULT 'available' NOT NULL,
	"qr_code" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"institution_id" text,
	"nfc_tag_id" text,
	"qr_secret" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"radius" double precision,
	"accuracy" double precision,
	"wifi_ssids" text,
	"deleted_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"date" text NOT NULL,
	"check_in" text,
	"check_out" text,
	"method" text DEFAULT 'manual' NOT NULL,
	"nfc_tag_id" text,
	"qr_code" text,
	"status" text DEFAULT 'present' NOT NULL,
	"worked_minutes" integer,
	"late_minutes" integer DEFAULT 0,
	"early_exit_minutes" integer DEFAULT 0,
	"notes" text,
	"presence_status" text DEFAULT 'verified',
	"last_verified_at" text,
	"geofence_violations" integer DEFAULT 0,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" jsonb,
	"ip_address" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_resources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"capacity" integer,
	"location" text,
	"institution_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_id" text NOT NULL,
	"booker_id" text NOT NULL,
	"title" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by_id" text,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"text" text,
	"media_url" text,
	"media_type" text DEFAULT 'text' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"role" text DEFAULT 'Member' NOT NULL,
	"added_by_id" text,
	"last_read_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"created_by_id" text NOT NULL,
	"last_message_time" text,
	"last_message_preview" text,
	"icon_url" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_template_items" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'onboarding' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circular_downloads" (
	"id" text PRIMARY KEY NOT NULL,
	"circular_id" text NOT NULL,
	"staff_id" text,
	"ip_address" text,
	"user_agent" text,
	"downloaded_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circulars" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"category" text DEFAULT 'general',
	"target_role" text,
	"target_department_id" text,
	"target_institution_id" text,
	"uploaded_by_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_report_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"task_id" text,
	"description" text NOT NULL,
	"hours_spent" double precision,
	"status" text DEFAULT 'completed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"date" text NOT NULL,
	"summary" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"reviewer_comment" text,
	"reviewed_by_id" text,
	"reviewed_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"head_user_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_rsvps" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"responded_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_type" text DEFAULT 'institution' NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"location" text,
	"department_id" text,
	"institution_id" text,
	"created_by_id" text NOT NULL,
	"max_attendees" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"receipt_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_id" text,
	"reviewed_at" text,
	"review_notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_work_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"attendance_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"started_at" text DEFAULT (current_timestamp) NOT NULL,
	"ended_at" text,
	"reason" text,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"approved_by" text,
	"approved_at" text,
	"rejection_reason" text,
	"location_snapshots" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"amount" double precision NOT NULL,
	"description" text,
	"transaction_date" text NOT NULL,
	"recorded_by_id" text NOT NULL,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievances" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text,
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"response" text,
	"responded_by_id" text,
	"responded_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "help_desk_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "help_desk_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'it' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"submitted_by_id" text NOT NULL,
	"assigned_to_id" text,
	"resolved_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"type" text DEFAULT 'campus' NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "institutions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"leave_type_id" text NOT NULL,
	"total_days" double precision NOT NULL,
	"used_days" double precision DEFAULT 0 NOT NULL,
	"year" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"leave_type_id" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"days_count" double precision NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"applied_at" text DEFAULT (current_timestamp) NOT NULL,
	"reviewed_by_id" text,
	"reviewed_at" text,
	"review_notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"days_allowed" double precision NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "leave_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "marketplace_apps" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"category" text NOT NULL,
	"department_id" text,
	"subdomain" text,
	"route_prefix" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "marketplace_apps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "meal_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"date" text NOT NULL,
	"meal_type" text NOT NULL,
	"status" text DEFAULT 'skip' NOT NULL,
	"guest_count" integer DEFAULT 0,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"file_url" text NOT NULL,
	"thumbnail_url" text,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"file_type" text NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"folder_id" text,
	"tags" jsonb,
	"metadata" jsonb,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_downloads" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"user_id" text,
	"ip_address" text,
	"user_agent" text,
	"downloaded_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"department_id" text,
	"created_by_id" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_share_links" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text,
	"folder_id" text,
	"token" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"password_hash" text,
	"expires_at" text,
	"download_count" integer DEFAULT 0 NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" text,
	"created_by_id" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "media_share_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "media_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"sha256" text NOT NULL,
	"total_chunks" integer NOT NULL,
	"completed_chunks" jsonb NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'general' NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"period" text NOT NULL,
	"rating" integer,
	"goals" jsonb,
	"achievements" text,
	"areas_for_improvement" text,
	"manager_comments" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"completed_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"selected_option" integer NOT NULL,
	"responded_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"target_role" text,
	"target_department_id" text,
	"target_institution_id" text,
	"created_by_id" text NOT NULL,
	"expires_at" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presence" (
	"staff_id" text PRIMARY KEY NOT NULL,
	"online" boolean DEFAULT false NOT NULL,
	"last_seen_at" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"status_text" text,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presence_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"attendance_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"accuracy" double precision,
	"is_within_geofence" boolean DEFAULT true NOT NULL,
	"is_mock_location" boolean DEFAULT false,
	"wifi_ssid" text,
	"verification_method" text DEFAULT 'gps',
	"distance_from_office" double precision,
	"network_state" text DEFAULT 'online',
	"battery_level" integer,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presence_verification_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"shadow_mode" boolean DEFAULT true NOT NULL,
	"check_interval_minutes" integer DEFAULT 10 NOT NULL,
	"grace_period_minutes" integer DEFAULT 5 NOT NULL,
	"auto_checkout_on_violation" boolean DEFAULT false NOT NULL,
	"geofence_radius_meters" integer DEFAULT 150 NOT NULL,
	"low_battery_interval_minutes" integer DEFAULT 15 NOT NULL,
	"critical_battery_suspend" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_id" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"estimated_cost" double precision,
	"justification" text,
	"status" text DEFAULT 'pending_hod' NOT NULL,
	"approved_by_hod_id" text,
	"approved_by_accounts_id" text,
	"approved_by_purchase_id" text,
	"approved_at" text,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"grace_period_minutes" integer DEFAULT 15 NOT NULL,
	"department_id" text,
	"applicable_to_all" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"employee_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"designation" text,
	"role" text DEFAULT 'staff' NOT NULL,
	"avatar_url" text,
	"date_of_birth" text,
	"date_of_joining" text,
	"qualifications" text,
	"certificates" text,
	"experience_years" double precision,
	"skills" text,
	"languages" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"aadhaar" text,
	"pan" text,
	"bank_account" text,
	"ifsc_code" text,
	"contract_end_date" text,
	"teaching_subjects" text,
	"biography" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"is_first_login" boolean DEFAULT true NOT NULL,
	"onboarding_completed_at" text,
	"password_hash" text,
	"nfc_tag_id" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "staff_email_unique" UNIQUE("email"),
	CONSTRAINT "staff_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "staff_nfc_tag_id_unique" UNIQUE("nfc_tag_id")
);
--> statement-breakpoint
CREATE TABLE "staff_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "staff_availability_staff_id_unique" UNIQUE("staff_id")
);
--> statement-breakpoint
CREATE TABLE "staff_checklist_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"checklist_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_by_id" text,
	"completed_at" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_checklists" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"template_id" text,
	"type" text DEFAULT 'onboarding' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" text,
	"completed_at" text,
	"notes" text,
	"created_by_id" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_departments" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"department_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_device_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"device_name" text,
	"last_used_at" text DEFAULT (current_timestamp) NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "staff_device_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "staff_institutions" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"institution_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_recognition" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"recognition_type" text NOT NULL,
	"message" text,
	"recognized_by_id" text,
	"date" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"shift_id" text NOT NULL,
	"effective_from" text NOT NULL,
	"effective_to" text
);
--> statement-breakpoint
CREATE TABLE "sub_departments" (
	"id" text PRIMARY KEY NOT NULL,
	"department_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_configs" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assigned_to_id" text,
	"assigned_by_id" text,
	"department_id" text,
	"due_date" text,
	"completed_at" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "used_nonces" (
	"jti" text PRIMARY KEY NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_app_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"app_id" text NOT NULL,
	"role_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"installed_at" text DEFAULT (current_timestamp) NOT NULL,
	"revoked_at" text,
	"revoked_by_id" text,
	"revoked_reason" text
);
--> statement-breakpoint
CREATE TABLE "vehicle_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"booked_by_id" text NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text,
	"purpose" text NOT NULL,
	"destination" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by_id" text,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"driver_id" text NOT NULL,
	"date" text NOT NULL,
	"start_odometer" integer,
	"end_odometer" integer,
	"distance_km" double precision,
	"fuel_litres" double precision,
	"fuel_cost" double precision,
	"route" text,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"registration_number" text NOT NULL,
	"model" text NOT NULL,
	"type" text NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"fuel_type" text DEFAULT 'petrol' NOT NULL,
	"institution_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "vehicles_registration_number_unique" UNIQUE("registration_number")
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact" text,
	"id_type" text,
	"id_number" text,
	"host_staff_id" text,
	"purpose" text NOT NULL,
	"check_in" text NOT NULL,
	"check_out" text,
	"status" text DEFAULT 'checked_in' NOT NULL,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_app_id_marketplace_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."marketplace_apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_assigned_role_id_app_default_roles_id_fk" FOREIGN KEY ("assigned_role_id") REFERENCES "public"."app_default_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_routed_to_id_staff_id_fk" FOREIGN KEY ("routed_to_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_target_department_id_departments_id_fk" FOREIGN KEY ("target_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_target_institution_id_institutions_id_fk" FOREIGN KEY ("target_institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_staff_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_default_roles" ADD CONSTRAINT "app_default_roles_app_id_marketplace_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."marketplace_apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegator_id_staff_id_fk" FOREIGN KEY ("delegator_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegate_id_staff_id_fk" FOREIGN KEY ("delegate_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_service_history" ADD CONSTRAINT "asset_service_history_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_assigned_to_id_staff_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_locations" ADD CONSTRAINT "attendance_locations_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_resources" ADD CONSTRAINT "booking_resources_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resource_id_booking_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."booking_resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_booker_id_staff_id_fk" FOREIGN KEY ("booker_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_approved_by_id_staff_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_chat_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_staff_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_room_id_chat_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_added_by_id_staff_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_created_by_id_staff_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circular_downloads" ADD CONSTRAINT "circular_downloads_circular_id_circulars_id_fk" FOREIGN KEY ("circular_id") REFERENCES "public"."circulars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circular_downloads" ADD CONSTRAINT "circular_downloads_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circulars" ADD CONSTRAINT "circulars_target_department_id_departments_id_fk" FOREIGN KEY ("target_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circulars" ADD CONSTRAINT "circulars_target_institution_id_institutions_id_fk" FOREIGN KEY ("target_institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circulars" ADD CONSTRAINT "circulars_uploaded_by_id_staff_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_tasks" ADD CONSTRAINT "daily_report_tasks_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_tasks" ADD CONSTRAINT "daily_report_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_reviewed_by_id_staff_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_user_id_staff_id_fk" FOREIGN KEY ("head_user_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_staff_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_reviewed_by_id_staff_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_work_sessions" ADD CONSTRAINT "field_work_sessions_attendance_id_attendance_logs_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_work_sessions" ADD CONSTRAINT "field_work_sessions_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_work_sessions" ADD CONSTRAINT "field_work_sessions_approved_by_staff_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_recorded_by_id_staff_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_responded_by_id_staff_id_fk" FOREIGN KEY ("responded_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_desk_comments" ADD CONSTRAINT "help_desk_comments_ticket_id_help_desk_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."help_desk_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_desk_comments" ADD CONSTRAINT "help_desk_comments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_desk_tickets" ADD CONSTRAINT "help_desk_tickets_submitted_by_id_staff_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_desk_tickets" ADD CONSTRAINT "help_desk_tickets_assigned_to_id_staff_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_id_staff_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_apps" ADD CONSTRAINT "marketplace_apps_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_notifications" ADD CONSTRAINT "meal_notifications_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_folder_id_media_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."media_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_created_by_id_staff_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_downloads" ADD CONSTRAINT "media_downloads_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_downloads" ADD CONSTRAINT "media_downloads_user_id_staff_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_parent_id_media_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_created_by_id_staff_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_share_links" ADD CONSTRAINT "media_share_links_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_share_links" ADD CONSTRAINT "media_share_links_folder_id_media_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."media_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_share_links" ADD CONSTRAINT "media_share_links_created_by_id_staff_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_created_by_id_staff_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_staff_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_target_department_id_departments_id_fk" FOREIGN KEY ("target_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_target_institution_id_institutions_id_fk" FOREIGN KEY ("target_institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_created_by_id_staff_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence" ADD CONSTRAINT "presence_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence_logs" ADD CONSTRAINT "presence_logs_attendance_id_attendance_logs_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence_logs" ADD CONSTRAINT "presence_logs_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence_verification_settings" ADD CONSTRAINT "presence_verification_settings_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_requester_id_staff_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_approved_by_hod_id_staff_id_fk" FOREIGN KEY ("approved_by_hod_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_approved_by_accounts_id_staff_id_fk" FOREIGN KEY ("approved_by_accounts_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_approved_by_purchase_id_staff_id_fk" FOREIGN KEY ("approved_by_purchase_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_availability" ADD CONSTRAINT "staff_availability_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_checklist_tasks" ADD CONSTRAINT "staff_checklist_tasks_checklist_id_staff_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."staff_checklists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_checklist_tasks" ADD CONSTRAINT "staff_checklist_tasks_completed_by_id_staff_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_checklists" ADD CONSTRAINT "staff_checklists_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_checklists" ADD CONSTRAINT "staff_checklists_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_checklists" ADD CONSTRAINT "staff_checklists_created_by_id_staff_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_departments" ADD CONSTRAINT "staff_departments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_departments" ADD CONSTRAINT "staff_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_device_tokens" ADD CONSTRAINT "staff_device_tokens_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_device_tokens" ADD CONSTRAINT "staff_device_tokens_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_institutions" ADD CONSTRAINT "staff_institutions_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_institutions" ADD CONSTRAINT "staff_institutions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_recognition" ADD CONSTRAINT "staff_recognition_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_recognition" ADD CONSTRAINT "staff_recognition_recognized_by_id_staff_id_fk" FOREIGN KEY ("recognized_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_departments" ADD CONSTRAINT "sub_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_staff_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_by_id_staff_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_app_assignments" ADD CONSTRAINT "user_app_assignments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_app_assignments" ADD CONSTRAINT "user_app_assignments_app_id_marketplace_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."marketplace_apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_app_assignments" ADD CONSTRAINT "user_app_assignments_role_id_app_default_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."app_default_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_app_assignments" ADD CONSTRAINT "user_app_assignments_revoked_by_id_staff_id_fk" FOREIGN KEY ("revoked_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_bookings" ADD CONSTRAINT "vehicle_bookings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_bookings" ADD CONSTRAINT "vehicle_bookings_booked_by_id_staff_id_fk" FOREIGN KEY ("booked_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_bookings" ADD CONSTRAINT "vehicle_bookings_approved_by_id_staff_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_logs" ADD CONSTRAINT "vehicle_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_logs" ADD CONSTRAINT "vehicle_logs_driver_id_staff_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_host_staff_id_staff_id_fk" FOREIGN KEY ("host_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_staff_idx" ON "activity_logs" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "activity_logs_action_idx" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activity_logs_resource_idx" ON "activity_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_location_nfc_tag" ON "attendance_locations" USING btree ("nfc_tag_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_location_qr_secret" ON "attendance_locations" USING btree ("qr_secret") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_location_active" ON "attendance_locations" USING btree ("institution_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_attendance_staff_date" ON "attendance_logs" USING btree ("staff_id","date");--> statement-breakpoint
CREATE INDEX "chat_messages_room_idx" ON "chat_messages" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "chat_messages_sender_idx" ON "chat_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "chat_participants_room_idx" ON "chat_participants" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "chat_participants_staff_idx" ON "chat_participants" USING btree ("staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_participants_room_staff_uniq" ON "chat_participants" USING btree ("room_id","staff_id");--> statement-breakpoint
CREATE INDEX "chat_rooms_creator_idx" ON "chat_rooms" USING btree ("created_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reports_staff_date" ON "daily_reports" USING btree ("staff_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_leave_balances_staff_leave_year" ON "leave_balances" USING btree ("staff_id","leave_type_id","year");--> statement-breakpoint
CREATE INDEX "idx_media_assets_folder_id" ON "media_assets" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "idx_media_assets_file_type" ON "media_assets" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "idx_media_assets_status" ON "media_assets" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_poll_responses_poll_staff" ON "poll_responses" USING btree ("poll_id","staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_settings_inst_id" ON "presence_verification_settings" USING btree ("institution_id") WHERE institution_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_settings_global_uniq" ON "presence_verification_settings" USING btree ("is_enabled") WHERE institution_id IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_staff_nfc_tag" ON "staff" USING btree ("nfc_tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_date_idx" ON "staff_shifts" USING btree ("staff_id","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_app_assignments_staff_app" ON "user_app_assignments" USING btree ("staff_id","app_id");