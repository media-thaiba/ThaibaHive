import 'package:flutter/material.dart';
import '../domain/academic_schedule_model.dart';

class HallTicketDownloadCard extends StatelessWidget {
  final MobileHallTicketItem hallTicket;
  final VoidCallback onDownloadPdf;

  const HallTicketDownloadCard({
    Key? key,
    required this.hallTicket,
    required this.onDownloadPdf,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  hallTicket.title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.green.shade300),
                  ),
                  child: Text(
                    'OFFICIAL',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green.shade800),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('Exam: ${hallTicket.examName} | Date: ${hallTicket.examDate}', style: const TextStyle(fontSize: 12, color: Colors.black87)),
            Text('Seating: ${hallTicket.hallNumber} - ${hallTicket.seatNumber}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onDownloadPdf,
                icon: const Icon(Icons.picture_as_pdf, size: 18),
                label: const Text('Download PDF Hall Ticket'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
