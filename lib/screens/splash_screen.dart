import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';

class SplashScreen extends StatefulWidget {
  final Widget nextScreen;

  const SplashScreen({
    super.key,
    required this.nextScreen,
  });

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  // Animation Controllers
  late AnimationController _logoController;
  late AnimationController _textController;
  late AnimationController _backgroundController;

  // Animations
  late Animation<double> _logoScaleAnimation;
  late Animation<double> _logoFadeAnimation;
  late Animation<double> _logoBounceAnimation;
  late Animation<double> _textFadeAnimation;
  late Animation<double> _textSlideAnimation;
  late Animation<double> _backgroundAnimation;

  // Timer for navigation
  Timer? _navigationTimer;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _startAnimationSequence();
  }

  void _initializeAnimations() {
    // Logo Animation Controller (1200ms total)
    _logoController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    // Text Animation Controller (800ms)
    _textController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    // Background Animation Controller (2000ms)
    _backgroundController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    // Logo Scale Animation (0.8 to 1.0 with bounce)
    _logoScaleAnimation = Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _logoController,
      curve: const Interval(0.0, 0.7, curve: Curves.easeOutBack),
    ));

    // Logo Fade Animation
    _logoFadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _logoController,
      curve: const Interval(0.0, 0.5, curve: Curves.easeIn),
    ));

    // Logo Bounce Animation (subtle bounce at the end)
    _logoBounceAnimation = Tween<double>(
      begin: 1.0,
      end: 1.05,
    ).animate(CurvedAnimation(
      parent: _logoController,
      curve: const Interval(0.7, 1.0, curve: Curves.elasticOut),
    ));

    // Text Fade Animation
    _textFadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _textController,
      curve: Curves.easeInOut,
    ));

    // Text Slide Animation (slide up effect)
    _textSlideAnimation = Tween<double>(
      begin: 30.0,
      end: 0.0,
    ).animate(CurvedAnimation(
      parent: _textController,
      curve: Curves.easeOutCubic,
    ));

    // Background Animation
    _backgroundAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _backgroundController,
      curve: Curves.easeInOut,
    ));
  }

  void _startAnimationSequence() async {
    // Set status bar style for splash screen
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );

    // Start background animation immediately
    _backgroundController.forward();

    // Start logo animation
    _logoController.forward();

    // Start text animation after 500ms delay
    await Future.delayed(const Duration(milliseconds: 500));
    if (mounted) {
      _textController.forward();
    }

    // Navigate to next screen after total duration
    _navigationTimer = Timer(const Duration(milliseconds: 2800), () {
      if (mounted) {
        _navigateToNextScreen();
      }
    });
  }

  void _navigateToNextScreen() {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            widget.nextScreen,
        transitionDuration: const Duration(milliseconds: 500),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _logoController.dispose();
    _textController.dispose();
    _backgroundController.dispose();
    _navigationTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedBuilder(
        animation: Listenable.merge([
          _logoController,
          _textController,
          _backgroundController,
        ]),
        builder: (context, child) {
          return Container(
            width: double.infinity,
            height: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(
                      0xFF6A1B9A), // App theme purple - exact match with native splash
                  Color(
                      0xFF8E24AA), // App theme light purple - exact match with native splash
                  Color(
                      0xFF4A148C), // App theme dark purple - exact match with native splash
                ],
              ),
            ),
            child: Stack(
              children: [
                // Background Wave Pattern (similar to dashboard)
                _buildBackgroundWaves(),

                // Main Content
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Logo Animation
                      _buildAnimatedLogo(),

                      const SizedBox(height: 40),

                      // Text Animation
                      _buildAnimatedText(),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildBackgroundWaves() {
    return Positioned.fill(
      child: Opacity(
        opacity: _backgroundAnimation.value * 0.3,
        child: CustomPaint(
          painter: _SplashWavePainter(
            color: Colors.white,
            animationValue: _backgroundAnimation.value,
          ),
        ),
      ),
    );
  }

  Widget _buildAnimatedLogo() {
    return Transform.scale(
      scale: _logoScaleAnimation.value * _logoBounceAnimation.value,
      child: Opacity(
        opacity: _logoFadeAnimation.value,
        child: Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2 * _logoFadeAnimation.value),
                blurRadius: 20,
                offset: const Offset(0, 10),
                spreadRadius: 0,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Image.asset(
              'assets/images/Indiapost_Logo.png',
              fit: BoxFit.contain,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAnimatedText() {
    return Transform.translate(
      offset: Offset(0, _textSlideAnimation.value),
      child: Opacity(
        opacity: _textFadeAnimation.value,
        child: Column(
          children: [
            Text(
              'Reports Management System',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                color: Colors.white,
                letterSpacing: 0.5,
                height: 1.2,
                shadows: [
                  Shadow(
                    color: Colors.black.withOpacity(0.3),
                    offset: const Offset(0, 2),
                    blurRadius: 4,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'India Post Western Region',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w400,
                color: Colors.white.withOpacity(0.9),
                letterSpacing: 0.3,
                shadows: [
                  Shadow(
                    color: Colors.black.withOpacity(0.2),
                    offset: const Offset(0, 1),
                    blurRadius: 2,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Custom Painter for Background Waves
class _SplashWavePainter extends CustomPainter {
  final Color color;
  final double animationValue;

  _SplashWavePainter({
    required this.color,
    required this.animationValue,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    // Animated wave path
    final path = Path();
    final waveHeight = size.height * 0.1 * animationValue;
    final waveLength = size.width * 0.5;

    path.moveTo(0, size.height * 0.3);

    for (double x = 0; x <= size.width; x += waveLength / 4) {
      path.quadraticBezierTo(
        x + waveLength / 8,
        size.height * 0.3 - waveHeight,
        x + waveLength / 4,
        size.height * 0.3,
      );
      path.quadraticBezierTo(
        x + 3 * waveLength / 8,
        size.height * 0.3 + waveHeight,
        x + waveLength / 2,
        size.height * 0.3,
      );
    }

    path.lineTo(size.width, 0);
    path.lineTo(0, 0);
    path.close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return true;
  }
}
