import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyArkEeLNGL9BP6iq8WnmdPy8TVX6_-Mqq4",
  authDomain: "peasy-81bbe.firebaseapp.com",
  projectId: "peasy-81bbe",
  storageBucket: "peasy-81bbe.firebasestorage.app",
  messagingSenderId: "791313939257",
  appId: "1:791313939257:web:5e0de8b609757157a286e8",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);