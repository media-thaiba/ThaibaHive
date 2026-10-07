class PollOption {
  final String id;
  final String pollId;
  final String text;
  int voteCount;

  PollOption({
    required this.id,
    required this.pollId,
    required this.text,
    this.voteCount = 0,
  });

  factory PollOption.fromJson(Map<String, dynamic> json) => PollOption(
        id: (json['id'] ?? '') as String,
        pollId: (json['pollId'] ?? json['poll_id'] ?? '') as String,
        text: (json['text'] ?? '') as String,
        voteCount: (json['voteCount'] ?? json['vote_count'] ?? 0) as int,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'poll_id': pollId,
        'text': text,
        'vote_count': voteCount,
      };
}

class PollModel {
  final String id;
  final String title;
  final String? description;
  final List<PollOption> options;
  final String? selectedOptionId;
  final DateTime expiresAt;
  final bool isActive;
  final String createdById;
  final DateTime createdAt;

  const PollModel({
    required this.id,
    required this.title,
    this.description,
    required this.options,
    this.selectedOptionId,
    required this.expiresAt,
    required this.isActive,
    required this.createdById,
    required this.createdAt,
  });

  factory PollModel.fromJson(Map<String, dynamic> json) => PollModel(
        id: (json['id'] ?? '') as String,
        title: (json['title'] ?? '') as String,
        description: json['description'] as String?,
        options: (json['options'] as List<dynamic>? ?? const [])
            .map((e) =>
                PollOption.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        selectedOptionId:
            (json['selectedOptionId'] ?? json['selected_option_id'])
                as String?,
        expiresAt: DateTime.tryParse(
                (json['expiresAt'] ?? json['expires_at'] ?? '').toString()) ??
            DateTime.now(),
        isActive: (json['isActive'] ?? json['is_active'] ?? true) as bool,
        createdById:
            (json['createdById'] ?? json['created_by_id'] ?? '') as String,
        createdAt: DateTime.tryParse(
                (json['createdAt'] ?? json['created_at'] ?? '').toString()) ??
            DateTime.now(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'options': options.map((e) => e.toJson()).toList(),
        'selected_option_id': selectedOptionId,
        'expires_at': expiresAt.toIso8601String(),
        'is_active': isActive,
        'created_by_id': createdById,
        'created_at': createdAt.toIso8601String(),
      };
}
