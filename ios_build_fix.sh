#!/bin/bash

# iOS Build Fix Script for Flutter
# Fixes common iOS simulator build issues

echo "🔧 Starting iOS Build Fix..."

# Navigate to iOS directory
cd ios

echo "📱 Cleaning iOS build cache..."
# Clean previous builds
rm -rf build/
rm -rf Pods/
rm -rf .symlinks/
rm -rf Flutter/Flutter.framework
rm -rf Flutter/Flutter.podspec
rm -rf .dart_tool/

echo "🧹 Cleaning Xcode derived data..."
# Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "📦 Reinstalling CocoaPods..."
# Remove Podfile.lock and reinstall
rm -f Podfile.lock

# Install CocoaPods dependencies
pod deintegrate
pod install --repo-update

echo "🔄 Regenerating Flutter iOS files..."
# Go back to Flutter root
cd ..

# Clean Flutter
flutter clean

# Get dependencies
flutter pub get

# Generate iOS files
flutter build ios --debug --simulator

echo "✅ iOS Build Fix Complete!"
echo ""
echo "🚀 Now try running:"
echo "   flutter run -d 'iPhone 16 Plus'"
echo ""
echo "📱 Or open in Xcode:"
echo "   open ios/Runner.xcworkspace"
echo ""
