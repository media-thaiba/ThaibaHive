import 'package:flutter/material.dart';

class ChildSummary {
  final String id;
  final String name;
  final String grade;

  ChildSummary({required this.id, required this.name, required this.grade});
}

class MultiChildSelector extends StatelessWidget {
  final List<ChildSummary> children;
  final String selectedChildId;
  final ValueChanged<ChildSummary> onSelected;

  const MultiChildSelector({
    super.key,
    required this.children,
    required this.selectedChildId,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: children.length,
        itemBuilder: (context, index) {
          final child = children[index];
          final isSelected = child.id == selectedChildId;

          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: ChoiceChip(
              avatar: CircleAvatar(
                backgroundColor: isSelected ? Colors.white : Colors.indigo.shade100,
                child: Text(
                  child.name.substring(0, 1),
                  style: TextStyle(
                    fontSize: 12,
                    color: isSelected ? Colors.indigo : Colors.indigo.shade900,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              label: Text(child.name),
              selected: isSelected,
              selectedColor: Colors.indigo,
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : Colors.black87,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
              onSelected: (_) => onSelected(child),
            ),
          );
        },
      ),
    );
  }
}
