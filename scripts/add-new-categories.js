const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCoBTaAwoQoR5B6FipxgyCF70ukN2rN2A0",
  authDomain: "employeemanagementsystem-6e893.firebaseapp.com",
  projectId: "employeemanagementsystem-6e893",
  storageBucket: "employeemanagementsystem-6e893.firebasestorage.app",
  messagingSenderId: "88739308700",
  appId: "1:88739308700:web:66a8e34809583e53c1b959"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addNewCategories() {
  try {
    console.log('Adding new categories to Firebase...');

    // Add Compliance category
    const complianceId = 'compliance-' + Date.now();
    const complianceRef = doc(db, 'categories', complianceId);
    await setDoc(complianceRef, {
      id: complianceId,
      title: 'Compliance',
      path: `/categories/${complianceId}`,
      parentId: '', // Top-level category
      lastUpdated: new Date().toISOString(),
      icon: 'FaShieldAlt',
      color: '#E91E63',
      fields: [],
      isPage: true,
      pageId: complianceId,
    });
    console.log('✅ Compliance category added successfully');

    // Add MMU category
    const mmuId = 'mmu-' + Date.now();
    const mmuRef = doc(db, 'categories', mmuId);
    await setDoc(mmuRef, {
      id: mmuId,
      title: 'MMU',
      path: `/categories/${mmuId}`,
      parentId: '', // Top-level category
      lastUpdated: new Date().toISOString(),
      icon: 'FaTruck',
      color: '#FF5722',
      fields: [],
      isPage: true,
      pageId: mmuId,
    });
    console.log('✅ MMU category added successfully');

    console.log('🎉 All new categories have been added to Firebase!');
    console.log('You can now see them in both the web app and Flutter app.');
    
  } catch (error) {
    console.error('❌ Error adding categories:', error);
  }
}

// Run the script
addNewCategories();
