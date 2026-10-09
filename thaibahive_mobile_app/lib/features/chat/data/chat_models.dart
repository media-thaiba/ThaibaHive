class ChatChannel {
  const ChatChannel({
    required this.id,
    required this.institutionId,
    required this.type,
    this.name,
    required this.createdById,
    this.avatarUrl,
    this.isActive = true,
    this.role,
    this.unreadCount = 0,
    this.latestMessage,
  });

  final String id;
  final String institutionId;
  final String type; // 'direct' | 'group' | 'announcement'
  final String? name;
  final String createdById;
  final String? avatarUrl;
  final bool isActive;
  final String? role;
  final int unreadCount;
  final ChatMessagePreview? latestMessage;

  factory ChatChannel.fromJson(Map<String, dynamic> json) {
    return ChatChannel(
      id: json['id'] as String? ?? '',
      institutionId: json['institutionId'] as String? ?? '',
      type: json['type'] as String? ?? 'group',
      name: json['name'] as String?,
      createdById: json['createdById'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      role: json['role'] as String?,
      unreadCount: json['unreadCount'] as int? ?? 0,
      latestMessage: json['latestMessage'] != null
          ? ChatMessagePreview.fromJson(json['latestMessage'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'institutionId': institutionId,
      'type': type,
      'name': name,
      'createdById': createdById,
      'avatarUrl': avatarUrl,
      'isActive': isActive,
      'role': role,
      'unreadCount': unreadCount,
      'latestMessage': latestMessage?.toJson(),
    };
  }

  ChatChannel copyWith({
    String? id,
    String? institutionId,
    String? type,
    String? name,
    String? createdById,
    String? avatarUrl,
    bool? isActive,
    String? role,
    int? unreadCount,
    ChatMessagePreview? latestMessage,
  }) {
    return ChatChannel(
      id: id ?? this.id,
      institutionId: institutionId ?? this.institutionId,
      type: type ?? this.type,
      name: name ?? this.name,
      createdById: createdById ?? this.createdById,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      isActive: isActive ?? this.isActive,
      role: role ?? this.role,
      unreadCount: unreadCount ?? this.unreadCount,
      latestMessage: latestMessage ?? this.latestMessage,
    );
  }
}

class ChatMessagePreview {
  const ChatMessagePreview({
    required this.id,
    required this.content,
    required this.senderId,
    required this.createdAt,
    required this.type,
  });

  final String id;
  final String content;
  final String senderId;
  final String createdAt;
  final String type;

  factory ChatMessagePreview.fromJson(Map<String, dynamic> json) {
    return ChatMessagePreview(
      id: json['id'] as String? ?? '',
      content: json['content'] as String? ?? '',
      senderId: json['senderId'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      type: json['type'] as String? ?? 'text',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'senderId': senderId,
      'createdAt': createdAt,
      'type': type,
    };
  }
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.channelId,
    required this.senderId,
    required this.content,
    this.clientMessageId,
    this.type = 'text',
    this.replyToId,
    this.attachmentUrl,
    this.editedAt,
    this.deletedAt,
    required this.createdAt,
    this.senderFirstName,
    this.senderLastName,
    this.senderAvatarUrl,
    this.senderDesignation,
    this.status = 'delivered',
  });

  final String id;
  final String channelId;
  final String senderId;
  final String? clientMessageId;
  final String content;
  final String type;
  final String? replyToId;
  final String? attachmentUrl;
  final String? editedAt;
  final String? deletedAt;
  final String createdAt;
  final String? senderFirstName;
  final String? senderLastName;
  final String? senderAvatarUrl;
  final String? senderDesignation;
  final String status; // 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

  String get senderFullName {
    final first = senderFirstName ?? '';
    final last = senderLastName ?? '';
    final full = '$first $last'.trim();
    return full.isNotEmpty ? full : 'Colleague';
  }

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final sender = json['sender'] as Map<String, dynamic>?;
    return ChatMessage(
      id: json['id'] as String? ?? '',
      channelId: json['channelId'] as String? ?? '',
      senderId: json['senderId'] as String? ?? '',
      clientMessageId: json['clientMessageId'] as String?,
      content: json['content'] as String? ?? '',
      type: json['type'] as String? ?? 'text',
      replyToId: json['replyToId'] as String?,
      attachmentUrl: json['attachmentUrl'] as String?,
      editedAt: json['editedAt'] as String?,
      deletedAt: json['deletedAt'] as String?,
      createdAt: json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      senderFirstName: sender?['firstName'] as String? ?? json['senderFirstName'] as String?,
      senderLastName: sender?['lastName'] as String? ?? json['senderLastName'] as String?,
      senderAvatarUrl: sender?['avatarUrl'] as String? ?? json['senderAvatarUrl'] as String?,
      senderDesignation: sender?['designation'] as String? ?? json['senderDesignation'] as String?,
      status: json['status'] as String? ?? 'delivered',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'channelId': channelId,
      'senderId': senderId,
      'clientMessageId': clientMessageId,
      'content': content,
      'type': type,
      'replyToId': replyToId,
      'attachmentUrl': attachmentUrl,
      'editedAt': editedAt,
      'deletedAt': deletedAt,
      'createdAt': createdAt,
      'senderFirstName': senderFirstName,
      'senderLastName': senderLastName,
      'senderAvatarUrl': senderAvatarUrl,
      'senderDesignation': senderDesignation,
      'status': status,
    };
  }

  ChatMessage copyWith({
    String? id,
    String? channelId,
    String? senderId,
    String? clientMessageId,
    String? content,
    String? type,
    String? replyToId,
    String? attachmentUrl,
    String? editedAt,
    String? deletedAt,
    String? createdAt,
    String? senderFirstName,
    String? senderLastName,
    String? senderAvatarUrl,
    String? senderDesignation,
    String? status,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      channelId: channelId ?? this.channelId,
      senderId: senderId ?? this.senderId,
      clientMessageId: clientMessageId ?? this.clientMessageId,
      content: content ?? this.content,
      type: type ?? this.type,
      replyToId: replyToId ?? this.replyToId,
      attachmentUrl: attachmentUrl ?? this.attachmentUrl,
      editedAt: editedAt ?? this.editedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      createdAt: createdAt ?? this.createdAt,
      senderFirstName: senderFirstName ?? this.senderFirstName,
      senderLastName: senderLastName ?? this.senderLastName,
      senderAvatarUrl: senderAvatarUrl ?? this.senderAvatarUrl,
      senderDesignation: senderDesignation ?? this.senderDesignation,
      status: status ?? this.status,
    );
  }
}
