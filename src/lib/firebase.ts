import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  firebaseConfig.projectId !== 'YOUR_FIREBASE_PROJECT_ID' &&
  !firebaseConfig.apiKey.includes('YOUR_')
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

/**
 * Creates a user account directly in Firebase Authentication without signing out
 * the current active administrator session in the browser.
 */
let secondaryApp: FirebaseApp | null = null;

export async function createFirebaseAuthUser(
  email: string,
  pass: string,
  displayName?: string
): Promise<{ uid: string } | null> {
  if (!isFirebaseConfigured) {
    console.warn('Firebase is not configured, skipping Firebase Auth user creation.');
    return null;
  }

  const existing = getApps().find(a => a.name === 'SecondaryAuth');
  secondaryApp = existing || initializeApp(firebaseConfig, 'SecondaryAuth');
  const secondaryAuth = getAuth(secondaryApp);

  const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), pass);
  if (displayName && cred.user) {
    try {
      await updateProfile(cred.user, { displayName });
    } catch {
      // non-critical if display name update fails
    }
  }

  const uid = cred.user.uid;
  // Sign out from the secondary auth instance immediately
  await signOut(secondaryAuth);
  return { uid };
}

import type { AppUser } from '../types';

/**
 * Iterates through a list of users and registers any missing user accounts
 * directly into Firebase Authentication so all users reflect in the Firebase Console.
 */
export async function syncAllUsersToFirebaseAuth(usersList: AppUser[]): Promise<{
  total: number;
  created: number;
  alreadyExisted: number;
  failed: number;
  errors: string[];
}> {
  let created = 0;
  let alreadyExisted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const u of usersList) {
    const email = (u.email || '').trim();
    if (!email || !email.includes('@')) continue;

    // Determine password (Firebase Auth requires min 6 chars)
    const rawPass = (u.password || u.pin || '123456').trim();
    const authPass = rawPass.length >= 6 ? rawPass : rawPass.padEnd(6, '0');

    try {
      await createFirebaseAuthUser(email, authPass, u.name);
      created++;
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        alreadyExisted++;
      } else {
        failed++;
        errors.push(`${u.name} (${email}): ${err?.message || 'Error'}`);
      }
    }
  }

  return { total: usersList.length, created, alreadyExisted, failed, errors };
}

export { app, auth, db, storage, firebaseConfig };
