CREATE TABLE `afed_benchmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`reporting_year` text DEFAULT '2026' NOT NULL,
	`retention_rate_percent` real DEFAULT 0 NOT NULL,
	`graduation_rate_percent` real DEFAULT 0 NOT NULL,
	`rank_position` integer DEFAULT 1 NOT NULL,
	`percentiles_data` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_afed_bench_campus` ON `afed_benchmarks` (`campus_id`);--> statement-breakpoint
CREATE TABLE `afed_drift_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	`overall_psi` real DEFAULT 0 NOT NULL,
	`max_feature_ks` real DEFAULT 0 NOT NULL,
	`drifted_feature_count` integer DEFAULT 0 NOT NULL,
	`has_significant_drift` integer DEFAULT false NOT NULL,
	`feature_reports_data` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`recorded_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_afed_drift_model` ON `afed_drift_metrics` (`model_id`);--> statement-breakpoint
CREATE TABLE `afed_model_weights` (
	`id` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`weights_data` text NOT NULL,
	`checksum` text NOT NULL,
	`format` text DEFAULT 'FP32' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_afed_weight_model` ON `afed_model_weights` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_afed_weight_round` ON `afed_model_weights` (`round_number`);--> statement-breakpoint
CREATE TABLE `afed_models` (
	`id` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`version` text NOT NULL,
	`architecture` text NOT NULL,
	`input_dimensions` integer NOT NULL,
	`output_dimensions` integer NOT NULL,
	`hyperparameters_data` text NOT NULL,
	`current_round` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'initialized' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `afed_models_model_id_unique` ON `afed_models` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_afed_model_id` ON `afed_models` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_afed_model_inst` ON `afed_models` (`institution_id`);--> statement-breakpoint
CREATE TABLE `afed_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`campus_id` text NOT NULL,
	`campus_name` text NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`compute_tier` text DEFAULT 'campus_server' NOT NULL,
	`sample_count` integer DEFAULT 0 NOT NULL,
	`available_memory_mb` integer DEFAULT 1024 NOT NULL,
	`network_latency_ms` real DEFAULT 20 NOT NULL,
	`reputation_score` real DEFAULT 1 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`last_heartbeat` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `afed_nodes_node_id_unique` ON `afed_nodes` (`node_id`);--> statement-breakpoint
CREATE INDEX `idx_afed_node_id` ON `afed_nodes` (`node_id`);--> statement-breakpoint
CREATE INDEX `idx_afed_node_campus` ON `afed_nodes` (`campus_id`);--> statement-breakpoint
CREATE TABLE `afed_predictions` (
	`id` text PRIMARY KEY NOT NULL,
	`prediction_id` text NOT NULL,
	`model_id` text NOT NULL,
	`predicted_class` integer DEFAULT 0 NOT NULL,
	`confidence_score` real DEFAULT 0 NOT NULL,
	`executed_on` text DEFAULT 'EDGE_LOCAL' NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `afed_predictions_prediction_id_unique` ON `afed_predictions` (`prediction_id`);--> statement-breakpoint
CREATE INDEX `idx_afed_pred_id` ON `afed_predictions` (`prediction_id`);--> statement-breakpoint
CREATE INDEX `idx_afed_pred_model` ON `afed_predictions` (`model_id`);--> statement-breakpoint
CREATE TABLE `afed_privacy_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`total_budget_epsilon` real DEFAULT 10 NOT NULL,
	`consumed_epsilon` real DEFAULT 0 NOT NULL,
	`remaining_epsilon` real DEFAULT 10 NOT NULL,
	`total_budget_delta` real DEFAULT 0.00001 NOT NULL,
	`is_exhausted` integer DEFAULT false NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `afed_privacy_budgets_tenant_id_unique` ON `afed_privacy_budgets` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_afed_budget_tenant` ON `afed_privacy_budgets` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `afed_smpc_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`model_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`threshold` integer NOT NULL,
	`participants_data` text NOT NULL,
	`active_phase` text DEFAULT 'AGGREGATED' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `afed_smpc_sessions_session_id_unique` ON `afed_smpc_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_afed_smpc_sesh` ON `afed_smpc_sessions` (`session_id`);--> statement-breakpoint
CREATE TABLE `afed_training_rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`model_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`participants_count` integer DEFAULT 0 NOT NULL,
	`total_samples` integer DEFAULT 0 NOT NULL,
	`aggregation_algorithm` text DEFAULT 'FedAvg' NOT NULL,
	`global_loss` real DEFAULT 0 NOT NULL,
	`global_accuracy` real DEFAULT 0 NOT NULL,
	`round_duration_ms` integer DEFAULT 0 NOT NULL,
	`epsilon_consumed` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `afed_training_rounds_round_id_unique` ON `afed_training_rounds` (`round_id`);--> statement-breakpoint
CREATE INDEX `idx_afed_round_model` ON `afed_training_rounds` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_afed_round_num` ON `afed_training_rounds` (`round_number`);--> statement-breakpoint
CREATE TABLE `aims_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`domain` text NOT NULL,
	`policy_state` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aims_agents_agent_id_unique` ON `aims_agents` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_agents_agent_id` ON `aims_agents` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_agents_inst` ON `aims_agents` (`institution_id`);--> statement-breakpoint
CREATE TABLE `aims_biometric_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`campus_id` text NOT NULL,
	`location_name` text NOT NULL,
	`verification_method` text DEFAULT 'EDGE_NEURAL_ZKP' NOT NULL,
	`zk_proof_id` text,
	`similarity_score` real DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'SYNCED' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`verified_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_aims_bio_user` ON `aims_biometric_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_bio_sesh` ON `aims_biometric_logs` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_bio_inst` ON `aims_biometric_logs` (`institution_id`);--> statement-breakpoint
CREATE TABLE `aims_campus_resources` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`campus_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`capacity_units` integer DEFAULT 1 NOT NULL,
	`is_shareable_cross_campus` integer DEFAULT true NOT NULL,
	`hourly_cost_rate_dollars` real DEFAULT 0 NOT NULL,
	`active_reservations_data` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aims_campus_resources_resource_id_unique` ON `aims_campus_resources` (`resource_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_resource_id` ON `aims_campus_resources` (`resource_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_resource_inst` ON `aims_campus_resources` (`institution_id`);--> statement-breakpoint
CREATE TABLE `aims_carbon_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`reporting_period` text NOT NULL,
	`scope1_kg` real DEFAULT 0 NOT NULL,
	`scope2_kg` real DEFAULT 0 NOT NULL,
	`scope3_kg` real DEFAULT 0 NOT NULL,
	`total_kg` real DEFAULT 0 NOT NULL,
	`total_tons` real DEFAULT 0 NOT NULL,
	`renewable_percent` real DEFAULT 0 NOT NULL,
	`student_intensity_kg` real DEFAULT 0 NOT NULL,
	`verified_gri` integer DEFAULT true NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`recorded_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_aims_carbon_campus` ON `aims_carbon_metrics` (`campus_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_carbon_inst` ON `aims_carbon_metrics` (`institution_id`);--> statement-breakpoint
CREATE TABLE `aims_cloud_costs` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`provider` text NOT NULL,
	`region` text NOT NULL,
	`instance_type` text NOT NULL,
	`cluster_name` text NOT NULL,
	`environment` text DEFAULT 'production' NOT NULL,
	`cpu_utilization_percent` real NOT NULL,
	`memory_utilization_percent` real NOT NULL,
	`monthly_cost_dollars` real NOT NULL,
	`is_spot_instance` integer DEFAULT false NOT NULL,
	`recommendation_data` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`recorded_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_aims_cloud_res` ON `aims_cloud_costs` (`resource_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_cloud_inst` ON `aims_cloud_costs` (`institution_id`);--> statement-breakpoint
CREATE TABLE `aims_energy_optimizations` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`building_id` text NOT NULL,
	`zone_id` text NOT NULL,
	`baseline_temp_celsius` real NOT NULL,
	`optimized_setpoint_celsius` real NOT NULL,
	`delta_celsius` real NOT NULL,
	`projected_kwh_savings` real DEFAULT 0 NOT NULL,
	`projected_cost_savings_dollars` real DEFAULT 0 NOT NULL,
	`projected_co2_reduction_kg` real DEFAULT 0 NOT NULL,
	`pmv_constraint_satisfied` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'DISPATCHED' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`dispatched_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_aims_opt_zone` ON `aims_energy_optimizations` (`zone_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_opt_inst` ON `aims_energy_optimizations` (`institution_id`);--> statement-breakpoint
CREATE TABLE `aims_energy_telemetry` (
	`id` text PRIMARY KEY NOT NULL,
	`sensor_id` text NOT NULL,
	`campus_id` text NOT NULL,
	`building_id` text NOT NULL,
	`zone_id` text NOT NULL,
	`temperature_celsius` real NOT NULL,
	`relative_humidity_percent` real NOT NULL,
	`co2_ppm` integer NOT NULL,
	`power_kw` real NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`timestamp` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_aims_energy_zone` ON `aims_energy_telemetry` (`zone_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_energy_inst` ON `aims_energy_telemetry` (`institution_id`);--> statement-breakpoint
CREATE TABLE `aims_fleet_dispatches` (
	`id` text PRIMARY KEY NOT NULL,
	`route_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`campus_id` text NOT NULL,
	`stops_data` text NOT NULL,
	`total_distance_km` real DEFAULT 0 NOT NULL,
	`total_duration_minutes` integer DEFAULT 0 NOT NULL,
	`fuel_efficiency_km_per_liter` real DEFAULT 12 NOT NULL,
	`projected_co2_emissions_kg` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`generated_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aims_fleet_dispatches_route_id_unique` ON `aims_fleet_dispatches` (`route_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_dispatch_route` ON `aims_fleet_dispatches` (`route_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_dispatch_veh` ON `aims_fleet_dispatches` (`vehicle_id`);--> statement-breakpoint
CREATE TABLE `aims_fleet_vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`campus_id` text NOT NULL,
	`vehicle_type` text NOT NULL,
	`speed_kmph` real DEFAULT 0 NOT NULL,
	`odometer_km` real DEFAULT 0 NOT NULL,
	`battery_soc_ratio` real DEFAULT 1 NOT NULL,
	`engine_temp_celsius` real DEFAULT 85 NOT NULL,
	`brake_pad_wear_percent` real DEFAULT 10 NOT NULL,
	`tire_pressure_psi` real DEFAULT 33 NOT NULL,
	`passenger_count` integer DEFAULT 0 NOT NULL,
	`max_capacity` integer DEFAULT 25 NOT NULL,
	`status` text DEFAULT 'IDLE' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aims_fleet_vehicles_vehicle_id_unique` ON `aims_fleet_vehicles` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_fleet_veh_id` ON `aims_fleet_vehicles` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `idx_aims_fleet_inst` ON `aims_fleet_vehicles` (`institution_id`);--> statement-breakpoint
CREATE TABLE `alumni_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`timestamp` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alumni_audit_logs_audit_id_unique` ON `alumni_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_audit_id` ON `alumni_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_audit_action` ON `alumni_audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_alum_audit_entity` ON `alumni_audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_audit_time` ON `alumni_audit_logs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `alumni_chapter_members` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter_id` text NOT NULL,
	`alumni_profile_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`joined_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `alumni_chapters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_alum_mem_chap` ON `alumni_chapter_members` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_mem_prof` ON `alumni_chapter_members` (`alumni_profile_id`);--> statement-breakpoint
CREATE TABLE `alumni_chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`type` text DEFAULT 'regional' NOT NULL,
	`country` text NOT NULL,
	`city` text NOT NULL,
	`description` text,
	`president_alumni_id` text,
	`secretary_alumni_id` text,
	`treasurer_alumni_id` text,
	`member_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`banner_url` text,
	`founded_date` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`president_alumni_id`) REFERENCES `alumni_profiles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`secretary_alumni_id`) REFERENCES `alumni_profiles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`treasurer_alumni_id`) REFERENCES `alumni_profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alumni_chapters_code_unique` ON `alumni_chapters` (`code`);--> statement-breakpoint
CREATE INDEX `idx_alum_chap_inst` ON `alumni_chapters` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_chap_code` ON `alumni_chapters` (`code`);--> statement-breakpoint
CREATE INDEX `idx_alum_chap_status` ON `alumni_chapters` (`status`);--> statement-breakpoint
CREATE TABLE `alumni_donation_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`title` text NOT NULL,
	`code` text NOT NULL,
	`category` text DEFAULT 'general_endowment' NOT NULL,
	`description` text NOT NULL,
	`target_amount` real DEFAULT 0 NOT NULL,
	`raised_amount` real DEFAULT 0 NOT NULL,
	`donor_count` integer DEFAULT 0 NOT NULL,
	`banner_image_url` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`is_tax_exempt_80g` integer DEFAULT true NOT NULL,
	`matching_donor_name` text,
	`matching_ratio` real DEFAULT 1,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alumni_donation_campaigns_code_unique` ON `alumni_donation_campaigns` (`code`);--> statement-breakpoint
CREATE INDEX `idx_alum_camp_inst` ON `alumni_donation_campaigns` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_camp_code` ON `alumni_donation_campaigns` (`code`);--> statement-breakpoint
CREATE INDEX `idx_alum_camp_status` ON `alumni_donation_campaigns` (`status`);--> statement-breakpoint
CREATE TABLE `alumni_donations` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`alumni_profile_id` text,
	`donor_name` text NOT NULL,
	`donor_email` text NOT NULL,
	`donor_phone` text,
	`donor_pan_tax_id` text,
	`is_anonymous` integer DEFAULT false NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`payment_gateway` text DEFAULT 'razorpay' NOT NULL,
	`gateway_transaction_id` text,
	`status` text DEFAULT 'initiated' NOT NULL,
	`gl_journal_id` text,
	`receipt_80g_number` text,
	`receipt_80g_hash` text,
	`receipt_80g_pdf_url` text,
	`recognition_tier` text DEFAULT 'supporter' NOT NULL,
	`is_corporate_matching` integer DEFAULT false NOT NULL,
	`corporate_employer_name` text,
	`confirmed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campaign_id`) REFERENCES `alumni_donation_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alumni_donations_gateway_transaction_id_unique` ON `alumni_donations` (`gateway_transaction_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `alumni_donations_receipt_80g_number_unique` ON `alumni_donations` (`receipt_80g_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `alumni_donations_receipt_80g_hash_unique` ON `alumni_donations` (`receipt_80g_hash`);--> statement-breakpoint
CREATE INDEX `idx_alum_don_inst` ON `alumni_donations` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_don_camp` ON `alumni_donations` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_don_alum` ON `alumni_donations` (`alumni_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_don_rcpt` ON `alumni_donations` (`receipt_80g_number`);--> statement-breakpoint
CREATE INDEX `idx_alum_don_status` ON `alumni_donations` (`status`);--> statement-breakpoint
CREATE TABLE `alumni_educations` (
	`id` text PRIMARY KEY NOT NULL,
	`alumni_profile_id` text NOT NULL,
	`institution_name` text NOT NULL,
	`degree` text NOT NULL,
	`field_of_study` text NOT NULL,
	`start_year` integer NOT NULL,
	`end_year` integer,
	`grade_cgpa` text,
	`honors` text,
	`activities` text,
	`is_institutional` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_alum_edu_prof` ON `alumni_educations` (`alumni_profile_id`);--> statement-breakpoint
CREATE TABLE `alumni_event_rsvps` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`alumni_profile_id` text,
	`student_id` text,
	`attendee_name` text NOT NULL,
	`attendee_email` text NOT NULL,
	`ticket_number` text NOT NULL,
	`ticket_pass_qr` text NOT NULL,
	`ticket_pass_hash` text NOT NULL,
	`payment_status` text DEFAULT 'free' NOT NULL,
	`amount_paid` real DEFAULT 0 NOT NULL,
	`is_checked_in` integer DEFAULT false NOT NULL,
	`checked_in_at` text,
	`checked_in_by_id` text,
	`rsvp_status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `alumni_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profiles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`checked_in_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alumni_event_rsvps_ticket_number_unique` ON `alumni_event_rsvps` (`ticket_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `alumni_event_rsvps_ticket_pass_hash_unique` ON `alumni_event_rsvps` (`ticket_pass_hash`);--> statement-breakpoint
CREATE INDEX `idx_alum_rsvp_evt` ON `alumni_event_rsvps` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_rsvp_ticket` ON `alumni_event_rsvps` (`ticket_number`);--> statement-breakpoint
CREATE INDEX `idx_alum_rsvp_hash` ON `alumni_event_rsvps` (`ticket_pass_hash`);--> statement-breakpoint
CREATE TABLE `alumni_events` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`chapter_id` text,
	`title` text NOT NULL,
	`event_type` text DEFAULT 'reunion' NOT NULL,
	`format` text DEFAULT 'in_person' NOT NULL,
	`venue` text,
	`virtual_meeting_url` text,
	`start_date_time` text NOT NULL,
	`end_date_time` text NOT NULL,
	`description` text NOT NULL,
	`banner_url` text,
	`ticket_price` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`capacity` integer DEFAULT 100 NOT NULL,
	`registered_count` integer DEFAULT 0 NOT NULL,
	`attended_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`organizer_alumni_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `alumni_chapters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`organizer_alumni_id`) REFERENCES `alumni_profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_alum_evt_inst` ON `alumni_events` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_evt_chap` ON `alumni_events` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_evt_status` ON `alumni_events` (`status`);--> statement-breakpoint
CREATE INDEX `idx_alum_evt_date` ON `alumni_events` (`start_date_time`);--> statement-breakpoint
CREATE TABLE `alumni_experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`alumni_profile_id` text NOT NULL,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`employment_type` text DEFAULT 'full_time',
	`industry` text NOT NULL,
	`location` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`is_current` integer DEFAULT false NOT NULL,
	`description` text,
	`skills` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_alum_exp_prof` ON `alumni_experiences` (`alumni_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_exp_company` ON `alumni_experiences` (`company`);--> statement-breakpoint
CREATE TABLE `alumni_job_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`job_posting_id` text NOT NULL,
	`student_id` text NOT NULL,
	`resume_url` text NOT NULL,
	`cover_letter` text,
	`portfolio_link` text,
	`status` text DEFAULT 'applied' NOT NULL,
	`referral_endorsed_by_id` text,
	`referral_notes` text,
	`recruiter_feedback` text,
	`applied_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`job_posting_id`) REFERENCES `alumni_job_postings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referral_endorsed_by_id`) REFERENCES `alumni_profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_alum_app_job` ON `alumni_job_applications` (`job_posting_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_app_student` ON `alumni_job_applications` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_app_status` ON `alumni_job_applications` (`status`);--> statement-breakpoint
CREATE TABLE `alumni_job_postings` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`posted_by_alumni_id` text,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`role_type` text DEFAULT 'full_time' NOT NULL,
	`workplace_type` text DEFAULT 'onsite' NOT NULL,
	`location` text NOT NULL,
	`department_target` text,
	`experience_level` text DEFAULT 'entry_level',
	`min_salary` real,
	`max_salary` real,
	`salary_currency` text DEFAULT 'INR' NOT NULL,
	`description` text NOT NULL,
	`requirements` text NOT NULL,
	`skills_required` text,
	`application_url` text,
	`contact_email` text,
	`allow_direct_apply` integer DEFAULT true NOT NULL,
	`has_alumni_referral` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`moderated_by_id` text,
	`moderation_notes` text,
	`published_at` text,
	`expires_at` text,
	`views_count` integer DEFAULT 0 NOT NULL,
	`applications_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`posted_by_alumni_id`) REFERENCES `alumni_profiles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`moderated_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_alum_job_inst` ON `alumni_job_postings` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_job_status` ON `alumni_job_postings` (`status`);--> statement-breakpoint
CREATE INDEX `idx_alum_job_company` ON `alumni_job_postings` (`company`);--> statement-breakpoint
CREATE TABLE `alumni_mentorship_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`alumni_profile_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`expertise_areas` text NOT NULL,
	`target_mentee_types` text DEFAULT 'all' NOT NULL,
	`max_active_mentees` integer DEFAULT 3 NOT NULL,
	`active_mentee_count` integer DEFAULT 0 NOT NULL,
	`preferred_languages` text DEFAULT 'English',
	`availability_hours_per_month` real DEFAULT 4 NOT NULL,
	`meeting_type` text DEFAULT 'virtual' NOT NULL,
	`meeting_link` text,
	`bio_mentor` text,
	`average_rating` real DEFAULT 5 NOT NULL,
	`total_reviews_count` integer DEFAULT 0 NOT NULL,
	`total_hours_delivered` real DEFAULT 0 NOT NULL,
	`is_accepting_requests` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alumni_mentorship_profiles_alumni_profile_id_unique` ON `alumni_mentorship_profiles` (`alumni_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_mentor_inst` ON `alumni_mentorship_profiles` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_mentor_prof` ON `alumni_mentorship_profiles` (`alumni_profile_id`);--> statement-breakpoint
CREATE TABLE `alumni_mentorship_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`mentorship_profile_id` text NOT NULL,
	`student_id` text NOT NULL,
	`request_topic` text NOT NULL,
	`request_goals` text NOT NULL,
	`student_notes` text,
	`compatibility_score` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`response_notes` text,
	`responded_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mentorship_profile_id`) REFERENCES `alumni_mentorship_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_alum_req_inst` ON `alumni_mentorship_requests` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_req_mentor` ON `alumni_mentorship_requests` (`mentorship_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_req_student` ON `alumni_mentorship_requests` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_req_status` ON `alumni_mentorship_requests` (`status`);--> statement-breakpoint
CREATE TABLE `alumni_mentorship_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`mentorship_profile_id` text NOT NULL,
	`student_id` text NOT NULL,
	`scheduled_start` text NOT NULL,
	`scheduled_end` text NOT NULL,
	`meeting_url` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`session_notes` text,
	`mentor_rating` integer,
	`mentor_feedback` text,
	`student_rating` integer,
	`student_feedback` text,
	`completed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `alumni_mentorship_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mentorship_profile_id`) REFERENCES `alumni_mentorship_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_alum_sess_req` ON `alumni_mentorship_sessions` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_sess_mentor` ON `alumni_mentorship_sessions` (`mentorship_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_sess_student` ON `alumni_mentorship_sessions` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_sess_status` ON `alumni_mentorship_sessions` (`status`);--> statement-breakpoint
CREATE TABLE `alumni_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`student_id` text,
	`user_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`maiden_name` text,
	`email` text NOT NULL,
	`phone` text,
	`avatar_url` text,
	`headline` text,
	`bio` text,
	`current_company` text,
	`current_designation` text,
	`current_industry` text,
	`current_city` text,
	`current_country` text,
	`linkedin_url` text,
	`github_url` text,
	`portfolio_url` text,
	`graduation_batch_year` integer NOT NULL,
	`primary_degree` text NOT NULL,
	`primary_department` text NOT NULL,
	`credential_hash` text,
	`is_verified` integer DEFAULT false NOT NULL,
	`verified_at` text,
	`verified_by_id` text,
	`is_mentor` integer DEFAULT false NOT NULL,
	`is_hiring` integer DEFAULT false NOT NULL,
	`privacy_consent_level` text DEFAULT 'alumni_only' NOT NULL,
	`show_email` integer DEFAULT false NOT NULL,
	`show_phone` integer DEFAULT false NOT NULL,
	`show_location` integer DEFAULT true NOT NULL,
	`show_company` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`claimed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`verified_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_alum_prof_inst` ON `alumni_profiles` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_alum_prof_email` ON `alumni_profiles` (`email`);--> statement-breakpoint
CREATE INDEX `idx_alum_prof_batch` ON `alumni_profiles` (`graduation_batch_year`);--> statement-breakpoint
CREATE INDEX `idx_alum_prof_status` ON `alumni_profiles` (`status`);--> statement-breakpoint
CREATE INDEX `idx_alum_prof_student` ON `alumni_profiles` (`student_id`);--> statement-breakpoint
CREATE TABLE `ares_chaos_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`scenario_id` text NOT NULL,
	`state` text DEFAULT 'COMPLETED' NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text,
	`baseline_metrics` text,
	`observed_metrics` text,
	`recovery_time_ms` integer DEFAULT 0 NOT NULL,
	`resilience_score_deduction` integer DEFAULT 0 NOT NULL,
	`abort_reason` text,
	`logs` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ares_chaos_exec_scenario` ON `ares_chaos_executions` (`scenario_id`);--> statement-breakpoint
CREATE INDEX `idx_ares_chaos_exec_state` ON `ares_chaos_executions` (`state`);--> statement-breakpoint
CREATE TABLE `ares_chaos_experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`scenario_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`fault_type` text NOT NULL,
	`target_type` text NOT NULL,
	`target_identifier` text NOT NULL,
	`blast_radius_percentage` integer DEFAULT 10 NOT NULL,
	`duration_seconds` integer DEFAULT 10 NOT NULL,
	`parameters` text,
	`max_error_rate_percent` real DEFAULT 1 NOT NULL,
	`max_p99_latency_ms` integer DEFAULT 1000 NOT NULL,
	`tenant_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ares_chaos_experiments_scenario_id_unique` ON `ares_chaos_experiments` (`scenario_id`);--> statement-breakpoint
CREATE INDEX `idx_ares_chaos_scenario` ON `ares_chaos_experiments` (`scenario_id`);--> statement-breakpoint
CREATE INDEX `idx_ares_chaos_fault` ON `ares_chaos_experiments` (`fault_type`);--> statement-breakpoint
CREATE TABLE `ares_predictive_threats` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`posterior_probability` real NOT NULL,
	`confidence_score` integer NOT NULL,
	`severity_tier` text NOT NULL,
	`projected_exploit_window_days` integer DEFAULT 14 NOT NULL,
	`key_indicators` text,
	`affected_asset_ids` text,
	`recommended_mitigations` text,
	`tenant_id` text DEFAULT 'global' NOT NULL,
	`calculated_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ares_threats_category` ON `ares_predictive_threats` (`category`);--> statement-breakpoint
CREATE INDEX `idx_ares_threats_tier` ON `ares_predictive_threats` (`severity_tier`);--> statement-breakpoint
CREATE INDEX `idx_ares_threats_tenant` ON `ares_predictive_threats` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `ares_resilience_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`overall_score` real NOT NULL,
	`tier` text NOT NULL,
	`vector_breakdown` text NOT NULL,
	`mttr_seconds` integer DEFAULT 45 NOT NULL,
	`unresolved_gaps_count` integer DEFAULT 0 NOT NULL,
	`tenant_id` text DEFAULT 'global' NOT NULL,
	`calculated_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ares_resilience_tier` ON `ares_resilience_scores` (`tier`);--> statement-breakpoint
CREATE INDEX `idx_ares_resilience_tenant` ON `ares_resilience_scores` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `ares_threat_graph_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`target_id` text NOT NULL,
	`type` text NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ares_graph_edge_source` ON `ares_threat_graph_edges` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_ares_graph_edge_target` ON `ares_threat_graph_edges` (`target_id`);--> statement-breakpoint
CREATE INDEX `idx_ares_graph_edge_type` ON `ares_threat_graph_edges` (`type`);--> statement-breakpoint
CREATE TABLE `ares_threat_graph_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`severity` text,
	`risk_score` integer DEFAULT 50 NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ares_graph_node_type` ON `ares_threat_graph_nodes` (`type`);--> statement-breakpoint
CREATE INDEX `idx_ares_graph_node_name` ON `ares_threat_graph_nodes` (`name`);--> statement-breakpoint
CREATE TABLE `ares_zkp_proofs` (
	`id` text PRIMARY KEY NOT NULL,
	`proof_id` text NOT NULL,
	`merkle_root` text NOT NULL,
	`epoch_timestamp` text NOT NULL,
	`leaf_hash_commitment` text NOT NULL,
	`proof_data` text NOT NULL,
	`public_inputs` text NOT NULL,
	`tenant_id` text DEFAULT 'global' NOT NULL,
	`generated_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ares_zkp_proofs_proof_id_unique` ON `ares_zkp_proofs` (`proof_id`);--> statement-breakpoint
CREATE INDEX `idx_ares_zkp_proof_id` ON `ares_zkp_proofs` (`proof_id`);--> statement-breakpoint
CREATE INDEX `idx_ares_zkp_merkle_root` ON `ares_zkp_proofs` (`merkle_root`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text DEFAULT 'default' NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`payload` text,
	`previous_hash` text,
	`current_hash` text NOT NULL,
	`merkle_root_id` text,
	`merkle_proof` text,
	`ip_address` text,
	`user_agent` text,
	`timestamp` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`merkle_root_id`) REFERENCES `audit_merkle_roots`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_tenant` ON `audit_logs` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_hash` ON `audit_logs` (`current_hash`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_merkle_root` ON `audit_logs` (`merkle_root_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_timestamp` ON `audit_logs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `audit_merkle_roots` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text DEFAULT 'default' NOT NULL,
	`root_hash` text NOT NULL,
	`start_audit_id` text,
	`end_audit_id` text,
	`leaf_count` integer DEFAULT 0 NOT NULL,
	`tree_depth` integer DEFAULT 0 NOT NULL,
	`signature` text,
	`metadata` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_merkle_roots_tenant` ON `audit_merkle_roots` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_merkle_roots_hash` ON `audit_merkle_roots` (`root_hash`);--> statement-breakpoint
CREATE INDEX `idx_audit_merkle_roots_created_at` ON `audit_merkle_roots` (`created_at`);--> statement-breakpoint
CREATE TABLE `campus_affiliations` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_name` text NOT NULL,
	`contact_person` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`location_address` text NOT NULL,
	`campus_type` text DEFAULT 'affiliated' NOT NULL,
	`total_capacity` integer DEFAULT 0,
	`facilities_description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`approved_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_campus_affiliations_status` ON `campus_affiliations` (`status`);--> statement-breakpoint
CREATE TABLE `circular_campus_compliance` (
	`id` text PRIMARY KEY NOT NULL,
	`circular_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`completion_evidence_url` text,
	`coordinator_remarks` text,
	`completed_at` text,
	`verified_by_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`circular_id`) REFERENCES `circulars`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`verified_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_circular_compliance_circ_inst` ON `circular_campus_compliance` (`circular_id`,`institution_id`);--> statement-breakpoint
CREATE TABLE `compliance_violations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text DEFAULT 'default' NOT NULL,
	`rule_id` text NOT NULL,
	`severity` text DEFAULT 'MEDIUM' NOT NULL,
	`actor_id` text,
	`entity_type` text,
	`entity_id` text,
	`details` text,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`resolution_notes` text,
	`resolved_by` text,
	`resolved_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_compliance_violations_tenant` ON `compliance_violations` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_compliance_violations_rule` ON `compliance_violations` (`rule_id`);--> statement-breakpoint
CREATE INDEX `idx_compliance_violations_severity` ON `compliance_violations` (`severity`);--> statement-breakpoint
CREATE INDEX `idx_compliance_violations_status` ON `compliance_violations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_compliance_violations_created_at` ON `compliance_violations` (`created_at`);--> statement-breakpoint
CREATE TABLE `curriculum_advising_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`sender_type` text NOT NULL,
	`agent_domain` text,
	`message_content` text NOT NULL,
	`citations_json` text,
	`roadmap_action_json` text,
	`token_count` integer DEFAULT 0 NOT NULL,
	`sent_at` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `curriculum_advising_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_curriculum_advmsg_session` ON `curriculum_advising_messages` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_advmsg_sender` ON `curriculum_advising_messages` (`sender_type`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_advmsg_time` ON `curriculum_advising_messages` (`sent_at`);--> statement-breakpoint
CREATE TABLE `curriculum_advising_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`active_domain` text DEFAULT 'degree_planner' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`assigned_counselor_id` text,
	`session_summary` text,
	`proposed_changes_json` text,
	`confidence_score` real DEFAULT 0.9 NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_counselor_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `curriculum_advising_sessions_session_id_unique` ON `curriculum_advising_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_advsession_id` ON `curriculum_advising_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_advsession_student` ON `curriculum_advising_sessions` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_advsession_domain` ON `curriculum_advising_sessions` (`active_domain`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_advsession_status` ON `curriculum_advising_sessions` (`status`);--> statement-breakpoint
CREATE TABLE `curriculum_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`action_type` text NOT NULL,
	`target_student_id` text,
	`plan_id` text,
	`performed_by_user_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`previous_state` text,
	`new_state` text,
	`justification` text,
	`merkle_proof` text DEFAULT '' NOT NULL,
	`merkle_audit_hash` text DEFAULT '' NOT NULL,
	`audit_timestamp` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`target_student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_id`) REFERENCES `curriculum_degree_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `curriculum_audit_logs_audit_id_unique` ON `curriculum_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_audit_id` ON `curriculum_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_audit_action` ON `curriculum_audit_logs` (`action_type`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_audit_student` ON `curriculum_audit_logs` (`target_student_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_audit_time` ON `curriculum_audit_logs` (`audit_timestamp`);--> statement-breakpoint
CREATE TABLE `curriculum_courses` (
	`id` text PRIMARY KEY NOT NULL,
	`course_code` text NOT NULL,
	`title` text NOT NULL,
	`department_id` text,
	`credits` integer DEFAULT 3 NOT NULL,
	`level` integer DEFAULT 100 NOT NULL,
	`course_type` text DEFAULT 'major_core' NOT NULL,
	`min_grade` text DEFAULT 'D' NOT NULL,
	`typical_term` integer DEFAULT 1 NOT NULL,
	`historical_pass_rate` real DEFAULT 0.85 NOT NULL,
	`blocking_factor` integer DEFAULT 0 NOT NULL,
	`description` text,
	`syllabus_embedding` text,
	`status` text DEFAULT 'active' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_curriculum_course_code` ON `curriculum_courses` (`course_code`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_course_dept` ON `curriculum_courses` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_course_level` ON `curriculum_courses` (`level`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_course_type` ON `curriculum_courses` (`course_type`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_course_inst` ON `curriculum_courses` (`institution_id`);--> statement-breakpoint
CREATE TABLE `curriculum_degree_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`student_id` text NOT NULL,
	`program_id` text NOT NULL,
	`title` text DEFAULT 'Primary Degree Plan' NOT NULL,
	`target_graduation_term` text DEFAULT 'Spring 2030' NOT NULL,
	`total_terms` integer DEFAULT 8 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`approved_by_advisor_id` text,
	`approved_at` text,
	`merkle_audit_hash` text DEFAULT '' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`program_id`) REFERENCES `curriculum_programs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by_advisor_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `curriculum_degree_plans_plan_id_unique` ON `curriculum_degree_plans` (`plan_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_plan_id` ON `curriculum_degree_plans` (`plan_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_plan_student` ON `curriculum_degree_plans` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_plan_program` ON `curriculum_degree_plans` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_plan_status` ON `curriculum_degree_plans` (`status`);--> statement-breakpoint
CREATE TABLE `curriculum_plan_courses` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`course_id` text NOT NULL,
	`planned_term_index` integer NOT NULL,
	`term_name` text NOT NULL,
	`credits` integer DEFAULT 3 NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`grade_received` text,
	`is_prerequisite_satisfied` integer DEFAULT true NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `curriculum_degree_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `curriculum_courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_curriculum_plancourse_plan` ON `curriculum_plan_courses` (`plan_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_plancourse_course` ON `curriculum_plan_courses` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_plancourse_term` ON `curriculum_plan_courses` (`planned_term_index`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_plancourse_status` ON `curriculum_plan_courses` (`status`);--> statement-breakpoint
CREATE TABLE `curriculum_prerequisites` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`prerequisite_course_id` text NOT NULL,
	`type` text DEFAULT 'hard_prerequisite' NOT NULL,
	`minimum_grade` text DEFAULT 'C' NOT NULL,
	`concurrency_allowed` integer DEFAULT false NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `curriculum_courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prerequisite_course_id`) REFERENCES `curriculum_courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_curriculum_prereq_course` ON `curriculum_prerequisites` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_prereq_target` ON `curriculum_prerequisites` (`prerequisite_course_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_prereq_type` ON `curriculum_prerequisites` (`type`);--> statement-breakpoint
CREATE TABLE `curriculum_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`program_code` text NOT NULL,
	`title` text NOT NULL,
	`department_id` text,
	`degree_type` text DEFAULT 'bachelor' NOT NULL,
	`total_credits_required` integer DEFAULT 120 NOT NULL,
	`minimum_gpa` real DEFAULT 2 NOT NULL,
	`catalog_year` text DEFAULT '2026-2027' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`curriculum_complexity_index` real DEFAULT 0 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `curriculum_programs_program_code_unique` ON `curriculum_programs` (`program_code`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_prog_code` ON `curriculum_programs` (`program_code`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_prog_dept` ON `curriculum_programs` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_prog_year` ON `curriculum_programs` (`catalog_year`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_prog_status` ON `curriculum_programs` (`status`);--> statement-breakpoint
CREATE TABLE `curriculum_retention_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`alert_id` text NOT NULL,
	`student_id` text NOT NULL,
	`risk_tier` text DEFAULT 'medium' NOT NULL,
	`risk_score` real DEFAULT 0.5 NOT NULL,
	`contributing_factors_json` text NOT NULL,
	`recommended_intervention_json` text,
	`status` text DEFAULT 'open' NOT NULL,
	`assigned_counselor_id` text,
	`engage_os_dispatched` integer DEFAULT false NOT NULL,
	`last_contacted_at` text,
	`resolved_at` text,
	`resolution_notes` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_counselor_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `curriculum_retention_alerts_alert_id_unique` ON `curriculum_retention_alerts` (`alert_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_alert_id` ON `curriculum_retention_alerts` (`alert_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_alert_student` ON `curriculum_retention_alerts` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_alert_risk` ON `curriculum_retention_alerts` (`risk_tier`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_alert_status` ON `curriculum_retention_alerts` (`status`);--> statement-breakpoint
CREATE TABLE `curriculum_transfer_articulations` (
	`id` text PRIMARY KEY NOT NULL,
	`articulation_id` text NOT NULL,
	`student_id` text NOT NULL,
	`source_institution` text NOT NULL,
	`source_course_code` text NOT NULL,
	`source_course_title` text NOT NULL,
	`source_credits` real DEFAULT 3 NOT NULL,
	`source_grade` text NOT NULL,
	`target_course_id` text,
	`semantic_match_score` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by_staff_id` text,
	`reviewed_at` text,
	`waiver_reason` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_course_id`) REFERENCES `curriculum_courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `curriculum_transfer_articulations_articulation_id_unique` ON `curriculum_transfer_articulations` (`articulation_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_transfer_art_id` ON `curriculum_transfer_articulations` (`articulation_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_transfer_student` ON `curriculum_transfer_articulations` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_transfer_status` ON `curriculum_transfer_articulations` (`status`);--> statement-breakpoint
CREATE TABLE `device_fingerprints` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`institution_id` text,
	`composite_hash` text NOT NULL,
	`attributes` text NOT NULL,
	`trust_score` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`last_seen` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `doc_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`timestamp` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `doc_audit_logs_audit_id_unique` ON `doc_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_doc_audit_id` ON `doc_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_doc_audit_action` ON `doc_audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_doc_audit_entity` ON `doc_audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_doc_audit_time` ON `doc_audit_logs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `doc_generated_records` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`template_id` text,
	`document_type` text NOT NULL,
	`recipient_type` text DEFAULT 'student' NOT NULL,
	`recipient_id` text NOT NULL,
	`academic_year_id` text,
	`exam_id` text,
	`document_hash` text NOT NULL,
	`serial_number` text NOT NULL,
	`title` text NOT NULL,
	`file_url` text,
	`file_size_bytes` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'valid' NOT NULL,
	`metadata_json` text,
	`generated_by_id` text,
	`issued_at` text DEFAULT (current_timestamp) NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `doc_templates`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`generated_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `doc_generated_records_document_hash_unique` ON `doc_generated_records` (`document_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `doc_generated_records_serial_number_unique` ON `doc_generated_records` (`serial_number`);--> statement-breakpoint
CREATE INDEX `idx_doc_gen_inst` ON `doc_generated_records` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_doc_gen_recipient` ON `doc_generated_records` (`recipient_type`,`recipient_id`);--> statement-breakpoint
CREATE INDEX `idx_doc_gen_hash` ON `doc_generated_records` (`document_hash`);--> statement-breakpoint
CREATE INDEX `idx_doc_gen_serial` ON `doc_generated_records` (`serial_number`);--> statement-breakpoint
CREATE INDEX `idx_doc_gen_status` ON `doc_generated_records` (`status`);--> statement-breakpoint
CREATE TABLE `doc_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`template_code` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`layout_config` text,
	`content_template` text NOT NULL,
	`css_styles` text,
	`version` integer DEFAULT 1 NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `doc_templates_template_code_unique` ON `doc_templates` (`template_code`);--> statement-breakpoint
CREATE INDEX `idx_doc_templates_inst` ON `doc_templates` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_doc_templates_code` ON `doc_templates` (`template_code`);--> statement-breakpoint
CREATE INDEX `idx_doc_templates_category` ON `doc_templates` (`category`);--> statement-breakpoint
CREATE TABLE `doc_verification_signatures` (
	`id` text PRIMARY KEY NOT NULL,
	`document_record_id` text NOT NULL,
	`document_hash` text NOT NULL,
	`signature` text NOT NULL,
	`signer_public_key` text,
	`signing_algorithm` text DEFAULT 'sha256WithRSAEncryption' NOT NULL,
	`merkle_root` text,
	`merkle_proof` text,
	`verification_count` integer DEFAULT 0 NOT NULL,
	`last_verified_at` text,
	`revoked` integer DEFAULT false NOT NULL,
	`revoked_reason` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`document_record_id`) REFERENCES `doc_generated_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `doc_verification_signatures_document_hash_unique` ON `doc_verification_signatures` (`document_hash`);--> statement-breakpoint
CREATE INDEX `idx_doc_verif_hash` ON `doc_verification_signatures` (`document_hash`);--> statement-breakpoint
CREATE INDEX `idx_doc_verif_record` ON `doc_verification_signatures` (`document_record_id`);--> statement-breakpoint
CREATE TABLE `eco_carbon_emissions` (
	`id` text PRIMARY KEY NOT NULL,
	`emission_id` text NOT NULL,
	`facility_id` text NOT NULL,
	`department_id` text,
	`scope` text DEFAULT 'scope_2' NOT NULL,
	`category` text DEFAULT 'electricity' NOT NULL,
	`fuel_type` text,
	`quantity` real DEFAULT 0 NOT NULL,
	`unit` text DEFAULT 'kWh' NOT NULL,
	`emission_factor` real DEFAULT 0.35 NOT NULL,
	`co2_equivalent_kg` real DEFAULT 0 NOT NULL,
	`activity_date` text NOT NULL,
	`is_offset` integer DEFAULT false NOT NULL,
	`offset_id` text,
	`audit_hash` text DEFAULT '' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eco_carbon_emissions_emission_id_unique` ON `eco_carbon_emissions` (`emission_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_emission_id` ON `eco_carbon_emissions` (`emission_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_emission_fac` ON `eco_carbon_emissions` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_emission_dept` ON `eco_carbon_emissions` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_emission_scope` ON `eco_carbon_emissions` (`scope`);--> statement-breakpoint
CREATE INDEX `idx_eco_emission_date` ON `eco_carbon_emissions` (`activity_date`);--> statement-breakpoint
CREATE TABLE `eco_carbon_offsets` (
	`id` text PRIMARY KEY NOT NULL,
	`offset_id` text NOT NULL,
	`certificate_number` text NOT NULL,
	`registry` text DEFAULT 'verra_vcs' NOT NULL,
	`offset_type` text DEFAULT 'reforestation' NOT NULL,
	`vintage_year` integer DEFAULT 2025 NOT NULL,
	`quantity_tons_co2e` real DEFAULT 100 NOT NULL,
	`cost_per_ton` real DEFAULT 25 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`retired_for_period` text,
	`verification_hash` text DEFAULT '' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eco_carbon_offsets_offset_id_unique` ON `eco_carbon_offsets` (`offset_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `eco_carbon_offsets_certificate_number_unique` ON `eco_carbon_offsets` (`certificate_number`);--> statement-breakpoint
CREATE INDEX `idx_eco_offset_id` ON `eco_carbon_offsets` (`offset_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_offset_cert` ON `eco_carbon_offsets` (`certificate_number`);--> statement-breakpoint
CREATE INDEX `idx_eco_offset_status` ON `eco_carbon_offsets` (`status`);--> statement-breakpoint
CREATE TABLE `eco_energy_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`facility_id` text NOT NULL,
	`name` text NOT NULL,
	`asset_type` text DEFAULT 'smart_meter' NOT NULL,
	`status` text DEFAULT 'online' NOT NULL,
	`capacity_kw` real DEFAULT 0 NOT NULL,
	`rated_voltage` real DEFAULT 400 NOT NULL,
	`specifications_json` text DEFAULT '{}' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eco_energy_assets_asset_id_unique` ON `eco_energy_assets` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_asset_id` ON `eco_energy_assets` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_asset_fac` ON `eco_energy_assets` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_asset_type` ON `eco_energy_assets` (`asset_type`);--> statement-breakpoint
CREATE INDEX `idx_eco_asset_status` ON `eco_energy_assets` (`status`);--> statement-breakpoint
CREATE TABLE `eco_esg_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`title` text NOT NULL,
	`reporting_period` text NOT NULL,
	`framework` text DEFAULT 'ghg_protocol_gri305' NOT NULL,
	`scope1_total_kg` real DEFAULT 0 NOT NULL,
	`scope2_location_kg` real DEFAULT 0 NOT NULL,
	`scope2_market_kg` real DEFAULT 0 NOT NULL,
	`scope3_total_kg` real DEFAULT 0 NOT NULL,
	`net_emissions_kg` real DEFAULT 0 NOT NULL,
	`rec_offsets_deducted_kg` real DEFAULT 0 NOT NULL,
	`merkle_root` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`signed_by_user_id` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eco_esg_reports_report_id_unique` ON `eco_esg_reports` (`report_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_report_id` ON `eco_esg_reports` (`report_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_report_period` ON `eco_esg_reports` (`reporting_period`);--> statement-breakpoint
CREATE INDEX `idx_eco_report_status` ON `eco_esg_reports` (`status`);--> statement-breakpoint
CREATE TABLE `eco_ev_charging_stations` (
	`id` text PRIMARY KEY NOT NULL,
	`station_id` text NOT NULL,
	`facility_id` text NOT NULL,
	`name` text NOT NULL,
	`ocpp_id` text NOT NULL,
	`connector_type` text DEFAULT 'type2_combo_ccs' NOT NULL,
	`max_power_kw` real DEFAULT 50 NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`current_power_kw` real DEFAULT 0 NOT NULL,
	`is_v2g_enabled` integer DEFAULT true NOT NULL,
	`firmware_version` text DEFAULT 'v2.0.1' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eco_ev_charging_stations_station_id_unique` ON `eco_ev_charging_stations` (`station_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `eco_ev_charging_stations_ocpp_id_unique` ON `eco_ev_charging_stations` (`ocpp_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_ev_station_id` ON `eco_ev_charging_stations` (`station_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_ev_station_fac` ON `eco_ev_charging_stations` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_ev_ocpp` ON `eco_ev_charging_stations` (`ocpp_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_ev_status` ON `eco_ev_charging_stations` (`status`);--> statement-breakpoint
CREATE TABLE `eco_ev_fleet_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`station_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`vehicle_type` text DEFAULT 'bus' NOT NULL,
	`driver_id` text,
	`session_type` text DEFAULT 'smart_charge' NOT NULL,
	`start_soc_percent` real DEFAULT 40 NOT NULL,
	`current_soc_percent` real DEFAULT 40 NOT NULL,
	`target_soc_percent` real DEFAULT 85 NOT NULL,
	`energy_delivered_kwh` real DEFAULT 0 NOT NULL,
	`energy_discharged_kwh` real DEFAULT 0 NOT NULL,
	`departure_time` text,
	`status` text DEFAULT 'active' NOT NULL,
	`cost_savings` real DEFAULT 0 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eco_ev_fleet_sessions_session_id_unique` ON `eco_ev_fleet_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_ev_session_id` ON `eco_ev_fleet_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_ev_session_station` ON `eco_ev_fleet_sessions` (`station_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_ev_session_veh` ON `eco_ev_fleet_sessions` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_ev_session_status` ON `eco_ev_fleet_sessions` (`status`);--> statement-breakpoint
CREATE TABLE `eco_generation_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`name` text NOT NULL,
	`source_type` text DEFAULT 'solar_pv' NOT NULL,
	`peak_capacity_kw` real DEFAULT 100 NOT NULL,
	`efficiency_percent` real DEFAULT 21.5 NOT NULL,
	`tilt_angle` real DEFAULT 15 NOT NULL,
	`azimuth_angle` real DEFAULT 180 NOT NULL,
	`location_json` text DEFAULT '{}' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eco_generation_sources_source_id_unique` ON `eco_generation_sources` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_gen_source_id` ON `eco_generation_sources` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_gen_asset_id` ON `eco_generation_sources` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_gen_type` ON `eco_generation_sources` (`source_type`);--> statement-breakpoint
CREATE TABLE `eco_grid_tariffs` (
	`id` text PRIMARY KEY NOT NULL,
	`tariff_id` text NOT NULL,
	`name` text NOT NULL,
	`provider_name` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`tou_rates_json` text DEFAULT '[]' NOT NULL,
	`demand_charge_per_kw` real DEFAULT 15 NOT NULL,
	`feed_in_tariff_per_kwh` real DEFAULT 0.06 NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eco_grid_tariffs_tariff_id_unique` ON `eco_grid_tariffs` (`tariff_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_tariff_id` ON `eco_grid_tariffs` (`tariff_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_tariff_provider` ON `eco_grid_tariffs` (`provider_name`);--> statement-breakpoint
CREATE TABLE `eco_storage_batteries` (
	`id` text PRIMARY KEY NOT NULL,
	`battery_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`name` text NOT NULL,
	`chemistry` text DEFAULT 'lfp' NOT NULL,
	`capacity_kwh` real DEFAULT 500 NOT NULL,
	`max_power_kw` real DEFAULT 250 NOT NULL,
	`current_soc_percent` real DEFAULT 65 NOT NULL,
	`min_soc_percent` real DEFAULT 20 NOT NULL,
	`max_soc_percent` real DEFAULT 90 NOT NULL,
	`cycle_count` integer DEFAULT 0 NOT NULL,
	`health_status` text DEFAULT 'good' NOT NULL,
	`dispatch_mode` text DEFAULT 'arbitrage' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eco_storage_batteries_battery_id_unique` ON `eco_storage_batteries` (`battery_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_bat_id` ON `eco_storage_batteries` (`battery_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_bat_asset` ON `eco_storage_batteries` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_bat_mode` ON `eco_storage_batteries` (`dispatch_mode`);--> statement-breakpoint
CREATE TABLE `eco_telemetry_energy` (
	`id` text PRIMARY KEY NOT NULL,
	`telemetry_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`source_type` text DEFAULT 'smart_meter' NOT NULL,
	`power_kw` real DEFAULT 0 NOT NULL,
	`energy_kwh` real DEFAULT 0 NOT NULL,
	`voltage_v` real DEFAULT 400 NOT NULL,
	`current_a` real DEFAULT 0 NOT NULL,
	`power_factor` real DEFAULT 0.98 NOT NULL,
	`frequency_hz` real DEFAULT 50 NOT NULL,
	`soc_percent` real,
	`carbon_grams_per_kwh` real DEFAULT 350 NOT NULL,
	`recorded_at` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eco_telemetry_energy_telemetry_id_unique` ON `eco_telemetry_energy` (`telemetry_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_telem_id` ON `eco_telemetry_energy` (`telemetry_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_telem_asset` ON `eco_telemetry_energy` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_telem_type` ON `eco_telemetry_energy` (`source_type`);--> statement-breakpoint
CREATE INDEX `idx_eco_telem_time` ON `eco_telemetry_energy` (`recorded_at`);--> statement-breakpoint
CREATE TABLE `engage_analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`campaign_id` text,
	`message_id` text,
	`delivery_id` text,
	`recipient_id` text,
	`event_type` text NOT NULL,
	`channel` text DEFAULT 'email' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`timestamp` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `engage_analytics_events_event_id_unique` ON `engage_analytics_events` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_evt_id` ON `engage_analytics_events` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_evt_type` ON `engage_analytics_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_engage_evt_campaign` ON `engage_analytics_events` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `engage_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`session_id` text NOT NULL,
	`sender_type` text DEFAULT 'stakeholder' NOT NULL,
	`text` text NOT NULL,
	`rich_payload_data` text DEFAULT '{}' NOT NULL,
	`intent_confidence` real DEFAULT 1 NOT NULL,
	`sentiment_score` real DEFAULT 0 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `engage_chat_messages_message_id_unique` ON `engage_chat_messages` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_chat_msg_id` ON `engage_chat_messages` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_chat_msg_sesh` ON `engage_chat_messages` (`session_id`);--> statement-breakpoint
CREATE TABLE `engage_chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`stakeholder_id` text NOT NULL,
	`stakeholder_type` text DEFAULT 'student' NOT NULL,
	`channel` text DEFAULT 'web' NOT NULL,
	`active_intent` text,
	`context_slots_data` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'bot_active' NOT NULL,
	`assigned_agent_id` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`last_interaction_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `engage_chat_sessions_session_id_unique` ON `engage_chat_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_chat_sesh_id` ON `engage_chat_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_chat_stakeholder` ON `engage_chat_sessions` (`stakeholder_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_chat_status` ON `engage_chat_sessions` (`status`);--> statement-breakpoint
CREATE TABLE `engage_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`delivery_id` text NOT NULL,
	`message_id` text NOT NULL,
	`channel` text NOT NULL,
	`provider` text NOT NULL,
	`provider_message_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`failure_reason` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`dispatched_at` text DEFAULT (current_timestamp) NOT NULL,
	`delivered_at` text,
	`opened_at` text,
	`clicked_at` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `engage_deliveries_delivery_id_unique` ON `engage_deliveries` (`delivery_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_deliv_id` ON `engage_deliveries` (`delivery_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_deliv_msg` ON `engage_deliveries` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_deliv_status` ON `engage_deliveries` (`status`);--> statement-breakpoint
CREATE TABLE `engage_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`campaign_id` text,
	`template_id` text,
	`recipient_id` text NOT NULL,
	`recipient_type` text DEFAULT 'student' NOT NULL,
	`recipient_channel_address` text NOT NULL,
	`channel` text DEFAULT 'email' NOT NULL,
	`priority` text DEFAULT 'standard' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`personalized_data` text DEFAULT '{}' NOT NULL,
	`scheduled_at` text DEFAULT (current_timestamp) NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `engage_messages_message_id_unique` ON `engage_messages` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_msg_id` ON `engage_messages` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_msg_recipient` ON `engage_messages` (`recipient_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_msg_status` ON `engage_messages` (`status`);--> statement-breakpoint
CREATE TABLE `engage_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_id` text NOT NULL,
	`recipient_type` text DEFAULT 'student' NOT NULL,
	`channel_preferences` text DEFAULT '{}' NOT NULL,
	`category_subscriptions` text DEFAULT '{}' NOT NULL,
	`quiet_hours_start` text DEFAULT '21:00' NOT NULL,
	`quiet_hours_end` text DEFAULT '07:00' NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`is_unsubscribed_all` integer DEFAULT false NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `engage_preferences_recipient_id_unique` ON `engage_preferences` (`recipient_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_pref_recipient` ON `engage_preferences` (`recipient_id`);--> statement-breakpoint
CREATE TABLE `engage_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`channel` text DEFAULT 'email' NOT NULL,
	`subject_template` text,
	`body_template` text NOT NULL,
	`variables_schema` text DEFAULT '{}' NOT NULL,
	`brand_rules_data` text DEFAULT '{}' NOT NULL,
	`is_approved` integer DEFAULT false NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `engage_templates_template_id_unique` ON `engage_templates` (`template_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_tmpl_id` ON `engage_templates` (`template_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_tmpl_channel` ON `engage_templates` (`channel`);--> statement-breakpoint
CREATE TABLE `engage_translations` (
	`id` text PRIMARY KEY NOT NULL,
	`content_hash` text NOT NULL,
	`source_language` text DEFAULT 'en' NOT NULL,
	`target_language` text NOT NULL,
	`source_text` text NOT NULL,
	`translated_text` text NOT NULL,
	`is_human_verified` integer DEFAULT false NOT NULL,
	`verified_by` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `engage_translations_content_hash_unique` ON `engage_translations` (`content_hash`);--> statement-breakpoint
CREATE INDEX `idx_engage_trans_hash` ON `engage_translations` (`content_hash`);--> statement-breakpoint
CREATE INDEX `idx_engage_trans_lang` ON `engage_translations` (`target_language`);--> statement-breakpoint
CREATE TABLE `engage_workflow_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`current_step_index` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`state_data` text DEFAULT '{}' NOT NULL,
	`next_execution_time` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`started_at` text DEFAULT (current_timestamp) NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `engage_workflow_runs_run_id_unique` ON `engage_workflow_runs` (`run_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_run_id` ON `engage_workflow_runs` (`run_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_run_wf` ON `engage_workflow_runs` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_run_status` ON `engage_workflow_runs` (`status`);--> statement-breakpoint
CREATE TABLE `engage_workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`name` text NOT NULL,
	`trigger_event` text NOT NULL,
	`trigger_condition_data` text DEFAULT '{}' NOT NULL,
	`steps_data` text DEFAULT '[]' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `engage_workflows_workflow_id_unique` ON `engage_workflows` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_wf_id` ON `engage_workflows` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_wf_trigger` ON `engage_workflows` (`trigger_event`);--> statement-breakpoint
CREATE TABLE `export_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`user_id` text NOT NULL,
	`job_type` text NOT NULL,
	`format` text DEFAULT 'csv' NOT NULL,
	`filter_params_json` text,
	`selected_columns_json` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`total_records` integer DEFAULT 0 NOT NULL,
	`processed_records` integer DEFAULT 0 NOT NULL,
	`download_url` text,
	`file_size_bytes` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`download_token` text,
	`expires_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_export_jobs_inst` ON `export_jobs` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_export_jobs_user` ON `export_jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_export_jobs_status` ON `export_jobs` (`status`);--> statement-breakpoint
CREATE TABLE `export_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`name` text NOT NULL,
	`entity_type` text NOT NULL,
	`column_mapping_json` text NOT NULL,
	`default_format` text DEFAULT 'csv' NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`created_by_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_export_templates_inst` ON `export_templates` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_export_templates_entity` ON `export_templates` (`entity_type`);--> statement-breakpoint
CREATE TABLE `facility_anomaly_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`alert_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`sensor_id` text,
	`alert_type` text DEFAULT 'sensor_drift' NOT NULL,
	`severity` text DEFAULT 'medium' NOT NULL,
	`anomaly_score` real DEFAULT 0.5 NOT NULL,
	`predicted_failure_mode` text,
	`estimated_rul_hours` real,
	`root_cause_hypothesis` text,
	`status` text DEFAULT 'open' NOT NULL,
	`acknowledged_by_staff_id` text,
	`acknowledged_at` text,
	`resolution_notes` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`equipment_id`) REFERENCES `facility_equipment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sensor_id`) REFERENCES `facility_telemetry_sensors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`acknowledged_by_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facility_anomaly_alerts_alert_id_unique` ON `facility_anomaly_alerts` (`alert_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_alert_id` ON `facility_anomaly_alerts` (`alert_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_alert_equip` ON `facility_anomaly_alerts` (`equipment_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_alert_severity` ON `facility_anomaly_alerts` (`severity`);--> statement-breakpoint
CREATE INDEX `idx_facility_alert_status` ON `facility_anomaly_alerts` (`status`);--> statement-breakpoint
CREATE TABLE `facility_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`prev_merkle_root` text DEFAULT '' NOT NULL,
	`merkle_root` text DEFAULT '' NOT NULL,
	`timestamp` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facility_audit_logs_audit_id_unique` ON `facility_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_audit_id` ON `facility_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_audit_action` ON `facility_audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_facility_audit_entity` ON `facility_audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_audit_time` ON `facility_audit_logs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `facility_contractor_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`contractor_id` text NOT NULL,
	`company_name` text NOT NULL,
	`contact_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`specializations_json` text NOT NULL,
	`rate_per_hour` real DEFAULT 75 NOT NULL,
	`sla_emergency_hours` integer DEFAULT 2 NOT NULL,
	`sla_routine_hours` integer DEFAULT 24 NOT NULL,
	`performance_rating` real DEFAULT 5 NOT NULL,
	`active_insurance_expiry` text,
	`status` text DEFAULT 'active' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facility_contractor_registry_contractor_id_unique` ON `facility_contractor_registry` (`contractor_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_contractor_id` ON `facility_contractor_registry` (`contractor_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_contractor_status` ON `facility_contractor_registry` (`status`);--> statement-breakpoint
CREATE INDEX `idx_facility_contractor_rating` ON `facility_contractor_registry` (`performance_rating`);--> statement-breakpoint
CREATE TABLE `facility_equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_tag` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'hvac' NOT NULL,
	`building_id` text NOT NULL,
	`floor_id` text NOT NULL,
	`room_id` text,
	`spatial_coordinates_json` text,
	`manufacturer` text,
	`model_number` text,
	`serial_number` text,
	`install_date` text,
	`warranty_expiry` text,
	`status` text DEFAULT 'operational' NOT NULL,
	`criticality` text DEFAULT 'medium' NOT NULL,
	`health_score` real DEFAULT 100 NOT NULL,
	`metadata_json` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facility_equipment_asset_tag_unique` ON `facility_equipment` (`asset_tag`);--> statement-breakpoint
CREATE INDEX `idx_facility_equip_asset_tag` ON `facility_equipment` (`asset_tag`);--> statement-breakpoint
CREATE INDEX `idx_facility_equip_category` ON `facility_equipment` (`category`);--> statement-breakpoint
CREATE INDEX `idx_facility_equip_building` ON `facility_equipment` (`building_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_equip_status` ON `facility_equipment` (`status`);--> statement-breakpoint
CREATE INDEX `idx_facility_equip_institution` ON `facility_equipment` (`institution_id`);--> statement-breakpoint
CREATE TABLE `facility_parts_inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`part_number` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'filters' NOT NULL,
	`quantity_on_hand` integer DEFAULT 0 NOT NULL,
	`quantity_reserved` integer DEFAULT 0 NOT NULL,
	`reorder_threshold` integer DEFAULT 5 NOT NULL,
	`target_stock_level` integer DEFAULT 20 NOT NULL,
	`unit_cost` real DEFAULT 0 NOT NULL,
	`supplier_name` text,
	`lead_time_days` integer DEFAULT 3 NOT NULL,
	`compatible_equipment_categories` text,
	`location_bin` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facility_parts_inventory_part_number_unique` ON `facility_parts_inventory` (`part_number`);--> statement-breakpoint
CREATE INDEX `idx_facility_part_number` ON `facility_parts_inventory` (`part_number`);--> statement-breakpoint
CREATE INDEX `idx_facility_part_category` ON `facility_parts_inventory` (`category`);--> statement-breakpoint
CREATE INDEX `idx_facility_part_stock` ON `facility_parts_inventory` (`quantity_on_hand`);--> statement-breakpoint
CREATE TABLE `facility_predictive_models` (
	`id` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	`equipment_category` text NOT NULL,
	`model_type` text NOT NULL,
	`version` text DEFAULT '1.0.0' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`accuracy_metrics_json` text,
	`hyperparameters_json` text,
	`weights_path` text,
	`last_trained_at` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facility_predictive_models_model_id_unique` ON `facility_predictive_models` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_model_id` ON `facility_predictive_models` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_model_category` ON `facility_predictive_models` (`equipment_category`);--> statement-breakpoint
CREATE INDEX `idx_facility_model_type` ON `facility_predictive_models` (`model_type`);--> statement-breakpoint
CREATE TABLE `facility_sensor_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`reading_id` text NOT NULL,
	`sensor_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`reading_value` real NOT NULL,
	`unit` text DEFAULT 'celsius' NOT NULL,
	`anomaly_score` real DEFAULT 0 NOT NULL,
	`is_anomaly` integer DEFAULT false NOT NULL,
	`raw_payload_json` text,
	`recorded_at` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`sensor_id`) REFERENCES `facility_telemetry_sensors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`equipment_id`) REFERENCES `facility_equipment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facility_sensor_readings_reading_id_unique` ON `facility_sensor_readings` (`reading_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_reading_id` ON `facility_sensor_readings` (`reading_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_reading_sensor` ON `facility_sensor_readings` (`sensor_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_reading_equip` ON `facility_sensor_readings` (`equipment_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_reading_recorded` ON `facility_sensor_readings` (`recorded_at`);--> statement-breakpoint
CREATE INDEX `idx_facility_reading_anomaly` ON `facility_sensor_readings` (`is_anomaly`);--> statement-breakpoint
CREATE TABLE `facility_telemetry_sensors` (
	`id` text PRIMARY KEY NOT NULL,
	`sensor_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`sensor_type` text DEFAULT 'temperature' NOT NULL,
	`sensor_model` text,
	`protocol` text DEFAULT 'mqtt' NOT NULL,
	`endpoint_url` text,
	`polling_interval_sec` integer DEFAULT 60 NOT NULL,
	`unit` text DEFAULT 'celsius' NOT NULL,
	`min_threshold` real,
	`max_threshold` real,
	`deadband_percent` real DEFAULT 1.5 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_reading_value` real,
	`last_reading_at` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`equipment_id`) REFERENCES `facility_equipment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facility_telemetry_sensors_sensor_id_unique` ON `facility_telemetry_sensors` (`sensor_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_sensor_id` ON `facility_telemetry_sensors` (`sensor_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_sensor_equip` ON `facility_telemetry_sensors` (`equipment_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_sensor_type` ON `facility_telemetry_sensors` (`sensor_type`);--> statement-breakpoint
CREATE INDEX `idx_facility_sensor_status` ON `facility_telemetry_sensors` (`status`);--> statement-breakpoint
CREATE TABLE `facility_work_order_parts` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_id` text NOT NULL,
	`part_id` text NOT NULL,
	`quantity_required` integer DEFAULT 1 NOT NULL,
	`quantity_used` integer DEFAULT 0 NOT NULL,
	`unit_cost_at_time` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'allocated' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `facility_work_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`part_id`) REFERENCES `facility_parts_inventory`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_facility_wopart_wo` ON `facility_work_order_parts` (`work_order_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_wopart_part` ON `facility_work_order_parts` (`part_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_wopart_status` ON `facility_work_order_parts` (`status`);--> statement-breakpoint
CREATE TABLE `facility_work_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_number` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`priority` text DEFAULT 'routine' NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`equipment_id` text,
	`anomaly_alert_id` text,
	`building_id` text NOT NULL,
	`floor_id` text NOT NULL,
	`room_id` text,
	`spatial_route_data_json` text,
	`assigned_technician_id` text,
	`assigned_contractor_id` text,
	`estimated_duration_minutes` integer DEFAULT 60 NOT NULL,
	`actual_duration_minutes` integer,
	`scheduled_start_time` text,
	`scheduled_end_time` text,
	`started_at` text,
	`completed_at` text,
	`verified_at` text,
	`verified_by_staff_id` text,
	`resolution_summary` text,
	`technician_signature` text,
	`photo_evidence_json` text,
	`merkle_audit_hash` text DEFAULT '' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`equipment_id`) REFERENCES `facility_equipment`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`anomaly_alert_id`) REFERENCES `facility_anomaly_alerts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_technician_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`verified_by_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facility_work_orders_work_order_number_unique` ON `facility_work_orders` (`work_order_number`);--> statement-breakpoint
CREATE INDEX `idx_facility_wo_number` ON `facility_work_orders` (`work_order_number`);--> statement-breakpoint
CREATE INDEX `idx_facility_wo_equip` ON `facility_work_orders` (`equipment_id`);--> statement-breakpoint
CREATE INDEX `idx_facility_wo_status` ON `facility_work_orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_facility_wo_priority` ON `facility_work_orders` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_facility_wo_tech` ON `facility_work_orders` (`assigned_technician_id`);--> statement-breakpoint
CREATE TABLE `fee_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`timestamp` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fee_audit_logs_audit_id_unique` ON `fee_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_audit_id` ON `fee_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_audit_action` ON `fee_audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_fee_audit_entity` ON `fee_audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_audit_time` ON `fee_audit_logs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `fee_concessions` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`student_id` text NOT NULL,
	`scholarship_id` text,
	`allocation_id` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`reason` text NOT NULL,
	`supporting_doc_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`applied_by_id` text NOT NULL,
	`approved_by_id` text,
	`decision_notes` text,
	`decision_date` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scholarship_id`) REFERENCES `fee_scholarships`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`allocation_id`) REFERENCES `fee_student_allocations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`applied_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_fee_conc_inst` ON `fee_concessions` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_conc_student` ON `fee_concessions` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_conc_alloc` ON `fee_concessions` (`allocation_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_conc_status` ON `fee_concessions` (`status`);--> statement-breakpoint
CREATE TABLE `fee_counter_registers` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`cashier_id` text NOT NULL,
	`counter_name` text NOT NULL,
	`opening_float` real DEFAULT 0 NOT NULL,
	`closing_cash_declared` real,
	`system_cash_total` real DEFAULT 0 NOT NULL,
	`system_pos_total` real DEFAULT 0 NOT NULL,
	`system_cheque_total` real DEFAULT 0 NOT NULL,
	`cash_drops_total` real DEFAULT 0 NOT NULL,
	`variance_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`opened_at` text DEFAULT (current_timestamp) NOT NULL,
	`closed_at` text,
	`supervisor_id` text,
	`supervisor_notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cashier_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`supervisor_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_fee_count_inst` ON `fee_counter_registers` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_count_cashier` ON `fee_counter_registers` (`cashier_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_count_status` ON `fee_counter_registers` (`status`);--> statement-breakpoint
CREATE TABLE `fee_defaulter_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`student_id` text NOT NULL,
	`allocation_id` text NOT NULL,
	`aging_days` integer DEFAULT 0 NOT NULL,
	`aging_bucket` text DEFAULT 'current' NOT NULL,
	`overdue_amount` real DEFAULT 0 NOT NULL,
	`risk_score` integer DEFAULT 0 NOT NULL,
	`action_taken` text DEFAULT 'reminder_sent' NOT NULL,
	`channel` text DEFAULT 'whatsapp',
	`dispatched_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`allocation_id`) REFERENCES `fee_student_allocations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_fee_def_inst` ON `fee_defaulter_logs` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_def_student` ON `fee_defaulter_logs` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_def_bucket` ON `fee_defaulter_logs` (`aging_bucket`);--> statement-breakpoint
CREATE TABLE `fee_installments` (
	`id` text PRIMARY KEY NOT NULL,
	`allocation_id` text NOT NULL,
	`installment_number` integer DEFAULT 1 NOT NULL,
	`title` text NOT NULL,
	`due_date` text NOT NULL,
	`grace_period_days` integer DEFAULT 7 NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`balance_amount` real DEFAULT 0 NOT NULL,
	`fine_amount` real DEFAULT 0 NOT NULL,
	`fine_waived_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`last_payment_date` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`allocation_id`) REFERENCES `fee_student_allocations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_fee_inst_alloc` ON `fee_installments` (`allocation_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_inst_due` ON `fee_installments` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_fee_inst_status` ON `fee_installments` (`status`);--> statement-breakpoint
CREATE TABLE `fee_payment_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`installment_id` text,
	`component_id` text,
	`allocated_amount` real DEFAULT 0 NOT NULL,
	`gl_debit_account` text DEFAULT 'GL:1100-BANK_CASH' NOT NULL,
	`gl_credit_account` text DEFAULT 'GL:1200-FEE_RECEIVABLE' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `fee_payments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`installment_id`) REFERENCES `fee_installments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`component_id`) REFERENCES `fee_structure_components`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_fee_tx_payment` ON `fee_payment_transactions` (`payment_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_tx_installment` ON `fee_payment_transactions` (`installment_id`);--> statement-breakpoint
CREATE TABLE `fee_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_number` text NOT NULL,
	`institution_id` text NOT NULL,
	`allocation_id` text NOT NULL,
	`student_id` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`fine_amount` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`net_amount` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`payment_method` text NOT NULL,
	`payment_status` text DEFAULT 'completed' NOT NULL,
	`gateway_order_id` text,
	`gateway_payment_id` text,
	`transaction_reference` text,
	`counter_register_id` text,
	`payer_name` text,
	`payer_phone` text,
	`payer_email` text,
	`receipt_number` text,
	`paid_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`allocation_id`) REFERENCES `fee_student_allocations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fee_payments_payment_number_unique` ON `fee_payments` (`payment_number`);--> statement-breakpoint
CREATE INDEX `idx_fee_pay_inst` ON `fee_payments` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_pay_alloc` ON `fee_payments` (`allocation_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_pay_student` ON `fee_payments` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_pay_number` ON `fee_payments` (`payment_number`);--> statement-breakpoint
CREATE INDEX `idx_fee_pay_status` ON `fee_payments` (`payment_status`);--> statement-breakpoint
CREATE TABLE `fee_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_number` text NOT NULL,
	`institution_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`student_id` text NOT NULL,
	`doc_generated_record_id` text,
	`receipt_hash` text NOT NULL,
	`signature` text NOT NULL,
	`qr_payload` text NOT NULL,
	`receipt_html` text,
	`receipt_pdf_url` text,
	`download_count` integer DEFAULT 0 NOT NULL,
	`issued_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_id`) REFERENCES `fee_payments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fee_receipts_receipt_number_unique` ON `fee_receipts` (`receipt_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `fee_receipts_payment_id_unique` ON `fee_receipts` (`payment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fee_receipts_receipt_hash_unique` ON `fee_receipts` (`receipt_hash`);--> statement-breakpoint
CREATE INDEX `idx_fee_rcpt_inst` ON `fee_receipts` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_rcpt_number` ON `fee_receipts` (`receipt_number`);--> statement-breakpoint
CREATE INDEX `idx_fee_rcpt_hash` ON `fee_receipts` (`receipt_hash`);--> statement-breakpoint
CREATE INDEX `idx_fee_rcpt_student` ON `fee_receipts` (`student_id`);--> statement-breakpoint
CREATE TABLE `fee_reconciliation_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_number` text NOT NULL,
	`institution_id` text NOT NULL,
	`source_type` text DEFAULT 'bank_statement' NOT NULL,
	`statement_date` text NOT NULL,
	`total_transactions` integer DEFAULT 0 NOT NULL,
	`matched_transactions` integer DEFAULT 0 NOT NULL,
	`unmatched_transactions` integer DEFAULT 0 NOT NULL,
	`total_settled_amount` real DEFAULT 0 NOT NULL,
	`fee_charges_amount` real DEFAULT 0 NOT NULL,
	`net_payout_amount` real DEFAULT 0 NOT NULL,
	`discrepancy_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'reconciled' NOT NULL,
	`reconciled_by_id` text,
	`reconciled_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reconciled_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fee_reconciliation_batches_batch_number_unique` ON `fee_reconciliation_batches` (`batch_number`);--> statement-breakpoint
CREATE INDEX `idx_fee_recon_inst` ON `fee_reconciliation_batches` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_recon_batch` ON `fee_reconciliation_batches` (`batch_number`);--> statement-breakpoint
CREATE INDEX `idx_fee_recon_status` ON `fee_reconciliation_batches` (`status`);--> statement-breakpoint
CREATE TABLE `fee_scholarships` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`category` text DEFAULT 'merit' NOT NULL,
	`discount_type` text DEFAULT 'percentage' NOT NULL,
	`discount_value` real DEFAULT 0 NOT NULL,
	`target_component_type` text DEFAULT 'tuition',
	`total_budget` real DEFAULT 0 NOT NULL,
	`disbursed_amount` real DEFAULT 0 NOT NULL,
	`academic_year` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_fee_sch_inst` ON `fee_scholarships` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_sch_code` ON `fee_scholarships` (`code`);--> statement-breakpoint
CREATE INDEX `idx_fee_sch_year` ON `fee_scholarships` (`academic_year`);--> statement-breakpoint
CREATE TABLE `fee_structure_components` (
	`id` text PRIMARY KEY NOT NULL,
	`fee_structure_id` text NOT NULL,
	`name` text NOT NULL,
	`component_type` text DEFAULT 'tuition' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`is_mandatory` integer DEFAULT true NOT NULL,
	`is_refundable` integer DEFAULT false NOT NULL,
	`tax_rate_percent` real DEFAULT 0 NOT NULL,
	`gl_account_code` text DEFAULT 'GL:4100-FEE_REVENUE' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`fee_structure_id`) REFERENCES `fee_structures`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_fee_components_struct` ON `fee_structure_components` (`fee_structure_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_components_type` ON `fee_structure_components` (`component_type`);--> statement-breakpoint
CREATE TABLE `fee_structures` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`academic_year` text NOT NULL,
	`program_id` text,
	`grade_level` text,
	`term` text DEFAULT 'annual' NOT NULL,
	`quota` text DEFAULT 'general' NOT NULL,
	`residential_type` text DEFAULT 'day_scholar' NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata_json` text,
	`created_by_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_fee_structures_inst` ON `fee_structures` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_structures_code` ON `fee_structures` (`code`);--> statement-breakpoint
CREATE INDEX `idx_fee_structures_year` ON `fee_structures` (`academic_year`);--> statement-breakpoint
CREATE TABLE `fee_student_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`student_id` text NOT NULL,
	`fee_structure_id` text NOT NULL,
	`academic_year` text NOT NULL,
	`base_amount` real DEFAULT 0 NOT NULL,
	`concession_amount` real DEFAULT 0 NOT NULL,
	`net_payable_amount` real DEFAULT 0 NOT NULL,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`balance_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'unpaid' NOT NULL,
	`allocation_date` text DEFAULT (current_timestamp) NOT NULL,
	`due_date` text,
	`remarks` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fee_structure_id`) REFERENCES `fee_structures`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_fee_alloc_inst` ON `fee_student_allocations` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_alloc_student` ON `fee_student_allocations` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_alloc_struct` ON `fee_student_allocations` (`fee_structure_id`);--> statement-breakpoint
CREATE INDEX `idx_fee_alloc_status` ON `fee_student_allocations` (`status`);--> statement-breakpoint
CREATE TABLE `forensic_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text DEFAULT 'default' NOT NULL,
	`snapshot_type` text DEFAULT 'SCHEDULED' NOT NULL,
	`storage_uri` text NOT NULL,
	`checksum_sha256` text NOT NULL,
	`signature` text,
	`signer_public_key` text,
	`entity_counts` text,
	`metadata` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`retention_tier` text DEFAULT 'HOT' NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_forensic_snapshots_tenant` ON `forensic_snapshots` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_forensic_snapshots_status` ON `forensic_snapshots` (`status`);--> statement-breakpoint
CREATE INDEX `idx_forensic_snapshots_tier` ON `forensic_snapshots` (`retention_tier`);--> statement-breakpoint
CREATE INDEX `idx_forensic_snapshots_created_at` ON `forensic_snapshots` (`created_at`);--> statement-breakpoint
CREATE TABLE `identity_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`dpop_thumbprint` text,
	`dpop_migrated` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ip_allowlist` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text DEFAULT 'default' NOT NULL,
	`ip_address` text NOT NULL,
	`description` text,
	`added_by` text DEFAULT 'admin' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ip_allowlist_tenant` ON `ip_allowlist` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_ip_allowlist_ip` ON `ip_allowlist` (`ip_address`);--> statement-breakpoint
CREATE TABLE `ip_quarantines` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text DEFAULT 'default' NOT NULL,
	`ip_address` text NOT NULL,
	`cidr_mask` text DEFAULT '/32',
	`is_subnet` integer DEFAULT false NOT NULL,
	`reason` text NOT NULL,
	`threat_score` integer DEFAULT 100 NOT NULL,
	`banned_by` text DEFAULT 'system' NOT NULL,
	`expires_at` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ip_quarantines_tenant` ON `ip_quarantines` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_ip_quarantines_ip` ON `ip_quarantines` (`ip_address`);--> statement-breakpoint
CREATE INDEX `idx_ip_quarantines_expires` ON `ip_quarantines` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_ip_quarantines_active` ON `ip_quarantines` (`is_active`);--> statement-breakpoint
CREATE TABLE `km_advising_interventions` (
	`id` text PRIMARY KEY NOT NULL,
	`intervention_id` text NOT NULL,
	`student_id` text NOT NULL,
	`risk_tier` text DEFAULT 'nominal' NOT NULL,
	`reason` text NOT NULL,
	`recommended_actions` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`assigned_advisor_id` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `km_advising_interventions_intervention_id_unique` ON `km_advising_interventions` (`intervention_id`);--> statement-breakpoint
CREATE INDEX `idx_km_interv_id` ON `km_advising_interventions` (`intervention_id`);--> statement-breakpoint
CREATE INDEX `idx_km_interv_student` ON `km_advising_interventions` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_km_interv_risk` ON `km_advising_interventions` (`risk_tier`);--> statement-breakpoint
CREATE TABLE `km_advising_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`advisor_id` text,
	`mode` text DEFAULT 'copilot_autonomous' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`summary` text,
	`context_data` text DEFAULT '{}' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `km_advising_sessions_session_id_unique` ON `km_advising_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_km_adv_sesh_id` ON `km_advising_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_km_adv_student` ON `km_advising_sessions` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_km_adv_status` ON `km_advising_sessions` (`status`);--> statement-breakpoint
CREATE TABLE `km_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`chunk_id` text NOT NULL,
	`document_id` text NOT NULL,
	`chunk_index` integer DEFAULT 0 NOT NULL,
	`content` text NOT NULL,
	`token_count` integer DEFAULT 0 NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `km_chunks_chunk_id_unique` ON `km_chunks` (`chunk_id`);--> statement-breakpoint
CREATE INDEX `idx_km_chunk_id` ON `km_chunks` (`chunk_id`);--> statement-breakpoint
CREATE INDEX `idx_km_chunk_doc` ON `km_chunks` (`document_id`);--> statement-breakpoint
CREATE TABLE `km_course_prerequisites` (
	`id` text PRIMARY KEY NOT NULL,
	`prereq_id` text NOT NULL,
	`course_code` text NOT NULL,
	`required_course_code` text NOT NULL,
	`is_hard_prerequisite` integer DEFAULT true NOT NULL,
	`min_grade_required` text DEFAULT 'C' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `km_course_prerequisites_prereq_id_unique` ON `km_course_prerequisites` (`prereq_id`);--> statement-breakpoint
CREATE INDEX `idx_km_prereq_id` ON `km_course_prerequisites` (`prereq_id`);--> statement-breakpoint
CREATE INDEX `idx_km_prereq_course` ON `km_course_prerequisites` (`course_code`);--> statement-breakpoint
CREATE INDEX `idx_km_prereq_req` ON `km_course_prerequisites` (`required_course_code`);--> statement-breakpoint
CREATE TABLE `km_degree_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`department_id` text,
	`total_credits_required` integer DEFAULT 120 NOT NULL,
	`min_gpa` real DEFAULT 2 NOT NULL,
	`rules_data` text DEFAULT '{}' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `km_degree_programs_program_id_unique` ON `km_degree_programs` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_km_prog_id` ON `km_degree_programs` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_km_prog_code` ON `km_degree_programs` (`code`);--> statement-breakpoint
CREATE TABLE `km_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT 'academic' NOT NULL,
	`file_type` text DEFAULT 'pdf' NOT NULL,
	`content_hash` text NOT NULL,
	`raw_text` text NOT NULL,
	`status` text DEFAULT 'indexed' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `km_documents_document_id_unique` ON `km_documents` (`document_id`);--> statement-breakpoint
CREATE INDEX `idx_km_doc_id` ON `km_documents` (`document_id`);--> statement-breakpoint
CREATE INDEX `idx_km_doc_category` ON `km_documents` (`category`);--> statement-breakpoint
CREATE INDEX `idx_km_doc_hash` ON `km_documents` (`content_hash`);--> statement-breakpoint
CREATE TABLE `km_embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`embedding_id` text NOT NULL,
	`chunk_id` text NOT NULL,
	`model` text DEFAULT 'text-embedding-3-small' NOT NULL,
	`dimensions` integer DEFAULT 1536 NOT NULL,
	`vector_data` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `km_embeddings_embedding_id_unique` ON `km_embeddings` (`embedding_id`);--> statement-breakpoint
CREATE INDEX `idx_km_embed_id` ON `km_embeddings` (`embedding_id`);--> statement-breakpoint
CREATE INDEX `idx_km_embed_chunk` ON `km_embeddings` (`chunk_id`);--> statement-breakpoint
CREATE TABLE `km_entities` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`code` text,
	`description` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `km_entities_entity_id_unique` ON `km_entities` (`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_km_entity_id` ON `km_entities` (`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_km_entity_type` ON `km_entities` (`type`);--> statement-breakpoint
CREATE INDEX `idx_km_entity_code` ON `km_entities` (`code`);--> statement-breakpoint
CREATE TABLE `km_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`relation_id` text NOT NULL,
	`source_entity_id` text NOT NULL,
	`target_entity_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`properties` text DEFAULT '{}' NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `km_relations_relation_id_unique` ON `km_relations` (`relation_id`);--> statement-breakpoint
CREATE INDEX `idx_km_rel_id` ON `km_relations` (`relation_id`);--> statement-breakpoint
CREATE INDEX `idx_km_rel_src` ON `km_relations` (`source_entity_id`);--> statement-breakpoint
CREATE INDEX `idx_km_rel_tgt` ON `km_relations` (`target_entity_id`);--> statement-breakpoint
CREATE INDEX `idx_km_rel_type` ON `km_relations` (`relation_type`);--> statement-breakpoint
CREATE TABLE `km_translation_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`content_hash` text NOT NULL,
	`source_language` text DEFAULT 'en' NOT NULL,
	`target_language` text NOT NULL,
	`source_text` text NOT NULL,
	`translated_text` text NOT NULL,
	`provider` text DEFAULT 'google_cloud' NOT NULL,
	`quality_score` real DEFAULT 0.9 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `km_translation_cache_content_hash_unique` ON `km_translation_cache` (`content_hash`);--> statement-breakpoint
CREATE INDEX `idx_km_trans_hash` ON `km_translation_cache` (`content_hash`);--> statement-breakpoint
CREATE INDEX `idx_km_trans_lang` ON `km_translation_cache` (`target_language`);--> statement-breakpoint
CREATE TABLE `mobile_device_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`device_token` text NOT NULL,
	`platform` text DEFAULT 'android' NOT NULL,
	`device_model` text,
	`app_version` text,
	`isActive` integer DEFAULT true NOT NULL,
	`last_seen_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mobile_device_tokens_device_token_unique` ON `mobile_device_tokens` (`device_token`);--> statement-breakpoint
CREATE INDEX `idx_mobile_device_user` ON `mobile_device_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_mobile_device_inst` ON `mobile_device_tokens` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_mobile_device_token` ON `mobile_device_tokens` (`device_token`);--> statement-breakpoint
CREATE TABLE `mobile_push_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`sync_event_id` text,
	`recipient_user_id` text NOT NULL,
	`device_token_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`data_payload_json` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`delivered_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sync_event_id`) REFERENCES `mobile_sync_events`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`device_token_id`) REFERENCES `mobile_device_tokens`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_mobile_push_inst` ON `mobile_push_logs` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_mobile_push_user` ON `mobile_push_logs` (`recipient_user_id`);--> statement-breakpoint
CREATE INDEX `idx_mobile_push_status` ON `mobile_push_logs` (`status`);--> statement-breakpoint
CREATE TABLE `mobile_sync_events` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`event_type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`target_audience` text DEFAULT 'all' NOT NULL,
	`target_id` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_mobile_sync_inst` ON `mobile_sync_events` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_mobile_sync_type` ON `mobile_sync_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_mobile_sync_time` ON `mobile_sync_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `neuro_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`prev_merkle_root` text DEFAULT '' NOT NULL,
	`merkle_root` text DEFAULT '' NOT NULL,
	`timestamp` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_audit_logs_audit_id_unique` ON `neuro_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_audit_id` ON `neuro_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_audit_action` ON `neuro_audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_neuro_audit_entity` ON `neuro_audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_audit_time` ON `neuro_audit_logs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `neuro_billing_ledger_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`account_id` text NOT NULL,
	`job_id` text,
	`transaction_type` text DEFAULT 'compute_debit' NOT NULL,
	`tokens_amount` real NOT NULL,
	`gpu_seconds` integer DEFAULT 0 NOT NULL,
	`gpu_model_rate_applied` text,
	`debit_account_code` text DEFAULT 'EXPENSE:GRANT_COMPUTE' NOT NULL,
	`credit_account_code` text DEFAULT 'REVENUE:HPC_CLUSTER_OPS' NOT NULL,
	`balance_after_tokens` real NOT NULL,
	`description` text NOT NULL,
	`merkle_leaf_hash` text DEFAULT '' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `neuro_compute_billing_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `neuro_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_billing_ledger_transactions_transaction_id_unique` ON `neuro_billing_ledger_transactions` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_ledger_tx_id` ON `neuro_billing_ledger_transactions` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_ledger_account` ON `neuro_billing_ledger_transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_ledger_job` ON `neuro_billing_ledger_transactions` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_ledger_type` ON `neuro_billing_ledger_transactions` (`transaction_type`);--> statement-breakpoint
CREATE TABLE `neuro_cloud_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_key` text NOT NULL,
	`provider_name` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`api_endpoint` text,
	`region` text DEFAULT 'us-east-1' NOT NULL,
	`max_spot_instances` integer DEFAULT 10 NOT NULL,
	`current_active_instances` integer DEFAULT 0 NOT NULL,
	`max_price_usd_per_hour` real DEFAULT 4.5 NOT NULL,
	`auto_arbitrage_threshold_delta` real DEFAULT 0.25 NOT NULL,
	`interruption_grace_seconds` integer DEFAULT 120 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_cloud_providers_provider_key_unique` ON `neuro_cloud_providers` (`provider_key`);--> statement-breakpoint
CREATE INDEX `idx_neuro_provider_key` ON `neuro_cloud_providers` (`provider_key`);--> statement-breakpoint
CREATE INDEX `idx_neuro_provider_enabled` ON `neuro_cloud_providers` (`is_enabled`);--> statement-breakpoint
CREATE TABLE `neuro_clusters` (
	`id` text PRIMARY KEY NOT NULL,
	`cluster_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`cluster_type` text DEFAULT 'hybrid' NOT NULL,
	`scheduler_type` text DEFAULT 'slurm' NOT NULL,
	`region` text DEFAULT 'local-dc-1' NOT NULL,
	`total_nodes` integer DEFAULT 0 NOT NULL,
	`total_gpus` integer DEFAULT 0 NOT NULL,
	`active_jobs_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`network_topology` text DEFAULT 'infiniband_fat_tree' NOT NULL,
	`config_json` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_clusters_cluster_id_unique` ON `neuro_clusters` (`cluster_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_cluster_id` ON `neuro_clusters` (`cluster_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_cluster_status` ON `neuro_clusters` (`status`);--> statement-breakpoint
CREATE INDEX `idx_neuro_cluster_type` ON `neuro_clusters` (`cluster_type`);--> statement-breakpoint
CREATE TABLE `neuro_compute_billing_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_number` text NOT NULL,
	`department_id` text NOT NULL,
	`grant_id` text,
	`grant_title` text,
	`principal_investigator_id` text,
	`token_balance` real DEFAULT 1000 NOT NULL,
	`token_allocated_total` real DEFAULT 1000 NOT NULL,
	`token_spent_total` real DEFAULT 0 NOT NULL,
	`soft_cap_percent` real DEFAULT 80 NOT NULL,
	`hard_cap_tokens` real DEFAULT 1000 NOT NULL,
	`is_hard_cap_locked` integer DEFAULT false NOT NULL,
	`expires_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`principal_investigator_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_compute_billing_accounts_account_number_unique` ON `neuro_compute_billing_accounts` (`account_number`);--> statement-breakpoint
CREATE INDEX `idx_neuro_billing_account` ON `neuro_compute_billing_accounts` (`account_number`);--> statement-breakpoint
CREATE INDEX `idx_neuro_billing_dept` ON `neuro_compute_billing_accounts` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_billing_grant` ON `neuro_compute_billing_accounts` (`grant_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_billing_status` ON `neuro_compute_billing_accounts` (`status`);--> statement-breakpoint
CREATE TABLE `neuro_dataset_provenance` (
	`id` text PRIMARY KEY NOT NULL,
	`dataset_id` text NOT NULL,
	`name` text NOT NULL,
	`version` text DEFAULT '1.0.0' NOT NULL,
	`description` text,
	`source_uri` text NOT NULL,
	`file_count` integer DEFAULT 1 NOT NULL,
	`total_size_bytes` real DEFAULT 0 NOT NULL,
	`manifest_sha256` text NOT NULL,
	`root_merkle_hash` text NOT NULL,
	`license` text DEFAULT 'MIT' NOT NULL,
	`nsf_nih_grant_tagged` text,
	`contains_pii_phi` integer DEFAULT false NOT NULL,
	`is_sealed` integer DEFAULT false NOT NULL,
	`sealed_at` text,
	`sealed_by_user_id` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`sealed_by_user_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_dataset_provenance_dataset_id_unique` ON `neuro_dataset_provenance` (`dataset_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_dataset_id` ON `neuro_dataset_provenance` (`dataset_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_dataset_sealed` ON `neuro_dataset_provenance` (`is_sealed`);--> statement-breakpoint
CREATE INDEX `idx_neuro_dataset_grant` ON `neuro_dataset_provenance` (`nsf_nih_grant_tagged`);--> statement-breakpoint
CREATE TABLE `neuro_fair_share_quotas` (
	`id` text PRIMARY KEY NOT NULL,
	`department_id` text NOT NULL,
	`department_name` text NOT NULL,
	`allocated_share_weight` real DEFAULT 1 NOT NULL,
	`max_concurrent_gpus` integer DEFAULT 16 NOT NULL,
	`historical_usage_decayed` real DEFAULT 0 NOT NULL,
	`fair_share_score` real DEFAULT 1 NOT NULL,
	`active_allocated_gpus` integer DEFAULT 0 NOT NULL,
	`pending_jobs_count` integer DEFAULT 0 NOT NULL,
	`half_life_decay_factor` real DEFAULT 0.95 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_fair_share_quotas_department_id_unique` ON `neuro_fair_share_quotas` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_quota_dept` ON `neuro_fair_share_quotas` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_quota_score` ON `neuro_fair_share_quotas` (`fair_share_score`);--> statement-breakpoint
CREATE TABLE `neuro_gpus` (
	`id` text PRIMARY KEY NOT NULL,
	`gpu_id` text NOT NULL,
	`node_id` text NOT NULL,
	`gpu_index` integer DEFAULT 0 NOT NULL,
	`model` text DEFAULT 'NVIDIA-H100-SXM5-80GB' NOT NULL,
	`vram_total_bytes` real DEFAULT 85899345920 NOT NULL,
	`vram_allocated_bytes` real DEFAULT 0 NOT NULL,
	`utilization_percent` real DEFAULT 0 NOT NULL,
	`temperature_celsius` real DEFAULT 40 NOT NULL,
	`power_draw_watts` real DEFAULT 150 NOT NULL,
	`sm_clock_mhz` integer DEFAULT 1980 NOT NULL,
	`memory_clock_mhz` integer DEFAULT 1593 NOT NULL,
	`pcie_bandwidth_gbps` real DEFAULT 64 NOT NULL,
	`nvlink_active` integer DEFAULT true NOT NULL,
	`numa_node` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`current_job_id` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`node_id`) REFERENCES `neuro_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_gpus_gpu_id_unique` ON `neuro_gpus` (`gpu_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_gpu_id` ON `neuro_gpus` (`gpu_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_gpu_node` ON `neuro_gpus` (`node_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_gpu_status` ON `neuro_gpus` (`status`);--> statement-breakpoint
CREATE INDEX `idx_neuro_gpu_job` ON `neuro_gpus` (`current_job_id`);--> statement-breakpoint
CREATE TABLE `neuro_grant_credit_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`allocation_id` text NOT NULL,
	`account_id` text NOT NULL,
	`grant_number` text NOT NULL,
	`funding_agency` text DEFAULT 'NSF' NOT NULL,
	`credited_tokens` real NOT NULL,
	`dollar_equivalent_usd` real NOT NULL,
	`allocated_by_user_id` text NOT NULL,
	`effective_date` text NOT NULL,
	`expiry_date` text NOT NULL,
	`audit_notes` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `neuro_compute_billing_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`allocated_by_user_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_grant_credit_allocations_allocation_id_unique` ON `neuro_grant_credit_allocations` (`allocation_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_alloc_id` ON `neuro_grant_credit_allocations` (`allocation_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_alloc_account` ON `neuro_grant_credit_allocations` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_alloc_grant` ON `neuro_grant_credit_allocations` (`grant_number`);--> statement-breakpoint
CREATE TABLE `neuro_job_checkpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`checkpoint_id` text NOT NULL,
	`job_id` text NOT NULL,
	`step_number` integer DEFAULT 0 NOT NULL,
	`epoch_number` integer DEFAULT 0 NOT NULL,
	`loss_value` real,
	`metrics_json` text,
	`storage_uri` text NOT NULL,
	`file_size_bytes` real DEFAULT 0 NOT NULL,
	`sha256_hash` text NOT NULL,
	`is_preemption_emergency` integer DEFAULT false NOT NULL,
	`restored_count` integer DEFAULT 0 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `neuro_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_job_checkpoints_checkpoint_id_unique` ON `neuro_job_checkpoints` (`checkpoint_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_checkpoint_id` ON `neuro_job_checkpoints` (`checkpoint_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_checkpoint_job` ON `neuro_job_checkpoints` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_checkpoint_hash` ON `neuro_job_checkpoints` (`sha256_hash`);--> statement-breakpoint
CREATE TABLE `neuro_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`job_name` text NOT NULL,
	`user_id` text NOT NULL,
	`department_id` text NOT NULL,
	`grant_id` text,
	`cluster_id` text NOT NULL,
	`job_type` text DEFAULT 'distributed_training' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_gpus` integer DEFAULT 1 NOT NULL,
	`gpu_model_requirement` text DEFAULT 'ANY' NOT NULL,
	`min_vram_bytes` real DEFAULT 25769803776 NOT NULL,
	`container_image` text DEFAULT 'pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime' NOT NULL,
	`entrypoint_command` text DEFAULT 'python train.py' NOT NULL,
	`allocated_nodes_json` text,
	`allocated_gpu_ids_json` text,
	`queued_at` text,
	`started_at` text,
	`completed_at` text,
	`runtime_seconds` integer DEFAULT 0 NOT NULL,
	`exit_code` integer,
	`error_message` text,
	`tokens_cost_total` real DEFAULT 0 NOT NULL,
	`carbon_saved_kg` real DEFAULT 0 NOT NULL,
	`merkle_proof_hash` text DEFAULT '' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cluster_id`) REFERENCES `neuro_clusters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_jobs_job_id_unique` ON `neuro_jobs` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_job_id` ON `neuro_jobs` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_job_user` ON `neuro_jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_job_dept` ON `neuro_jobs` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_job_status` ON `neuro_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_neuro_job_cluster` ON `neuro_jobs` (`cluster_id`);--> statement-breakpoint
CREATE TABLE `neuro_merkle_lineage_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`node_hash` text NOT NULL,
	`parent_node_hash` text,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`job_id` text,
	`dataset_id` text,
	`metadata_json` text NOT NULL,
	`prov_o_type` text DEFAULT 'prov:Entity' NOT NULL,
	`inclusion_proof_json` text,
	`timestamp` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `neuro_jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dataset_id`) REFERENCES `neuro_dataset_provenance`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_merkle_lineage_nodes_node_hash_unique` ON `neuro_merkle_lineage_nodes` (`node_hash`);--> statement-breakpoint
CREATE INDEX `idx_neuro_lineage_node_hash` ON `neuro_merkle_lineage_nodes` (`node_hash`);--> statement-breakpoint
CREATE INDEX `idx_neuro_lineage_parent` ON `neuro_merkle_lineage_nodes` (`parent_node_hash`);--> statement-breakpoint
CREATE INDEX `idx_neuro_lineage_job` ON `neuro_merkle_lineage_nodes` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_lineage_dataset` ON `neuro_merkle_lineage_nodes` (`dataset_id`);--> statement-breakpoint
CREATE TABLE `neuro_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`cluster_id` text NOT NULL,
	`hostname` text NOT NULL,
	`ip_address` text NOT NULL,
	`rack_location` text,
	`chassis_slot` integer,
	`node_type` text DEFAULT 'compute' NOT NULL,
	`cpu_cores` integer DEFAULT 64 NOT NULL,
	`ram_bytes` real DEFAULT 549755813888 NOT NULL,
	`gpu_count` integer DEFAULT 8 NOT NULL,
	`gpu_model` text DEFAULT 'NVIDIA-H100-SXM5-80GB' NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`is_cloud_burst` integer DEFAULT false NOT NULL,
	`cloud_provider` text DEFAULT 'on_prem' NOT NULL,
	`spot_instance_id` text,
	`current_power_watts` real DEFAULT 0 NOT NULL,
	`temperature_celsius` real DEFAULT 35 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`cluster_id`) REFERENCES `neuro_clusters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neuro_nodes_node_id_unique` ON `neuro_nodes` (`node_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_node_id` ON `neuro_nodes` (`node_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_node_cluster` ON `neuro_nodes` (`cluster_id`);--> statement-breakpoint
CREATE INDEX `idx_neuro_node_status` ON `neuro_nodes` (`status`);--> statement-breakpoint
CREATE INDEX `idx_neuro_node_cloud` ON `neuro_nodes` (`is_cloud_burst`);--> statement-breakpoint
CREATE TABLE `neuro_spot_price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`region` text NOT NULL,
	`gpu_model` text NOT NULL,
	`instance_type` text NOT NULL,
	`spot_price_usd` real NOT NULL,
	`on_demand_price_usd` real NOT NULL,
	`discount_percent` real NOT NULL,
	`interruption_risk_score` real DEFAULT 0.1 NOT NULL,
	`recorded_at` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_neuro_spot_provider` ON `neuro_spot_price_history` (`provider`);--> statement-breakpoint
CREATE INDEX `idx_neuro_spot_model` ON `neuro_spot_price_history` (`gpu_model`);--> statement-breakpoint
CREATE INDEX `idx_neuro_spot_recorded` ON `neuro_spot_price_history` (`recorded_at`);--> statement-breakpoint
CREATE TABLE `soar_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`execution_id` text NOT NULL,
	`playbook_id` text NOT NULL,
	`playbook_name` text NOT NULL,
	`target_type` text NOT NULL,
	`target_value` text NOT NULL,
	`confidence_score` integer NOT NULL,
	`trigger_payload` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`reason` text,
	`resolved_by` text,
	`requested_at` text DEFAULT (current_timestamp) NOT NULL,
	`expires_at` text NOT NULL,
	`resolved_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_soar_approvals_status` ON `soar_approvals` (`status`);--> statement-breakpoint
CREATE INDEX `idx_soar_approvals_execution` ON `soar_approvals` (`execution_id`);--> statement-breakpoint
CREATE INDEX `idx_soar_approvals_expires` ON `soar_approvals` (`expires_at`);--> statement-breakpoint
CREATE TABLE `soar_execution_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`execution_id` text NOT NULL,
	`step_id` text NOT NULL,
	`name` text NOT NULL,
	`action` text NOT NULL,
	`state` text DEFAULT 'RUNNING' NOT NULL,
	`input_params` text,
	`output` text,
	`error` text,
	`compensated` integer DEFAULT false NOT NULL,
	`started_at` text DEFAULT (current_timestamp) NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_soar_steps_execution` ON `soar_execution_steps` (`execution_id`);--> statement-breakpoint
CREATE INDEX `idx_soar_steps_step` ON `soar_execution_steps` (`step_id`);--> statement-breakpoint
CREATE INDEX `idx_soar_steps_state` ON `soar_execution_steps` (`state`);--> statement-breakpoint
CREATE TABLE `soar_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`playbook_id` text NOT NULL,
	`playbook_name` text NOT NULL,
	`target_type` text NOT NULL,
	`target_value` text NOT NULL,
	`state` text DEFAULT 'RUNNING' NOT NULL,
	`trigger_payload` text,
	`tenant_id` text DEFAULT 'default',
	`actor_id` text,
	`approval_id` text,
	`error` text,
	`compensation_status` text DEFAULT 'NONE',
	`started_at` text DEFAULT (current_timestamp) NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_soar_executions_playbook` ON `soar_executions` (`playbook_id`);--> statement-breakpoint
CREATE INDEX `idx_soar_executions_state` ON `soar_executions` (`state`);--> statement-breakpoint
CREATE INDEX `idx_soar_executions_target` ON `soar_executions` (`target_type`,`target_value`);--> statement-breakpoint
CREATE INDEX `idx_soar_executions_started_at` ON `soar_executions` (`started_at`);--> statement-breakpoint
CREATE TABLE `soar_playbooks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` text DEFAULT '1.0.0' NOT NULL,
	`description` text,
	`category` text DEFAULT 'NETWORK' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`auto_execute` integer DEFAULT true NOT NULL,
	`min_confidence` integer DEFAULT 80 NOT NULL,
	`high_impact` integer DEFAULT false NOT NULL,
	`definition` text NOT NULL,
	`rollback_strategy` text DEFAULT 'COMPENSATE',
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_soar_playbooks_name` ON `soar_playbooks` (`name`);--> statement-breakpoint
CREATE INDEX `idx_soar_playbooks_category` ON `soar_playbooks` (`category`);--> statement-breakpoint
CREATE INDEX `idx_soar_playbooks_enabled` ON `soar_playbooks` (`enabled`);--> statement-breakpoint
CREATE TABLE `student_enquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`applicant_name` text NOT NULL,
	`guardian_name` text NOT NULL,
	`email` text,
	`phone` text NOT NULL,
	`applied_grade_or_course` text NOT NULL,
	`academic_year_id` text,
	`previous_school_or_college` text,
	`notes` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_student_enquiries_inst_status` ON `student_enquiries` (`institution_id`,`status`);--> statement-breakpoint
CREATE TABLE `supply_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`prev_merkle_root` text DEFAULT '' NOT NULL,
	`merkle_root` text DEFAULT '' NOT NULL,
	`timestamp` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supply_audit_logs_audit_id_unique` ON `supply_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_audit_id` ON `supply_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_audit_action` ON `supply_audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_supply_audit_entity` ON `supply_audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_audit_time` ON `supply_audit_logs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `supply_budget_encumbrances` (
	`id` text PRIMARY KEY NOT NULL,
	`encumbrance_number` text NOT NULL,
	`department_id` text NOT NULL,
	`budget_code` text NOT NULL,
	`po_id` text NOT NULL,
	`encumbered_amount_usd` real NOT NULL,
	`liquidated_amount_usd` real DEFAULT 0 NOT NULL,
	`remaining_encumbered_usd` real NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`debit_account_code` text DEFAULT 'GL:ENCUMBRANCE_EXPENSE' NOT NULL,
	`credit_account_code` text DEFAULT 'GL:ENCUMBRANCE_RESERVE' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`po_id`) REFERENCES `supply_purchase_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supply_budget_encumbrances_encumbrance_number_unique` ON `supply_budget_encumbrances` (`encumbrance_number`);--> statement-breakpoint
CREATE INDEX `idx_supply_encumber_num` ON `supply_budget_encumbrances` (`encumbrance_number`);--> statement-breakpoint
CREATE INDEX `idx_supply_encumber_dept` ON `supply_budget_encumbrances` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_encumber_po` ON `supply_budget_encumbrances` (`po_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_encumber_status` ON `supply_budget_encumbrances` (`status`);--> statement-breakpoint
CREATE TABLE `supply_contract_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`milestone_id` text NOT NULL,
	`contract_id` text NOT NULL,
	`milestone_number` integer NOT NULL,
	`title` text NOT NULL,
	`deliverable_description` text NOT NULL,
	`amount_usd` real NOT NULL,
	`due_date` text NOT NULL,
	`completion_date` text,
	`deliverable_evidence_url` text,
	`approved_by_user_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `supply_contracts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supply_contract_milestones_milestone_id_unique` ON `supply_contract_milestones` (`milestone_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_milestone_id` ON `supply_contract_milestones` (`milestone_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_milestone_contract` ON `supply_contract_milestones` (`contract_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_milestone_status` ON `supply_contract_milestones` (`status`);--> statement-breakpoint
CREATE TABLE `supply_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_code` text NOT NULL,
	`vendor_id` text NOT NULL,
	`title` text NOT NULL,
	`contract_type` text DEFAULT 'MSA' NOT NULL,
	`total_value_usd` real NOT NULL,
	`effective_start_date` text NOT NULL,
	`effective_end_date` text NOT NULL,
	`renewal_notice_days` integer DEFAULT 60 NOT NULL,
	`sla_uptime_target_percent` real DEFAULT 99.9 NOT NULL,
	`sla_penalty_rate_per_outage_hour_usd` real DEFAULT 500 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `supply_vendors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supply_contracts_contract_code_unique` ON `supply_contracts` (`contract_code`);--> statement-breakpoint
CREATE INDEX `idx_supply_contract_code` ON `supply_contracts` (`contract_code`);--> statement-breakpoint
CREATE INDEX `idx_supply_contract_vendor` ON `supply_contracts` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_contract_status` ON `supply_contracts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_supply_contract_end` ON `supply_contracts` (`effective_end_date`);--> statement-breakpoint
CREATE TABLE `supply_goods_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_number` text NOT NULL,
	`po_id` text NOT NULL,
	`vendor_id` text NOT NULL,
	`received_date` text NOT NULL,
	`received_by_user_id` text NOT NULL,
	`warehouse_bay` text DEFAULT 'BAY_1' NOT NULL,
	`dock_tag` text DEFAULT 'DOCK_A' NOT NULL,
	`carrier_name` text,
	`tracking_number` text,
	`package_condition` text DEFAULT 'good' NOT NULL,
	`inspection_notes` text,
	`receiver_signature` text DEFAULT 'VERIFIED' NOT NULL,
	`status` text DEFAULT 'verified' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`po_id`) REFERENCES `supply_purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendor_id`) REFERENCES `supply_vendors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`received_by_user_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supply_goods_receipts_receipt_number_unique` ON `supply_goods_receipts` (`receipt_number`);--> statement-breakpoint
CREATE INDEX `idx_supply_receipt_number` ON `supply_goods_receipts` (`receipt_number`);--> statement-breakpoint
CREATE INDEX `idx_supply_receipt_po` ON `supply_goods_receipts` (`po_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_receipt_vendor` ON `supply_goods_receipts` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_receipt_status` ON `supply_goods_receipts` (`status`);--> statement-breakpoint
CREATE TABLE `supply_po_line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`po_id` text NOT NULL,
	`line_number` integer NOT NULL,
	`item_sku` text NOT NULL,
	`description` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`unit_price_usd` real NOT NULL,
	`quantity_ordered` real NOT NULL,
	`quantity_received` real DEFAULT 0 NOT NULL,
	`quantity_invoiced` real DEFAULT 0 NOT NULL,
	`unit_of_measure` text DEFAULT 'EA' NOT NULL,
	`line_total_usd` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`po_id`) REFERENCES `supply_purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_supply_po_line_po` ON `supply_po_line_items` (`po_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_po_line_sku` ON `supply_po_line_items` (`item_sku`);--> statement-breakpoint
CREATE INDEX `idx_supply_po_line_status` ON `supply_po_line_items` (`status`);--> statement-breakpoint
CREATE TABLE `supply_purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`po_number` text NOT NULL,
	`requisition_id` text,
	`vendor_id` text NOT NULL,
	`department_id` text NOT NULL,
	`order_date` text NOT NULL,
	`expected_delivery_date` text,
	`subtotal_usd` real NOT NULL,
	`tax_amount_usd` real DEFAULT 0 NOT NULL,
	`shipping_amount_usd` real DEFAULT 0 NOT NULL,
	`total_amount_usd` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`payment_terms` text DEFAULT 'NET_30' NOT NULL,
	`shipping_address` text NOT NULL,
	`shipping_dock` text DEFAULT 'DOCK_A_CENTRAL' NOT NULL,
	`status` text DEFAULT 'issued' NOT NULL,
	`is_encumbered` integer DEFAULT true NOT NULL,
	`encumbrance_id` text,
	`merkle_leaf_hash` text DEFAULT '' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`requisition_id`) REFERENCES `supply_purchase_requisitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendor_id`) REFERENCES `supply_vendors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supply_purchase_orders_po_number_unique` ON `supply_purchase_orders` (`po_number`);--> statement-breakpoint
CREATE INDEX `idx_supply_po_number` ON `supply_purchase_orders` (`po_number`);--> statement-breakpoint
CREATE INDEX `idx_supply_po_vendor` ON `supply_purchase_orders` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_po_dept` ON `supply_purchase_orders` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_po_status` ON `supply_purchase_orders` (`status`);--> statement-breakpoint
CREATE TABLE `supply_purchase_requisitions` (
	`id` text PRIMARY KEY NOT NULL,
	`requisition_number` text NOT NULL,
	`department_id` text NOT NULL,
	`requester_id` text NOT NULL,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`source_reference_id` text,
	`title` text NOT NULL,
	`urgency` text DEFAULT 'standard' NOT NULL,
	`estimated_total_usd` real NOT NULL,
	`budget_code` text NOT NULL,
	`required_by_date` text,
	`current_approval_tier` text DEFAULT 'hod' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`rejection_reason` text,
	`approved_by_user_id` text,
	`approved_at` text,
	`notes` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`requester_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supply_purchase_requisitions_requisition_number_unique` ON `supply_purchase_requisitions` (`requisition_number`);--> statement-breakpoint
CREATE INDEX `idx_supply_req_number` ON `supply_purchase_requisitions` (`requisition_number`);--> statement-breakpoint
CREATE INDEX `idx_supply_req_dept` ON `supply_purchase_requisitions` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_req_status` ON `supply_purchase_requisitions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_supply_req_tier` ON `supply_purchase_requisitions` (`current_approval_tier`);--> statement-breakpoint
CREATE TABLE `supply_three_way_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`po_id` text NOT NULL,
	`receipt_id` text,
	`match_status` text DEFAULT 'matched' NOT NULL,
	`price_variance_percent` real DEFAULT 0 NOT NULL,
	`quantity_variance_units` real DEFAULT 0 NOT NULL,
	`dollar_variance_usd` real DEFAULT 0 NOT NULL,
	`is_tolerance_compliant` integer DEFAULT true NOT NULL,
	`override_approved_by_user_id` text,
	`override_justification` text,
	`debit_memo_generated` integer DEFAULT false NOT NULL,
	`debit_memo_amount_usd` real DEFAULT 0 NOT NULL,
	`payment_voucher_code` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `supply_vendor_invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`po_id`) REFERENCES `supply_purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`receipt_id`) REFERENCES `supply_goods_receipts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supply_three_way_matches_match_id_unique` ON `supply_three_way_matches` (`match_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_match_id` ON `supply_three_way_matches` (`match_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_match_invoice` ON `supply_three_way_matches` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_match_po` ON `supply_three_way_matches` (`po_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_match_status` ON `supply_three_way_matches` (`match_status`);--> statement-breakpoint
CREATE TABLE `supply_vendor_certifications` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`cert_type` text NOT NULL,
	`cert_number` text NOT NULL,
	`issuing_authority` text NOT NULL,
	`issued_date` text NOT NULL,
	`expiry_date` text NOT NULL,
	`document_url` text,
	`verification_status` text DEFAULT 'verified' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `supply_vendors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_supply_cert_vendor` ON `supply_vendor_certifications` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_cert_type` ON `supply_vendor_certifications` (`cert_type`);--> statement-breakpoint
CREATE INDEX `idx_supply_cert_status` ON `supply_vendor_certifications` (`verification_status`);--> statement-breakpoint
CREATE TABLE `supply_vendor_esg_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`score_id` text NOT NULL,
	`vendor_id` text NOT NULL,
	`composite_esg_score` real NOT NULL,
	`environmental_score` real NOT NULL,
	`social_score` real NOT NULL,
	`governance_score` real NOT NULL,
	`scope3_carbon_intensity_kg_per_usd` real DEFAULT 0.15 NOT NULL,
	`recycled_material_percentage` real DEFAULT 0 NOT NULL,
	`fair_labor_certified` integer DEFAULT false NOT NULL,
	`rating_grade` text DEFAULT 'A' NOT NULL,
	`audit_year` integer DEFAULT 2026 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `supply_vendors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supply_vendor_esg_scores_score_id_unique` ON `supply_vendor_esg_scores` (`score_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_esg_score_id` ON `supply_vendor_esg_scores` (`score_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_esg_vendor` ON `supply_vendor_esg_scores` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_esg_grade` ON `supply_vendor_esg_scores` (`rating_grade`);--> statement-breakpoint
CREATE TABLE `supply_vendor_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_number` text NOT NULL,
	`vendor_id` text NOT NULL,
	`po_id` text,
	`invoice_date` text NOT NULL,
	`due_date` text NOT NULL,
	`subtotal_usd` real NOT NULL,
	`tax_amount_usd` real DEFAULT 0 NOT NULL,
	`total_amount_usd` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`document_url` text,
	`status` text DEFAULT 'submitted' NOT NULL,
	`voucher_number` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `supply_vendors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`po_id`) REFERENCES `supply_purchase_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_supply_inv_number` ON `supply_vendor_invoices` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `idx_supply_inv_vendor` ON `supply_vendor_invoices` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_inv_po` ON `supply_vendor_invoices` (`po_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_inv_status` ON `supply_vendor_invoices` (`status`);--> statement-breakpoint
CREATE TABLE `supply_vendor_risk_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`vendor_id` text NOT NULL,
	`overall_risk_score` real NOT NULL,
	`financial_risk_score` real DEFAULT 20 NOT NULL,
	`compliance_risk_score` real DEFAULT 15 NOT NULL,
	`operational_risk_score` real DEFAULT 25 NOT NULL,
	`sanctions_registry_checked` text DEFAULT 'OFAC_UN_EU' NOT NULL,
	`sanctions_matched` integer DEFAULT false NOT NULL,
	`pep_matched` integer DEFAULT false NOT NULL,
	`adverse_media_findings` text,
	`recommended_action` text DEFAULT 'approve' NOT NULL,
	`assessed_by_user_id` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `supply_vendors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supply_vendor_risk_assessments_assessment_id_unique` ON `supply_vendor_risk_assessments` (`assessment_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_risk_assmt_id` ON `supply_vendor_risk_assessments` (`assessment_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_risk_vendor` ON `supply_vendor_risk_assessments` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_supply_risk_action` ON `supply_vendor_risk_assessments` (`recommended_action`);--> statement-breakpoint
CREATE TABLE `supply_vendors` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_code` text NOT NULL,
	`name` text NOT NULL,
	`legal_entity_name` text,
	`category` text NOT NULL,
	`tax_id` text NOT NULL,
	`contact_name` text NOT NULL,
	`contact_email` text NOT NULL,
	`contact_phone` text,
	`address` text,
	`city` text,
	`country` text DEFAULT 'USA' NOT NULL,
	`payment_terms` text DEFAULT 'NET_30' NOT NULL,
	`onboarding_status` text DEFAULT 'pending_verification' NOT NULL,
	`risk_tier` text DEFAULT 'low' NOT NULL,
	`risk_score` real DEFAULT 10 NOT NULL,
	`esg_rating` text DEFAULT 'A' NOT NULL,
	`esg_score` real DEFAULT 75 NOT NULL,
	`is_sanctions_clean` integer DEFAULT true NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supply_vendors_vendor_code_unique` ON `supply_vendors` (`vendor_code`);--> statement-breakpoint
CREATE INDEX `idx_supply_vendor_code` ON `supply_vendors` (`vendor_code`);--> statement-breakpoint
CREATE INDEX `idx_supply_vendor_category` ON `supply_vendors` (`category`);--> statement-breakpoint
CREATE INDEX `idx_supply_vendor_status` ON `supply_vendors` (`onboarding_status`);--> statement-breakpoint
CREATE INDEX `idx_supply_vendor_risk` ON `supply_vendors` (`risk_tier`);--> statement-breakpoint
CREATE TABLE `teacher_substitutions` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`timetable_entry_id` text NOT NULL,
	`date` text NOT NULL,
	`original_teacher_id` text NOT NULL,
	`substitute_teacher_id` text NOT NULL,
	`reason` text,
	`status` text DEFAULT 'assigned' NOT NULL,
	`assigned_by_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`timetable_entry_id`) REFERENCES `timetable_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`original_teacher_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`substitute_teacher_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_substitutions_date` ON `teacher_substitutions` (`date`);--> statement-breakpoint
CREATE INDEX `idx_substitutions_sub_teacher` ON `teacher_substitutions` (`substitute_teacher_id`);--> statement-breakpoint
CREATE TABLE `timetable_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`academic_year_id` text,
	`class_id` text NOT NULL,
	`slot_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`subject_name` text NOT NULL,
	`teacher_id` text,
	`room_number` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`slot_id`) REFERENCES `timetable_slots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_timetable_entries_class_day` ON `timetable_entries` (`class_id`,`day_of_week`);--> statement-breakpoint
CREATE INDEX `idx_timetable_entries_teacher` ON `timetable_entries` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `idx_timetable_entries_inst` ON `timetable_entries` (`institution_id`);--> statement-breakpoint
CREATE TABLE `timetable_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`name` text NOT NULL,
	`slot_order` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_break` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_timetable_slots_inst` ON `timetable_slots` (`institution_id`);--> statement-breakpoint
CREATE TABLE `twin_3d_models` (
	`id` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	`facility_id` text NOT NULL,
	`space_id` text,
	`format` text DEFAULT 'gltf' NOT NULL,
	`lod_level` integer DEFAULT 1 NOT NULL,
	`model_data` text DEFAULT '{}' NOT NULL,
	`mesh_vertices_count` integer DEFAULT 0 NOT NULL,
	`file_size_bytes` integer DEFAULT 0 NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `twin_3d_models_model_id_unique` ON `twin_3d_models` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_model_id` ON `twin_3d_models` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_model_fac` ON `twin_3d_models` (`facility_id`);--> statement-breakpoint
CREATE TABLE `twin_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`facility_id` text NOT NULL,
	`space_id` text,
	`tag_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'lab_equipment' NOT NULL,
	`status` text DEFAULT 'in_place' NOT NULL,
	`current_coordinates_json` text DEFAULT '{"x":0,"y":0,"z":0}' NOT NULL,
	`last_seen_at` text,
	`purchase_cost` real DEFAULT 0 NOT NULL,
	`operational_hours` real DEFAULT 0 NOT NULL,
	`warranty_expiry` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `twin_assets_asset_id_unique` ON `twin_assets` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_asset_id` ON `twin_assets` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_asset_tag` ON `twin_assets` (`tag_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_asset_fac` ON `twin_assets` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_asset_status` ON `twin_assets` (`status`);--> statement-breakpoint
CREATE TABLE `twin_facilities` (
	`id` text PRIMARY KEY NOT NULL,
	`facility_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`facility_type` text DEFAULT 'academic' NOT NULL,
	`status` text DEFAULT 'operational' NOT NULL,
	`total_floors` integer DEFAULT 1 NOT NULL,
	`total_area_sq_meters` real DEFAULT 0 NOT NULL,
	`geo_location_json` text DEFAULT '{}' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `twin_facilities_facility_id_unique` ON `twin_facilities` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_fac_id` ON `twin_facilities` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_fac_type` ON `twin_facilities` (`facility_type`);--> statement-breakpoint
CREATE INDEX `idx_twin_fac_status` ON `twin_facilities` (`status`);--> statement-breakpoint
CREATE TABLE `twin_geofences` (
	`id` text PRIMARY KEY NOT NULL,
	`geofence_id` text NOT NULL,
	`facility_id` text NOT NULL,
	`space_id` text,
	`name` text NOT NULL,
	`perimeter_type` text DEFAULT 'polygon' NOT NULL,
	`boundary_json` text DEFAULT '{}' NOT NULL,
	`alert_on_exit` integer DEFAULT true NOT NULL,
	`alert_on_entry` integer DEFAULT false NOT NULL,
	`severity` text DEFAULT 'high' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `twin_geofences_geofence_id_unique` ON `twin_geofences` (`geofence_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_geo_id` ON `twin_geofences` (`geofence_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_geo_fac` ON `twin_geofences` (`facility_id`);--> statement-breakpoint
CREATE TABLE `twin_maintenance_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`facility_id` text NOT NULL,
	`space_id` text,
	`asset_id` text,
	`sensor_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`source` text DEFAULT 'ai_predicted' NOT NULL,
	`assigned_staff_id` text,
	`estimated_cost` real DEFAULT 0 NOT NULL,
	`scheduled_date` text,
	`completed_at` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `twin_maintenance_orders_order_id_unique` ON `twin_maintenance_orders` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_maint_id` ON `twin_maintenance_orders` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_maint_fac` ON `twin_maintenance_orders` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_maint_status` ON `twin_maintenance_orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_twin_maint_priority` ON `twin_maintenance_orders` (`priority`);--> statement-breakpoint
CREATE TABLE `twin_sensors` (
	`id` text PRIMARY KEY NOT NULL,
	`sensor_id` text NOT NULL,
	`facility_id` text NOT NULL,
	`space_id` text,
	`sensor_type` text DEFAULT 'temperature' NOT NULL,
	`protocol` text DEFAULT 'mqtt' NOT NULL,
	`status` text DEFAULT 'online' NOT NULL,
	`battery_percent` real DEFAULT 100,
	`sampling_interval_seconds` integer DEFAULT 60 NOT NULL,
	`calibration_offset` real DEFAULT 0 NOT NULL,
	`last_heartbeat` text,
	`coordinates_json` text DEFAULT '{"x":0,"y":0,"z":0}' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `twin_sensors_sensor_id_unique` ON `twin_sensors` (`sensor_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_sensor_id` ON `twin_sensors` (`sensor_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_sensor_fac` ON `twin_sensors` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_sensor_space` ON `twin_sensors` (`space_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_sensor_type` ON `twin_sensors` (`sensor_type`);--> statement-breakpoint
CREATE INDEX `idx_twin_sensor_status` ON `twin_sensors` (`status`);--> statement-breakpoint
CREATE TABLE `twin_spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`space_id` text NOT NULL,
	`facility_id` text NOT NULL,
	`floor_level` integer DEFAULT 0 NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`space_type` text DEFAULT 'classroom' NOT NULL,
	`capacity` integer DEFAULT 30 NOT NULL,
	`current_occupancy` integer DEFAULT 0 NOT NULL,
	`comfort_score` real DEFAULT 100 NOT NULL,
	`dimensions_json` text DEFAULT '{}' NOT NULL,
	`polygon_geojson` text DEFAULT '{}' NOT NULL,
	`is_bookable` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `twin_spaces_space_id_unique` ON `twin_spaces` (`space_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_space_id` ON `twin_spaces` (`space_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_space_fac` ON `twin_spaces` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_space_type` ON `twin_spaces` (`space_type`);--> statement-breakpoint
CREATE INDEX `idx_twin_space_status` ON `twin_spaces` (`status`);--> statement-breakpoint
CREATE TABLE `twin_telemetry` (
	`id` text PRIMARY KEY NOT NULL,
	`telemetry_id` text NOT NULL,
	`sensor_id` text NOT NULL,
	`metric_type` text NOT NULL,
	`numeric_value` real NOT NULL,
	`unit` text DEFAULT 'unit' NOT NULL,
	`is_anomaly` integer DEFAULT false NOT NULL,
	`raw_payload` text DEFAULT '{}' NOT NULL,
	`recorded_at` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `twin_telemetry_telemetry_id_unique` ON `twin_telemetry` (`telemetry_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_telem_id` ON `twin_telemetry` (`telemetry_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_telem_sensor` ON `twin_telemetry` (`sensor_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_telem_metric` ON `twin_telemetry` (`metric_type`);--> statement-breakpoint
CREATE INDEX `idx_twin_telem_time` ON `twin_telemetry` (`recorded_at`);--> statement-breakpoint
CREATE TABLE `twin_wayfinding_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`edge_id` text NOT NULL,
	`facility_id` text NOT NULL,
	`source_node_id` text NOT NULL,
	`target_node_id` text NOT NULL,
	`distance_meters` real DEFAULT 1 NOT NULL,
	`transit_time_seconds` real DEFAULT 1 NOT NULL,
	`is_step_free` integer DEFAULT true NOT NULL,
	`is_blocked` integer DEFAULT false NOT NULL,
	`hazard_level` text DEFAULT 'none' NOT NULL,
	`hazard_reason` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `twin_wayfinding_edges_edge_id_unique` ON `twin_wayfinding_edges` (`edge_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_wf_edge_id` ON `twin_wayfinding_edges` (`edge_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_wf_edge_fac` ON `twin_wayfinding_edges` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_wf_edge_src` ON `twin_wayfinding_edges` (`source_node_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_wf_edge_tgt` ON `twin_wayfinding_edges` (`target_node_id`);--> statement-breakpoint
CREATE TABLE `twin_wayfinding_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`facility_id` text NOT NULL,
	`space_id` text,
	`floor_level` integer DEFAULT 0 NOT NULL,
	`node_type` text DEFAULT 'hallway_intersection' NOT NULL,
	`coordinates_json` text DEFAULT '{"x":0,"y":0,"z":0}' NOT NULL,
	`is_accessible` integer DEFAULT true NOT NULL,
	`is_exit` integer DEFAULT false NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `twin_wayfinding_nodes_node_id_unique` ON `twin_wayfinding_nodes` (`node_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_wf_node_id` ON `twin_wayfinding_nodes` (`node_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_wf_node_fac` ON `twin_wayfinding_nodes` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_twin_wf_node_floor` ON `twin_wayfinding_nodes` (`floor_level`);--> statement-breakpoint
CREATE TABLE `vision_alpr_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`log_id` text NOT NULL,
	`camera_id` text NOT NULL,
	`plate_number` text NOT NULL,
	`confidence_score` real DEFAULT 0.95 NOT NULL,
	`direction` text DEFAULT 'entry' NOT NULL,
	`gate_id` text DEFAULT 'main_gate' NOT NULL,
	`vehicle_type` text DEFAULT 'car' NOT NULL,
	`permit_status` text DEFAULT 'unknown' NOT NULL,
	`gate_actuated` integer DEFAULT false NOT NULL,
	`snapshot_url` text,
	`captured_at` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vision_alpr_logs_log_id_unique` ON `vision_alpr_logs` (`log_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_alpr_log_id` ON `vision_alpr_logs` (`log_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_alpr_cam` ON `vision_alpr_logs` (`camera_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_alpr_plate` ON `vision_alpr_logs` (`plate_number`);--> statement-breakpoint
CREATE INDEX `idx_vision_alpr_permit` ON `vision_alpr_logs` (`permit_status`);--> statement-breakpoint
CREATE INDEX `idx_vision_alpr_time` ON `vision_alpr_logs` (`captured_at`);--> statement-breakpoint
CREATE TABLE `vision_cameras` (
	`id` text PRIMARY KEY NOT NULL,
	`camera_id` text NOT NULL,
	`name` text NOT NULL,
	`facility_id` text NOT NULL,
	`space_id` text,
	`zone_type` text DEFAULT 'perimeter' NOT NULL,
	`protocol` text DEFAULT 'onvif' NOT NULL,
	`stream_url` text NOT NULL,
	`resolution` text DEFAULT '1080p' NOT NULL,
	`fps` integer DEFAULT 30 NOT NULL,
	`fov_horizontal_deg` real DEFAULT 90 NOT NULL,
	`fov_vertical_deg` real DEFAULT 60 NOT NULL,
	`mounting_height_meters` real DEFAULT 3.5 NOT NULL,
	`position_x` real DEFAULT 0 NOT NULL,
	`position_y` real DEFAULT 0 NOT NULL,
	`position_z` real DEFAULT 3.5 NOT NULL,
	`pitch_deg` real DEFAULT -15 NOT NULL,
	`yaw_deg` real DEFAULT 0 NOT NULL,
	`roll_deg` real DEFAULT 0 NOT NULL,
	`ptz_capable` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'online' NOT NULL,
	`is_privacy_masked` integer DEFAULT false NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vision_cameras_camera_id_unique` ON `vision_cameras` (`camera_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_cam_id` ON `vision_cameras` (`camera_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_cam_fac` ON `vision_cameras` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_cam_zone` ON `vision_cameras` (`zone_type`);--> statement-breakpoint
CREATE INDEX `idx_vision_cam_status` ON `vision_cameras` (`status`);--> statement-breakpoint
CREATE TABLE `vision_detection_zones` (
	`id` text PRIMARY KEY NOT NULL,
	`zone_id` text NOT NULL,
	`camera_id` text NOT NULL,
	`name` text NOT NULL,
	`zone_type` text DEFAULT 'perimeter_tripwire' NOT NULL,
	`polygon_coordinates_json` text DEFAULT '[]' NOT NULL,
	`direction` text DEFAULT 'bidirectional' NOT NULL,
	`sensitivity` real DEFAULT 0.85 NOT NULL,
	`max_occupancy_threshold` integer DEFAULT 50 NOT NULL,
	`loitering_threshold_seconds` integer DEFAULT 120 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vision_detection_zones_zone_id_unique` ON `vision_detection_zones` (`zone_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_zone_id` ON `vision_detection_zones` (`zone_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_zone_cam` ON `vision_detection_zones` (`camera_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_zone_type` ON `vision_detection_zones` (`zone_type`);--> statement-breakpoint
CREATE TABLE `vision_guard_dispatches` (
	`id` text PRIMARY KEY NOT NULL,
	`dispatch_id` text NOT NULL,
	`incident_id` text NOT NULL,
	`guard_id` text NOT NULL,
	`priority` text DEFAULT 'high' NOT NULL,
	`assigned_route_json` text DEFAULT '[]' NOT NULL,
	`eta_seconds` integer DEFAULT 180 NOT NULL,
	`response_status` text DEFAULT 'dispatched' NOT NULL,
	`dispatched_at` text NOT NULL,
	`arrived_at` text,
	`cleared_at` text,
	`notes` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vision_guard_dispatches_dispatch_id_unique` ON `vision_guard_dispatches` (`dispatch_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_dispatch_id` ON `vision_guard_dispatches` (`dispatch_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_dispatch_inc` ON `vision_guard_dispatches` (`incident_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_dispatch_guard` ON `vision_guard_dispatches` (`guard_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_dispatch_status` ON `vision_guard_dispatches` (`response_status`);--> statement-breakpoint
CREATE TABLE `vision_guard_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`guard_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`badge_number` text NOT NULL,
	`call_sign` text NOT NULL,
	`status` text DEFAULT 'on_duty' NOT NULL,
	`current_location_x` real DEFAULT 0 NOT NULL,
	`current_location_y` real DEFAULT 0 NOT NULL,
	`current_location_z` real DEFAULT 0 NOT NULL,
	`current_facility_id` text,
	`assigned_sector` text,
	`battery_percent` real DEFAULT 100 NOT NULL,
	`last_heartbeat_at` text NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vision_guard_profiles_guard_id_unique` ON `vision_guard_profiles` (`guard_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `vision_guard_profiles_badge_number_unique` ON `vision_guard_profiles` (`badge_number`);--> statement-breakpoint
CREATE INDEX `idx_vision_guard_id` ON `vision_guard_profiles` (`guard_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_guard_staff` ON `vision_guard_profiles` (`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_guard_status` ON `vision_guard_profiles` (`status`);--> statement-breakpoint
CREATE INDEX `idx_vision_guard_fac` ON `vision_guard_profiles` (`current_facility_id`);--> statement-breakpoint
CREATE TABLE `vision_lockdown_events` (
	`id` text PRIMARY KEY NOT NULL,
	`lockdown_id` text NOT NULL,
	`scope` text DEFAULT 'campus_wide' NOT NULL,
	`target_facility_id` text,
	`target_zone_id` text,
	`trigger_reason` text NOT NULL,
	`triggered_by_user_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`doors_locked_count` integer DEFAULT 0 NOT NULL,
	`egress_paths_illuminated` integer DEFAULT true NOT NULL,
	`eco_mesh_islanding_triggered` integer DEFAULT false NOT NULL,
	`triggered_at` text NOT NULL,
	`all_clear_at` text,
	`merkle_audit_hash` text DEFAULT '' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vision_lockdown_events_lockdown_id_unique` ON `vision_lockdown_events` (`lockdown_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_lockdown_id` ON `vision_lockdown_events` (`lockdown_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_lockdown_scope` ON `vision_lockdown_events` (`scope`);--> statement-breakpoint
CREATE INDEX `idx_vision_lockdown_status` ON `vision_lockdown_events` (`status`);--> statement-breakpoint
CREATE INDEX `idx_vision_lockdown_time` ON `vision_lockdown_events` (`triggered_at`);--> statement-breakpoint
CREATE TABLE `vision_privacy_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`event_type` text DEFAULT 'face_redaction' NOT NULL,
	`camera_id` text,
	`subject_type` text DEFAULT 'student' NOT NULL,
	`faces_redacted_count` integer DEFAULT 0 NOT NULL,
	`plates_redacted_count` integer DEFAULT 0 NOT NULL,
	`authorized_by_share1` text,
	`authorized_by_share2` text,
	`deanon_reason` text,
	`privacy_noise_epsilon` real DEFAULT 1 NOT NULL,
	`audit_timestamp` text NOT NULL,
	`merkle_proof` text DEFAULT '' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vision_privacy_audit_logs_audit_id_unique` ON `vision_privacy_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_privacy_audit_id` ON `vision_privacy_audit_logs` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_privacy_type` ON `vision_privacy_audit_logs` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_vision_privacy_cam` ON `vision_privacy_audit_logs` (`camera_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_privacy_time` ON `vision_privacy_audit_logs` (`audit_timestamp`);--> statement-breakpoint
CREATE TABLE `vision_security_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`threat_type` text DEFAULT 'perimeter_intrusion' NOT NULL,
	`severity` text DEFAULT 'high' NOT NULL,
	`facility_id` text NOT NULL,
	`space_id` text,
	`lead_guard_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`cap_json` text DEFAULT '{}' NOT NULL,
	`merkle_root` text DEFAULT '' NOT NULL,
	`occurred_at` text NOT NULL,
	`contained_at` text,
	`closed_at` text,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vision_security_incidents_incident_id_unique` ON `vision_security_incidents` (`incident_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_incident_id` ON `vision_security_incidents` (`incident_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_incident_fac` ON `vision_security_incidents` (`facility_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_incident_status` ON `vision_security_incidents` (`status`);--> statement-breakpoint
CREATE INDEX `idx_vision_incident_severity` ON `vision_security_incidents` (`severity`);--> statement-breakpoint
CREATE INDEX `idx_vision_incident_occur` ON `vision_security_incidents` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `vision_threat_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`alert_id` text NOT NULL,
	`camera_id` text NOT NULL,
	`zone_id` text,
	`threat_type` text DEFAULT 'perimeter_intrusion' NOT NULL,
	`severity` text DEFAULT 'medium' NOT NULL,
	`confidence_score` real DEFAULT 0.85 NOT NULL,
	`bounding_polygon_json` text DEFAULT '[]' NOT NULL,
	`snapshot_url` text,
	`status` text DEFAULT 'active' NOT NULL,
	`detected_at` text NOT NULL,
	`resolved_at` text,
	`audit_hash` text DEFAULT '' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vision_threat_alerts_alert_id_unique` ON `vision_threat_alerts` (`alert_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_alert_id` ON `vision_threat_alerts` (`alert_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_alert_cam` ON `vision_threat_alerts` (`camera_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_alert_threat` ON `vision_threat_alerts` (`threat_type`);--> statement-breakpoint
CREATE INDEX `idx_vision_alert_severity` ON `vision_threat_alerts` (`severity`);--> statement-breakpoint
CREATE INDEX `idx_vision_alert_status` ON `vision_threat_alerts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_vision_alert_time` ON `vision_threat_alerts` (`detected_at`);--> statement-breakpoint
CREATE TABLE `vision_vehicle_whitelist` (
	`id` text PRIMARY KEY NOT NULL,
	`permit_id` text NOT NULL,
	`plate_number` text NOT NULL,
	`owner_name` text NOT NULL,
	`owner_type` text DEFAULT 'staff' NOT NULL,
	`owner_id` text,
	`vehicle_make_model` text,
	`vehicle_color` text,
	`valid_from` text NOT NULL,
	`valid_to` text,
	`is_blacklisted` integer DEFAULT false NOT NULL,
	`blacklist_reason` text,
	`status` text DEFAULT 'active' NOT NULL,
	`institution_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vision_vehicle_whitelist_permit_id_unique` ON `vision_vehicle_whitelist` (`permit_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `vision_vehicle_whitelist_plate_number_unique` ON `vision_vehicle_whitelist` (`plate_number`);--> statement-breakpoint
CREATE INDEX `idx_vision_whitelist_permit` ON `vision_vehicle_whitelist` (`permit_id`);--> statement-breakpoint
CREATE INDEX `idx_vision_whitelist_plate` ON `vision_vehicle_whitelist` (`plate_number`);--> statement-breakpoint
CREATE INDEX `idx_vision_whitelist_status` ON `vision_vehicle_whitelist` (`status`);--> statement-breakpoint
CREATE INDEX `idx_vision_whitelist_owner` ON `vision_vehicle_whitelist` (`owner_type`,`owner_id`);--> statement-breakpoint
CREATE TABLE `zasm_certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`serial_number` text NOT NULL,
	`service_name` text NOT NULL,
	`type` text NOT NULL,
	`certificate_pem` text NOT NULL,
	`public_key_pem` text NOT NULL,
	`fingerprint_sha256` text NOT NULL,
	`san_list` text,
	`valid_from` text NOT NULL,
	`valid_to` text NOT NULL,
	`is_revoked` integer DEFAULT false NOT NULL,
	`revocation_reason` text,
	`revoked_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zasm_certificates_serial_number_unique` ON `zasm_certificates` (`serial_number`);--> statement-breakpoint
CREATE INDEX `idx_zasm_certs_serial` ON `zasm_certificates` (`serial_number`);--> statement-breakpoint
CREATE INDEX `idx_zasm_certs_service` ON `zasm_certificates` (`service_name`);--> statement-breakpoint
CREATE INDEX `idx_zasm_certs_valid_to` ON `zasm_certificates` (`valid_to`);--> statement-breakpoint
CREATE TABLE `zasm_device_trust` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`tenant_id` text DEFAULT 'global' NOT NULL,
	`score` integer NOT NULL,
	`tier` text NOT NULL,
	`factor_breakdown` text,
	`penalties` text,
	`is_overridden` integer DEFAULT false NOT NULL,
	`override_reason` text,
	`evaluated_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_zasm_device_trust_device` ON `zasm_device_trust` (`device_id`);--> statement-breakpoint
CREATE INDEX `idx_zasm_device_trust_tier` ON `zasm_device_trust` (`tier`);--> statement-breakpoint
CREATE INDEX `idx_zasm_device_trust_tenant` ON `zasm_device_trust` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `zasm_forensic_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`primary_actor` text NOT NULL,
	`executive_summary` text NOT NULL,
	`technical_details` text,
	`timeline` text,
	`root_cause_graph` text,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`generated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_zasm_forensic_actor` ON `zasm_forensic_reports` (`primary_actor`);--> statement-breakpoint
CREATE INDEX `idx_zasm_forensic_incident` ON `zasm_forensic_reports` (`incident_id`);--> statement-breakpoint
CREATE TABLE `zasm_sbom_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`purl` text NOT NULL,
	`license` text,
	`sha256` text,
	`is_direct` integer DEFAULT true NOT NULL,
	`dependencies` text,
	`last_scanned_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_zasm_sbom_pkg_name` ON `zasm_sbom_packages` (`name`);--> statement-breakpoint
CREATE INDEX `idx_zasm_sbom_pkg_purl` ON `zasm_sbom_packages` (`purl`);--> statement-breakpoint
CREATE TABLE `zasm_sbom_vulnerabilities` (
	`id` text PRIMARY KEY NOT NULL,
	`cve_id` text NOT NULL,
	`package_name` text NOT NULL,
	`affected_versions` text NOT NULL,
	`patched_version` text,
	`severity` text NOT NULL,
	`cvss_score` real,
	`summary` text,
	`published_at` text,
	`advisory_url` text,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`detected_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_zasm_vuln_cve` ON `zasm_sbom_vulnerabilities` (`cve_id`);--> statement-breakpoint
CREATE INDEX `idx_zasm_vuln_pkg` ON `zasm_sbom_vulnerabilities` (`package_name`);--> statement-breakpoint
CREATE INDEX `idx_zasm_vuln_severity` ON `zasm_sbom_vulnerabilities` (`severity`);--> statement-breakpoint
CREATE TABLE `zasm_segmentation_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`priority` integer DEFAULT 100 NOT NULL,
	`action` text DEFAULT 'ALLOW' NOT NULL,
	`target_trust_tiers` text NOT NULL,
	`source_subnets` text,
	`dest_services` text,
	`protocols` text,
	`dest_ports` text,
	`vlan_tag` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`tenant_id` text DEFAULT 'global' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_zasm_policies_priority` ON `zasm_segmentation_policies` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_zasm_policies_action` ON `zasm_segmentation_policies` (`action`);--> statement-breakpoint
CREATE INDEX `idx_zasm_policies_enabled` ON `zasm_segmentation_policies` (`enabled`);