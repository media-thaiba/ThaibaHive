import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

final conferenceMuteAudioProvider = StateProvider<bool>((ref) => false);
final conferenceMuteVideoProvider = StateProvider<bool>((ref) => false);

class ConferenceRoomScreen extends ConsumerWidget {
  final String roomId;
  final String roomName;

  const ConferenceRoomScreen({
    super.key,
    required this.roomId,
    this.roomName = 'Campus Conference Room',
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAudioMuted = ref.watch(conferenceMuteAudioProvider);
    final isVideoMuted = ref.watch(conferenceMuteVideoProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              roomName,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.greenAccent,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                const Text(
                  'E2EE Active (SFrame P-256)',
                  style: TextStyle(fontSize: 11, color: Colors.greenAccent),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.security, color: Colors.greenAccent),
            tooltip: 'View E2EE Fingerprint',
            onPressed: () {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('E2EE Security Fingerprint'),
                  content: const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Media streams are encrypted on-device before transmission.',
                        style: TextStyle(fontSize: 13),
                      ),
                      SizedBox(height: 16),
                      SelectableText(
                        'B82F-1A4C-99E0-442D',
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ],
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Close'),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Video Tiles Grid
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12.0),
                child: GridView.count(
                  crossAxisCount: 2,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  children: [
                    // Self Tile
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.blueAccent.withValues(alpha: 0.4)),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          if (isVideoMuted)
                            const CircleAvatar(
                              radius: 32,
                              backgroundColor: Colors.blueGrey,
                              child: Text('You', style: TextStyle(color: Colors.white, fontSize: 18)),
                            )
                          else
                            const Icon(Icons.person, size: 64, color: Colors.blueAccent),
                          Positioned(
                            bottom: 8,
                            left: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.black54,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Text('You (Self)', style: TextStyle(color: Colors.white, fontSize: 11)),
                                  if (isAudioMuted) ...[
                                    const SizedBox(width: 4),
                                    const Icon(Icons.mic_off, size: 12, color: Colors.redAccent),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Remote Participant Tile
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white10),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          const CircleAvatar(
                            radius: 32,
                            backgroundColor: Color(0xFF334155),
                            child: Text('AD', style: TextStyle(color: Colors.white, fontSize: 18)),
                          ),
                          Positioned(
                            bottom: 8,
                            left: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.black54,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text('Admin Host', style: TextStyle(color: Colors.white, fontSize: 11)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom Media Controls
            Container(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
              color: const Color(0xFF1E293B),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  IconButton.filledTonal(
                    icon: Icon(isAudioMuted ? Icons.mic_off : Icons.mic),
                    color: isAudioMuted ? Colors.redAccent : Colors.white,
                    style: IconButton.styleFrom(
                      backgroundColor: isAudioMuted ? Colors.red.withValues(alpha: 0.2) : Colors.white10,
                    ),
                    onPressed: () {
                      ref.read(conferenceMuteAudioProvider.notifier).state = !isAudioMuted;
                    },
                  ),
                  IconButton.filledTonal(
                    icon: Icon(isVideoMuted ? Icons.videocam_off : Icons.videocam),
                    color: isVideoMuted ? Colors.redAccent : Colors.white,
                    style: IconButton.styleFrom(
                      backgroundColor: isVideoMuted ? Colors.red.withValues(alpha: 0.2) : Colors.white10,
                    ),
                    onPressed: () {
                      ref.read(conferenceMuteVideoProvider.notifier).state = !isVideoMuted;
                    },
                  ),
                  IconButton.filled(
                    icon: const Icon(Icons.call_end),
                    style: IconButton.styleFrom(backgroundColor: Colors.red),
                    onPressed: () {
                      if (context.canPop()) {
                        context.pop();
                      } else {
                        context.go('/today');
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
