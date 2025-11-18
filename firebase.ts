
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
// const firebaseConfig = {
//   apiKey: "PASTE_YOUR_API_KEY_HERE",
//   authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
//   projectId: "PASTE_YOUR_PROJECT_ID_HERE",
//   storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
//   messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
//   appId: "PASTE_YOUR_APP_ID_HERE"
// };
const firebaseConfig = {
  apiKey: "AIzaSyDChaXPX5XO3-4VVC43o7FFyF-LkjD2rbg",
  authDomain: "uphr-vault-demo.firebaseapp.com",
  projectId: "uphr-vault-demo",
  storageBucket: "uphr-vault-demo.firebasestorage.app",
  messagingSenderId: "101316573436",
  appId: "1:101316573436:web:a8ca740966d9013635bf79"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
