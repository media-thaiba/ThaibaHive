import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/hall_ticket_provider.dart';
import 'qr_scanner_screen.dart';

class HallTicketScreen extends ConsumerWidget {
  const HallTicketScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hallTicketState = ref.watch(hallTicketProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Examination Hall Ticket'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Invigilator QR Scanner',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const QrScannerScreen()),
              );
            },
          ),
        ],
      ),
      body: hallTicketState.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (ticket) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!ticket.isFeeCleared)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.red.shade100,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning, color: Colors.red),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Fee Clearance Required: Outstanding dues of \$${ticket.outstandingFee.toStringAsFixed(2)}. Hall Ticket is currently locked.',
                            style: TextStyle(color: Colors.red.shade900, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),

                Card(
                  elevation: 4,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Center(
                          child: Column(
                            children: [
                              Container(
                                width: 140,
                                height: 140,
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.black26, width: 2),
                                  borderRadius: BorderRadius.circular(12),
                                  color: Colors.grey.shade100,
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.qr_code_2,
                                      size: 100,
                                      color: ticket.isFeeCleared ? Colors.black87 : Colors.grey,
                                    ),
                                    Text(
                                      ticket.isFeeCleared ? 'HMAC VERIFIED' : 'LOCKED',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: ticket.isFeeCleared ? Colors.green : Colors.red,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                ticket.registerNumber,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ],
                          ),
                        ),
                        const Divider(height: 32),
                        _infoRow('Student Name', ticket.studentName),
                        _infoRow('Candidate ID', ticket.candidateId),
                        _infoRow('Course Program', ticket.courseName),
                        _infoRow('Assigned Venue', ticket.examCenter),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),
                const Text(
                  'Examination Timetable',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),

                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: ticket.schedule.length,
                  itemBuilder: (context, index) {
                    final item = ticket.schedule[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.blue.shade100,
                          child: Text('${index + 1}'),
                        ),
                        title: Text(item['subject'] ?? ''),
                        subtitle: Text('Date: ${item['date']} | Time: ${item['time']}'),
                        trailing: const Icon(Icons.event_available, color: Colors.green),
                      ),
                    );
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        ],
      ),
    );
  }
}
