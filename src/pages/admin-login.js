import { auth, provider } from '../services/firebase/firebase.js';
import { signInWithRedirect, getRedirectResult } from 'firebase/auth';

const app = document.getElementById('app');

app.innerHTML = `
  <div style="max-width:400px;margin:100px auto;font-family:sans-serif;text-align:center;">
    <h2>🔐 Admin Login</h2>
    <button id="loginBtn" style="padding:10px 20px;cursor:pointer;">
      Ingresar con Google
    </button>
    <p id="error" style="color:red;margin-top:10px;"></p>
  </div>
`;

// Chequeá si volvió del redirect
getRedirectResult(auth).then(result => {
  if (result?.user) {
    window.location.href = '/src/pages/super-admin.html';
  }
}).catch(err => {
  document.getElementById('error').textContent = err.message;
});

document.getElementById('loginBtn').onclick = async () => {
  await signInWithRedirect(auth, provider);
};
