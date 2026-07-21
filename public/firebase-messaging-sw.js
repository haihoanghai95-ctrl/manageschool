/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Import and configure the Firebase SDK inside the service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyD9aowDuikorcbioTpvR4-5pNGbtvVe0QA",
  authDomain: "diemdanh-56430.firebaseapp.com",
  projectId: "diemdanh-56430",
  storageBucket: "diemdanh-56430.firebasestorage.app",
  messagingSenderId: "735680893276",
  appId: "1:735680893276:web:c893a3e12e005992fab199"
});

// Retrieve an instance of Firebase Cloud Messaging
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'Thông báo từ Nhà Trường';
  const notificationOptions = {
    body: payload.notification.body || 'Bạn có thông tin cập nhật mới.',
    icon: '/src/assets/school_logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
