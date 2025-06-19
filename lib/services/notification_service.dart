import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class NotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Initialize notification service
  static Future<void> initialize() async {
    try {
      print('🔔 NotificationService: Initializing...');

      // Request permission for notifications
      await _requestPermission();

      // Get FCM token
      final token = await _messaging.getToken();
      if (token != null) {
        print('🔔 NotificationService: FCM Token: $token');
        await _saveTokenToFirestore(token);
      }

      // Listen for token refresh
      _messaging.onTokenRefresh.listen(_saveTokenToFirestore);

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Handle background messages
      FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);

      // Handle notification taps
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

      // Check for initial message (app opened from notification)
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        _handleNotificationTap(initialMessage);
      }

      print('✅ NotificationService: Initialization complete');
    } catch (error) {
      print('❌ NotificationService: Initialization error: $error');
    }
  }

  /// Request notification permissions
  static Future<void> _requestPermission() async {
    try {
      final settings = await _messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      print(
          '🔔 NotificationService: Permission status: ${settings.authorizationStatus}');

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        print('✅ NotificationService: Notification permissions granted');
      } else if (settings.authorizationStatus ==
          AuthorizationStatus.provisional) {
        print(
            '⚠️ NotificationService: Provisional notification permissions granted');
      } else {
        print('❌ NotificationService: Notification permissions denied');
      }
    } catch (error) {
      print('❌ NotificationService: Permission request error: $error');
    }
  }

  /// Save FCM token to Firestore
  static Future<void> _saveTokenToFirestore(String token) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        print('❌ NotificationService: No user logged in, cannot save token');
        return;
      }

      await _firestore.collection('user_tokens').doc(user.uid).set({
        'token': token,
        'platform': defaultTargetPlatform.name,
        'updatedAt': FieldValue.serverTimestamp(),
        'userId': user.uid,
      }, SetOptions(merge: true));

      print('✅ NotificationService: Token saved to Firestore');
    } catch (error) {
      print('❌ NotificationService: Error saving token: $error');
    }
  }

  /// Handle foreground messages
  static void _handleForegroundMessage(RemoteMessage message) {
    print('🔔 NotificationService: Foreground message received');
    print('🔔 Title: ${message.notification?.title}');
    print('🔔 Body: ${message.notification?.body}');
    print('🔔 Data: ${message.data}');

    // Save notification to local storage
    _saveNotificationLocally(message);

    // You can show a custom in-app notification here if needed
    // For now, we'll let the system handle it
  }

  /// Handle background messages
  static Future<void> _handleBackgroundMessage(RemoteMessage message) async {
    print('🔔 NotificationService: Background message received');
    print('🔔 Title: ${message.notification?.title}');
    print('🔔 Body: ${message.notification?.body}');
    print('🔔 Data: ${message.data}');

    // Save notification to local storage
    await _saveNotificationLocally(message);
  }

  /// Handle notification tap
  static void _handleNotificationTap(RemoteMessage message) {
    print('🔔 NotificationService: Notification tapped');
    print('🔔 Data: ${message.data}');

    // Handle navigation based on notification data
    final notificationType = message.data['type'];
    final targetScreen = message.data['screen'];

    switch (notificationType) {
      case 'form_submission':
        // Navigate to reports or specific form
        print('🔔 Navigate to form submission: ${message.data['formId']}');
        break;
      case 'pending_forms':
        // Navigate to pending forms screen
        print('🔔 Navigate to pending forms');
        break;
      case 'system_announcement':
        // Navigate to announcements or show dialog
        print('🔔 Show system announcement');
        break;
      default:
        print('🔔 Unknown notification type: $notificationType');
    }
  }

  /// Save notification locally for history
  static Future<void> _saveNotificationLocally(RemoteMessage message) async {
    try {
      final user = _auth.currentUser;
      if (user == null) return;

      await _firestore.collection('user_notifications').add({
        'userId': user.uid,
        'title': message.notification?.title ?? '',
        'body': message.notification?.body ?? '',
        'data': message.data,
        'receivedAt': FieldValue.serverTimestamp(),
        'isRead': false,
        'type': message.data['type'] ?? 'general',
      });

      print('✅ NotificationService: Notification saved locally');
    } catch (error) {
      print('❌ NotificationService: Error saving notification locally: $error');
    }
  }

  /// Get user's notification history
  static Stream<List<Map<String, dynamic>>> getUserNotifications() {
    final user = _auth.currentUser;
    if (user == null) {
      return Stream.value([]);
    }

    return _firestore
        .collection('user_notifications')
        .where('userId', isEqualTo: user.uid)
        .limit(50)
        .snapshots()
        .map((snapshot) {
      final notifications = snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        return data;
      }).toList();

      // Sort by receivedAt in memory to avoid index requirement
      notifications.sort((a, b) {
        final aTime = a['receivedAt'] as Timestamp?;
        final bTime = b['receivedAt'] as Timestamp?;

        if (aTime == null && bTime == null) return 0;
        if (aTime == null) return 1;
        if (bTime == null) return -1;

        return bTime.compareTo(aTime); // Descending order (newest first)
      });

      return notifications;
    });
  }

  /// Mark notification as read
  static Future<void> markAsRead(String notificationId) async {
    try {
      await _firestore
          .collection('user_notifications')
          .doc(notificationId)
          .update({'isRead': true});

      print('✅ NotificationService: Notification marked as read');
    } catch (error) {
      print(
          '❌ NotificationService: Error marking notification as read: $error');
    }
  }

  /// Delete notification
  static Future<void> deleteNotification(String notificationId) async {
    try {
      await _firestore
          .collection('user_notifications')
          .doc(notificationId)
          .delete();

      print('✅ NotificationService: Notification deleted');
    } catch (error) {
      print('❌ NotificationService: Error deleting notification: $error');
    }
  }

  /// Get unread notification count
  static Stream<int> getUnreadCount() {
    final user = _auth.currentUser;
    if (user == null) {
      return Stream.value(0);
    }

    return _firestore
        .collection('user_notifications')
        .where('userId', isEqualTo: user.uid)
        .snapshots()
        .map((snapshot) {
      // Filter unread notifications in memory to avoid index requirement
      return snapshot.docs.where((doc) {
        final data = doc.data();
        return data['isRead'] == false;
      }).length;
    });
  }

  /// Subscribe to division-specific topics
  static Future<void> subscribeToDivisionTopics(String officeName) async {
    try {
      // Subscribe to general division notifications
      if (officeName.toLowerCase().endsWith('division')) {
        await _messaging.subscribeToTopic('division_notifications');
        print('✅ NotificationService: Subscribed to division notifications');
      }

      // Subscribe to office-specific notifications
      final sanitizedOfficeName = officeName.replaceAll(' ', '_').toLowerCase();
      await _messaging.subscribeToTopic('office_$sanitizedOfficeName');
      print(
          '✅ NotificationService: Subscribed to office notifications: office_$sanitizedOfficeName');
    } catch (error) {
      print('❌ NotificationService: Error subscribing to topics: $error');
    }
  }

  /// Unsubscribe from topics
  static Future<void> unsubscribeFromTopics(String officeName) async {
    try {
      if (officeName.toLowerCase().endsWith('division')) {
        await _messaging.unsubscribeFromTopic('division_notifications');
      }

      final sanitizedOfficeName = officeName.replaceAll(' ', '_').toLowerCase();
      await _messaging.unsubscribeFromTopic('office_$sanitizedOfficeName');

      print('✅ NotificationService: Unsubscribed from topics');
    } catch (error) {
      print('❌ NotificationService: Error unsubscribing from topics: $error');
    }
  }
}

/// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _handleBackgroundMessage(RemoteMessage message) async {
  await NotificationService._handleBackgroundMessage(message);
}
