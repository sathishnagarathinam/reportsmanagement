const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You'll need to download the service account key from Firebase Console
// and place it in the project root as 'serviceAccountKey.json'
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'employeemanagementsystem-6e893'
});

const db = admin.firestore();

async function addCategories() {
  try {
    console.log('🚀 Adding Compliance and MMU categories to Firebase...');

    // Add Compliance category
    const complianceId = 'compliance-' + Date.now();
    await db.collection('categories').doc(complianceId).set({
      id: complianceId,
      title: 'Compliance',
      path: `/categories/${complianceId}`,
      parentId: '', // Top-level category (empty string, not null)
      lastUpdated: new Date().toISOString(),
      icon: 'FaShieldAlt',
      color: '#E91E63',
      fields: [],
      isPage: true,
      pageId: complianceId,
    });
    console.log('✅ Compliance category added successfully with ID:', complianceId);

    // Add MMU category
    const mmuId = 'mmu-' + Date.now();
    await db.collection('categories').doc(mmuId).set({
      id: mmuId,
      title: 'MMU',
      path: `/categories/${mmuId}`,
      parentId: '', // Top-level category (empty string, not null)
      lastUpdated: new Date().toISOString(),
      icon: 'FaTruck',
      color: '#FF5722',
      fields: [],
      isPage: true,
      pageId: mmuId,
    });
    console.log('✅ MMU category added successfully with ID:', mmuId);

    console.log('🎉 Both categories have been added to Firebase!');
    console.log('📱 They should now appear in both web app and Flutter app.');
    
    // Verify by listing all top-level categories
    console.log('\n📋 Verifying top-level categories:');
    const snapshot = await db.collection('categories')
      .where('parentId', '==', '')
      .get();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.title} (${data.icon})`);
    });

  } catch (error) {
    console.error('❌ Error adding categories:', error);
    console.log('\n💡 Make sure you have:');
    console.log('1. Downloaded the service account key from Firebase Console');
    console.log('2. Saved it as "serviceAccountKey.json" in the project root');
    console.log('3. Installed firebase-admin: npm install firebase-admin');
  } finally {
    process.exit();
  }
}

// Run the script
addCategories();
