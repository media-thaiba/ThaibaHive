import 'package:flutter/material.dart';
import '../../data/models/agent_models.dart';

class LiveSnippetCard extends StatelessWidget {
  final MobileLiveSnippet snippet;
  final VoidCallback? onTap;

  const LiveSnippetCard({
    super.key,
    required this.snippet,
    this.onTap,
  });

  Color _severityColor(String? severity) {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return Colors.red.shade700;
      case 'medium':
      case 'warning':
        return Colors.orange.shade700;
      case 'low':
      case 'info':
        return Colors.blue.shade700;
      default:
        return Colors.amber.shade700;
    }
  }

  IconData _speakerIcon(String speaker) {
    switch (speaker.toLowerCase()) {
      case 'user':
        return Icons.person_outline;
      case 'gemini_live':
      case 'agent':
      case 'assistant':
        return Icons.auto_awesome;
      case 'hazard_sensor':
      case 'vision':
      case 'radar':
        return Icons.warning_amber_rounded;
      default:
        return Icons.chat_bubble_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isHazard = snippet.isHazard;
    final sevColor = _severityColor(snippet.severity);

    return Card(
      elevation: isHazard ? 2 : 0,
      margin: const EdgeInsets.symmetric(vertical: 4),
      color: isHazard ? Colors.red.shade50 : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(
          color: isHazard ? sevColor.withOpacity(0.5) : Colors.grey.shade200,
          width: isHazard ? 1.5 : 1.0,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Speaker Badge / Hazard Tag / Timestamp
              Row(
                children: [
                  Icon(
                    _speakerIcon(snippet.speaker),
                    size: 16,
                    color: isHazard ? sevColor : Colors.blue.shade700,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    snippet.speaker.toUpperCase(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isHazard ? sevColor : Colors.blue.shade800,
                    ),
                  ),
                  if (isHazard && snippet.hazardType != null) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: sevColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${snippet.hazardType?.toUpperCase()} [${snippet.severity ?? "ALERT"}]',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: sevColor,
                        ),
                      ),
                    ),
                  ],
                  const Spacer(),
                  Text(
                    snippet.timestamp.length >= 19
                        ? snippet.timestamp.substring(11, 19)
                        : snippet.timestamp,
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                  ),
                ],
              ),

              const SizedBox(height: 6),

              // Transcript Body
              Text(
                snippet.text.isNotEmpty ? snippet.text : '(No transcript content)',
                style: TextStyle(
                  fontSize: 13,
                  color: isHazard ? Colors.red.shade900 : Colors.black87,
                  fontStyle: snippet.text.isEmpty ? FontStyle.italic : FontStyle.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
