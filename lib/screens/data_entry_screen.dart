import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart'; // Using for icons similar to web
import './dynamic_page_screen.dart';
import '../services/form_filtering_service.dart';
import '../services/favorites_service.dart';
import '../services/division_notification_service.dart';
import '../services/reports_routing_service.dart';

class Category {
  final String id;
  final String name;
  final String icon;
  final String? parentId;
  final bool isPage; // Ensure this is bool
  final String? pageId;
  // final int order; // Uncomment if you use order

  Category({
    required this.id,
    required this.name, // Make sure 'name' is a required named parameter
    required this.icon,
    this.parentId,
    required this.isPage,
    this.pageId,
    // required this.order, // Uncomment if you use order
  });

  factory Category.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;

    bool isPageValue = false;
    if (data.containsKey('isPage') && data['isPage'] is bool) {
      isPageValue = data['isPage'] as bool;
    } else if (data.containsKey('isPage')) {
      print(
          'Warning: isPage for category ${data['name']} is not a boolean. Actual type: ${data['isPage'].runtimeType}, Value: ${data['isPage']}');
      // Potentially try to parse if it's a string representation of a boolean
      if (data['isPage'] is String) {
        if (data['isPage'].toString().toLowerCase() == 'true') {
          isPageValue = true;
        } else if (data['isPage'].toString().toLowerCase() == 'false') {
          isPageValue = false;
        }
      }
    }

    String? pageIdValue;
    if (data.containsKey('pageId') && data['pageId'] is String) {
      pageIdValue = data['pageId'] as String?;
    } else if (data.containsKey('pageId')) {
      print(
          'Warning: pageId for category ${data['name']} is not a String. Actual type: ${data['pageId'].runtimeType}, Value: ${data['pageId']}');
    }

    // Handle name/title field more robustly
    String categoryName = '';
    if (data.containsKey('title') && data['title'] != null) {
      categoryName = data['title'].toString().trim();
    } else if (data.containsKey('name') && data['name'] != null) {
      categoryName = data['name'].toString().trim();
    }

    return Category(
      id: doc.id,
      name: categoryName,
      icon: data['icon']?.toString() ?? '',
      parentId: data['parentId'] as String?,
      isPage: isPageValue,
      pageId: pageIdValue,
      // order: (data['order'] ?? 0) as int, // Ensure 'order' is handled correctly if used
    );
  }
}

class DataEntryScreen extends StatefulWidget {
  final String? parentCategoryId;
  final String?
      parentCategoryTitle; // This is the correct parameter name for the title

  const DataEntryScreen(
      {super.key, this.parentCategoryId, this.parentCategoryTitle});

  @override
  _DataEntryScreenState createState() => _DataEntryScreenState();
}

class _DataEntryScreenState extends State<DataEntryScreen> {
  List<Category> _categories = [];
  bool _isLoading = true;
  String? _errorMessage;
  String? _currentParentCategoryId; // Declare this field
  List<String> _breadcrumbs = []; // Initialize empty or with a base title
  bool _isDivisionUser = false;

  @override
  void initState() {
    super.initState();
    // Initialize breadcrumbs. If there's a parent title, add it.
    // The root screen might not have a parentCategoryTitle.
    _breadcrumbs = widget.parentCategoryTitle != null
        ? ['Categories', widget.parentCategoryTitle!]
        : ['Categories'];
    _fetchCategories(widget.parentCategoryId);
    _checkIfDivisionUser();
  }

  Future<void> _checkIfDivisionUser() async {
    try {
      final isDivision =
          await ReportsRoutingService.shouldShowComprehensiveReports();
      setState(() {
        _isDivisionUser = isDivision;
      });
    } catch (error) {
      print('❌ DataEntryScreen: Error checking user type: $error');
    }
  }

  Future<void> _fetchCategories(String? parentCategoryId) async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
        _currentParentCategoryId =
            parentCategoryId; // This line will now be valid
      });
    }

    print(
        'Fetching categories with parentId: $parentCategoryId'); // Debug print

    try {
      List<Category> fetchedCategories = [];

      if (parentCategoryId == null) {
        // Fetch top-level categories - handle both null and empty string parentId
        // This fixes the issue where web admin creates with parentId: null
        // but Flutter was only looking for parentId: ''

        print('🔍 Fetching top-level categories...');

        // Get all documents and filter in code to handle both null and empty string
        final allSnapshot =
            await FirebaseFirestore.instance.collection('categories').get();

        for (var doc in allSnapshot.docs) {
          final data = doc.data();
          final parentId = data['parentId'];

          // Consider it a top-level category if parentId is null, empty string, or missing
          if (parentId == null ||
              parentId == '' ||
              parentId.toString().trim().isEmpty) {
            try {
              final category = Category.fromFirestore(doc);
              fetchedCategories.add(category);
              print(
                  '✅ Added top-level category: ${category.name} (parentId: $parentId)');
            } catch (e) {
              print('❌ Error parsing category ${doc.id}: $e');
            }
          }
        }
      } else {
        // Fetch child categories - use query for better performance
        print('🔍 Fetching child categories for parent: $parentCategoryId');
        Query query = FirebaseFirestore.instance.collection('categories');
        query = query.where('parentId', isEqualTo: parentCategoryId);
        final snapshot = await query.get();

        fetchedCategories =
            snapshot.docs.map((doc) => Category.fromFirestore(doc)).toList();
      }

      // Filter out categories with empty or null names and invalid data
      fetchedCategories = fetchedCategories.where((category) {
        bool hasValidName =
            category.name.isNotEmpty && category.name.trim().isNotEmpty;
        bool hasValidId = category.id.isNotEmpty;
        bool isValid = hasValidName && hasValidId;

        if (!isValid) {
          print(
              'Filtering out invalid category: ID="${category.id}", Name="${category.name}", Icon="${category.icon}"');
        }
        return isValid;
      }).toList();

      // DEBUG PRINT (optional, but can be helpful)
      print(
          'Fetched ${fetchedCategories.length} valid categories for parentId: ${widget.parentCategoryId}');
      for (var cat in fetchedCategories) {
        print(
            'Category: ${cat.name}, ID: ${cat.id}, ParentID: ${cat.parentId}, IconName: ${cat.icon}');
      }

      if (mounted) {
        setState(() {
          _categories = fetchedCategories;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Error fetching categories: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error fetching categories: ${e.toString()}')),
        );
      }
    }
  }

  // Helper function to get IconData from a string name (ensure this is implemented)
  IconData _getIconData(String iconName) {
    print('Attempting to get icon for: $iconName'); // Debug print
    switch (iconName.toLowerCase()) {
      // Use toLowerCase for case-insensitive matching
      case 'user':
        return FontAwesomeIcons.user;
      case 'filealt':
        return FontAwesomeIcons.fileLines;
      case 'aadhaar':
        return FontAwesomeIcons.idCard;
      case 'reports':
        return FontAwesomeIcons.chartBar;
      case 'settings':
        return FontAwesomeIcons.gear;
      case 'fabuilding':
        return FontAwesomeIcons.building;
      case 'fabriefcase': // Added mapping for 'business development'
        return FontAwesomeIcons.briefcase;
      case 'falaptopcode': // Added mapping for 'Technology'
        return FontAwesomeIcons.laptopCode;
      case 'fasearch': // Added mapping for 'Technology'
        return FontAwesomeIcons.searchengin;
      case 'fapiggybank': // Added mapping for 'Technology'
        return FontAwesomeIcons.piggyBank;
      case 'fausers': // Added mapping for 'Technology'
        return FontAwesomeIcons.users;

      // Add all your icon mappings here
      default:
        print(
            'Warning: No icon found for $iconName, using default.'); // Debug print
        return FontAwesomeIcons.folder; // A sensible default
    }
  }

  Widget _buildCategoryCard(Category category) {
    IconData iconData = _getIconData(category.icon);

    // Add this debug print statement
    print('Category Name for card: ${category.name}');

    return Card(
      elevation: 2.0,
      margin: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
      child: ListTile(
        leading: Center(
          widthFactor: 1.0, // Ensures the Center widget takes up enough width
          child: FaIcon(
            iconData,
            size: 20, // Adjust size as needed
            color: Theme.of(context).primaryColor, // Use theme color
          ),
        ),
        title: Text(
          category.name,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Show favorite icon only for forms (pages)
            if (category.isPage && category.pageId != null)
              StreamBuilder<bool>(
                stream: FavoritesService.favoriteStatusStream(category.pageId!),
                builder: (context, snapshot) {
                  final isFavorite = snapshot.data ?? false;
                  return IconButton(
                    icon: Icon(
                      isFavorite ? Icons.favorite : Icons.favorite_border,
                      color: isFavorite ? Colors.red : Colors.grey,
                      size: 20,
                    ),
                    onPressed: () async {
                      final success = await FavoritesService.toggleFavorite(
                        category.pageId!,
                        category.name,
                      );

                      if (success && mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(isFavorite
                                ? 'Removed from favorites'
                                : 'Added to favorites'),
                            duration: const Duration(seconds: 2),
                            backgroundColor:
                                isFavorite ? Colors.orange : Colors.green,
                          ),
                        );
                      }
                    },
                  );
                },
              ),
            const Icon(Icons.arrow_forward_ios, size: 16.0),
          ],
        ),
        onTap: () async {
          if (category.isPage) {
            // Check office-based access before navigating to DynamicPageScreen
            if (category.pageId != null) {
              print(
                  '🔒 DataEntry: Checking access for form: ${category.pageId}');

              // Show loading indicator
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (context) => const Center(
                  child: CircularProgressIndicator(),
                ),
              );

              try {
                // Check if user can access this form
                final hasAccess = await FormFilteringService.canUserAccessForm(
                    category.pageId!);

                // Hide loading indicator
                if (mounted) {
                  Navigator.of(context).pop();

                  if (hasAccess) {
                    print(
                        '✅ DataEntry: Access granted for form: ${category.pageId}');
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            DynamicPageScreen(pageId: category.pageId!),
                      ),
                    );
                  } else {
                    print(
                        '❌ DataEntry: Access denied for form: ${category.pageId}');
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                            'Access denied: This form is not available for your office.'),
                        backgroundColor: Colors.orange,
                        duration: Duration(seconds: 3),
                      ),
                    );
                  }
                }
              } catch (error) {
                // Hide loading indicator
                if (mounted) {
                  Navigator.of(context).pop();

                  print('❌ DataEntry: Error checking form access: $error');
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content:
                          Text('Error checking form access. Please try again.'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            } else {
              // Handle error: pageId is null
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Error: Page ID is missing.')),
              );
            }
          } else {
            // Navigate to another DataEntryScreen for sub-categories
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => DataEntryScreen(
                  parentCategoryId: category.id,
                  parentCategoryTitle: category.name, // Pass the title
                ),
              ),
            );
          }
        },
      ),
    );
  }

  // Method to handle back navigation within DataEntryScreen
  void _navigateBack() {
    if (_breadcrumbs.length > 1) {
      _breadcrumbs.removeLast(); // Remove current level
      String? previousParentId = _breadcrumbs.length > 1
          ? _categories
              .firstWhere((cat) => cat.name == _breadcrumbs.last,
                  orElse: () =>
                      Category(id: '', name: '', icon: '', isPage: false))
              .parentId // This logic might need refinement
          : null;
      // If breadcrumbs has only 'Categories' left, it means we are going back to root.
      // The parentId for root is null or empty string depending on your Firestore structure.
      // For simplicity, let's assume root categories have parentId as null.
      _fetchCategories(
          previousParentId); // Fetch categories for the parent level
    }
    // If you want to pop the screen if it's the top-level DataEntryScreen,
    // you might need more complex logic or rely on the AppBar's default back button behavior
    // if this DataEntryScreen was pushed by another screen.
    // However, if this is the root DataEntryScreen in the BottomNavBar, you might not want to pop.
  }

  @override
  Widget build(BuildContext context) {
    // Determine the title for the AppBar
    String appBarTitle =
        _breadcrumbs.isNotEmpty ? _breadcrumbs.last : 'Categories';
    if (_breadcrumbs.length > 1) {
      // If there's a specific parent category title
      appBarTitle = _breadcrumbs.last;
    } else if (widget.parentCategoryTitle != null) {
      // Fallback for initial load if breadcrumbs aren't fully set
      appBarTitle = widget.parentCategoryTitle!;
    } else {
      appBarTitle = 'Categories'; // Default for top-level
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(appBarTitle), // Use dynamic title
        leading: (_currentParentCategoryId != null ||
                    _breadcrumbs.length > 1) &&
                Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  // Custom back navigation logic if needed, or just Navigator.pop(context)
                  // For now, let's use the _navigateBack logic if it's for internal navigation,
                  // or Navigator.pop if it's a pushed screen.
                  // This part needs careful consideration based on how DataEntryScreen is used.
                  // If _navigateBack handles internal state changes for breadcrumbs:
                  // _navigateBack();
                  // If this screen was pushed and should simply pop:
                  Navigator.pop(context);
                },
              )
            : null, // No back button for the root categories view or if it cannot pop
        actions: _isDivisionUser
            ? [
                PopupMenuButton<String>(
                  onSelected: (value) async {
                    switch (value) {
                      case 'test_notification':
                        await DivisionNotificationService
                            .sendTestNotification();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Test notification sent!'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        }
                        break;
                      case 'test_form_submission':
                        await DivisionNotificationService
                            .sendTestFormSubmissionNotification();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                  'Test form submission notification sent!'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        }
                        break;
                      case 'test_pending_forms':
                        await DivisionNotificationService
                            .sendTestPendingFormsNotification();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content:
                                  Text('Test pending forms notification sent!'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        }
                        break;
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'test_notification',
                      child: Row(
                        children: [
                          Icon(Icons.notifications_active, size: 18),
                          SizedBox(width: 8),
                          Text('Test Notification'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'test_form_submission',
                      child: Row(
                        children: [
                          Icon(Icons.assignment_turned_in, size: 18),
                          SizedBox(width: 8),
                          Text('Test Form Submission'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'test_pending_forms',
                      child: Row(
                        children: [
                          Icon(Icons.pending_actions, size: 18),
                          SizedBox(width: 8),
                          Text('Test Pending Forms'),
                        ],
                      ),
                    ),
                  ],
                  child: const Icon(Icons.bug_report, color: Colors.orange),
                ),
              ]
            : null,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(child: Text(_errorMessage!))
              : _categories.isEmpty
                  ? const Center(child: Text('No categories found.'))
                  : Column(
                      children: [
                        // _buildBreadcrumbs(), // You'll need to implement _buildBreadcrumbs
                        Expanded(
                          child: ListView.builder(
                            itemCount: _categories.length,
                            itemBuilder: (context, index) {
                              return _buildCategoryCard(_categories[index]);
                            },
                          ),
                        ),
                      ],
                    ),
    );
  }
}
