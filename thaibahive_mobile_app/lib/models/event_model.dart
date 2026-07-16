class EventModel {
  final String id;
  final String title;
  final String? description;
  final String eventDate;
  final String? startTime;
  final String? endTime;
  final String? location;
  final String eventType;
  final int attendeeCount;
  final bool hasRsvp;
  final bool isActive;

  const EventModel({
    required this.id,
    required this.title,
    this.description,
    required this.eventDate,
    this.startTime,
    this.endTime,
    this.location,
    required this.eventType,
    required this.attendeeCount,
    required this.hasRsvp,
    required this.isActive,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) => EventModel(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        eventDate: json['event_date'] as String,
        startTime: json['start_time'] as String?,
        endTime: json['end_time'] as String?,
        location: json['location'] as String?,
        eventType: json['event_type'] as String? ?? 'general',
        attendeeCount: json['attendee_count'] as int? ?? 0,
        hasRsvp: json['has_rsvp'] as bool? ?? false,
        isActive: json['is_active'] as bool? ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'event_date': eventDate,
        'start_time': startTime,
        'end_time': endTime,
        'location': location,
        'event_type': eventType,
        'attendee_count': attendeeCount,
        'has_rsvp': hasRsvp,
        'is_active': isActive,
      };
}
