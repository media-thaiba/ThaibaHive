/// Dart mirror of the media-domain entries in `packages/auth/capabilities.ts`
/// (the web `CAPABILITY_REGISTRY`).
///
/// The client shell gates tabs on these role sets; an unknown capability id
/// resolves to `false` (D7* — no more hardcoded role lists).
const Map<String, Set<String>> kCapabilityRegistry = {
  // id: media.asset.capture — "Capture Media"
  'media.asset.capture': {
    'staff',
    'teacher',
    'coordinator',
    'admin',
    'super_admin',
  },
  // id: media.asset.upload — "Upload Media Outbox"
  'media.asset.upload': {
    'staff',
    'teacher',
    'coordinator',
    'admin',
    'super_admin',
  },
  // id: media.asset.view — "View Media Gallery" (gates the Media tab)
  'media.asset.view': {
    'staff',
    'teacher',
    'hod',
    'principal',
    'admin',
    'super_admin',
    'accounts',
    'purchase',
  },
  // id: media.album.manage — "Curate Media Albums & Metadata"
  'media.album.manage': {'admin', 'super_admin'},
};

/// Returns true when [role] holds [capability] per the mirrored registry.
/// Absent capabilities or a missing role always return false.
bool hasCapability(String? role, String capability) {
  if (role == null || role.isEmpty) return false;
  return kCapabilityRegistry[capability]?.contains(role) ?? false;
}
