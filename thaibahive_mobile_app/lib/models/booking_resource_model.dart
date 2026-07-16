class BookingResourceModel {
  final String id;
  final String name;
  final String type;
  final String? description;
  final int capacity;
  final bool isAvailable;

  const BookingResourceModel({
    required this.id,
    required this.name,
    required this.type,
    this.description,
    required this.capacity,
    required this.isAvailable,
  });

  factory BookingResourceModel.fromJson(Map<String, dynamic> json) =>
      BookingResourceModel(
        id: json['id'] as String,
        name: json['name'] as String,
        type: json['type'] as String,
        description: json['description'] as String?,
        capacity: json['capacity'] as int,
        isAvailable: json['is_available'] as bool,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'type': type,
        'description': description,
        'capacity': capacity,
        'is_available': isAvailable,
      };
}
