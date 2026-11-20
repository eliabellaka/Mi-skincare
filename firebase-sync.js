import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const dialog = $("accountDialog");
const status = $("accountStatus");
const openButton = $("accountOpen");
const syncedKeys = [
  "pinkShelf.v1",
  "misPontigues.studies.v1",
  "misPontigues.routines.v1",
  "misPontigues.events.v1",
  "misPontigues.mood.v1",
  "misPontigues.checklist.history.v1",
  "misPontigues.checklist.v1",
  "misPontigues.ritual.v1",
];
const originalSetItem = Storage.prototype.setItem;
let currentUser = null;
let stopListening = null;
let appReady = false;
let reloadPending = false;
let auth = null;
let db = null;

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function updateAccountUI(user) {
  currentUser = user;
  openButton.textContent = user ? "Mi cuenta" : "Iniciar sesión con Google";
  $("accountGoogle").hidden = Boolean(user);
  $("accountSignOut").classList.toggle("hidden", !user);
  $("accountTitle").textContent = user
    ? "Tu cuenta está conectada ♡"
    : "Tu espacio, en todos tus dispositivos ♡";
  document.querySelector(".account-intro").textContent = user
    ? `Conectada como ${user.email}.`
    : "Entra con tu cuenta de Google para guardar y sincronizar tus datos.";
  showStatus(user ? `Sesión iniciada como ${user.email}. Sincronizando…` : "");
}

function reportError(error) {
  const friendly = {
    "auth/network-request-failed": "No hay conexión. Comprueba internet y vuelve a intentarlo.",
    "auth/operation-not-allowed": "Activa el proveedor Google en Authentication → Sign-in method en Firebase.",
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase Authentication.",
    "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite ventanas emergentes y prueba otra vez.",
    "auth/popup-closed-by-user": "Se cerró la ventana de Google antes de terminar.",
    "auth/account-exists-with-different-credential": "Ese correo ya está registrado con otro método de acceso.",
    "permission-denied": "Firebase ha rechazado el acceso. Revisa las reglas de Firestore.",
  };
  showStatus(friendly[error.code] || `No se pudo completar: ${error.message}`, true);
}

async function saveCloudValue(user, key, value) {
  if (!user || !appReady || !syncedKeys.includes(key)) return;
  try {
    await setDoc(doc(db, "users", user.uid, "appData", key), {
      value,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    reportError(error);
  }
}

// La app existente sigue guardando primero en el navegador. Tras iniciar sesión,
// cada actualización de las mismas claves también se envía a Firestore.
Storage.prototype.setItem = function (key, value) {
  originalSetItem.call(this, key, value);
  if (this === localStorage && syncedKeys.includes(String(key))) {
    void saveCloudValue(currentUser, String(key), String(value));
  }
};

async function startSync(user) {
  const dataCollection = collection(db, "users", user.uid, "appData");
  const remote = await getDocs(dataCollection);
  const remoteKeys = new Set();
  let localWasUpdated = false;

  remote.forEach((snapshot) => {
    const key = snapshot.id;
    const value = snapshot.data()?.value;
    if (!syncedKeys.includes(key) || typeof value !== "string") return;
    remoteKeys.add(key);
    if (localStorage.getItem(key) !== value) {
      originalSetItem.call(localStorage, key, value);
      localWasUpdated = true;
    }
  });

  // First account/device: seed the cloud from existing local data. If the account
  // already has cloud data, it wins for keys present there; missing keys are kept.
  for (const key of syncedKeys) {
    const localValue = localStorage.getItem(key);
    if (localValue !== null && !remoteKeys.has(key)) {
      await setDoc(doc(dataCollection, key), {
        value: localValue,
        updatedAt: serverTimestamp(),
      });
    }
  }

  appReady = true;
  showStatus(`Sesión iniciada como ${user.email}. Sincronización activa ♡`);
  if (localWasUpdated) location.reload();

  stopListening?.();
  let firstSnapshot = true;
  stopListening = onSnapshot(
    dataCollection,
    (snapshot) => {
      if (firstSnapshot) {
        firstSnapshot = false;
        return;
      }
      let changed = false;
      snapshot.docChanges().forEach((change) => {
        const key = change.doc.id;
        const value = change.doc.data()?.value;
        if (
          change.type !== "removed" &&
          syncedKeys.includes(key) &&
          typeof value === "string" &&
          localStorage.getItem(key) !== value
        ) {
          originalSetItem.call(localStorage, key, value);
          changed = true;
        }
      });
      if (changed && !reloadPending) {
        reloadPending = true;
        setTimeout(() => location.reload(), 250);
      }
    },
    reportError,
  );
}

const configured = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.length > 0,
);

openButton.addEventListener("click", () => {
  if (!configured) {
    dialog.showModal();
    showStatus("Falta conectar el proyecto Firebase. Mira FIREBASE_SETUP.md para configurarlo.", true);
    return;
  }
  dialog.showModal();
  if (currentUser) showStatus(`Sesión iniciada como ${currentUser.email}.`);
});
$("accountClose").addEventListener("click", () => dialog.close());
$("accountGoogle").addEventListener("click", async () => {
  try {
    showStatus("Conectando con Google…");
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    updateAccountUI(credential.user);
    dialog.close();
  } catch (error) {
    reportError(error);
  }
});
$("accountSignOut").addEventListener("click", async () => {
  try {
    await signOut(auth);
    stopListening?.();
    stopListening = null;
    appReady = false;
    updateAccountUI(null);
    showStatus("Sesión cerrada. Tus datos siguen guardados en este dispositivo.");
  } catch (error) {
    reportError(error);
  }
});

if (!configured) {
  openButton.title = "Conecta Firebase para activar la cuenta";
} else {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  onAuthStateChanged(auth, async (user) => {
    appReady = false;
    stopListening?.();
    stopListening = null;
    updateAccountUI(user);
    if (!user) return;
    try {
      await startSync(user);
    } catch (error) {
      reportError(error);
    }
  });
}
