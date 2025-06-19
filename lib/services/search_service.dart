import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/form_filtering_service.dart';

class SearchResult {
  final String id;
  final String title;
  final String type; // 'form', 'category', 'submission'
  final String? description;
  final String? icon;
  final String? pageId;
  final String? categoryId;
  final Map<String, dynamic>? metadata;

  SearchResult({
    required this.id,
    required this.title,
    required this.type,
    this.description,
    this.icon,
    this.pageId,
    this.categoryId,
    this.metadata,
  });
}

class SearchService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Search across all dynamic forms and categories
  static Future<List<SearchResult>> searchAll(String query) async {
    if (query.trim().isEmpty) {
      return [];
    }

    print('🔍 Search: Searching for "$query"');

    try {
      final results = <SearchResult>[];

      // Expand query to include common postal abbreviations
      final expandedQueries = _expandSearchQuery(query);

      // Search in parallel for better performance
      for (final searchQuery in expandedQueries) {
        final futures = await Future.wait([
          _searchCategories(searchQuery),
          _searchFormSubmissions(searchQuery),
          _searchFavorites(searchQuery),
        ]);

        // Combine all results
        for (final resultList in futures) {
          results.addAll(resultList);
        }
      }

      // Remove duplicates and sort by relevance
      final uniqueResults = _removeDuplicates(results);
      final sortedResults = _sortByRelevance(uniqueResults, query);

      print('🔍 Search: Found ${sortedResults.length} results for "$query"');
      return sortedResults;
    } catch (error) {
      print('❌ Search error: $error');
      return [];
    }
  }

  /// Expand search query to include related postal service terms
  static List<String> _expandSearchQuery(String query) {
    final queryLower = query.toLowerCase().trim();
    final queries = <String>[query]; // Always include original query

    // Postal service abbreviation expansions
    final expansions = <String, List<String>>{
      'sb': ['savings bank', 'saving bank', 'savings', 'bank'],
      'aadhaar': ['aadhar', 'adhaar', 'adhar', 'uid', 'unique id'],
      'pli': ['postal life insurance', 'life insurance', 'insurance'],
      'rpli': ['rural postal life insurance', 'rural insurance', 'rural pli'],
      'ippb': [
        'india post payments bank',
        'payments bank',
        'post bank',
        'payment'
      ],
      'post': ['postal', 'post office', 'mail'],
      'office': ['post office', 'branch'],
      'delivery': ['mail delivery', 'post delivery', 'courier'],
      'collection': ['mail collection', 'post collection'],
    };

    // Add expansions for the query
    for (final entry in expansions.entries) {
      if (queryLower.contains(entry.key)) {
        queries.addAll(entry.value);
      }
    }

    // Remove duplicates and return
    return queries.toSet().toList();
  }

  /// Search in categories (forms and folders)
  static Future<List<SearchResult>> _searchCategories(String query) async {
    try {
      final queryLower = query.toLowerCase();

      // Get all categories
      final snapshot = await _firestore.collection('categories').get();

      final results = <SearchResult>[];

      for (final doc in snapshot.docs) {
        final data = doc.data();
        final title = data['title'] ?? '';
        final icon = data['icon'] ?? '';
        final isPage = data['isPage'] ?? false;
        final pageId = data['pageId'] as String?;

        // Check if title matches search query
        if (title.toLowerCase().contains(queryLower)) {
          // For forms (pages), check office-based access
          if (isPage && pageId != null) {
            final hasAccess =
                await FormFilteringService.canUserAccessForm(pageId);
            if (!hasAccess) {
              continue; // Skip forms user can't access
            }
          }

          results.add(SearchResult(
            id: doc.id,
            title: title,
            type: isPage ? 'form' : 'category',
            icon: icon,
            pageId: pageId,
            categoryId: doc.id,
            metadata: {
              'isPage': isPage,
              'parentId': data['parentId'],
            },
          ));
        }
      }

      print('🔍 Categories: Found ${results.length} category results');
      return results;
    } catch (error) {
      print('❌ Error searching categories: $error');
      return [];
    }
  }

  /// Search in form submissions
  static Future<List<SearchResult>> _searchFormSubmissions(String query) async {
    try {
      final user = _auth.currentUser;
      if (user == null) return [];

      final queryLower = query.toLowerCase();

      // Get recent form submissions
      final snapshot = await _firestore
          .collection('dynamic_form_submissions')
          .orderBy('created_at', descending: true)
          .limit(100) // Limit for performance
          .get();

      final results = <SearchResult>[];
      final seenFormIds = <String>{};

      for (final doc in snapshot.docs) {
        final data = doc.data();
        final formIdentifier = data['form_identifier'] as String?;
        final submissionData = data['submission_data'] as Map<String, dynamic>?;

        if (formIdentifier == null || submissionData == null) continue;

        // Avoid duplicate form identifiers
        if (seenFormIds.contains(formIdentifier)) continue;

        // Search in form identifier and submission data
        bool matches = formIdentifier.toLowerCase().contains(queryLower);

        if (!matches) {
          // Search in submission data values
          for (final value in submissionData.values) {
            if (value is String && value.toLowerCase().contains(queryLower)) {
              matches = true;
              break;
            }
          }
        }

        if (matches) {
          seenFormIds.add(formIdentifier);

          results.add(SearchResult(
            id: formIdentifier,
            title: _getFormDisplayName(formIdentifier),
            type: 'submission',
            description: 'Recent submission found',
            icon: 'filealt',
            pageId: formIdentifier,
            metadata: {
              'submissionCount': 1,
              'lastSubmission': data['created_at'],
            },
          ));
        }
      }

      print('🔍 Submissions: Found ${results.length} submission results');
      return results;
    } catch (error) {
      print('❌ Error searching submissions: $error');
      return [];
    }
  }

  /// Search in user favorites
  static Future<List<SearchResult>> _searchFavorites(String query) async {
    try {
      final user = _auth.currentUser;
      if (user == null) return [];

      final queryLower = query.toLowerCase();

      // Get user favorites
      final snapshot = await _firestore
          .collection('user_favorites')
          .where('userId', isEqualTo: user.uid)
          .get();

      final results = <SearchResult>[];

      for (final doc in snapshot.docs) {
        final data = doc.data();
        final formTitle = data['formTitle'] as String? ?? '';
        final formId = data['formId'] as String?;

        if (formId == null) continue;

        // Check if title matches search query
        if (formTitle.toLowerCase().contains(queryLower)) {
          results.add(SearchResult(
            id: formId,
            title: formTitle,
            type: 'favorite',
            description: 'Favorite form',
            icon: 'favorite',
            pageId: formId,
            metadata: {
              'isFavorite': true,
              'addedAt': data['addedAt'],
            },
          ));
        }
      }

      print('🔍 Favorites: Found ${results.length} favorite results');
      return results;
    } catch (error) {
      print('❌ Error searching favorites: $error');
      return [];
    }
  }

  /// Remove duplicate results based on pageId or id
  static List<SearchResult> _removeDuplicates(List<SearchResult> results) {
    final seen = <String>{};
    final unique = <SearchResult>[];

    for (final result in results) {
      final key = result.pageId ?? result.id;
      if (!seen.contains(key)) {
        seen.add(key);
        unique.add(result);
      }
    }

    return unique;
  }

  /// Sort results by relevance to search query
  static List<SearchResult> _sortByRelevance(
      List<SearchResult> results, String query) {
    final queryLower = query.toLowerCase();

    results.sort((a, b) {
      // Prioritize exact matches
      final aExact = a.title.toLowerCase() == queryLower;
      final bExact = b.title.toLowerCase() == queryLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Prioritize starts with
      final aStarts = a.title.toLowerCase().startsWith(queryLower);
      final bStarts = b.title.toLowerCase().startsWith(queryLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Prioritize forms over categories
      if (a.type == 'form' && b.type != 'form') return -1;
      if (a.type != 'form' && b.type == 'form') return 1;

      // Prioritize favorites
      if (a.type == 'favorite' && b.type != 'favorite') return -1;
      if (a.type != 'favorite' && b.type == 'favorite') return 1;

      // Sort alphabetically
      return a.title.compareTo(b.title);
    });

    return results;
  }

  /// Get display name for form identifier
  static String _getFormDisplayName(String formIdentifier) {
    // Convert form identifier to readable name
    return formIdentifier
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isNotEmpty
            ? word[0].toUpperCase() + word.substring(1).toLowerCase()
            : word)
        .join(' ');
  }

  /// Search suggestions based on recent searches and popular forms
  static Future<List<String>> getSearchSuggestions() async {
    try {
      final suggestions = <String>[];

      // Add postal/government specific search terms (prioritized)
      suggestions.addAll([
        'SB', // Savings Bank
        'AADHAAR', // Aadhaar services
        'PLI', // Postal Life Insurance
        'RPLI', // Rural Postal Life Insurance
        'IPPB', // India Post Payments Bank
        'NSC', // National Savings Certificate
        'KVP', // Kisan Vikas Patra
        'PPF', // Public Provident Fund
        'SCSS', // Senior Citizens Savings Scheme
        'MIS', // Monthly Income Scheme
        'TD', // Time Deposit
        'RD', // Recurring Deposit
        'Money Order', // Money Order services
        'Speed Post', // Speed Post services
        'Registered Post', // Registered Post
        'Parcel', // Parcel services
        'Passport', // Passport services
        'PAN', // PAN services
        'Pension', // Pension services
        'daily report',
        'weekly report',
        'monthly report',
        'attendance',
        'leave',
        'post office',
        'delivery',
        'collection',
        'counter',
        'cash',
        'transaction',
      ]);

      // Add recent form identifiers
      final snapshot = await _firestore
          .collection('dynamic_form_submissions')
          .orderBy('created_at', descending: true)
          .limit(20)
          .get();

      for (final doc in snapshot.docs) {
        final data = doc.data();
        final formIdentifier = data['form_identifier'] as String?;
        if (formIdentifier != null) {
          final displayName = _getFormDisplayName(formIdentifier);
          if (!suggestions.contains(displayName)) {
            suggestions.add(displayName);
          }
        }
      }

      return suggestions.take(10).toList();
    } catch (error) {
      print('❌ Error getting search suggestions: $error');
      return [];
    }
  }
}
