import 'package:flutter/material.dart';

class DietarySettingsScreen extends StatefulWidget {
  const DietarySettingsScreen({super.key});

  @override
  State<DietarySettingsScreen> createState() => _DietarySettingsScreenState();
}

class _DietarySettingsScreenState extends State<DietarySettingsScreen> {
  bool _isVegetarian = true;
  bool _isNutFree = false;
  bool _isGlutenFree = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Dietary Controls'),
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            SwitchListTile(
              title: const Text('Vegetarian Only'),
              subtitle: const Text('Restrict non-vegetarian meal options during cafeteria checkout'),
              value: _isVegetarian,
              onChanged: (val) => setState(() => _isVegetarian = val),
            ),
            const Divider(),
            SwitchListTile(
              title: const Text('Nut Allergy Warning'),
              subtitle: const Text('Alert cashier if meal contains peanuts or tree nuts'),
              value: _isNutFree,
              onChanged: (val) => setState(() => _isNutFree = val),
            ),
            const Divider(),
            SwitchListTile(
              title: const Text('Gluten Free'),
              subtitle: const Text('Alert cashier if meal contains wheat or gluten'),
              value: _isGlutenFree,
              onChanged: (val) => setState(() => _isGlutenFree = val),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Dietary controls saved')),
                  );
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Save Controls', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
