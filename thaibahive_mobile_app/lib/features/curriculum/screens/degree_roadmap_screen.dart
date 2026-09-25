import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/curriculum_models.dart';
import '../providers/curriculum_providers.dart';
import '../widgets/degree_progress_card.dart';

class DegreeRoadmapScreen extends ConsumerWidget {
  const DegreeRoadmapScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final planAsync = ref.watch(studentDegreePlanProvider('stud_mobile_user'));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Degree Roadmap'),
        actions: [
          IconButton(
            icon: const Icon(Icons.chat_bubble_outline),
            tooltip: 'AI Academic Advisor',
            onPressed: () => context.push('/curriculum/advising'),
          ),
        ],
      ),
      body: planAsync.when(
        data: (plan) => RefreshIndicator(
          onRefresh: () async => ref.refresh(studentDegreePlanProvider('stud_mobile_user')),
          child: ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              DegreeProgressCard(plan: plan),
              const SizedBox(height: 20),
              Text(
                'Term Sequence',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ...plan.courses.map((course) => _buildCourseTile(context, course)),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text('Failed to load degree roadmap', style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref.refresh(studentDegreePlanProvider('stud_mobile_user')),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/curriculum/advising'),
        icon: const Icon(Icons.psychology),
        label: const Text('Ask Advisor'),
      ),
    );
  }

  Widget _buildCourseTile(BuildContext context, MobileCourseItem course) {
    final theme = Theme.of(context);
    final isCompleted = course.status == 'completed';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isCompleted ? Colors.green.withAlpha(30) : theme.colorScheme.primaryContainer,
          child: Icon(
            isCompleted ? Icons.check_circle : Icons.school,
            color: isCompleted ? Colors.green : theme.colorScheme.primary,
            size: 20,
          ),
        ),
        title: Text(
          '${course.courseCode}: ${course.title}',
          style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        subtitle: Text('${course.termName} · ${course.credits} Credits'),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: isCompleted ? Colors.green.withAlpha(20) : theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            course.status.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: isCompleted ? Colors.green : theme.colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }
}
