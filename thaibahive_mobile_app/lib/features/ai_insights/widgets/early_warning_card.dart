import 'package:flutter/material.dart';

class EarlyWarningCard extends StatelessWidget {
  final String title;
  final String value;
  final String category;
  final Color badgeColor;

  const EarlyWarningCard({
    Key? key,
    required this.title,
    required this.value,
    required this.category,
    required this.badgeColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87),
                ),
                const SizedBox(height: 4),
                Text(
                  category,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: badgeColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: badgeColor.withOpacity(0.4)),
              ),
              child: Text(
                value,
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: badgeColor),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
