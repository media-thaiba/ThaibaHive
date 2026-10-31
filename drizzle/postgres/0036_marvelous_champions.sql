ALTER TABLE "academic_years" DROP CONSTRAINT "uq_ay_inst_id" CASCADE;--> statement-breakpoint
ALTER TABLE "staff_availability" DROP CONSTRAINT "staff_availability_staff_id_unique" CASCADE;--> statement-breakpoint
ALTER TABLE "staff_institutions" DROP CONSTRAINT "uq_staff_inst" CASCADE;--> statement-breakpoint
ALTER TABLE "staff_meal_preferences" DROP CONSTRAINT "staff_meal_preferences_staff_id_unique" CASCADE;--> statement-breakpoint
ALTER TABLE "students" DROP CONSTRAINT "uq_student_inst_id" CASCADE;--> statement-breakpoint
CREATE INDEX "idx_access_requests_status_routed_staff" ON "access_requests" USING btree ("status","routed_to_id","staff_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_communications_correlation_id" ON "ai_agent_communications" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "idx_ai_predictions_target_entity" ON "ai_predictions" USING btree ("target_entity_type","target_entity_id");--> statement-breakpoint
CREATE INDEX "idx_alert_delivery_logs_user_sent" ON "alert_delivery_logs" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_announcement_reads_announcement_staff_uniq" ON "announcement_reads" USING btree ("announcement_id","staff_id");--> statement-breakpoint
CREATE INDEX "idx_approval_delegations_delegate_id" ON "approval_delegations" USING btree ("delegate_id");--> statement-breakpoint
CREATE INDEX "idx_asset_service_history_asset_id" ON "asset_service_history" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_assets_assigned_status" ON "assets" USING btree ("assigned_to_id","status");--> statement-breakpoint
CREATE INDEX "idx_audit_log_entity" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_autonomous_workflows_status" ON "autonomous_workflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_biometric_logs_created_at" ON "biometric_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_bookings_resource_times" ON "bookings" USING btree ("resource_id","start_time","end_time");--> statement-breakpoint
CREATE INDEX "idx_canteen_transactions_pass_id" ON "canteen_transactions" USING btree ("pass_id");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_room_created" ON "chat_messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_checklist_template_items_template_id" ON "checklist_template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_circular_downloads_circular_id" ON "circular_downloads" USING btree ("circular_id");--> statement-breakpoint
CREATE INDEX "idx_conference_signals_room_deliv_created" ON "conference_signals" USING btree ("room_id","delivered","created_at");--> statement-breakpoint
CREATE INDEX "idx_daily_report_tasks_report_id" ON "daily_report_tasks" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "idx_device_fingerprints_composite_hash" ON "device_fingerprints" USING btree ("composite_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_dw_aggregated_analytics_region_inst_date_uniq" ON "dw_aggregated_analytics" USING btree ("regional_group_id","institution_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "idx_dw_etl_runs_status" ON "dw_etl_runs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_event_rsvps_event_staff_uniq" ON "event_rsvps" USING btree ("event_id","staff_id");--> statement-breakpoint
CREATE INDEX "idx_exam_audit_logs_exam_timestamp" ON "exam_audit_logs" USING btree ("exam_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_expense_claims_created_at" ON "expense_claims" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_field_work_sessions_staff_status" ON "field_work_sessions" USING btree ("staff_id","status");--> statement-breakpoint
CREATE INDEX "idx_fleet_maintenance_logs_vehicle_date" ON "fleet_maintenance_logs" USING btree ("vehicle_id","maintenance_date");--> statement-breakpoint
CREATE INDEX "idx_fleet_routes_driver_vehicle" ON "fleet_routes" USING btree ("driver_id","vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_grievances_status_staff" ON "grievances" USING btree ("status","staff_id");--> statement-breakpoint
CREATE INDEX "idx_help_desk_comments_ticket_id" ON "help_desk_comments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_help_desk_tickets_assigned_status" ON "help_desk_tickets" USING btree ("assigned_to_id","status");--> statement-breakpoint
CREATE INDEX "idx_beds_room_id" ON "hostel_beds" USING btree ("room_id","institution_id");--> statement-breakpoint
CREATE INDEX "idx_fines_inst_student" ON "hostel_fines" USING btree ("institution_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_pass_inst_status_valid" ON "hostel_gate_passes" USING btree ("institution_id","status","valid_until");--> statement-breakpoint
CREATE INDEX "idx_leave_requests_staff_dates" ON "leave_requests" USING btree ("staff_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_media_assets_created_at" ON "media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_media_downloads_asset_downloaded" ON "media_downloads" USING btree ("asset_id","downloaded_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_staff_read_created" ON "notifications" USING btree ("staff_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "idx_push_notification_subs_user_id" ON "push_notification_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_regional_access_logs_user_id" ON "regional_access_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_remediation_tickets_assigned_staff" ON "remediation_tickets" USING btree ("assigned_staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_staff_availability_staff_uniq" ON "staff_availability" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_staff_checklist_tasks_checklist_id" ON "staff_checklist_tasks" USING btree ("checklist_id");--> statement-breakpoint
CREATE INDEX "idx_staff_checklists_staff_status" ON "staff_checklists" USING btree ("staff_id","status");--> statement-breakpoint
CREATE INDEX "idx_staff_institutions_inst_staff" ON "staff_institutions" USING btree ("institution_id","staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_staff_meal_preferences_staff_id" ON "staff_meal_preferences" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_staff_recognition_date_recognized" ON "staff_recognition" USING btree ("date","recognized_by_id");--> statement-breakpoint
CREATE INDEX "idx_task_comments_task_id" ON "task_comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_used_nonces_expires_at" ON "used_nonces" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_vehicle_bookings_vehicle_date" ON "vehicle_bookings" USING btree ("vehicle_id","date");--> statement-breakpoint
CREATE INDEX "idx_visitor_passes_inst_status_valid" ON "visitor_passes" USING btree ("institution_id","status","valid_until");--> statement-breakpoint
CREATE INDEX "idx_visitor_requests_host_status" ON "visitor_requests" USING btree ("host_staff_id","status");