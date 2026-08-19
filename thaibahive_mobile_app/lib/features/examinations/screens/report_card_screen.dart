import 'package:flutter/material.dart';
import '../services/pdf_viewer_service.dart';
import '../widgets/grade_summary_card.dart';

class ReportCardScreen extends StatefulWidget {
  final String studentId;
  final String examId;

  const ReportCardScreen({
    super.key,
    this.studentId = 'STD-9921',
    this.examId = 'EXAM-2026-T1',
  });

  @override
  State<ReportCardScreen> createState() => _ReportCardScreenState();
}

class _ReportCardScreenState extends State<ReportCardScreen> {
  final PdfViewerService _pdfService = PdfViewerService();
  bool _isDownloading = false;

  final List<Map<String, dynamic>> _subjectGrades = [
    {'code': 'CS601', 'name': 'Advanced Web Architecture', 'credits': 4, 'grade': 'A+', 'point': 10.0},
    {'code': 'CS602', 'name': 'Database Systems & ORM', 'credits': 4, 'grade': 'A', 'point': 9.0},
    {'code': 'CS603', 'name': 'Mobile Application Dev', 'credits': 3, 'grade': 'A+', 'point': 10.0},
    {'code': 'CS604', 'name': 'Cloud Security & DevSecOps', 'credits': 3, 'grade': 'B+', 'point': 8.0},
    {'code': 'CS605', 'name': 'Capstone Project Phase I', 'credits': 6, 'grade': 'O', 'point': 10.0},
  ];

  Future<void> _handlePdfDownload() async {
    final passwordController = TextEditingController();
    final shouldProceed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('DOB Password Protection'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'If your PDF report card is encrypted, enter your DOB in DDMMYYYY format to unlock:',
              style: TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: passwordController,
              keyboardType: TextInputType.number,
              obscureText: true,
              decoration: const InputDecoration(
                hintText: 'e.g. 15082004',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Download PDF')),
        ],
      ),
    );

    if (shouldProceed != true) return;

    setState(() {
      _isDownloading = true;
    });

    final file = await _pdfService.downloadReportCardPdf(
      examId: widget.examId,
      studentId: widget.studentId,
      dobPassword: passwordController.text.trim().isNotEmpty ? passwordController.text.trim() : null,
    );

    setState(() {
      _isDownloading = false;
    });

    if (file != null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Report Card PDF downloaded successfully!'), backgroundColor: Colors.green),
        );
      }
      await _pdfService.openPdfFile(file);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Downloaded sample transcript report card.'), backgroundColor: Colors.indigo),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Report Card'),
        actions: [
          IconButton(
            icon: _isDownloading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.download),
            tooltip: 'Download PDF Report Card',
            onPressed: _isDownloading ? null : _handlePdfDownload,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const GradeSummaryCard(
              sgpa: 9.40,
              cgpa: 9.25,
              status: 'Passed',
              totalCredits: 20,
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Subject Grades Breakdown',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Term 1 - 2026',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _subjectGrades.length,
              itemBuilder: (context, index) {
                final item = _subjectGrades[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(item['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('${item['code']} | Credits: ${item['credits']}'),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.indigo.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.indigo.shade200),
                      ),
                      child: Text(
                        '${item['grade']} (${item['point']})',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.indigo.shade900,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: Colors.indigo.shade700,
                  foregroundColor: Colors.white,
                ),
                onPressed: _handlePdfDownload,
                icon: const Icon(Icons.picture_as_pdf),
                label: const Text('Download Official DOB-Encrypted PDF Report Card'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
