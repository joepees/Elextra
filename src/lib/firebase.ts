import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json" assert { type: "json" };

const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Auth Provider with requested Gmail scopes
googleProvider.addScope("https://mail.google.com/");
googleProvider.addScope("https://www.googleapis.com/auth/gmail.compose");
googleProvider.addScope("https://www.googleapis.com/auth/gmail.readonly");
googleProvider.addScope("https://www.googleapis.com/auth/gmail.send");
googleProvider.addScope("https://www.googleapis.com/auth/gmail.modify");

// In-memory cache for Google OAuth access token
let cachedAccessToken: string | null = null;

export const setGmailAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getGmailAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Listen for auth state changes to clear the cached token upon sign out
auth.onAuthStateChanged((user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

// Using the custom firestoreDatabaseId for custom firestore DB
export const firestore = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
