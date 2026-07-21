/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Your web app's Firebase configuration (provided by user or environment)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD9aowDuikorcbioTpvR4-5pNGbtvVe0QA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "diemdanh-56430.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "diemdanh-56430",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "diemdanh-56430.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "735680893276",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:735680893276:web:c893a3e12e005992fab199"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with robust connection settings for iframe sandboxes & offline cache
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
