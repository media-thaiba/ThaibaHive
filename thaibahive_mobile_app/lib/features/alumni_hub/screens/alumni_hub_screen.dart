import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/alumni_provider.dart';
import '../models/alumni_models.dart';

class AlumniHubScreen extends ConsumerWidget {
  const AlumniHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(alumniProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('ALUMNI-HUB'),
        backgroundColor: Colors.teal.shade700,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_2),
            tooltip: 'Offline Event Wallet',
            onPressed: () {
              context.push('/alumni/pass');
            },
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () async {
                await ref.read(alumniProvider.notifier).loadOfflineData();
              },
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  _buildCredentialCard(context, state.digitalCredential),
                  const SizedBox(height: 16),
                  _buildSectionHeader('AI Mentorship Matches'),
                  const SizedBox(height: 8),
                  if (state.mentorMatches.isEmpty)
                    _buildEmptyState('No active mentor matches loaded.')
                  else
                    ...state.mentorMatches.map((m) => _buildMentorCard(context, m)),
                  const SizedBox(height: 16),
                  _buildSectionHeader('Offline Event Passes'),
                  const SizedBox(height: 8),
                  if (state.eventPasses.isEmpty)
                    _buildEmptyState('No offline event passes in wallet.')
                  else
                    ...state.eventPasses.map((p) => _buildPassSummary(context, p)),
                ],
              ),
            ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
    );
  }

  Widget _buildEmptyState(String msg) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Center(
        child: Text(msg, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
      ),
    );
  }

  Widget _buildCredentialCard(BuildContext context, MobileAlumniProfile? cred) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: Colors.teal.shade800,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Verified Alumni Identity',
                  style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.green.shade400,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text('VERIFIED', style: TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              cred != null ? '${cred.firstName} ${cred.lastName}' : 'Student / Alumni Member',
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              cred != null ? '${cred.primaryDegree} • Batch ${cred.graduationBatchYear}' : 'Thaiba Central Campus',
              style: const TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 12),
            Text(
              cred?.credentialHash != null
                  ? 'SHA256: ${cred!.credentialHash!.substring(0, 16)}...'
                  : 'Offline Secure Enclave Enabled',
              style: const TextStyle(color: Colors.white54, fontSize: 11, fontFamily: 'monospace'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMentorCard(BuildContext context, MobileMentorMatch mentor) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(mentor.mentorName, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('${mentor.mentorDesignation ?? "Specialist"} @ ${mentor.mentorCompany ?? "Industry"}'),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.teal.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.teal.shade200),
          ),
          child: Text(
            '${(mentor.compatibilityScore * 100).toInt()}% Match',
            style: TextStyle(color: Colors.teal.shade800, fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }

  Widget _buildPassSummary(BuildContext context, MobileEventPass pass) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.confirmation_number, color: Colors.teal),
        title: Text(pass.eventTitle, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('Ticket: ${pass.ticketNumber} • ${pass.venue}'),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14),
        onTap: () {
          context.push('/alumni/pass', extra: pass);
        },
      ),
    );
  }
}
