#!/bin/bash

# Xcode 16.2 Build Fix Script
# Specifically addresses the '-G' flag issue

echo "🔧 Fixing Xcode 16.2 build issues..."

# Navigate to iOS directory
cd ios

# Clean everything thoroughly
echo "🧹 Deep cleaning build artifacts..."
rm -rf build/
rm -rf Pods/
rm -rf .symlinks/
rm -rf Flutter/Flutter.framework
rm -rf Flutter/Flutter.podspec
rm -rf DerivedData/
rm -rf ~/Library/Developer/Xcode/DerivedData/Runner-*

# Remove Podfile.lock to force fresh install
rm -f Podfile.lock

# Update CocoaPods to latest version
echo "📦 Updating CocoaPods..."
sudo gem install cocoapods --force
pod repo update

# Clean and reinstall pods with verbose output
echo "🔄 Reinstalling CocoaPods dependencies..."
pod deintegrate
pod install --verbose --repo-update

# Go back to Flutter root
cd ..

# Clean Flutter completely
echo "🧹 Cleaning Flutter..."
flutter clean
rm -rf .dart_tool/
rm -rf build/

# Get fresh dependencies
echo "📦 Getting Flutter dependencies..."
flutter pub get

# Try building with specific flags to bypass the issue
echo "🚀 Attempting build with Xcode 16.2 compatibility..."

# Method 1: Build with specific simulator
flutter build ios --debug --simulator --target-platform ios-x64

echo "✅ Build attempt completed!"
echo ""
echo "🎯 If build succeeded, try running:"
echo "   flutter run -d 'iPhone 16 Plus'"
echo ""
echo "📱 Alternative: Open in Xcode and build manually:"
echo "   open ios/Runner.xcworkspace"
echo ""
echo "🔧 If still failing, try building for a different simulator:"
echo "   flutter devices"
echo "   flutter run -d 'iPhone 15'"
echo ""
