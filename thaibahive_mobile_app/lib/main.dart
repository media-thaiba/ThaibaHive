import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';
import 'core/services/service_initializer.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize all services before running the app
  await serviceInitializer.init();
  
  runApp(
    const ProviderScope(
      child: ThaibaHiveApp(),
    ),
  );
}
