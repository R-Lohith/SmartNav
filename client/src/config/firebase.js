import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDMBBn9GAtyeonpzTzFVgWqjzRZINV8zcg",
    authDomain: "sihproject122.firebaseapp.com",
    projectId: "sihproject122",
    storageBucket: "sihproject122.firebasestorage.app",
    messagingSenderId: "1074159668432",
    appId: "1:1074159668432:web:78b698fc015ae83bf1a2d5",
    measurementId: "G-TENV361BNG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth & Google provider
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Sign in with Google
export const signInWithGoogle = async () => {
    console.log("🔥 Firebase Google Sign-In called");
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Firebase Sign-In Error:", error);
        throw error;
    }
};

// Sign out
export const logOut = async () => {
    await signOut(auth);
};

// Export only the helpers used by the app
export default app;
