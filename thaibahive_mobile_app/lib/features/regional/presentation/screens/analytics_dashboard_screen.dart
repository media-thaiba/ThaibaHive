import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/analytics_provider.dart';

class SparklinePainter extends CustomPainter {
  final List<double> data;
  final Color lineColor;

  SparklinePainter(this.data, {this.lineColor = Colors.blue});

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty || data.length < 2) return;

    final paint = Paint()
      ..color = lineColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;

    final path = Path();
    final double stepX = size.width / (data.length - 1);
    
    double maxVal = data.reduce((a, b) => a > b ? a : b);
    double minVal = data.reduce((a, b) => a < b ? a : b);
    double range = maxVal - minVal;
    if (range == 0) range = 1.0;

    for (int i = 0; i < data.length; i++) {
      final double x = i * stepX;
      // Subtract from size.height because Flutter canvas Y axis goes downwards
      final double y = size.height - ((data[i] - minVal) / range * (size.height - 10) + 5);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant SparklinePainter oldDelegate) {
    return oldDelegate.data != data || oldDelegate.lineColor != lineColor;
  }
}

class SparklineWidget extends StatelessWidget {
  final List<double> data;
  final double height;
  final Color lineColor;

  const SparklineWidget({
    Key? key,
    required this.data,
    this.height = 80.0,
    this.lineColor = const Color(0xFF3B82F6),
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return Container(
        height: height,
        alignment: Center,
        child: const Text('No trend data', style: TextStyle(fontSize: 12, color: Colors.grey)),
      );
    }
    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(
        painter: SparklinePainter(data, lineColor: lineColor),
      ),
    );
  }
}

class AnalyticsDashboardScreen extends ConsumerWidget {
  const AnalyticsDashboardScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(analyticsStateProvider);
    final notifier = ref.read(analyticsStateProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Workspace Analytics Engine'),
        backgroundColor: const Color(0xFF1E293B),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => notifier.fetchAnalytics(state.activeType),
          ),
        ],
      ),
      body: Column(
        children: [
          // Category selector tabs (minimum 44px height for touch target requirements)
          Container(
            color: const Color(0xFF0F172A),
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            child: Row(
              children: [
                _buildCategoryButton('attendance', 'Attendance', state, notifier),
                const SizedBox(width: 8),
                _buildCategoryButton('finance', 'Finance', state, notifier),
                const SizedBox(width: 8),
                _buildCategoryButton('academics', 'Academics', state, notifier),
              ],
            ),
          ),
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : state.error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.error_outline, color: Colors.red, size: 48),
                              const SizedBox(height: 16),
                              Text(
                                state.error!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 14, color: Colors.red),
                              ),
                            ],
                          ),
                        ),
                      )
                    : _buildAnalyticsContent(context, state),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryButton(
    String type,
    String label,
    AnalyticsState state,
    AnalyticsNotifier notifier,
  ) {
    final isSelected = state.activeType == type;
    return Expanded(
      child: SizedBox(
        height: 44, // Meets the 44px minimum touch target size
        child: TextButton(
          style: TextButton.styleFrom(
            backgroundColor: isSelected ? const Color(0xFF3B82F6) : const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          onPressed: () => notifier.fetchAnalytics(type),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : Colors.grey.shade400,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAnalyticsContent(BuildContext context, AnalyticsState state) {
    final data = state.data;
    if (data == null) {
      return const Center(child: Text('No analytics data available.'));
    }

    if (state.activeType == 'attendance') {
      final double presenceRate = (data['rate'] as num? ?? 0).toDouble();
      final List<dynamic> departments = data['departmentVariations'] as List<dynamic>? ?? [];

      return ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Presence Rate Card
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Overall Staff Presence Rate',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 10),
                  Text('${presenceRate.toStringAsFixed(0)}%',
                      style: const TextStyle(fontSize: 36, fontWeight: FontWeight.extrabold, color: Color(0xFF0F172A))),
                  const SizedBox(height: 16),
                  // Render visual Presence Gauge
                  Container(
                    height: 12,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    alignment: Alignment.centerLeft,
                    child: FractionallySizedBox(
                      widthFactor: presenceRate / 100.0,
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981),
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Department Breakdown
          const Text('Presence by Department',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          const SizedBox(height: 8),
          ...departments.map((dept) {
            final String name = dept['departmentName'] as String? ?? 'Department';
            final double rate = (dept['rate'] as num? ?? 0).toDouble();
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                trailing: Text('${rate.toStringAsFixed(0)}%',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: rate >= 90 ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                    )),
              ),
            );
          }).toList(),
        ],
      );
    } else if (state.activeType == 'finance') {
      final double efficiency = (data['collectionEfficiency'] as num? ?? 0).toDouble();
      final double totalCollected = (data['collectionTotal'] as num? ?? 0).toDouble();
      final List<dynamic> collections = data['dailyCollections'] as List<dynamic>? ?? [];
      final List<double> collectionsTrend = collections.map((c) => (c['amount'] as num? ?? 0).toDouble()).toList();

      return ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Efficiency card
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Realization Efficiency',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 10),
                  Text('${efficiency.toStringAsFixed(0)}%',
                      style: const TextStyle(fontSize: 36, fontWeight: FontWeight.extrabold, color: Color(0xFF0F172A))),
                  const SizedBox(height: 6),
                  Text('Total collected: ₹${totalCollected.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 13, color: Colors.grey)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Collections Sparkline Trend
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Fee Collections Trend (30 Days)',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 20),
                  SparklineWidget(data: collectionsTrend, height: 100, lineColor: const Color(0xFF3B82F6)),
                ],
              ),
            ),
          ),
        ],
      );
    } else {
      // Academics Tab
      final double passRate = (data['passRate'] as num? ?? 0).toDouble();
      final List<dynamic> classes = data['classPerformance'] as List<dynamic>? ?? [];

      return ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Overall Pass Rate
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Overall Exam Pass Rate',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 10),
                  Text('${passRate.toStringAsFixed(0)}%',
                      style: const TextStyle(fontSize: 36, fontWeight: FontWeight.extrabold, color: Color(0xFF0F172A))),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Class Performance Breakdown
          const Text('Class Academic Pass Rates',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          const SizedBox(height: 8),
          ...classes.map((cls) {
            final String name = cls['className'] as String? ?? 'Class';
            final double rate = (cls['passRate'] as num? ?? 0).toDouble();
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                trailing: Text('${rate.toStringAsFixed(0)}%',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF3B82F6))),
              ),
            );
          }).toList(),
        ],
      );
    }
  }
}
