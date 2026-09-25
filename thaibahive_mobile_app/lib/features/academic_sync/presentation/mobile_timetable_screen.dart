import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'academic_sync_provider.dart';
import '../domain/academic_schedule_model.dart';
import 'substitution_alert_dialog.dart';

class MobileTimetableScreen extends ConsumerStatefulWidget {
  const MobileTimetableScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<MobileTimetableScreen> createState() => _MobileTimetableScreenState();
}

class _MobileTimetableScreenState extends ConsumerState<MobileTimetableScreen> {
  int _selectedDay = 1; // Monday

  @override
  Widget build(BuildContext context) {
    final syncState = ref.watch(academicSyncStateNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Academic Timetable & Sync'),
        actions: [
          IconButton(
            icon: syncState.isSyncing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.sync),
            onPressed: syncState.isSyncing
                ? null
                : () => ref.read(academicSyncStateNotifierProvider.notifier).loadSchedule(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(academicSyncStateNotifierProvider.notifier).loadSchedule(),
        child: Column(
          children: [
            // Day selector tabs
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              color: Theme.of(context).cardColor,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildDayChip(1, 'Monday'),
                    _buildDayChip(2, 'Tuesday'),
                    _buildDayChip(3, 'Wednesday'),
                    _buildDayChip(4, 'Thursday'),
                    _buildDayChip(5, 'Friday'),
                  ],
                ),
              ),
            ),
            const Divider(height: 1),

            // Timetable list
            Expanded(
              child: syncState.schedule.isEmpty
                  ? Center(
                      child: syncState.isSyncing
                          ? const CircularProgressIndicator()
                          : const Text('No schedule slots found.'),
                    )
                  : ListView.builder(
                      itemCount: syncState.schedule.length,
                      itemBuilder: (context, index) {
                        final slot = syncState.schedule[index];
                        return _buildSlotCard(slot);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDayChip(int day, String label) {
    final isSelected = _selectedDay == day;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4.0),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (val) {
          if (val) setState(() => _selectedDay = day);
        },
      ),
    );
  }

  Widget _buildSlotCard(MobileTimetableSlot slot) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: slot.isSubstitution ? Colors.orange.shade100 : Colors.blue.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            slot.isSubstitution ? Icons.swap_horiz : Icons.schedule,
            color: slot.isSubstitution ? Colors.orange.shade800 : Colors.blue.shade800,
          ),
        ),
        title: Text(
          slot.subjectName,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${slot.startTime} - ${slot.endTime} | ${slot.roomNumber ?? 'Main Hall'}'),
            if (slot.teacherName != null)
              Text(
                'Instructor: ${slot.teacherName}',
                style: TextStyle(
                  color: slot.isSubstitution ? Colors.orange.shade900 : Colors.black87,
                  fontWeight: slot.isSubstitution ? FontWeight.bold : FontWeight.normal,
                ),
              ),
          ],
        ),
        trailing: slot.isSubstitution
            ? IconButton(
                icon: const Icon(Icons.info_outline, color: Colors.orange),
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => SubstitutionAlertDialog(
                      slot: slot,
                      onAcknowledge: () {},
                    ),
                  );
                },
              )
            : null,
      ),
    );
  }
}
