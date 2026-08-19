CREATE TABLE "agent_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"target_asset" text NOT NULL,
	"severity" text NOT NULL,
	"decision" text NOT NULL,
	"action_status" text NOT NULL,
	"rollback_state" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"log_level" text NOT NULL,
	"message" text NOT NULL,
	"timestamp" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"version" text NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"last_heartbeat" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agent_communications" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"sender_agent_id" text NOT NULL,
	"recipient_agent_id" text NOT NULL,
	"message_type" text NOT NULL,
	"payload_json" text NOT NULL,
	"hop_count" integer DEFAULT 1 NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agent_reasoning_contexts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"input_payload_json" text NOT NULL,
	"reasoning_graph_json" text,
	"confidence_score" double precision NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agents" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"agent_type" text NOT NULL,
	"domain" text NOT NULL,
	"name" text NOT NULL,
	"capabilities_json" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_anomalies" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"anomaly_type" text NOT NULL,
	"severity" text NOT NULL,
	"description" text NOT NULL,
	"metric_data" text,
	"status" text DEFAULT 'unresolved' NOT NULL,
	"resolved_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_copilot_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"title" text NOT NULL,
	"domain" text NOT NULL,
	"summary" text NOT NULL,
	"context_data_json" text,
	"suggested_action_json" text,
	"confidence_score" double precision NOT NULL,
	"human_approval_status" text DEFAULT 'REQUIRES_HUMAN_APPROVAL' NOT NULL,
	"action_taken_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_models" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"model_name" text NOT NULL,
	"domain" text NOT NULL,
	"version" text NOT NULL,
	"accuracy_score" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_trained_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_predictions" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"domain" text NOT NULL,
	"target_entity_id" text NOT NULL,
	"target_entity_type" text NOT NULL,
	"prediction_type" text NOT NULL,
	"risk_level" text NOT NULL,
	"confidence_score" double precision NOT NULL,
	"predicted_value" text,
	"risk_factors" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_delivery_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"alert_id" text NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text,
	"channel" text NOT NULL,
	"delivery_status" text NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"error_message" text,
	"sent_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_usage_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"region" text NOT NULL,
	"endpoint_path" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"total_latency_ms" integer DEFAULT 0 NOT NULL,
	"cache_hit_count" integer DEFAULT 0 NOT NULL,
	"timestamp" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automated_trigger_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rule_name" text NOT NULL,
	"event_type" text NOT NULL,
	"conditions_json" text NOT NULL,
	"action_channel" text NOT NULL,
	"recipient_group" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "autonomous_workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"name" text NOT NULL,
	"trigger_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"last_executed_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "background_sync_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"records_failed" integer DEFAULT 0 NOT NULL,
	"execution_duration_ms" double precision DEFAULT 0 NOT NULL,
	"battery_level" double precision,
	"network_type" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_simulation_scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"scenario_name" text NOT NULL,
	"created_by_id" text NOT NULL,
	"parameters_json" text NOT NULL,
	"impact_projections_json" text NOT NULL,
	"variance_percentage" double precision NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cache_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"cache_key" text NOT NULL,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"executed_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canteen_items" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'snacks' NOT NULL,
	"price" double precision NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"dietary_flags" text,
	"image_url" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canteen_meal_passes" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"user_id" text NOT NULL,
	"pass_code" text NOT NULL,
	"balance" double precision DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"daily_limit" double precision,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "canteen_meal_passes_pass_code_unique" UNIQUE("pass_code")
);
--> statement-breakpoint
CREATE TABLE "canteen_menus" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"date" text NOT NULL,
	"meal_type" text NOT NULL,
	"items_json" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canteen_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"pass_id" text NOT NULL,
	"pass_code" text NOT NULL,
	"user_id" text NOT NULL,
	"items_json" text NOT NULL,
	"total_amount" double precision NOT NULL,
	"idempotency_key" text,
	"cashier_staff_id" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "canteen_transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "circuit_breaker_states" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"service_name" text NOT NULL,
	"state" text DEFAULT 'CLOSED' NOT NULL,
	"failure_rate" double precision DEFAULT 0 NOT NULL,
	"median_latency_ms" double precision DEFAULT 0 NOT NULL,
	"tripped_at" text,
	"cooldown_until" text,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cluster_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"node_id" text NOT NULL,
	"role" text NOT NULL,
	"endpoint" text NOT NULL,
	"is_healthy" boolean DEFAULT true NOT NULL,
	"replication_lag_ms" integer DEFAULT 0 NOT NULL,
	"last_checked_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "cluster_nodes_node_id_unique" UNIQUE("node_id")
);
--> statement-breakpoint
CREATE TABLE "competency_frameworks" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"name" text NOT NULL,
	"department_id" text,
	"role_scope" text DEFAULT 'all',
	"metrics_json" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_audit_vault" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"event_type" text NOT NULL,
	"previous_hash" text NOT NULL,
	"record_hash" text NOT NULL,
	"payload_json" text NOT NULL,
	"signature" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_role" text NOT NULL,
	"timestamp" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_frameworks" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"authority" text NOT NULL,
	"rules_json" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "compliance_frameworks_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "compliance_report_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"framework_code" text NOT NULL,
	"compliance_score" double precision NOT NULL,
	"vault_integrity_status" text DEFAULT 'VALIDATED' NOT NULL,
	"findings_json" text,
	"generated_by" text NOT NULL,
	"generated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"framework" text NOT NULL,
	"status" text NOT NULL,
	"findings" jsonb,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conflict_events" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"local_region" text NOT NULL,
	"remote_region" text NOT NULL,
	"winner_region" text NOT NULL,
	"conflicting_fields_json" text,
	"resolved_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cross_tenant_role_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"source_tenant_id" text NOT NULL,
	"target_tenant_id" text NOT NULL,
	"source_role" text NOT NULL,
	"target_role" text NOT NULL,
	"permissions_json" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_lakehouse_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"domain" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"file_size_bytes" integer DEFAULT 0 NOT NULL,
	"partition_path" text,
	"execution_duration_ms" double precision DEFAULT 0,
	"error_message" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"completed_at" text
);
--> statement-breakpoint
CREATE TABLE "data_lakehouse_partitions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"domain" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"partition_path" text NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"file_size_bytes" integer DEFAULT 0 NOT NULL,
	"last_watermark" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "data_lakehouse_partitions_partition_path_unique" UNIQUE("partition_path")
);
--> statement-breakpoint
CREATE TABLE "database_index_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"query_signature" text NOT NULL,
	"table_target" text NOT NULL,
	"avg_execution_ms" double precision NOT NULL,
	"execution_count" integer DEFAULT 1 NOT NULL,
	"recommended_index_sql" text NOT NULL,
	"estimated_speedup_ratio" double precision DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"review_id" text,
	"title" text NOT NULL,
	"action_items_json" text NOT NULL,
	"target_completion_date" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dlq_retry_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"job_type" text NOT NULL,
	"payload_json" text NOT NULL,
	"error_message" text,
	"stack_trace" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"next_retry_at" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dw_aggregated_analytics" (
	"id" text PRIMARY KEY NOT NULL,
	"regional_group_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"snapshot_date" text NOT NULL,
	"attendance_rate" double precision NOT NULL,
	"fee_realization_rate" double precision NOT NULL,
	"academic_pass_rate" double precision NOT NULL,
	"ai_risk_student_count" integer DEFAULT 0 NOT NULL,
	"active_anomaly_count" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dw_etl_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"regional_group_id" text,
	"run_type" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"error_message" text,
	"started_at" text DEFAULT (current_timestamp) NOT NULL,
	"completed_at" text
);
--> statement-breakpoint
CREATE TABLE "dw_materialized_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"regional_group_id" text NOT NULL,
	"snapshot_type" text NOT NULL,
	"data_payload" text NOT NULL,
	"generated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edge_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"node_region" text NOT NULL,
	"node_name" text NOT NULL,
	"endpoint" text NOT NULL,
	"status" text DEFAULT 'ONLINE' NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"last_heartbeat" text DEFAULT (current_timestamp) NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "edge_nodes_node_region_unique" UNIQUE("node_region")
);
--> statement-breakpoint
CREATE TABLE "enrollment_forecasts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"academic_year_id" text,
	"projected_enrollment" integer NOT NULL,
	"utilization_percentage" double precision NOT NULL,
	"forecast_metadata_json" text,
	"generated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_forms" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"framework_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metrics_config_json" text NOT NULL,
	"rating_scale" text DEFAULT '1-5',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"exam_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"performed_by_staff_id" text,
	"previous_state" text,
	"new_state" text,
	"reason" text,
	"timestamp" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"exam_id" text NOT NULL,
	"course_id" text,
	"subject_name" text NOT NULL,
	"exam_date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"duration_minutes" integer DEFAULT 180 NOT NULL,
	"max_marks" double precision DEFAULT 100 NOT NULL,
	"pass_marks" double precision DEFAULT 40 NOT NULL,
	"room_number" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"title" text NOT NULL,
	"academic_year" text NOT NULL,
	"term" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"grade_scale_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "failover_events" (
	"id" text PRIMARY KEY NOT NULL,
	"failed_primary_id" text NOT NULL,
	"promoted_node_id" text NOT NULL,
	"recovery_duration_ms" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"executed_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "federated_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"institution_id" text,
	"action" text NOT NULL,
	"actor_id" text NOT NULL,
	"severity" text DEFAULT 'INFO' NOT NULL,
	"details_json" text NOT NULL,
	"anonymized" boolean DEFAULT false NOT NULL,
	"logged_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "federated_identity_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"provider_type" text NOT NULL,
	"external_subject_id" text NOT NULL,
	"mapped_role" text DEFAULT 'staff' NOT NULL,
	"attributes_json" text,
	"last_login_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "federated_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"content_json" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"sha256_hash" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"effective_date" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "federated_services" (
	"id" text PRIMARY KEY NOT NULL,
	"service_name" text NOT NULL,
	"endpoint" text NOT NULL,
	"schema_definition" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"last_reloaded_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "federated_services_service_name_unique" UNIQUE("service_name")
);
--> statement-breakpoint
CREATE TABLE "feedback_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"review_id" text NOT NULL,
	"requester_staff_id" text NOT NULL,
	"peer_staff_id" text NOT NULL,
	"feedback_text" text,
	"rating" double precision,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_budget_models" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"fiscal_year" text NOT NULL,
	"target_budget_amount" double precision NOT NULL,
	"baseline_velocity" double precision DEFAULT 1 NOT NULL,
	"historical_coefficients_json" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_forecast_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"horizon_days" integer DEFAULT 90 NOT NULL,
	"forecast_p10" double precision NOT NULL,
	"forecast_p50" double precision NOT NULL,
	"forecast_p90" double precision NOT NULL,
	"realization_deficit_percent" double precision NOT NULL,
	"risk_level" text DEFAULT 'low_risk' NOT NULL,
	"generated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_maintenance_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"vehicle_id" text NOT NULL,
	"maintenance_date" text NOT NULL,
	"service_type" text NOT NULL,
	"cost" double precision DEFAULT 0 NOT NULL,
	"odometer_reading" integer,
	"description" text,
	"performed_by" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_routes" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"name" text NOT NULL,
	"start_location" text NOT NULL,
	"end_location" text NOT NULL,
	"stops_json" text,
	"driver_id" text,
	"vehicle_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gate_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"pass_id" text,
	"visitor_name" text NOT NULL,
	"action_type" text NOT NULL,
	"timestamp" text DEFAULT (current_timestamp) NOT NULL,
	"gatekeeper_id" text,
	"device_id" text,
	"is_offline_sync" boolean DEFAULT false NOT NULL,
	"sync_timestamp" text,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grade_scales" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"name" text NOT NULL,
	"scale_type" text DEFAULT '10_point' NOT NULL,
	"rules_json" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hall_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"exam_id" text NOT NULL,
	"student_id" text NOT NULL,
	"ticket_number" text NOT NULL,
	"fee_cleared" boolean DEFAULT false NOT NULL,
	"override_fee_lock" boolean DEFAULT false NOT NULL,
	"override_reason" text,
	"override_by_staff_id" text,
	"qr_payload" text NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"issued_at" text DEFAULT (current_timestamp) NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "hall_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "index_tuning_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"recommendation_id" text NOT NULL,
	"action" text NOT NULL,
	"index_name" text NOT NULL,
	"execution_duration_ms" double precision DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "index_tuning_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"recommended_index_name" text NOT NULL,
	"index_ddl" text NOT NULL,
	"seq_scans" integer DEFAULT 0 NOT NULL,
	"est_time_savings_ms" double precision DEFAULT 0 NOT NULL,
	"risk_level" text DEFAULT 'LOW' NOT NULL,
	"status" text DEFAULT 'RECOMMENDED' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution_clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"regional_group_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"cluster_category" text DEFAULT 'standard' NOT NULL,
	"assigned_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_path_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"student_id" text NOT NULL,
	"path_title" text NOT NULL,
	"priority" text NOT NULL,
	"suggested_action_items_json" text,
	"target_completion_days" integer DEFAULT 30 NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mark_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"exam_schedule_id" text NOT NULL,
	"student_id" text NOT NULL,
	"marks_obtained" double precision,
	"max_marks" double precision DEFAULT 100 NOT NULL,
	"is_absent" boolean DEFAULT false NOT NULL,
	"evaluator_token" text,
	"double_blind" boolean DEFAULT false NOT NULL,
	"remarks" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"entered_by_staff_id" text,
	"moderated_by_staff_id" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mdm_enrolled_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"device_uuid" text NOT NULL,
	"device_model" text,
	"os_version" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"enrolled_at" text DEFAULT (current_timestamp) NOT NULL,
	"last_sync_at" text,
	CONSTRAINT "mdm_enrolled_devices_device_uuid_unique" UNIQUE("device_uuid")
);
--> statement-breakpoint
CREATE TABLE "mdm_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"platform" text NOT NULL,
	"profile_name" text NOT NULL,
	"config_payload_xml" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mesh_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"region_id" text NOT NULL,
	"node_name" text NOT NULL,
	"endpoint" text NOT NULL,
	"status" text DEFAULT 'ONLINE' NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"last_heartbeat" text DEFAULT (current_timestamp) NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "mesh_nodes_region_id_unique" UNIQUE("region_id")
);
--> statement-breakpoint
CREATE TABLE "migration_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"migration_name" text NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"started_at" text DEFAULT (current_timestamp) NOT NULL,
	"completed_at" text
);
--> statement-breakpoint
CREATE TABLE "negotiation_bids" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"bid_amount" double precision NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiation_outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"winner_id" text NOT NULL,
	"final_price" double precision NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_dispatch_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"rule_id" text,
	"channel" text NOT NULL,
	"recipient_id" text NOT NULL,
	"payload_json" text NOT NULL,
	"dispatch_status" text DEFAULT 'SENT' NOT NULL,
	"error_message" text,
	"dispatched_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offline_sync_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"mutation_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"payload_json" text NOT NULL,
	"client_timestamp" text NOT NULL,
	"sync_status" text DEFAULT 'PENDING' NOT NULL,
	"conflict_details_json" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oidc_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"issuer_url" text NOT NULL,
	"discovery_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"title" text NOT NULL,
	"cycle_type" text DEFAULT 'quarterly' NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"self_assessment_deadline" text NOT NULL,
	"manager_review_deadline" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"review_id" text,
	"title" text NOT NULL,
	"description" text,
	"target_date" text NOT NULL,
	"progress_percentage" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"policy_id" text NOT NULL,
	"version" integer NOT NULL,
	"sha256_hash" text NOT NULL,
	"content_json" text NOT NULL,
	"created_by_id" text NOT NULL,
	"change_log" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictive_models" (
	"id" text PRIMARY KEY NOT NULL,
	"model_name" text NOT NULL,
	"version" text NOT NULL,
	"precision_score" double precision DEFAULT 0 NOT NULL,
	"recall_score" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "predictive_models_model_name_unique" UNIQUE("model_name")
);
--> statement-breakpoint
CREATE TABLE "push_notification_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"institution_id" text,
	"device_token" text NOT NULL,
	"platform" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" text DEFAULT (current_timestamp) NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "push_notification_subscriptions_device_token_unique" UNIQUE("device_token")
);
--> statement-breakpoint
CREATE TABLE "push_notification_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" text DEFAULT 'android' NOT NULL,
	"device_model" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "push_notification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "realtime_stream_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"connection_type" text DEFAULT 'websocket' NOT NULL,
	"channels_json" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_ping_at" text DEFAULT (current_timestamp) NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redis_circuit_breaker_states" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"circuit_key" text NOT NULL,
	"state" text DEFAULT 'CLOSED' NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_tripped_at" text,
	"expires_at" text,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "redis_circuit_breaker_states_circuit_key_unique" UNIQUE("circuit_key")
);
--> statement-breakpoint
CREATE TABLE "regional_access_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"regional_group_id" text NOT NULL,
	"role" text NOT NULL,
	"granted_by" text NOT NULL,
	"expires_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regional_access_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"regional_group_id" text NOT NULL,
	"action" text NOT NULL,
	"target_entity" text,
	"details" text,
	"ip_address" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regional_benchmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"regional_group_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"metric_domain" text NOT NULL,
	"period" text NOT NULL,
	"raw_score" double precision NOT NULL,
	"normalized_score" double precision NOT NULL,
	"percentile_rank" double precision NOT NULL,
	"rank_position" integer NOT NULL,
	"calculated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regional_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"regional_director_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "regional_groups_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "regional_hod_rankings" (
	"id" text PRIMARY KEY NOT NULL,
	"regional_group_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"hod_staff_id" text NOT NULL,
	"discipline" text NOT NULL,
	"composite_score" double precision NOT NULL,
	"rank_position" integer NOT NULL,
	"performance_factors" text,
	"evaluated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remediation_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"action_type" text NOT NULL,
	"executor_type" text DEFAULT 'autonomous_engine' NOT NULL,
	"details_json" text,
	"status" text DEFAULT 'success' NOT NULL,
	"executed_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remediation_escalation_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"recipient_role" text NOT NULL,
	"channel" text NOT NULL,
	"message_body" text NOT NULL,
	"delivery_status" text DEFAULT 'sent' NOT NULL,
	"sent_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remediation_history" (
	"id" text PRIMARY KEY NOT NULL,
	"compliance_finding_id" text NOT NULL,
	"action_triggered" text NOT NULL,
	"approval_key" text,
	"approval_status" text NOT NULL,
	"outcome" text NOT NULL,
	"rollback_status" text NOT NULL,
	"created_at" text NOT NULL,
	"institution_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remediation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"anomaly_type" text NOT NULL,
	"severity_threshold" text DEFAULT 'high' NOT NULL,
	"action_pipeline_json" text NOT NULL,
	"cooldown_period_minutes" integer DEFAULT 1440 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remediation_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"anomaly_id" text,
	"rule_id" text,
	"title" text NOT NULL,
	"severity" text NOT NULL,
	"category" text NOT NULL,
	"affected_student_id" text,
	"assigned_staff_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"auto_created" boolean DEFAULT true NOT NULL,
	"resolution_summary" text,
	"resolved_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replication_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"source_region" text NOT NULL,
	"target_region" text NOT NULL,
	"mutations_count" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"batch_checksum" text NOT NULL,
	"error_message" text,
	"executed_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saml_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"idp_entity_id" text NOT NULL,
	"sso_url" text NOT NULL,
	"x509_certificate" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stream_recordings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"room_id" text NOT NULL,
	"stream_id" text NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"file_size_bytes" integer DEFAULT 0 NOT NULL,
	"recording_url" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaming_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"room_name" text NOT NULL,
	"host_user_id" text NOT NULL,
	"max_participants" integer DEFAULT 250 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaming_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"participant_user_id" text NOT NULL,
	"role" text DEFAULT 'ATTENDEE' NOT NULL,
	"audio_muted" boolean DEFAULT true NOT NULL,
	"video_muted" boolean DEFAULT false NOT NULL,
	"joined_at" text DEFAULT (current_timestamp) NOT NULL,
	"left_at" text
);
--> statement-breakpoint
CREATE TABLE "student_retention_predictions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"student_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"at_risk_score" double precision NOT NULL,
	"risk_category" text NOT NULL,
	"contributing_factors_json" text,
	"recommended_intervention_json" text,
	"predicted_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_risk_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"student_id" text NOT NULL,
	"risk_score" integer NOT NULL,
	"risk_level" text NOT NULL,
	"confidence_score" double precision DEFAULT 0 NOT NULL,
	"primary_drivers_json" text,
	"assessed_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swarm_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_source" text NOT NULL,
	"severity" text NOT NULL,
	"message" text NOT NULL,
	"timestamp" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swarm_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"node_id" text NOT NULL,
	"metric_name" text NOT NULL,
	"metric_value" double precision NOT NULL,
	"timestamp" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swarm_negotiations" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"institution_id" text,
	"status" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swarm_topology" (
	"id" text PRIMARY KEY NOT NULL,
	"node_id" text NOT NULL,
	"tier" text NOT NULL,
	"status" text NOT NULL,
	"last_seen_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_conflict_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"field_name" text NOT NULL,
	"winning_value" text,
	"losing_value" text,
	"resolution_strategy" text DEFAULT 'LWW' NOT NULL,
	"resolved_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_device_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"device_model" text,
	"os_version" text,
	"app_version" text,
	"push_token" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_active_at" text DEFAULT (current_timestamp) NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_states" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"device_id" text NOT NULL,
	"user_id" text NOT NULL,
	"last_sync_version" integer DEFAULT 0 NOT NULL,
	"last_sync_at" text NOT NULL,
	"device_platform" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_tuning_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"network_type" text NOT NULL,
	"min_bandwidth_kbps" integer DEFAULT 0 NOT NULL,
	"max_latency_ms" integer DEFAULT 0 NOT NULL,
	"batch_size" integer DEFAULT 50 NOT NULL,
	"compression_level" integer DEFAULT 1 NOT NULL,
	"retry_backoff_ms" integer DEFAULT 5000 NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "sync_tuning_policies_network_type_unique" UNIQUE("network_type")
);
--> statement-breakpoint
CREATE TABLE "tabulation_registers" (
	"id" text PRIMARY KEY NOT NULL,
	"exam_id" text NOT NULL,
	"student_id" text NOT NULL,
	"total_marks" double precision DEFAULT 0 NOT NULL,
	"percentage" double precision DEFAULT 0 NOT NULL,
	"gpa" double precision DEFAULT 0 NOT NULL,
	"letter_grade" text DEFAULT 'F' NOT NULL,
	"result_status" text DEFAULT 'pending' NOT NULL,
	"rank" integer,
	"published_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_series_decompositions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"metric_name" text NOT NULL,
	"granularity" text DEFAULT 'monthly' NOT NULL,
	"observed_json" text NOT NULL,
	"trend_json" text NOT NULL,
	"seasonal_json" text NOT NULL,
	"residual_json" text NOT NULL,
	"anomalies_json" text,
	"decomposed_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_passes" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"request_id" text,
	"visitor_name" text NOT NULL,
	"visitor_phone" text NOT NULL,
	"host_staff_id" text NOT NULL,
	"purpose" text NOT NULL,
	"qr_signature" text NOT NULL,
	"valid_from" text NOT NULL,
	"valid_until" text NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"check_in_at" text,
	"check_out_at" text,
	"gatekeeper_id" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"visitor_name" text NOT NULL,
	"visitor_phone" text NOT NULL,
	"visitor_email" text,
	"id_type" text,
	"id_number" text,
	"host_staff_id" text NOT NULL,
	"purpose" text NOT NULL,
	"expected_date" text NOT NULL,
	"expected_time_window" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_query_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"transcript" text NOT NULL,
	"confidence_score" double precision DEFAULT 1 NOT NULL,
	"parsed_intent" text NOT NULL,
	"entity_params_json" text,
	"execution_duration_ms" double precision DEFAULT 0 NOT NULL,
	"audio_format" text DEFAULT 'pcm' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "performance_reviews" ALTER COLUMN "reviewer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_reviews" ALTER COLUMN "period" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_reviews" ALTER COLUMN "rating" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "performance_reviews" ALTER COLUMN "goals" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "performance_reviews" ALTER COLUMN "status" SET DEFAULT 'self_assessment';--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "cycle_id" text;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "evaluator_staff_id" text;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "form_template_id" text;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "self_score" double precision;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "manager_score" double precision;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "final_score" double precision;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "grade" text;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "self_comments" text;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "hr_comments" text;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "ratings_json" text;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "submitted_at" text;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD COLUMN "approved_at" text;--> statement-breakpoint
ALTER TABLE "ai_agent_communications" ADD CONSTRAINT "ai_agent_communications_sender_agent_id_ai_agents_id_fk" FOREIGN KEY ("sender_agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_communications" ADD CONSTRAINT "ai_agent_communications_recipient_agent_id_ai_agents_id_fk" FOREIGN KEY ("recipient_agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_reasoning_contexts" ADD CONSTRAINT "ai_agent_reasoning_contexts_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_anomalies" ADD CONSTRAINT "ai_anomalies_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_copilot_recommendations" ADD CONSTRAINT "ai_copilot_recommendations_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_predictions" ADD CONSTRAINT "ai_predictions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomous_workflows" ADD CONSTRAINT "autonomous_workflows_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_items" ADD CONSTRAINT "canteen_items_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_meal_passes" ADD CONSTRAINT "canteen_meal_passes_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_menus" ADD CONSTRAINT "canteen_menus_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_transactions" ADD CONSTRAINT "canteen_transactions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_transactions" ADD CONSTRAINT "canteen_transactions_pass_id_canteen_meal_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."canteen_meal_passes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_transactions" ADD CONSTRAINT "canteen_transactions_cashier_staff_id_staff_id_fk" FOREIGN KEY ("cashier_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_frameworks" ADD CONSTRAINT "competency_frameworks_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competency_frameworks" ADD CONSTRAINT "competency_frameworks_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_report_runs" ADD CONSTRAINT "compliance_report_runs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_review_id_performance_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."performance_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dw_aggregated_analytics" ADD CONSTRAINT "dw_aggregated_analytics_regional_group_id_regional_groups_id_fk" FOREIGN KEY ("regional_group_id") REFERENCES "public"."regional_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dw_aggregated_analytics" ADD CONSTRAINT "dw_aggregated_analytics_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dw_etl_runs" ADD CONSTRAINT "dw_etl_runs_regional_group_id_regional_groups_id_fk" FOREIGN KEY ("regional_group_id") REFERENCES "public"."regional_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dw_materialized_snapshots" ADD CONSTRAINT "dw_materialized_snapshots_regional_group_id_regional_groups_id_fk" FOREIGN KEY ("regional_group_id") REFERENCES "public"."regional_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_forecasts" ADD CONSTRAINT "enrollment_forecasts_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_forecasts" ADD CONSTRAINT "enrollment_forecasts_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_forms" ADD CONSTRAINT "evaluation_forms_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_forms" ADD CONSTRAINT "evaluation_forms_framework_id_competency_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."competency_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_audit_logs" ADD CONSTRAINT "exam_audit_logs_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_audit_logs" ADD CONSTRAINT "exam_audit_logs_performed_by_staff_id_staff_id_fk" FOREIGN KEY ("performed_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_grade_scale_id_grade_scales_id_fk" FOREIGN KEY ("grade_scale_id") REFERENCES "public"."grade_scales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "federated_audit_logs" ADD CONSTRAINT "federated_audit_logs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_requests" ADD CONSTRAINT "feedback_requests_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_requests" ADD CONSTRAINT "feedback_requests_review_id_performance_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."performance_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_requests" ADD CONSTRAINT "feedback_requests_requester_staff_id_staff_id_fk" FOREIGN KEY ("requester_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_requests" ADD CONSTRAINT "feedback_requests_peer_staff_id_staff_id_fk" FOREIGN KEY ("peer_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_budget_models" ADD CONSTRAINT "financial_budget_models_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_forecast_runs" ADD CONSTRAINT "financial_forecast_runs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_maintenance_logs" ADD CONSTRAINT "fleet_maintenance_logs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_maintenance_logs" ADD CONSTRAINT "fleet_maintenance_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_routes" ADD CONSTRAINT "fleet_routes_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_routes" ADD CONSTRAINT "fleet_routes_driver_id_staff_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_routes" ADD CONSTRAINT "fleet_routes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_logs" ADD CONSTRAINT "gate_logs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_logs" ADD CONSTRAINT "gate_logs_pass_id_visitor_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."visitor_passes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_logs" ADD CONSTRAINT "gate_logs_gatekeeper_id_staff_id_fk" FOREIGN KEY ("gatekeeper_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_scales" ADD CONSTRAINT "grade_scales_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_tickets" ADD CONSTRAINT "hall_tickets_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_tickets" ADD CONSTRAINT "hall_tickets_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_tickets" ADD CONSTRAINT "hall_tickets_override_by_staff_id_staff_id_fk" FOREIGN KEY ("override_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_clusters" ADD CONSTRAINT "institution_clusters_regional_group_id_regional_groups_id_fk" FOREIGN KEY ("regional_group_id") REFERENCES "public"."regional_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_clusters" ADD CONSTRAINT "institution_clusters_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_exam_schedule_id_exam_schedules_id_fk" FOREIGN KEY ("exam_schedule_id") REFERENCES "public"."exam_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_entered_by_staff_id_staff_id_fk" FOREIGN KEY ("entered_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_moderated_by_staff_id_staff_id_fk" FOREIGN KEY ("moderated_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_dispatch_logs" ADD CONSTRAINT "notification_dispatch_logs_rule_id_automated_trigger_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automated_trigger_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_cycles" ADD CONSTRAINT "performance_cycles_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_review_id_performance_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."performance_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_policy_id_federated_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."federated_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notification_subscriptions" ADD CONSTRAINT "push_notification_subscriptions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regional_access_grants" ADD CONSTRAINT "regional_access_grants_regional_group_id_regional_groups_id_fk" FOREIGN KEY ("regional_group_id") REFERENCES "public"."regional_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regional_benchmarks" ADD CONSTRAINT "regional_benchmarks_regional_group_id_regional_groups_id_fk" FOREIGN KEY ("regional_group_id") REFERENCES "public"."regional_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regional_benchmarks" ADD CONSTRAINT "regional_benchmarks_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regional_hod_rankings" ADD CONSTRAINT "regional_hod_rankings_regional_group_id_regional_groups_id_fk" FOREIGN KEY ("regional_group_id") REFERENCES "public"."regional_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regional_hod_rankings" ADD CONSTRAINT "regional_hod_rankings_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regional_hod_rankings" ADD CONSTRAINT "regional_hod_rankings_hod_staff_id_staff_id_fk" FOREIGN KEY ("hod_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_actions" ADD CONSTRAINT "remediation_actions_ticket_id_remediation_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."remediation_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_escalation_logs" ADD CONSTRAINT "remediation_escalation_logs_ticket_id_remediation_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."remediation_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_rules" ADD CONSTRAINT "remediation_rules_workflow_id_autonomous_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."autonomous_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_rules" ADD CONSTRAINT "remediation_rules_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_tickets" ADD CONSTRAINT "remediation_tickets_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_tickets" ADD CONSTRAINT "remediation_tickets_rule_id_remediation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."remediation_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_tickets" ADD CONSTRAINT "remediation_tickets_assigned_staff_id_staff_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_retention_predictions" ADD CONSTRAINT "student_retention_predictions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_retention_predictions" ADD CONSTRAINT "student_retention_predictions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_conflict_logs" ADD CONSTRAINT "sync_conflict_logs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_device_registrations" ADD CONSTRAINT "sync_device_registrations_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_states" ADD CONSTRAINT "sync_states_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabulation_registers" ADD CONSTRAINT "tabulation_registers_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabulation_registers" ADD CONSTRAINT "tabulation_registers_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_passes" ADD CONSTRAINT "visitor_passes_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_passes" ADD CONSTRAINT "visitor_passes_request_id_visitor_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."visitor_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_passes" ADD CONSTRAINT "visitor_passes_host_staff_id_staff_id_fk" FOREIGN KEY ("host_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_passes" ADD CONSTRAINT "visitor_passes_gatekeeper_id_staff_id_fk" FOREIGN KEY ("gatekeeper_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_requests" ADD CONSTRAINT "visitor_requests_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_requests" ADD CONSTRAINT "visitor_requests_host_staff_id_staff_id_fk" FOREIGN KEY ("host_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_remediation_history_inst_pg" ON "remediation_history" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_swarm_events_timestamp_pg" ON "swarm_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_swarm_metrics_node_metric_pg" ON "swarm_metrics" USING btree ("node_id","metric_name");--> statement-breakpoint
CREATE INDEX "idx_swarm_metrics_timestamp_pg" ON "swarm_metrics" USING btree ("timestamp");--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_cycle_id_performance_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."performance_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_evaluator_staff_id_staff_id_fk" FOREIGN KEY ("evaluator_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_form_template_id_evaluation_forms_id_fk" FOREIGN KEY ("form_template_id") REFERENCES "public"."evaluation_forms"("id") ON DELETE no action ON UPDATE no action;