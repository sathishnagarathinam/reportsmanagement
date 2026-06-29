import 'package:supabase_flutter/supabase_flutter.dart';

/// Debug script to check office data in Supabase
/// Run this to see what's actually in the database
void main() async {
  // Initialize Supabase (you'll need to add your credentials)
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );

  final supabase = Supabase.instance.client;

  print('🔍 Debug: Checking offices table...');

  try {
    // Check table structure
    print('\n1. Checking table structure...');
    final structureResponse = await supabase.from('offices').select('*').limit(3);
    print('Sample records: $structureResponse');
    if (structureResponse.isNotEmpty) {
      print('Available columns: ${structureResponse.first.keys.toList()}');
    }

    // Count total records
    print('\n2. Counting total records...');
    final countResponse = await supabase.from('offices').select('*');
    print('Total records in offices table: ${countResponse.length}');

    // Check for Coimbatore specifically
    print('\n3. Searching for Coimbatore offices...');
    final coimbatoreResponse = await supabase
        .from('offices')
        .select('*')
        .ilike('Office name', '%coimbatore%');
    print('Coimbatore offices found: ${coimbatoreResponse.length}');
    for (var office in coimbatoreResponse) {
      print('  - ${office['Office name']}');
    }

    // Check for division offices
    print('\n4. Searching for division offices...');
    final divisionResponse = await supabase
        .from('offices')
        .select('*')
        .ilike('Office name', '%division%');
    print('Division offices found: ${divisionResponse.length}');
    for (var office in divisionResponse) {
      print('  - ${office['Office name']}');
    }

    // Get all office names
    print('\n5. Getting all office names...');
    final allOfficesResponse = await supabase
        .from('offices')
        .select('"Office name"')
        .order('"Office name"', ascending: true);
    
    List<String> allOfficeNames = [];
    for (var office in allOfficesResponse) {
      String? officeName = office['Office name'] as String?;
      if (officeName != null && officeName.trim().isNotEmpty) {
        allOfficeNames.add(officeName.trim());
      }
    }
    
    print('Total valid office names: ${allOfficeNames.length}');
    print('First 10 offices: ${allOfficeNames.take(10).toList()}');
    print('Last 10 offices: ${allOfficeNames.skip(allOfficeNames.length - 10).toList()}');

    // Search for specific office
    print('\n6. Searching for "Coimbatore division" specifically...');
    final specificResponse = await supabase
        .from('offices')
        .select('*')
        .eq('Office name', 'Coimbatore division');
    print('Exact match for "Coimbatore division": ${specificResponse.length}');
    if (specificResponse.isNotEmpty) {
      print('Found: ${specificResponse.first}');
    }

    // Case-insensitive search
    print('\n7. Case-insensitive search for "coimbatore division"...');
    final caseInsensitiveResponse = await supabase
        .from('offices')
        .select('*')
        .ilike('Office name', 'coimbatore division');
    print('Case-insensitive match: ${caseInsensitiveResponse.length}');
    if (caseInsensitiveResponse.isNotEmpty) {
      print('Found: ${caseInsensitiveResponse.first}');
    }

  } catch (e) {
    print('❌ Error: $e');
  }
}
