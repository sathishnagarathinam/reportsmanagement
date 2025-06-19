import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../services/favorites_service.dart';
import '../services/form_filtering_service.dart';
import './dynamic_page_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({Key? key}) : super(key: key);

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<Map<String, dynamic>> _favorites = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final favorites = await FavoritesService.getFavoritesWithDetails();
      if (mounted) {
        setState(() {
          _favorites = favorites;
          _isLoading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Error loading favorites: $error';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _removeFromFavorites(String formId, String formTitle) async {
    final success = await FavoritesService.removeFromFavorites(formId);
    
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Removed "$formTitle" from favorites'),
          backgroundColor: Colors.orange,
          duration: const Duration(seconds: 2),
        ),
      );
      _loadFavorites(); // Refresh the list
    }
  }

  Future<void> _clearAllFavorites() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear All Favorites'),
        content: const Text('Are you sure you want to remove all favorites?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Clear All', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await FavoritesService.clearAllFavorites();
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('All favorites cleared'),
            backgroundColor: Colors.orange,
          ),
        );
        _loadFavorites(); // Refresh the list
      }
    }
  }

  IconData _getIconData(String iconName) {
    switch (iconName.toLowerCase()) {
      case 'user':
        return FontAwesomeIcons.user;
      case 'filealt':
        return FontAwesomeIcons.fileLines; // Updated from deprecated fileAlt
      case 'aadhaar':
        return FontAwesomeIcons.idCard;
      case 'reports':
        return FontAwesomeIcons.chartBar;
      case 'settings':
        return FontAwesomeIcons.gear; // Updated from deprecated cog
      case 'fabuilding':
        return FontAwesomeIcons.building;
      case 'fabriefcase':
        return FontAwesomeIcons.briefcase;
      case 'falaptopcode':
        return FontAwesomeIcons.laptopCode;
      case 'fasearch':
        return FontAwesomeIcons.magnifyingGlass;
      case 'fapiggybank':
        return FontAwesomeIcons.piggyBank;
      case 'fausers':
        return FontAwesomeIcons.users;
      default:
        return FontAwesomeIcons.folder;
    }
  }

  Widget _buildFavoriteCard(Map<String, dynamic> favorite) {
    final formId = favorite['formId'] as String;
    final formTitle = favorite['formTitle'] as String;
    final icon = favorite['icon'] as String? ?? 'filealt';
    final addedAt = favorite['addedAt'];

    return Card(
      elevation: 2.0,
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: FaIcon(
              _getIconData(icon),
              size: 20,
              color: Theme.of(context).primaryColor,
            ),
          ),
        ),
        title: Text(
          formTitle,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: addedAt != null
            ? Text(
                'Added ${_formatDate(addedAt)}',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              )
            : null,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.favorite, color: Colors.red, size: 20),
              onPressed: () => _removeFromFavorites(formId, formTitle),
              tooltip: 'Remove from favorites',
            ),
            const Icon(Icons.arrow_forward_ios, size: 16.0),
          ],
        ),
        onTap: () => _navigateToForm(formId, formTitle),
      ),
    );
  }

  String _formatDate(dynamic timestamp) {
    try {
      if (timestamp == null) return '';
      final date = timestamp.toDate();
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays == 0) {
        return 'today';
      } else if (difference.inDays == 1) {
        return 'yesterday';
      } else if (difference.inDays < 7) {
        return '${difference.inDays} days ago';
      } else {
        return '${date.day}/${date.month}/${date.year}';
      }
    } catch (e) {
      return '';
    }
  }

  Future<void> _navigateToForm(String formId, String formTitle) async {
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
      final hasAccess = await FormFilteringService.canUserAccessForm(formId);

      // Hide loading indicator
      if (mounted) {
        Navigator.of(context).pop();

        if (hasAccess) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => DynamicPageScreen(pageId: formId),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Access denied: This form is not available for your office.'),
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error accessing form: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Favorite Forms'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
        actions: [
          if (_favorites.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear_all),
              onPressed: _clearAllFavorites,
              tooltip: 'Clear all favorites',
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadFavorites,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _errorMessage!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 16, color: Colors.grey),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadFavorites,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _favorites.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.favorite_border,
                            size: 64,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'No favorite forms yet',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Tap the heart icon on any form to add it to favorites',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 14, color: Colors.grey),
                          ),
                        ],
                      ),
                    )
                  : Column(
                      children: [
                        // Header with count
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16.0),
                          color: Colors.grey[100],
                          child: Text(
                            '${_favorites.length} favorite form${_favorites.length == 1 ? '' : 's'}',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey,
                            ),
                          ),
                        ),
                        // Favorites list
                        Expanded(
                          child: ListView.builder(
                            itemCount: _favorites.length,
                            itemBuilder: (context, index) {
                              return _buildFavoriteCard(_favorites[index]);
                            },
                          ),
                        ),
                      ],
                    ),
    );
  }
}
