import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'realtime_stream_service.dart';

class RealTimeCopilotScreen extends ConsumerStatefulWidget {
  final String tenantId;

  const RealTimeCopilotScreen({Key? key, required this.tenantId}) : super(key: key);

  @override
  ConsumerState<RealTimeCopilotScreen> createState() => _RealTimeCopilotScreenState();
}

class _RealTimeCopilotScreenState extends ConsumerState<RealTimeCopilotScreen> {
  List<RealTimeStreamItem> _events = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() {
      _isLoading = true;
    });
    final service = ref.read(realTimeStreamServiceProvider);
    final events = await service.fetchRealTimeEvents(widget.tenantId);
    if (mounted) {
      setState(() {
        _events = events;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Real-Time Copilot Feed'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadEvents,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadEvents,
              child: _events.isEmpty
                  ? const Center(
                      child: Text('No real-time stream events received.'),
                    )
                  : ListView.builder(
                      itemCount: _events.length,
                      padding: const EdgeInsets.all(12),
                      itemBuilder: (context, index) {
                        final item = _events[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: ListTile(
                            leading: CircleAvatar(
                              child: Icon(
                                item.channel == 'risk_alerts'
                                    ? Icons.warning_amber_rounded
                                    : Icons.bolt_rounded,
                              ),
                            ),
                            title: Text(item.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 4),
                                Text(item.summary),
                                const SizedBox(height: 4),
                                Text(
                                  'Channel: ${item.channel} • ${item.timestamp}',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
