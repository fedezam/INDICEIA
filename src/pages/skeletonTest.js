
console.log('🟢 usuario-test.js cargó');

const app = document.getElementById('app');

if (!app) {
  console.error('❌ No existe #app');
} else {
  console.log('✅ #app encontrado');
  app.innerHTML += '<p>JS ejecutándose correctamente</p>';
}
