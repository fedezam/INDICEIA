import { auth, db } from '../firebase.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { showToast, showLoading, hideLoading } from '../shared/utils.js';

let currentUser = null;
let selectedSkin = null;

// ==================== AUTH ====================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/login.html";
        return;
    }
    currentUser = user;
    showLoading('Cargando skins...');
    await loadSkins();
    hideLoading();
});

// ==================== LOAD SKINS DYNAMICALLY ====================
async function loadSkins() {
    const container = document.getElementById('skinsContainer');
    container.innerHTML = '';

    try {
        // Leer el registry.json de los templates
        const res = await fetch('/api/entity-factory/templates/registry.json');
        const registry = await res.json();

        // registry: { templates: [{ id, name, img }] }
        registry.templates.forEach(template => {
            const card = document.createElement('div');
            card.className = 'skin-card';
            card.dataset.id = template.id;
            card.innerHTML = `
                <img src="${template.img}" alt="${template.name}">
                <h4>${template.name}</h4>
            `;

            card.addEventListener('click', () => {
                document.querySelectorAll('.skin-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectedSkin = template.id;
            });

            container.appendChild(card);
        });

        // Si el usuario ya tiene un skin seleccionado, marcarlo
        const userRef = doc(db, 'usuarios', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().visualSkin) {
            selectedSkin = userSnap.data().visualSkin;
            const activeCard = document.querySelector(`.skin-card[data-id="${selectedSkin}"]`);
            if (activeCard) activeCard.classList.add('active');
        }

    } catch (err) {
        console.error(err);
        showToast('Error', 'No se pudieron cargar los skins', 'error');
    }
}

// ==================== SAVE SELECTION ====================
document.getElementById('saveSkinBtn').addEventListener('click', async () => {
    if (!selectedSkin) {
        showToast('Error', 'Debes seleccionar un skin', 'error');
        return;
    }

    try {
        const userRef = doc(db, 'usuarios', currentUser.uid);
        await updateDoc(userRef, { visualSkin: selectedSkin });
        showToast('Éxito', 'Skin guardado correctamente', 'success');
    } catch (err) {
        console.error(err);
        showToast('Error', 'No se pudo guardar el skin', 'error');
    }
});
