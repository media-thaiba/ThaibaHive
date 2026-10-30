-- Custom SQL migration: SQLite Append-Only Ledger Immutability Triggers
CREATE TRIGGER IF NOT EXISTS `trg_immutable_gate_logs_update` BEFORE UPDATE ON `hostel_gate_logs` BEGIN SELECT RAISE(ABORT, 'hostel_gate_logs is append-only. UPDATE not allowed.'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `trg_immutable_gate_logs_delete` BEFORE DELETE ON `hostel_gate_logs` BEGIN SELECT RAISE(ABORT, 'hostel_gate_logs is append-only. DELETE not allowed.'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `trg_immutable_fine_actions_update` BEFORE UPDATE ON `hostel_fine_actions` BEGIN SELECT RAISE(ABORT, 'hostel_fine_actions is append-only. UPDATE not allowed.'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `trg_immutable_fine_actions_delete` BEFORE DELETE ON `hostel_fine_actions` BEGIN SELECT RAISE(ABORT, 'hostel_fine_actions is append-only. DELETE not allowed.'); END;
