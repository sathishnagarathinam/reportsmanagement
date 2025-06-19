import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../services/search_service.dart';
import '../services/form_filtering_service.dart';
import './dynamic_page_screen.dart';
import './data_entry_screen.dart';

class SearchResultsScreen extends StatefulWidget {
  final String initialQuery;

  const SearchResultsScreen({
    Key? key,
    this.initialQuery = '',
  }) : super(key: key);

  @override
  State<SearchResultsScreen> createState() => _SearchResultsScreenState();
}

class _SearchResultsScreenState extends State<SearchResultsScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<SearchResult> _results = [];
  List<String> _suggestions = [];
  bool _isLoading = false;
  bool _showSuggestions = true;
  String _currentQuery = '';

  @override
  void initState() {
    super.initState();
    _searchController.text = widget.initialQuery;
    _currentQuery = widget.initialQuery;
    
    if (widget.initialQuery.isNotEmpty) {
      _performSearch(widget.initialQuery);
    } else {
      _loadSuggestions();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadSuggestions() async {
    try {
      final suggestions = await SearchService.getSearchSuggestions();
      if (mounted) {
        setState(() {
          _suggestions = suggestions;
          _showSuggestions = true;
        });
      }
    } catch (error) {
      print('Error loading suggestions: $error');
    }
  }

  Future<void> _performSearch(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _results = [];
        _showSuggestions = true;
        _currentQuery = '';
      });
      _loadSuggestions();
      return;
    }

    setState(() {
      _isLoading = true;
      _showSuggestions = false;
      _currentQuery = query;
    });

    try {
      final results = await SearchService.searchAll(query);
      if (mounted) {
        setState(() {
          _results = results;
          _isLoading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Search error: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  IconData _getIconData(String? iconName) {
    if (iconName == null) return FontAwesomeIcons.folder;
    
    switch (iconName.toLowerCase()) {
      case 'user':
        return FontAwesomeIcons.user;
      case 'filealt':
        return FontAwesomeIcons.fileLines;
      case 'favorite':
        return Icons.favorite;
      case 'aadhaar':
        return FontAwesomeIcons.idCard;
      case 'reports':
        return FontAwesomeIcons.chartBar;
      case 'settings':
        return FontAwesomeIcons.gear;
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

  Color _getTypeColor(String type) {
    switch (type) {
      case 'form':
        return Colors.blue;
      case 'category':
        return Colors.green;
      case 'submission':
        return Colors.orange;
      case 'favorite':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getTypeLabel(String type) {
    switch (type) {
      case 'form':
        return 'Form';
      case 'category':
        return 'Category';
      case 'submission':
        return 'Recent';
      case 'favorite':
        return 'Favorite';
      default:
        return 'Item';
    }
  }

  Widget _buildSearchResult(SearchResult result) {
    return Card(
      elevation: 2.0,
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: _getTypeColor(result.type).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: result.icon == 'favorite'
                ? Icon(
                    Icons.favorite,
                    size: 20,
                    color: _getTypeColor(result.type),
                  )
                : FaIcon(
                    _getIconData(result.icon),
                    size: 20,
                    color: _getTypeColor(result.type),
                  ),
          ),
        ),
        title: Text(
          result.title,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (result.description != null)
              Text(
                result.description!,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            const SizedBox(height: 2),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: _getTypeColor(result.type),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                _getTypeLabel(result.type),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16.0),
        onTap: () => _handleResultTap(result),
      ),
    );
  }

  Widget _buildSuggestionChip(String suggestion) {
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ActionChip(
        label: Text(suggestion),
        onPressed: () {
          _searchController.text = suggestion;
          _performSearch(suggestion);
        },
        backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
        labelStyle: TextStyle(color: Theme.of(context).primaryColor),
      ),
    );
  }

  Future<void> _handleResultTap(SearchResult result) async {
    if (result.type == 'form' || result.type == 'favorite' || result.type == 'submission') {
      if (result.pageId != null) {
        // Show loading indicator
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => const Center(
            child: CircularProgressIndicator(),
          ),
        );

        try {
          // Check access for forms
          final hasAccess = await FormFilteringService.canUserAccessForm(result.pageId!);

          // Hide loading indicator
          if (mounted) {
            Navigator.of(context).pop();

            if (hasAccess) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => DynamicPageScreen(pageId: result.pageId!),
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
    } else if (result.type == 'category') {
      // Navigate to category
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => DataEntryScreen(
            parentCategoryId: result.categoryId,
            parentCategoryTitle: result.title,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Search Forms'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              autofocus: widget.initialQuery.isEmpty,
              decoration: InputDecoration(
                hintText: 'Search forms, categories, submissions...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _performSearch('');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(25.0),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.white,
              ),
              onChanged: (value) {
                // Debounce search
                Future.delayed(const Duration(milliseconds: 500), () {
                  if (_searchController.text == value) {
                    _performSearch(value);
                  }
                });
              },
              onSubmitted: _performSearch,
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _showSuggestions
              ? _buildSuggestionsView()
              : _buildResultsView(),
    );
  }

  Widget _buildSuggestionsView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.all(16.0),
          child: Text(
            'Search Suggestions',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        Expanded(
          child: _suggestions.isEmpty
              ? const Center(
                  child: Text(
                    'Loading suggestions...',
                    style: TextStyle(color: Colors.grey),
                  ),
                )
              : Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Wrap(
                    children: _suggestions
                        .map((suggestion) => _buildSuggestionChip(suggestion))
                        .toList(),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildResultsView() {
    if (_results.isEmpty && _currentQuery.isNotEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search_off,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'No results found for "$_currentQuery"',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            const Text(
              'Try different keywords or check spelling',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_results.isNotEmpty)
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              '${_results.length} result${_results.length == 1 ? '' : 's'} for "$_currentQuery"',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
          ),
        Expanded(
          child: ListView.builder(
            itemCount: _results.length,
            itemBuilder: (context, index) {
              return _buildSearchResult(_results[index]);
            },
          ),
        ),
      ],
    );
  }
}
