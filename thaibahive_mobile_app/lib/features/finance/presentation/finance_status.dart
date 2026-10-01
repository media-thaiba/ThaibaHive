import '../../../shared/widgets/status_badge.dart';

/// Shared status presentation helpers for Sprint-103 finance screens.
StatusBadgeVariant badgeForStatus(String status) {
  if (status.startsWith('pending')) return StatusBadgeVariant.warning;
  switch (status) {
    case 'approved':
    case 'received':
      return StatusBadgeVariant.success;
    case 'rejected':
      return StatusBadgeVariant.destructive;
    case 'ordered':
      return StatusBadgeVariant.info;
    case 'reconciled':
      return StatusBadgeVariant.success;
    case 'flagged_variance':
      return StatusBadgeVariant.destructive;
    case 'matched':
      return StatusBadgeVariant.success;
    case 'variance':
      return StatusBadgeVariant.destructive;
    case 'manual_override':
      return StatusBadgeVariant.info;
    case 'unmatched':
      return StatusBadgeVariant.warning;
    case 'disbursed':
      return StatusBadgeVariant.success;
    case 'voided':
      return StatusBadgeVariant.destructive;
    default:
      return StatusBadgeVariant.secondary;
  }
}

String labelForStatus(String status) {
  if (status.startsWith('pending_tier_')) {
    return 'TIER ${status.split('_').last}';
  }
  if (status == 'flagged_variance') return 'VARIANCE';
  if (status.startsWith('pending')) return 'PENDING';
  return status.replaceAll('_', ' ').toUpperCase();
}
