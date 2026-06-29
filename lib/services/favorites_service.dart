import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class FavoritesService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Add a form to favorites
  static Future<bool> addToFavorites(String formId, String formTitle) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        print('❌ User not authenticated');
        return false;
      }

      final favoriteData = {
        'formId': formId,
        'formTitle': formTitle,
        'userId': user.uid,
        'addedAt': FieldValue.serverTimestamp(),
      };

      await _firestore
          .collection('user_favorites')
          .doc('${user.uid}_$formId')
          .set(favoriteData);

      print('✅ Added to favorites: $formTitle');
      return true;
    } catch (error) {
      print('❌ Error adding to favorites: $error');
      return false;
    }
  }

  /// Remove a form from favorites
  static Future<bool> removeFromFavorites(String formId) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        print('❌ User not authenticated');
        return false;
      }

      await _firestore
          .collection('user_favorites')
          .doc('${user.uid}_$formId')
          .delete();

      print('✅ Removed from favorites: $formId');
      return true;
    } catch (error) {
      print('❌ Error removing from favorites: $error');
      return false;
    }
  }

  /// Check if a form is in favorites
  static Future<bool> isFavorite(String formId) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        print('❌ User not authenticated for favorite check');
        return false;
      }

      print('🔍 Checking favorite status for user: ${user.uid}, form: $formId');

      final doc = await _firestore
          .collection('user_favorites')
          .doc('${user.uid}_$formId')
          .get();

      final exists = doc.exists;
      print('✅ Favorite check result: $exists');
      return exists;
    } catch (error) {
      print('❌ Error checking favorite status: $error');
      if (error.toString().contains('permission-denied')) {
        print(
            '🔒 Permission denied - check Firestore security rules for user_favorites collection');
      }
      return false;
    }
  }

  /// Get all favorite forms for the current user
  static Future<List<Map<String, dynamic>>> getUserFavorites() async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        print('❌ User not authenticated for getUserFavorites');
        return [];
      }

      print('🔍 Getting favorites for user: ${user.uid}');

      // First, try without ordering to avoid index issues
      final snapshot = await _firestore
          .collection('user_favorites')
          .where('userId', isEqualTo: user.uid)
          .get();

      print(
          '📊 Raw favorites query returned ${snapshot.docs.length} documents');

      final favorites = <Map<String, dynamic>>[];

      for (final doc in snapshot.docs) {
        try {
          final data = doc.data();
          print('📄 Processing favorite document: ${doc.id}');
          print('📄 Document data: $data');

          final favorite = {
            'formId': data['formId'] as String? ?? '',
            'formTitle': data['formTitle'] as String? ?? 'Unknown Form',
            'addedAt': data['addedAt'] as Timestamp?,
          };

          favorites.add(favorite);
          print('✅ Added favorite: ${favorite['formTitle']}');
        } catch (docError) {
          print('❌ Error processing document ${doc.id}: $docError');
        }
      }

      // Sort manually by addedAt if available
      favorites.sort((a, b) {
        final aTime = a['addedAt'] as Timestamp?;
        final bTime = b['addedAt'] as Timestamp?;

        if (aTime == null && bTime == null) return 0;
        if (aTime == null) return 1;
        if (bTime == null) return -1;

        return bTime.compareTo(aTime); // Descending order (newest first)
      });

      print('✅ Retrieved and sorted ${favorites.length} favorites');
      return favorites;
    } catch (error) {
      print('❌ Error getting user favorites: $error');
      if (error.toString().contains('failed-precondition')) {
        print('🔒 Index required - trying without ordering...');

        // Fallback: try without any ordering
        try {
          final user = _auth.currentUser;
          if (user == null) return [];

          final snapshot = await _firestore
              .collection('user_favorites')
              .where('userId', isEqualTo: user.uid)
              .get();

          final favorites = snapshot.docs.map((doc) {
            final data = doc.data();
            return {
              'formId': data['formId'] as String? ?? '',
              'formTitle': data['formTitle'] as String? ?? 'Unknown Form',
              'addedAt': data['addedAt'] as Timestamp?,
            };
          }).toList();

          print('✅ Fallback query retrieved ${favorites.length} favorites');
          return favorites;
        } catch (fallbackError) {
          print('❌ Fallback query also failed: $fallbackError');
          return [];
        }
      }
      return [];
    }
  }

  /// Get favorite forms with category information
  static Future<List<Map<String, dynamic>>> getFavoritesWithDetails() async {
    try {
      final favorites = await getUserFavorites();
      final favoritesWithDetails = <Map<String, dynamic>>[];

      for (final favorite in favorites) {
        try {
          // Get category details from Firestore
          final categorySnapshot = await _firestore
              .collection('categories')
              .where('pageId', isEqualTo: favorite['formId'])
              .limit(1)
              .get();

          if (categorySnapshot.docs.isNotEmpty) {
            final categoryData = categorySnapshot.docs.first.data();
            favoritesWithDetails.add({
              'formId': favorite['formId'],
              'formTitle': favorite['formTitle'],
              'addedAt': favorite['addedAt'],
              'icon': categoryData['icon'] ?? 'filealt',
              'categoryId': categorySnapshot.docs.first.id,
              'parentId': categoryData['parentId'],
            });
          } else {
            // If category not found, still include the favorite with default values
            favoritesWithDetails.add({
              'formId': favorite['formId'],
              'formTitle': favorite['formTitle'],
              'addedAt': favorite['addedAt'],
              'icon': 'filealt',
              'categoryId': null,
              'parentId': null,
            });
          }
        } catch (error) {
          print(
              '❌ Error getting details for favorite ${favorite['formId']}: $error');
          // Include the favorite even if we can't get details
          favoritesWithDetails.add({
            'formId': favorite['formId'],
            'formTitle': favorite['formTitle'],
            'addedAt': favorite['addedAt'],
            'icon': 'filealt',
            'categoryId': null,
            'parentId': null,
          });
        }
      }

      return favoritesWithDetails;
    } catch (error) {
      print('❌ Error getting favorites with details: $error');
      return [];
    }
  }

  /// Toggle favorite status (add if not favorite, remove if favorite)
  static Future<bool> toggleFavorite(String formId, String formTitle) async {
    try {
      final isFav = await isFavorite(formId);

      if (isFav) {
        return await removeFromFavorites(formId);
      } else {
        return await addToFavorites(formId, formTitle);
      }
    } catch (error) {
      print('❌ Error toggling favorite: $error');
      return false;
    }
  }

  /// Get favorites count for the current user
  static Future<int> getFavoritesCount() async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        return 0;
      }

      final snapshot = await _firestore
          .collection('user_favorites')
          .where('userId', isEqualTo: user.uid)
          .get();

      return snapshot.docs.length;
    } catch (error) {
      print('❌ Error getting favorites count: $error');
      return 0;
    }
  }

  /// Stream of favorite status for a specific form
  static Stream<bool> favoriteStatusStream(String formId) {
    final user = _auth.currentUser;
    if (user == null) {
      return Stream.value(false);
    }

    return _firestore
        .collection('user_favorites')
        .doc('${user.uid}_$formId')
        .snapshots()
        .map((doc) => doc.exists);
  }

  /// Stream of all user favorites
  static Stream<List<Map<String, dynamic>>> favoritesStream() {
    final user = _auth.currentUser;
    if (user == null) {
      return Stream.value([]);
    }

    return _firestore
        .collection('user_favorites')
        .where('userId', isEqualTo: user.uid)
        .snapshots()
        .map((snapshot) {
      final favorites = snapshot.docs.map((doc) {
        final data = doc.data();
        return {
          'formId': data['formId'] as String? ?? '',
          'formTitle': data['formTitle'] as String? ?? 'Unknown Form',
          'addedAt': data['addedAt'] as Timestamp?,
        };
      }).toList();

      // Sort manually by addedAt
      favorites.sort((a, b) {
        final aTime = a['addedAt'] as Timestamp?;
        final bTime = b['addedAt'] as Timestamp?;

        if (aTime == null && bTime == null) return 0;
        if (aTime == null) return 1;
        if (bTime == null) return -1;

        return bTime.compareTo(aTime); // Descending order (newest first)
      });

      return favorites;
    });
  }

  /// Clear all favorites for the current user
  static Future<bool> clearAllFavorites() async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        print('❌ User not authenticated');
        return false;
      }

      final snapshot = await _firestore
          .collection('user_favorites')
          .where('userId', isEqualTo: user.uid)
          .get();

      final batch = _firestore.batch();
      for (final doc in snapshot.docs) {
        batch.delete(doc.reference);
      }

      await batch.commit();
      print('✅ Cleared all favorites');
      return true;
    } catch (error) {
      print('❌ Error clearing favorites: $error');
      return false;
    }
  }
}
