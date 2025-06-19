import 'package:flutter/material.dart';
import 'package:excel/excel.dart' as excel_lib;
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import '../services/reports_service.dart';
import '../services/form_config_service.dart';

class TableColumn {
  final String key;
  final String label;
  final String type; // 'form_type', 'user', 'office', 'date', 'field'

  TableColumn({
    required this.key,
    required this.label,
    required this.type,
  });
}

class DynamicReportsTable extends StatefulWidget {
  final List<FormSubmission> submissions;
  final bool loading;
  final VoidCallback onRefresh;

  const DynamicReportsTable({
    Key? key,
    required this.submissions,
    required this.loading,
    required this.onRefresh,
  }) : super(key: key);

  @override
  State<DynamicReportsTable> createState() => _DynamicReportsTableState();
}

class _DynamicReportsTableState extends State<DynamicReportsTable> {
  List<TableColumn> columns = [];
  List<Map<String, dynamic>> processedData = [];
  bool loadingColumns = true;

  @override
  void initState() {
    super.initState();
    buildDynamicColumns();
  }

  @override
  void didUpdateWidget(DynamicReportsTable oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.submissions != widget.submissions) {
      buildDynamicColumns();
    }
  }

  Future<void> buildDynamicColumns() async {
    if (widget.submissions.isEmpty) {
      setState(() {
        columns = [];
        processedData = [];
        loadingColumns = false;
      });
      return;
    }

    setState(() {
      loadingColumns = true;
    });

    print(
        '🏗️ Building dynamic columns for submissions: ${widget.submissions.length}');

    try {
      // Get all unique form identifiers
      final formIdentifiers =
          widget.submissions.map((s) => s.formIdentifier).toSet().toList();
      print('📋 Unique form identifiers: $formIdentifiers');

      // Get all field mappings for all forms
      final allFieldMappings = <String, Map<String, String>>{};
      for (final formId in formIdentifiers) {
        final mapping = await FormConfigService.getFieldMapping(formId);
        allFieldMappings[formId] = mapping;
      }

      // Collect all unique field labels across all forms
      final allFieldLabels = <String>{};
      allFieldMappings.forEach((formId, mapping) {
        allFieldLabels.addAll(mapping.values);
      });

      print('🏷️ All field labels found: $allFieldLabels');

      // Build column structure
      final newColumns = <TableColumn>[
        TableColumn(key: 'form_type', label: 'Form Type', type: 'form_type'),
        TableColumn(key: 'submitted_at', label: 'Submitted', type: 'date'),
      ];

      // Add dynamic field columns
      for (final label in allFieldLabels) {
        newColumns.add(TableColumn(
          key: label,
          label: label,
          type: 'field',
        ));
      }

      // Process submission data
      final processedSubmissions = <Map<String, dynamic>>[];
      for (final submission in widget.submissions) {
        final convertedData = await FormConfigService.convertSubmissionData(
          submission.formIdentifier,
          submission.submissionData,
        );

        final row = <String, dynamic>{
          'id': submission.id,
          'form_type':
              ReportsService.getFormTypeDisplay(submission.formIdentifier),
          'submitted_at': _formatDate(submission.submittedAt),
        };

        // Add field values using converted labels
        convertedData.forEach((label, value) {
          // Skip the fields we're already handling separately
          if (label != 'officeName' && !_isUserNameField(label)) {
            row[label] = _formatFieldValue(value);
          }
        });

        processedSubmissions.add(row);
      }

      setState(() {
        columns = newColumns;
        processedData = processedSubmissions;
      });

      print('✅ Dynamic table built successfully');
    } catch (error) {
      print('❌ Error building dynamic columns: $error');
    } finally {
      setState(() {
        loadingColumns = false;
      });
    }
  }

  Map<String, String> _formatDate(DateTime dateTime) {
    return {
      'date': '${dateTime.day}/${dateTime.month}/${dateTime.year}',
      'time':
          '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}',
    };
  }

  String _formatFieldValue(dynamic value) {
    if (value == null) return '';

    if (value is String && value.contains('T') && value.contains(':')) {
      try {
        final date = DateTime.parse(value);
        return '${date.day}/${date.month}/${date.year}';
      } catch (e) {
        return value;
      }
    }

    return value.toString();
  }

  String _extractActualOfficeName(Map<String, dynamic> convertedData) {
    // Common field names that contain office names
    const officeNameFields = [
      'Office Name',
      'officeName',
      'Office',
      'office',
      'Branch',
      'branch',
      'Location',
      'location',
      'Workplace',
      'workplace',
      'Department',
      'department',
      'Division',
      'division',
      'Unit',
      'unit'
    ];

    // Try to find an office name field
    for (final field in officeNameFields) {
      if (convertedData[field] != null && convertedData[field] is String) {
        final value = (convertedData[field] as String).trim();
        if (value.isNotEmpty) {
          return value;
        }
      }
    }

    // Look for values that look like office names (contain BO, SO, RO, etc.)
    for (final entry in convertedData.entries) {
      final value = entry.value;
      if (value is String &&
          (value.contains(' BO') ||
              value.contains(' SO') ||
              value.contains(' RO') ||
              value.contains(' HO') ||
              value.contains(' DO') ||
              value.contains('Office'))) {
        return value;
      }
    }

    return 'Unknown Office';
  }

  bool _isUserNameField(String fieldName) {
    const userNameFields = [
      'Employee Name',
      'employeeName',
      'Full Name',
      'fullName',
      'Name',
      'name',
      'First Name',
      'firstName',
      'Last Name',
      'lastName',
      'User Name',
      'userName',
      'Participant Name',
      'participantName',
      'Requested By',
      'requestedBy',
      'Submitted By',
      'submittedBy',
      'Applicant Name',
      'applicantName'
    ];
    return userNameFields.contains(fieldName);
  }

  String _getEmployeeIdFromSubmission(FormSubmission submission) {
    // 1. First try the dedicated employee_id column
    if (submission.employeeId != null && submission.employeeId!.isNotEmpty) {
      print('✅ Found employee_id in column: "${submission.employeeId}"');
      return submission.employeeId!.trim();
    }

    // 2. Try to extract from submission_data VALUES (not field IDs)
    final data = submission.submissionData;
    print('🔍 Searching in submission_data VALUES: $data');
    print('🔍 All field values: ${data.values.toList()}');

    // Look through all field VALUES to find employee IDs
    for (final entry in data.entries) {
      final fieldId = entry.key;
      final fieldValue = entry.value;

      if (fieldValue is String && fieldValue.trim().isNotEmpty) {
        final value = fieldValue.trim();

        // Skip dates
        if (value.contains('T') && value.contains(':')) continue;

        // Skip office names
        if (value.contains(' BO') ||
            value.contains(' SO') ||
            value.contains(' RO') ||
            value.contains(' HO') ||
            value.contains(' DO')) continue;

        // Skip very long values (likely not employee IDs)
        if (value.length > 50) continue;

        // Check if it looks like an employee ID pattern
        if (RegExp(r'^(EMP|STAFF|USER|ID)[0-9]{1,6}$', caseSensitive: false)
            .hasMatch(value)) {
          print('✅ Found employee ID pattern in field "$fieldId": "$value"');
          return value.toUpperCase();
        }

        // Check if it's a short alphanumeric code (likely an employee ID)
        if (RegExp(r'^[A-Z0-9]{3,15}$', caseSensitive: false).hasMatch(value) &&
            !value.contains(' ')) {
          print('✅ Found potential employee ID in field "$fieldId": "$value"');
          return value.toUpperCase();
        }
      }
    }

    // 3. Try to extract a name and create an ID from it
    for (final entry in data.entries) {
      final fieldId = entry.key;
      final fieldValue = entry.value;

      if (fieldValue is String && fieldValue.trim().isNotEmpty) {
        final value = fieldValue.trim();

        // Skip dates and office names
        if (value.contains('T') && value.contains(':')) continue;
        if (value.contains(' BO') ||
            value.contains(' SO') ||
            value.contains(' RO')) continue;

        // If it looks like a person's name (2-4 words, reasonable length)
        final words = value.split(RegExp(r'\s+'));
        if (words.length >= 2 &&
            words.length <= 4 &&
            value.length >= 5 &&
            value.length <= 50) {
          // Check if all words are likely name parts (alphabetic)
          final isLikelyName =
              words.every((word) => RegExp(r'^[A-Za-z]+$').hasMatch(word));
          if (isLikelyName) {
            // Create ID from first name + last name initial
            final firstName = words[0].toUpperCase();
            final lastInitial = words[words.length - 1][0].toUpperCase();
            final nameId = '$firstName$lastInitial';
            print('✅ Generated employee ID from name "$value": "$nameId"');
            return nameId;
          }
        }
      }
    }

    // 4. Final fallback: Use any reasonable text value as employee ID
    print('⚠️ No specific employee ID found, trying fallback approach...');
    for (final entry in data.entries) {
      final fieldId = entry.key;
      final fieldValue = entry.value;

      if (fieldValue is String && fieldValue.trim().isNotEmpty) {
        final value = fieldValue.trim();

        // Skip obvious non-employee data
        if (value.contains('T') && value.contains(':')) continue; // dates
        if (value.contains('@')) continue; // emails
        if (value.length > 100) continue; // very long text
        if (value.contains(' BO') ||
            value.contains(' SO') ||
            value.contains(' RO')) continue; // office names

        // Use the first reasonable text value we find
        if (value.length >= 2 && value.length <= 50) {
          // If it's a name, create an ID from it
          final words = value.split(RegExp(r'\s+'));
          if (words.length >= 2) {
            final nameId = words
                    .map((word) => word.isNotEmpty ? word[0].toUpperCase() : '')
                    .join('') +
                (DateTime.now().millisecondsSinceEpoch % 1000).toString();
            print('✅ Created fallback ID from "$value": "$nameId"');
            return nameId;
          } else {
            // Single word, use as-is with some modification
            final singleId = value
                    .toUpperCase()
                    .substring(0, value.length > 8 ? 8 : value.length) +
                (DateTime.now().millisecondsSinceEpoch % 100).toString();
            print(
                '✅ Created fallback ID from single word "$value": "$singleId"');
            return singleId;
          }
        }
      }
    }

    // 5. Absolute final fallback
    final fallbackId =
        'USER${DateTime.now().millisecondsSinceEpoch.toString().substring(DateTime.now().millisecondsSinceEpoch.toString().length - 6)}';
    print('❌ No usable data found, using absolute fallback: "$fallbackId"');
    return fallbackId;
  }

  /// Export table data to Excel file
  Future<void> _exportToExcel() async {
    try {
      print('📊 Starting Excel export...');

      // Create a new Excel document
      var excel = excel_lib.Excel.createExcel();

      // Get the default sheet
      excel_lib.Sheet sheetObject = excel['Sheet1'];

      // Add headers
      for (int i = 0; i < columns.length; i++) {
        var cell = sheetObject.cell(
            excel_lib.CellIndex.indexByColumnRow(columnIndex: i, rowIndex: 0));
        cell.value = excel_lib.TextCellValue(columns[i].label);
        cell.cellStyle = excel_lib.CellStyle(
          bold: true,
          backgroundColorHex: excel_lib.ExcelColor.blue,
          fontColorHex: excel_lib.ExcelColor.white,
        );
      }

      // Add data rows
      for (int rowIndex = 0; rowIndex < processedData.length; rowIndex++) {
        final row = processedData[rowIndex];
        for (int colIndex = 0; colIndex < columns.length; colIndex++) {
          final column = columns[colIndex];
          final value = row[column.key];

          var cell = sheetObject.cell(excel_lib.CellIndex.indexByColumnRow(
              columnIndex: colIndex, rowIndex: rowIndex + 1));

          // Format the cell value based on column type
          String cellValue = '';
          if (column.type == 'date' && value is Map<String, String>) {
            cellValue = '${value['date']} ${value['time']}';
          } else {
            cellValue = value?.toString() ?? '';
          }

          cell.value = excel_lib.TextCellValue(cellValue);
        }
      }

      // Generate filename with timestamp
      final now = DateTime.now();
      final timestamp =
          '${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}_${now.hour.toString().padLeft(2, '0')}${now.minute.toString().padLeft(2, '0')}';
      final fileName = 'reports_export_$timestamp.xlsx';

      // Get the Downloads directory
      Directory? downloadsDirectory;
      if (Platform.isAndroid) {
        downloadsDirectory = Directory('/storage/emulated/0/Download');
        if (!await downloadsDirectory.exists()) {
          downloadsDirectory = await getExternalStorageDirectory();
        }
      } else if (Platform.isIOS) {
        downloadsDirectory = await getApplicationDocumentsDirectory();
      }

      if (downloadsDirectory != null) {
        final filePath = '${downloadsDirectory.path}/$fileName';
        final file = File(filePath);

        // Save the Excel file
        final excelBytes = excel.encode();
        if (excelBytes != null) {
          await file.writeAsBytes(excelBytes);

          print('✅ Excel file saved to: $filePath');

          // Show success message
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                    '📊 Excel file exported successfully!\nSaved to: $fileName'),
                backgroundColor: Colors.green,
                duration: const Duration(seconds: 4),
                action: SnackBarAction(
                  label: 'OK',
                  textColor: Colors.white,
                  onPressed: () {},
                ),
              ),
            );
          }
        } else {
          throw Exception('Failed to encode Excel file');
        }
      } else {
        throw Exception('Could not access downloads directory');
      }
    } catch (error) {
      print('❌ Error exporting to Excel: $error');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Export failed: ${error.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loadingColumns) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(48.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text(
                '🔄 Building dynamic table structure...',
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    if (widget.loading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(48.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text(
                '🔄 Loading submissions...',
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    if (widget.submissions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(48.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('📭', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 16),
              const Text(
                'No Submissions Found',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'No form submissions match your current filters.',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: widget.onRefresh,
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh'),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: [
        // Horizontal scrollable table
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SingleChildScrollView(
              child: DataTable(
                columnSpacing: 16,
                horizontalMargin: 16,
                columns: columns.map((column) {
                  return DataColumn(
                    label: Container(
                      constraints: BoxConstraints(
                        minWidth: column.type == 'field' ? 120 : 80,
                      ),
                      child: Text(
                        column.label,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  );
                }).toList(),
                rows: processedData.map((row) {
                  return DataRow(
                    cells: columns.map((column) {
                      final value = row[column.key];

                      return DataCell(
                        Container(
                          constraints: BoxConstraints(
                            minWidth: column.type == 'field' ? 120 : 80,
                            maxWidth: 200,
                          ),
                          child: _buildCellContent(column, value),
                        ),
                      );
                    }).toList(),
                  );
                }).toList(),
              ),
            ),
          ),
        ),

        // Table Footer
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey[50],
            border: Border(top: BorderSide(color: Colors.grey[300]!)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Info text
              Text(
                'Showing ${widget.submissions.length} submissions across ${columns.length - 2} field types',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 8),
              // Buttons row
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  // Export to Excel button
                  ElevatedButton.icon(
                    onPressed: processedData.isNotEmpty ? _exportToExcel : null,
                    icon: const Icon(Icons.file_download, size: 14),
                    label: const Text('Export', style: TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 6),
                      minimumSize: const Size(70, 32),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Refresh button
                  ElevatedButton.icon(
                    onPressed: widget.onRefresh,
                    icon: const Icon(Icons.refresh, size: 14),
                    label:
                        const Text('Refresh', style: TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 6),
                      minimumSize: const Size(70, 32),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCellContent(TableColumn column, dynamic value) {
    switch (column.type) {
      case 'form_type':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.blue[50],
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            value?.toString() ?? '',
            style: TextStyle(
              color: Colors.blue[800],
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        );

      case 'date':
        if (value is Map<String, String>) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                value['date'] ?? '',
                style: const TextStyle(fontSize: 11),
              ),
              Text(
                value['time'] ?? '',
                style: const TextStyle(fontSize: 10, color: Colors.grey),
              ),
            ],
          );
        }
        return Text(
          value?.toString() ?? '',
          style: const TextStyle(fontSize: 11),
          overflow: TextOverflow.ellipsis,
        );

      default:
        return Text(
          value?.toString() ?? '-',
          style: const TextStyle(fontSize: 11),
          overflow: TextOverflow.ellipsis,
        );
    }
  }
}
