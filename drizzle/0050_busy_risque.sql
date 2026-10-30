DROP INDEX `uq_ay_inst_id`;--> statement-breakpoint
DROP INDEX `staff_availability_staff_id_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_staff_availability_staff_uniq` ON `staff_availability` (`staff_id`);--> statement-breakpoint
DROP INDEX `uq_staff_inst`;--> statement-breakpoint
CREATE INDEX `idx_staff_institutions_inst_staff` ON `staff_institutions` (`institution_id`,`staff_id`);--> statement-breakpoint
DROP INDEX `staff_meal_preferences_staff_id_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_staff_meal_preferences_staff_id` ON `staff_meal_preferences` (`staff_id`);--> statement-breakpoint
DROP INDEX `uq_student_inst_id`;--> statement-breakpoint
CREATE INDEX `idx_access_requests_status_routed_staff` ON `access_requests` (`status`,`routed_to_id`,`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_agent_communications_correlation_id` ON `ai_agent_communications` (`correlation_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_predictions_target_entity` ON `ai_predictions` (`target_entity_type`,`target_entity_id`);--> statement-breakpoint
CREATE INDEX `idx_alert_delivery_logs_user_sent` ON `alert_delivery_logs` (`user_id`,`sent_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_announcement_reads_announcement_staff_uniq` ON `announcement_reads` (`announcement_id`,`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_approval_delegations_delegate_id` ON `approval_delegations` (`delegate_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_service_history_asset_id` ON `asset_service_history` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_assets_assigned_status` ON `assets` (`assigned_to_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_entity` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_created_at` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_autonomous_workflows_status` ON `autonomous_workflows` (`status`);--> statement-breakpoint
CREATE INDEX `idx_biometric_logs_created_at` ON `biometric_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_bookings_resource_times` ON `bookings` (`resource_id`,`start_time`,`end_time`);--> statement-breakpoint
CREATE INDEX `idx_canteen_transactions_pass_id` ON `canteen_transactions` (`pass_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_messages_room_created` ON `chat_messages` (`room_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_checklist_template_items_template_id` ON `checklist_template_items` (`template_id`);--> statement-breakpoint
CREATE INDEX `idx_circular_downloads_circular_id` ON `circular_downloads` (`circular_id`);--> statement-breakpoint
CREATE INDEX `idx_conference_signals_room_deliv_created` ON `conference_signals` (`room_id`,`delivered`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_daily_report_tasks_report_id` ON `daily_report_tasks` (`report_id`);--> statement-breakpoint
CREATE INDEX `idx_device_fingerprints_composite_hash` ON `device_fingerprints` (`composite_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_dw_aggregated_analytics_region_inst_date_uniq` ON `dw_aggregated_analytics` (`regional_group_id`,`institution_id`,`snapshot_date`);--> statement-breakpoint
CREATE INDEX `idx_dw_etl_runs_status` ON `dw_etl_runs` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_event_rsvps_event_staff_uniq` ON `event_rsvps` (`event_id`,`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_exam_audit_logs_exam_timestamp` ON `exam_audit_logs` (`exam_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_expense_claims_created_at` ON `expense_claims` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_field_work_sessions_staff_status` ON `field_work_sessions` (`staff_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_fleet_maintenance_logs_vehicle_date` ON `fleet_maintenance_logs` (`vehicle_id`,`maintenance_date`);--> statement-breakpoint
CREATE INDEX `idx_fleet_routes_driver_vehicle` ON `fleet_routes` (`driver_id`,`vehicle_id`);--> statement-breakpoint
CREATE INDEX `idx_grievances_status_staff` ON `grievances` (`status`,`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_help_desk_comments_ticket_id` ON `help_desk_comments` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `idx_help_desk_tickets_assigned_status` ON `help_desk_tickets` (`assigned_to_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_beds_room_id` ON `hostel_beds` (`room_id`,`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_fines_inst_student` ON `hostel_fines` (`institution_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_pass_inst_status_valid` ON `hostel_gate_passes` (`institution_id`,`status`,`valid_until`);--> statement-breakpoint
CREATE INDEX `idx_leave_requests_staff_dates` ON `leave_requests` (`staff_id`,`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `idx_media_assets_created_at` ON `media_assets` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_media_downloads_asset_downloaded` ON `media_downloads` (`asset_id`,`downloaded_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_staff_read_created` ON `notifications` (`staff_id`,`is_read`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_push_notification_subs_user_id` ON `push_notification_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_regional_access_logs_user_id` ON `regional_access_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_remediation_tickets_assigned_staff` ON `remediation_tickets` (`assigned_staff_id`);--> statement-breakpoint
CREATE INDEX `idx_staff_checklist_tasks_checklist_id` ON `staff_checklist_tasks` (`checklist_id`);--> statement-breakpoint
CREATE INDEX `idx_staff_checklists_staff_status` ON `staff_checklists` (`staff_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_staff_recognition_date_recognized` ON `staff_recognition` (`date`,`recognized_by_id`);--> statement-breakpoint
CREATE INDEX `idx_task_comments_task_id` ON `task_comments` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_used_nonces_expires_at` ON `used_nonces` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_vehicle_bookings_vehicle_date` ON `vehicle_bookings` (`vehicle_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_visitor_passes_inst_status_valid` ON `visitor_passes` (`institution_id`,`status`,`valid_until`);--> statement-breakpoint
CREATE INDEX `idx_visitor_requests_host_status` ON `visitor_requests` (`host_staff_id`,`status`);