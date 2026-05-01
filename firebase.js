let db = null;
let ref = null;
let set = null;
let update = null;
let get = null;
let onValue = null;
let remove = null;

async function initFirebase() {
  try {
    const [{ initializeApp }, dbModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js"),
    ]);

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
    db = dbModule.getDatabase(app);
    ref = dbModule.ref;
    set = dbModule.set;
    update = dbModule.update;
    get = dbModule.get;
    onValue = dbModule.onValue;
    remove = dbModule.remove;
  } catch (error) {
    console.warn("Firebase 로드 실패: 온라인 모드 비활성화", error);
  }
}

await initFirebase();

export { db, ref, set, update, get, onValue, remove };
