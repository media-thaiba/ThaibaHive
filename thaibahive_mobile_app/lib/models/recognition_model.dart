import 'user_model.dart';

class RecognitionModel {
  final String id;
  final String type;
  final String? message;
  final String giverId;
  final String receiverId;
  final DateTime createdAt;
  final UserModel? giver;
  final UserModel? receiver;

  const RecognitionModel({
    required this.id,
    required this.type,
    this.message,
    required this.giverId,
    required this.receiverId,
    required this.createdAt,
    this.giver,
    this.receiver,
  });

  factory RecognitionModel.fromJson(Map<String, dynamic> json) =>
      RecognitionModel(
        id: json['id'] as String,
        type: json['type'] as String,
        message: json['message'] as String?,
        giverId: json['giver_id'] as String,
        receiverId: json['receiver_id'] as String,
        createdAt: DateTime.parse(json['created_at'] as String),
        giver: json['giver'] != null
            ? UserModel.fromJson(json['giver'] as Map<String, dynamic>)
            : null,
        receiver: json['receiver'] != null
            ? UserModel.fromJson(json['receiver'] as Map<String, dynamic>)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'message': message,
        'giver_id': giverId,
        'receiver_id': receiverId,
        'created_at': createdAt.toIso8601String(),
        if (giver != null) 'giver': giver!.toJson(),
        if (receiver != null) 'receiver': receiver!.toJson(),
      };
}
