/* ============================================================
   APP.JS — Logique applicative
   ============================================================ */

const ALERTES_PIN = '1996';
let alertesUnlocked = false;

let allItems = [];          // cache mémoire de tous les articles
let currentItem = null;     // article actuellement affiché dans Recherche
let currentEmpGroup = [];   // toutes les lignes (même réf, différents emplacements)

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  await refreshCache();
  bindNav();
  bindRecherche();
  bindAjout();
  bindAlertesLock();
  bindModal();
  bindExportImport();
  bindAdminSearch();
  updateStatusBar();
});

async function refreshCache() {
  allItems = await dbGetAll();
}

function updateStatusBar() {
  document.getElementById('statusText').textContent =
    `Données locales — ${allItems.length} référence${allItems.length > 1 ? 's' : ''}`;
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- Navigation onglets ---------- */
function bindNav() {
  document.querySelectorAll('nav.tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      const previousTab = document.querySelector('nav.tabs button.active')?.dataset.tab;

      // Si on quitte l'onglet alertes, on reverrouille systématiquement
      if (previousTab === 'alertes' && btn.dataset.tab !== 'alertes') {
        lockAlertes();
      }

      document.querySelectorAll('nav.tabs button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');

      if (btn.dataset.tab === 'alertes') {
        if (alertesUnlocked) {
          renderAlertes();
        } else {
          document.getElementById('alertesLocked').style.display = 'block';
          document.getElementById('alertesContent').style.display = 'none';
        }
      }
    });
  });
}

function lockAlertes() {
  alertesUnlocked = false;
  document.getElementById('alertesLocked').style.display = 'block';
  document.getElementById('alertesContent').style.display = 'none';
  document.getElementById('alertesPinInput').value = '';
  document.getElementById('alertesPinMsg').textContent = '';
  // Réinitialiser aussi le module de recherche admin
  document.getElementById('adminSearchRef').value = '';
  document.getElementById('adminSearchDes').value = '';
  document.getElementById('adminSuggRef').style.display = 'none';
  document.getElementById('adminSuggDes').style.display = 'none';
  document.getElementById('adminResult').style.display = 'none';
  adminCurrentItem = null;
}

/* ============================================================
   RECHERCHE
   ============================================================ */
function bindRecherche() {
  const searchRef = document.getElementById('searchRef');
  const searchDes = document.getElementById('searchDes');
  const suggRef = document.getElementById('suggRef');
  const suggDes = document.getElementById('suggDes');
  const selectEmp = document.getElementById('selectEmp');

  searchRef.addEventListener('input', () => {
    const q = searchRef.value.trim().toUpperCase();
    if (!q) { suggRef.style.display = 'none'; return; }
    const matches = uniqueByRef(allItems.filter(it => it.ref.toUpperCase().includes(q)));
    renderSuggest(suggRef, matches, item => `<b>${escapeHtml(item.ref)}</b><span>${escapeHtml(item.designation || '')}</span>`, item => selectByRef(item.ref));
  });

  searchDes.addEventListener('input', () => {
    const q = searchDes.value.trim().toUpperCase();
    if (!q) { suggDes.style.display = 'none'; return; }
    const matches = uniqueByDes(allItems.filter(it => (it.designation || '').toUpperCase().includes(q)));
    renderSuggest(suggDes, matches, item => `<span>${escapeHtml(item.designation || '')}</span><b>${escapeHtml(item.ref)}</b>`, item => selectByRef(item.ref));
  });

  selectEmp.addEventListener('change', () => {
    const idx = Number(selectEmp.value);
    if (currentEmpGroup[idx]) loadItemIntoForm(currentEmpGroup[idx]);
  });

  document.querySelectorAll('button.op').forEach(btn => {
    btn.addEventListener('click', () => adjustQty(Number(btn.dataset.d)));
  });

  document.getElementById('btnCommander').addEventListener('click', async () => {
    if (!currentItem) return;
    if (!confirm('Passer la quantité à zéro pour ' + currentItem.ref + ' ?')) return;
    currentItem.quantite = 0;
    await dbUpdate(currentItem);
    await autoSave();
    await refreshCache();
    refreshCurrentItemFromCache();
    document.getElementById('qtyNum').textContent = '0';
    document.getElementById('qtyNum').classList.add('low');
    showToast('Commande enregistrée. Quantité remise à zéro.');
  });

  document.getElementById('btnResetForm').addEventListener('click', resetSearchForm);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchRef') && !e.target.closest('#suggRef')) suggRef.style.display = 'none';
    if (!e.target.closest('#searchDes') && !e.target.closest('#suggDes')) suggDes.style.display = 'none';
  });
}

function uniqueByRef(items) {
  const seen = new Set(); const out = [];
  for (const it of items) { const k = it.ref.toUpperCase(); if (!seen.has(k)) { seen.add(k); out.push(it); } }
  return out;
}
function uniqueByDes(items) {
  const seen = new Set(); const out = [];
  for (const it of items) { const k = (it.designation || '').toUpperCase(); if (!seen.has(k)) { seen.add(k); out.push(it); } }
  return out;
}

function renderSuggest(container, items, htmlFn, onClick) {
  container.innerHTML = '';
  if (items.length === 0) { container.style.display = 'none'; return; }
  items.forEach(item => {
    const div = document.createElement('div');
    div.innerHTML = htmlFn(item);
    div.addEventListener('click', () => onClick(item));
    container.appendChild(div);
  });
  container.style.display = 'block';
}

function selectByRef(ref) {
  document.getElementById('searchRef').value = ref;
  document.getElementById('suggRef').style.display = 'none';
  document.getElementById('suggDes').style.display = 'none';

  currentEmpGroup = allItems.filter(it => it.ref.toUpperCase() === ref.toUpperCase());
  const select = document.getElementById('selectEmp');
  select.innerHTML = '';
  currentEmpGroup.forEach((item, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = item.emplacement;
    select.appendChild(opt);
  });

  if (currentEmpGroup.length > 0) {
    document.getElementById('searchDes').value = currentEmpGroup[0].designation || '';
    loadItemIntoForm(currentEmpGroup[0]);
  }
}

function loadItemIntoForm(item) {
  currentItem = item;
  document.getElementById('fieldTyp').value = item.type || '';
  document.getElementById('qtyNum').textContent = item.quantite;
  document.getElementById('qtyNum').classList.toggle('low', isLow(item));
  document.getElementById('qtyRefLabel').textContent = item.ref + ' · ' + item.emplacement;
  document.getElementById('cardQty').style.display = 'block';
}

function refreshCurrentItemFromCache() {
  if (!currentItem) return;
  const updated = allItems.find(it => it.id === currentItem.id);
  if (updated) currentItem = updated;
}

function isLow(item) {
  return (item.seuil5 && item.quantite < 5) || (item.seuil10 && item.quantite < 10);
}

async function adjustQty(delta) {
  if (!currentItem) { showToast('Sélectionnez un article.'); return; }
  const before = currentItem.quantite;
  const after = before + delta;
  if (after < 0 && !confirm(`Quantité négative (${after}). Continuer ?`)) return;

  currentItem.quantite = after;
  await dbUpdate(currentItem);
  await autoSave();
  await refreshCache();
  refreshCurrentItemFromCache();

  document.getElementById('qtyNum').textContent = after;
  document.getElementById('qtyNum').classList.toggle('low', isLow(currentItem));
  showToast(`Modifié : ${before} → ${after}`);
}

function resetSearchForm() {
  currentItem = null;
  currentEmpGroup = [];
  document.getElementById('searchRef').value = '';
  document.getElementById('searchDes').value = '';
  document.getElementById('selectEmp').innerHTML = '<option value="">—</option>';
  document.getElementById('fieldTyp').value = '';
  document.getElementById('cardQty').style.display = 'none';
  document.getElementById('suggRef').style.display = 'none';
  document.getElementById('suggDes').style.display = 'none';
}

/* ============================================================
   AJOUT D'ARTICLE
   ============================================================ */
function bindAjout() {
  document.getElementById('btnAjouter').addEventListener('click', async () => {
    const ref = document.getElementById('newRef').value.trim();
    const emp = document.getElementById('newEmp').value.trim();

    if (!ref || !emp) { showToast('Référence et emplacement obligatoires.'); return; }

    const doublon = allItems.some(it =>
      it.ref.toUpperCase() === ref.toUpperCase() && it.emplacement.toUpperCase() === emp.toUpperCase()
    );
    if (doublon) { showToast('Cette référence existe déjà à cet emplacement.'); return; }

    const item = {
      ref, emplacement: emp,
      quantite: Number(document.getElementById('newQte').value) || 0,
      designation: document.getElementById('newDes').value.trim(),
      type: document.getElementById('newTyp').value.trim(),
      seuil5: document.getElementById('newS5').checked,
      seuil10: document.getElementById('newS10').checked
    };

    await dbAdd(item);
    await autoSave();
    await refreshCache();
    updateStatusBar();

    ['newRef','newEmp','newDes','newTyp'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('newQte').value = '0';
    document.getElementById('newS5').checked = false;
    document.getElementById('newS10').checked = false;

    showToast('Article ajouté à l\'inventaire.');
  });
}

/* ============================================================
   ALERTES — VERROUILLÉES PAR CODE
   ============================================================ */
function bindAlertesLock() {
  const input = document.getElementById('alertesPinInput');
  const btn = document.getElementById('btnUnlockAlertes');
  const msg = document.getElementById('alertesPinMsg');

  function tryUnlock() {
    if (input.value === ALERTES_PIN) {
      alertesUnlocked = true;
      document.getElementById('alertesLocked').style.display = 'none';
      document.getElementById('alertesContent').style.display = 'block';
      input.value = '';
      msg.textContent = '';
      renderAlertes();
    } else {
      msg.textContent = 'Code incorrect.';
      input.value = '';
      input.focus();
    }
  }

  btn.addEventListener('click', tryUnlock);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
}

function renderAlertes() {
  const list = document.getElementById('alertesList');
  const meta = document.getElementById('alertesMeta');
  const alertes = allItems.filter(isLow);

  if (alertes.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="ok-mark">✓</div><p>Tout est au-dessus du seuil</p></div>`;
    meta.textContent = '';
    return;
  }

  list.innerHTML = '';
  alertes.forEach(item => {
    const row = document.createElement('div');
    row.className = 'alert-row';
    row.innerHTML = `
      <div class="alert-row-top">
        <div>
          <div class="alert-ref">${escapeHtml(item.ref)}</div>
          <div class="alert-des">${escapeHtml(item.designation || '')} · ${escapeHtml(item.emplacement)}</div>
        </div>
        <div class="alert-qty">${item.quantite}</div>
      </div>
      <div class="alert-actions">
        <button class="btn-edit" data-id="${item.id}">Modifier</button>
        <button class="btn-del" data-id="${item.id}">Supprimer</button>
      </div>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => openEditModal(Number(b.dataset.id))));
  list.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => deleteItem(Number(b.dataset.id))));

  meta.textContent = `${alertes.length} article${alertes.length > 1 ? 's' : ''} sous le seuil`;
}

async function deleteItem(id) {
  const item = allItems.find(it => it.id === id);
  if (!item) return;
  if (!confirm(`Supprimer définitivement ${item.ref} (${item.emplacement}) ?`)) return;

  await dbDelete(id);
  await autoSave();
  await refreshCache();
  updateStatusBar();
  renderAlertes();
  showToast('Article supprimé.');
}

/* ============================================================
   MODALE D'ÉDITION
   ============================================================ */
let editingId = null;

function bindModal() {
  document.getElementById('btnEditCancel').addEventListener('click', closeEditModal);
  document.getElementById('btnEditSave').addEventListener('click', saveEditModal);
}

function openEditModal(id) {
  const item = allItems.find(it => it.id === id);
  if (!item) return;
  editingId = id;

  document.getElementById('editRef').value = item.ref;
  document.getElementById('editEmp').value = item.emplacement;
  document.getElementById('editQte').value = item.quantite;
  document.getElementById('editDes').value = item.designation || '';
  document.getElementById('editTyp').value = item.type || '';
  document.getElementById('editS5').checked = !!item.seuil5;
  document.getElementById('editS10').checked = !!item.seuil10;

  document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('show');
  editingId = null;
}

async function saveEditModal() {
  if (editingId == null) return;
  const item = allItems.find(it => it.id === editingId);
  if (!item) return;

  const ref = document.getElementById('editRef').value.trim();
  const emp = document.getElementById('editEmp').value.trim();
  if (!ref || !emp) { showToast('Référence et emplacement obligatoires.'); return; }

  item.ref = ref;
  item.emplacement = emp;
  item.quantite = Number(document.getElementById('editQte').value) || 0;
  item.designation = document.getElementById('editDes').value.trim();
  item.type = document.getElementById('editTyp').value.trim();
  item.seuil5 = document.getElementById('editS5').checked;
  item.seuil10 = document.getElementById('editS10').checked;

  await dbUpdate(item);
  await autoSave();
  await refreshCache();
  updateStatusBar();
  closeEditModal();
  renderAlertes();
  showToast('Article modifié.');
}

/* ============================================================
   EXPORT / IMPORT MANUEL
   ============================================================ */
function bindExportImport() {
  document.getElementById('btnExport').addEventListener('click', async () => {
    await exportToFile();
    showToast('Sauvegarde exportée.');
  });

  const fileInput = document.getElementById('fileImport');
  document.getElementById('btnImport').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Restaurer cette sauvegarde remplacera toutes les données actuelles. Continuer ?')) {
      fileInput.value = '';
      return;
    }
    try {
      await importFromFile(file);
      await refreshCache();
      updateStatusBar();
      renderAlertes();
      showToast('Sauvegarde restaurée.');
    } catch (err) {
      showToast('Fichier invalide.');
    }
    fileInput.value = '';
  });
}

/* ---------- Utilitaire ---------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ============================================================
   MODULE ADMIN — Recherche et édition de tous les articles
   (dans l'onglet Alertes, après déverrouillage)
   ============================================================ */
let adminCurrentItem = null;

function bindAdminSearch() {
  const input = document.getElementById('adminSearchRef');
  const sugg = document.getElementById('adminSuggRef');
  const inputDes = document.getElementById('adminSearchDes');
  const suggDes = document.getElementById('adminSuggDes');

  // --- Recherche par référence ---
  input.addEventListener('input', () => {
    const q = input.value.trim().toUpperCase();
    sugg.innerHTML = '';
    if (!q) { sugg.style.display = 'none'; adminHideResult(); return; }

    const matches = uniqueByRef(allItems.filter(it => it.ref.toUpperCase().includes(q)));
    if (matches.length === 0) { sugg.style.display = 'none'; return; }

    matches.forEach(item => {
      const div = document.createElement('div');
      div.innerHTML = `<b>${escapeHtml(item.ref)}</b><span>${escapeHtml(item.designation || '')}</span>`;
      div.addEventListener('click', () => {
        input.value = item.ref;
        inputDes.value = '';
        suggDes.style.display = 'none';
        sugg.style.display = 'none';
        adminLoadItem(item.ref);
      });
      sugg.appendChild(div);
    });
    sugg.style.display = 'block';
  });

  // --- Recherche par désignation ---
  inputDes.addEventListener('input', () => {
    const q = inputDes.value.trim().toUpperCase();
    suggDes.innerHTML = '';
    if (!q) { suggDes.style.display = 'none'; adminHideResult(); return; }

    const matches = uniqueByDes(allItems.filter(it => (it.designation || '').toUpperCase().includes(q)));
    if (matches.length === 0) { suggDes.style.display = 'none'; return; }

    matches.forEach(item => {
      const div = document.createElement('div');
      div.innerHTML = `<span>${escapeHtml(item.designation || '')}</span><b>${escapeHtml(item.ref)}</b>`;
      div.addEventListener('click', () => {
        inputDes.value = item.designation || '';
        input.value = '';
        sugg.style.display = 'none';
        suggDes.style.display = 'none';
        adminLoadItem(item.ref);
      });
      suggDes.appendChild(div);
    });
    suggDes.style.display = 'block';
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#adminSearchRef') && !e.target.closest('#adminSuggRef')) {
      sugg.style.display = 'none';
    }
    if (!e.target.closest('#adminSearchDes') && !e.target.closest('#adminSuggDes')) {
      suggDes.style.display = 'none';
    }
  });

  document.getElementById('btnAdminSave').addEventListener('click', adminSave);
  document.getElementById('btnAdminDelete').addEventListener('click', adminDelete);
}

function adminLoadItem(ref) {
  const items = allItems.filter(it => it.ref.toUpperCase() === ref.toUpperCase());
  if (items.length === 0) return;

  // Si plusieurs emplacements, on prend le premier (la modale d'édition permet d'affiner)
  adminCurrentItem = items[0];
  const item = adminCurrentItem;

  document.getElementById('adminRef').value = item.ref;
  document.getElementById('adminEmp').value = item.emplacement;
  document.getElementById('adminQte').value = item.quantite;
  document.getElementById('adminDes').value = item.designation || '';
  document.getElementById('adminTyp').value = item.type || '';
  document.getElementById('adminS5').checked = !!item.seuil5;
  document.getElementById('adminS10').checked = !!item.seuil10;

  document.getElementById('adminResult').style.display = 'block';
}

function adminHideResult() {
  adminCurrentItem = null;
  document.getElementById('adminResult').style.display = 'none';
}

async function adminSave() {
  if (!adminCurrentItem) return;

  const ref = document.getElementById('adminRef').value.trim();
  const emp = document.getElementById('adminEmp').value.trim();
  if (!ref || !emp) { showToast('Référence et emplacement obligatoires.'); return; }

  adminCurrentItem.ref = ref;
  adminCurrentItem.emplacement = emp;
  adminCurrentItem.quantite = Number(document.getElementById('adminQte').value) || 0;
  adminCurrentItem.designation = document.getElementById('adminDes').value.trim();
  adminCurrentItem.type = document.getElementById('adminTyp').value.trim();
  adminCurrentItem.seuil5 = document.getElementById('adminS5').checked;
  adminCurrentItem.seuil10 = document.getElementById('adminS10').checked;

  await dbUpdate(adminCurrentItem);
  await autoSave();
  await refreshCache();
  updateStatusBar();
  renderAlertes();
  adminHideResult();
  document.getElementById('adminSearchRef').value = '';
  document.getElementById('adminSearchDes').value = '';
  showToast('Article modifié.');
}

async function adminDelete() {
  if (!adminCurrentItem) return;
  if (!confirm(`Supprimer définitivement ${adminCurrentItem.ref} (${adminCurrentItem.emplacement}) ?`)) return;

  await dbDelete(adminCurrentItem.id);
  await autoSave();
  await refreshCache();
  updateStatusBar();
  renderAlertes();
  adminHideResult();
  document.getElementById('adminSearchRef').value = '';
  document.getElementById('adminSearchDes').value = '';
  showToast('Article supprimé.');
}
