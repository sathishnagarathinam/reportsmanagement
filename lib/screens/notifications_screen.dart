import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/notification_service.dart';
import '../services/reports_routing_service.dart';
import '../services/division_notification_service.dart';
import '../services/office_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  _NotificationsScreenState createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _isDivisionUser = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkUserType();
  }

  Future<void> _checkUserType() async {
    try {
      print('🔔 NotificationsScreen: Checking user type...');

      // Use shouldShowComprehensiveReports but ensure cache is populated first
      // by calling it twice if needed
      bool isDivision =
          await ReportsRoutingService.shouldShowComprehensiveReports();

      // If we got false, it might be due to cache issues, try once more
      if (!isDivision) {
        print(
            '🔔 NotificationsScreen: First check returned false, trying again...');
        ReportsRoutingService.clearCache();
        await Future.delayed(const Duration(milliseconds: 100)); // Small delay
        isDivision =
            await ReportsRoutingService.shouldShowComprehensiveReports();
      }

      print('🔔 NotificationsScreen: Is division user: $isDivision');

      setState(() {
        _isDivisionUser = isDivision;
        _isLoading = false;
      });
      print(
          '🔔 NotificationsScreen: State updated - _isDivisionUser: $_isDivisionUser');
    } catch (error) {
      setState(() {
        _isLoading = false;
      });
      print('❌ NotificationsScreen: Error checking user type: $error');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (_isDivisionUser) ...[
            IconButton(
              icon: const Icon(Icons.send, color: Colors.blue),
              onPressed: () {
                print(
                    '🔔 NotificationsScreen: Send notification button pressed');
                _showSendNotificationDialog(context);
              },
              tooltip: 'Send Notification',
            ),
          ] else ...[
            // Debug: Show why send button is not visible
            Builder(
              builder: (context) {
                print(
                    '🔔 NotificationsScreen: Send button hidden - _isDivisionUser: $_isDivisionUser');
                return const SizedBox.shrink();
              },
            ),
          ],
          StreamBuilder<int>(
            stream: NotificationService.getUnreadCount(),
            builder: (context, snapshot) {
              final unreadCount = snapshot.data ?? 0;
              if (unreadCount > 0) {
                return Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$unreadCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ],
      ),
      body: StreamBuilder<List<Map<String, dynamic>>>(
        stream: NotificationService.getUserNotifications(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error loading notifications',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                      color: Colors.red[700],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    snapshot.error.toString(),
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          final notifications = snapshot.data ?? [];

          if (notifications.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.notifications_none,
                    size: 64,
                    color: Colors.grey,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'No notifications',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'You\'ll see notifications here when there are updates',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              // Refresh is handled automatically by the stream
              await Future.delayed(const Duration(milliseconds: 500));
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: notifications.length,
              itemBuilder: (context, index) {
                return _buildNotificationCard(notifications[index]);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildNotificationCard(Map<String, dynamic> notification) {
    final isRead = notification['isRead'] as bool? ?? false;
    final title = notification['title'] as String? ?? 'Notification';
    final body = notification['body'] as String? ?? '';
    final type = notification['type'] as String? ?? 'general';
    final priority = notification['priority'] as String? ?? 'normal';
    final receivedAt = notification['receivedAt'] as Timestamp?;
    final notificationId = notification['id'] as String;

    // Get icon and color based on type
    IconData icon;
    Color iconColor;

    switch (type) {
      case 'form_submission':
        icon = Icons.assignment_turned_in;
        iconColor = Colors.green;
        break;
      case 'pending_forms':
        icon = Icons.pending_actions;
        iconColor = Colors.orange;
        break;
      case 'overdue_forms':
        icon = Icons.warning;
        iconColor = Colors.red;
        break;
      case 'system_announcement':
        icon = Icons.campaign;
        iconColor = Colors.blue;
        break;
      default:
        icon = Icons.notifications;
        iconColor = Colors.grey;
    }

    // Format time
    String timeText = '';
    if (receivedAt != null) {
      final dateTime = receivedAt.toDate();
      final now = DateTime.now();
      final difference = now.difference(dateTime);

      if (difference.inDays > 0) {
        timeText = '${difference.inDays}d ago';
      } else if (difference.inHours > 0) {
        timeText = '${difference.inHours}h ago';
      } else if (difference.inMinutes > 0) {
        timeText = '${difference.inMinutes}m ago';
      } else {
        timeText = 'Just now';
      }
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isRead ? 1 : 3,
      child: InkWell(
        onTap: () async {
          if (!isRead) {
            await NotificationService.markAsRead(notificationId);
          }
          _handleNotificationTap(notification);
        },
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: iconColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight:
                                  isRead ? FontWeight.w500 : FontWeight.w600,
                              color: isRead ? Colors.grey[700] : Colors.black,
                            ),
                          ),
                        ),
                        if (priority == 'urgent')
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.red,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'URGENT',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      body,
                      style: TextStyle(
                        fontSize: 14,
                        color: isRead ? Colors.grey[600] : Colors.grey[800],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          timeText,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[500],
                          ),
                        ),
                        if (!isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Colors.blue,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),

              // Actions
              PopupMenuButton<String>(
                onSelected: (value) async {
                  switch (value) {
                    case 'mark_read':
                      await NotificationService.markAsRead(notificationId);
                      break;
                    case 'delete':
                      await NotificationService.deleteNotification(
                          notificationId);
                      break;
                  }
                },
                itemBuilder: (context) => [
                  if (!isRead)
                    const PopupMenuItem(
                      value: 'mark_read',
                      child: Row(
                        children: [
                          Icon(Icons.mark_email_read, size: 18),
                          SizedBox(width: 8),
                          Text('Mark as read'),
                        ],
                      ),
                    ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete, size: 18, color: Colors.red),
                        SizedBox(width: 8),
                        Text('Delete', style: TextStyle(color: Colors.red)),
                      ],
                    ),
                  ),
                ],
                child: const Icon(Icons.more_vert, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handleNotificationTap(Map<String, dynamic> notification) {
    final data = notification['data'] as Map<String, dynamic>? ?? {};
    final type = data['type'] as String?;
    final screen = data['screen'] as String?;

    print(
        '🔔 NotificationsScreen: Tapped notification type: $type, screen: $screen');

    switch (screen) {
      case 'reports':
        // Navigate to reports screen
        Navigator.pushNamed(context, '/reports');
        break;
      case 'pending_forms':
        // Navigate to pending forms screen
        Navigator.pushNamed(context, '/pending_forms');
        break;
      case 'notifications':
        // Already on notifications screen
        break;
      default:
        print('🔔 NotificationsScreen: Unknown screen: $screen');
    }
  }

  void _showSendNotificationDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => _SendNotificationDialog(),
    );
  }
}

class _SendNotificationDialog extends StatefulWidget {
  @override
  _SendNotificationDialogState createState() => _SendNotificationDialogState();
}

class _SendNotificationDialogState extends State<_SendNotificationDialog> {
  final _titleController = TextEditingController();
  final _messageController = TextEditingController();
  final _searchController = TextEditingController();
  String _selectedType = 'all';
  String? _selectedOffice;
  List<String> _offices = [];
  List<String> _filteredOffices = [];
  List<String> _pendingOffices = [];
  bool _isLoading = false;
  bool _showOfficeSearch = false;

  @override
  void initState() {
    super.initState();
    _loadOffices();
    _loadPendingOffices();
  }

  Future<void> _loadOffices() async {
    try {
      final offices = await OfficeService.fetchOfficeNames();
      setState(() {
        _offices = offices;
        _filteredOffices = offices; // Initialize filtered list
      });
    } catch (e) {
      print('Error loading offices: $e');
    }
  }

  void _filterOffices(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredOffices = _offices;
      } else {
        _filteredOffices = _offices
            .where(
                (office) => office.toLowerCase().contains(query.toLowerCase()))
            .toList();
      }
    });
  }

  Future<void> _loadPendingOffices() async {
    try {
      // Get offices with pending forms
      final pendingOffices =
          await DivisionNotificationService.getPendingOffices();
      setState(() {
        _pendingOffices = pendingOffices;
      });
    } catch (e) {
      print('Error loading pending offices: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Send Notification'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title field
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Title',
                border: OutlineInputBorder(),
              ),
              maxLength: 100,
            ),
            const SizedBox(height: 16),

            // Message field
            TextField(
              controller: _messageController,
              decoration: const InputDecoration(
                labelText: 'Message',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
              maxLength: 500,
            ),
            const SizedBox(height: 16),

            // Notification type
            const Text('Send to:',
                style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),

            RadioListTile<String>(
              title: const Text('All Users'),
              subtitle: const Text('Send to all users in the system'),
              value: 'all',
              groupValue: _selectedType,
              onChanged: (value) => setState(() => _selectedType = value!),
            ),

            RadioListTile<String>(
              title: const Text('Selected Office'),
              subtitle: const Text('Choose a specific office'),
              value: 'selected',
              groupValue: _selectedType,
              onChanged: (value) => setState(() => _selectedType = value!),
            ),

            if (_selectedType == 'selected') ...[
              const SizedBox(height: 8),
              // Search field for offices
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  labelText: 'Search Office',
                  hintText: 'Type to search from ${_offices.length} offices...',
                  border: const OutlineInputBorder(),
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            _filterOffices('');
                          },
                        )
                      : null,
                ),
                onChanged: _filterOffices,
              ),
              const SizedBox(height: 8),
              // Dropdown with filtered results
              DropdownButtonFormField<String>(
                value: _selectedOffice,
                decoration: InputDecoration(
                  labelText: 'Select Office',
                  hintText: _filteredOffices.isEmpty
                      ? 'No offices found'
                      : 'Choose from ${_filteredOffices.length} results',
                  border: const OutlineInputBorder(),
                ),
                isExpanded: true,
                items: _filteredOffices
                    .map((office) => DropdownMenuItem(
                          value: office,
                          child: SizedBox(
                            width: double.infinity,
                            child: Text(
                              office,
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                              style: const TextStyle(fontSize: 14),
                            ),
                          ),
                        ))
                    .toList(),
                onChanged: (value) => setState(() => _selectedOffice = value),
                validator: (value) {
                  if (_selectedType == 'selected' && value == null) {
                    return 'Please select an office';
                  }
                  return null;
                },
              ),
            ],

            RadioListTile<String>(
              title: const Text('Pending Offices'),
              subtitle: Text(
                  'Send to ${_pendingOffices.length} offices with pending forms'),
              value: 'pending',
              groupValue: _selectedType,
              onChanged: (value) => setState(() => _selectedType = value!),
            ),

            RadioListTile<String>(
              title: const Text('Test Notification'),
              subtitle: const Text('Send a test notification to yourself'),
              value: 'test',
              groupValue: _selectedType,
              onChanged: (value) => setState(() => _selectedType = value!),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _sendNotification,
          child: _isLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Send'),
        ),
      ],
    );
  }

  Future<void> _sendNotification() async {
    if (_titleController.text.trim().isEmpty ||
        _messageController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter both title and message'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (_selectedType == 'selected' && _selectedOffice == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select an office'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final title = _titleController.text.trim();
      final message = _messageController.text.trim();

      switch (_selectedType) {
        case 'all':
          await DivisionNotificationService.sendNotificationToAll(
              title, message);
          break;
        case 'selected':
          await DivisionNotificationService.sendNotificationToOffice(
              _selectedOffice!, title, message);
          break;
        case 'pending':
          await DivisionNotificationService.sendNotificationToPendingOffices(
              title, message);
          break;
        case 'test':
          await DivisionNotificationService.sendTestNotification();
          break;
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Notification sent successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error sending notification: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    _searchController.dispose();
    super.dispose();
  }
}
