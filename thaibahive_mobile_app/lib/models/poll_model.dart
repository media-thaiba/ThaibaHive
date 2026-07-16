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
        id: json['id'] as String,
        pollId: json['poll_id'] as String,
        text: json['text'] as String,
        voteCount: json['vote_count'] as int? ?? 0,
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
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        options: (json['options'] as List<dynamic>)
            .map((e) => PollOption.fromJson(e as Map<String, dynamic>))
            .toList(),
        selectedOptionId: json['selected_option_id'] as String?,
        expiresAt: DateTime.parse(json['expires_at'] as String),
        isActive: json['is_active'] as bool? ?? true,
        createdById: json['created_by_id'] as String,
        createdAt: DateTime.parse(json['created_at'] as String),
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
