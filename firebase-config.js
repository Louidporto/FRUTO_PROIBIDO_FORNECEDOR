import { initializeApp } from "firebase/app";

import { getDatabase } from "firebase/database";



const firebaseConfig = {

  apiKey: "AIzaSyCRIoKEfFU5LqBkszVgeZDfC2eiJsTtvkI",

  authDomain: "fruto-proibido-73c54.firebaseapp.com",

  projectId: "fruto-proibido-73c54",

  storageBucket: "fruto-proibido-73c54.firebasestorage.app",

  messagingSenderId: "1067844602315",

  appId: "1:1067844602315:web:b6f50d81fae62e15ee4e4e"

};



const app = initializeApp(firebaseConfig);

const database = getDatabase(app);



// Torna o banco global para os outros scripts

window.database = database;
