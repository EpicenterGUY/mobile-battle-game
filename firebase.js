import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
      import {
        getDatabase,
        ref,
        set,
        update,
        get,
        onValue,
        remove,
      } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";

      const firebaseConfig = {
        apiKey: "AIzaSyDWGUoQ7wDlBo6DZ-ksaSBIONFwVFxTSls",
        authDomain: "moblie-battle-game.firebaseapp.com",
        databaseURL:
          "https://moblie-battle-game-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "moblie-battle-game",
        storageBucket: "moblie-battle-game.firebasestorage.app",
        messagingSenderId: "316801652493",
        appId: "1:316801652493:web:b0ed3da0dba57b244bc244",
        measurementId: "G-LLLPMSVRXP",
      };

      const app = initializeApp(firebaseConfig);
      const db = getDatabase(app);

export { db, ref, set, update, get, onValue, remove };
