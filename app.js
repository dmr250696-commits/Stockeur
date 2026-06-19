<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Atelier — Stock</title>
<meta name="theme-color" content="#1B1F23">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
 
<style>
  :root{
    --ink:#1B1F23;
    --ink-soft:#3A4046;
    --paper:#F6F4EF;
    --paper-raised:#FFFFFF;
    --line:#DCD7CC;
    --rust:#B5502D;
    --rust-deep:#8E3D22;
    --brass:#9C8347;
    --ok:#3E6B4F;
    --ok-bg:#E7EFE9;
    --warn-bg:#FBEAE2;
    --warn-ink:#8E3D22;
    --mono:'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    --sans:'Inter', -apple-system, system-ui, sans-serif;
  }
 
  *{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  html,body{ height:100%; }
  body{
    margin:0;
    font-family:var(--sans);
    background:var(--paper);
    color:var(--ink);
    overscroll-behavior-y:contain;
    padding-bottom:env(safe-area-inset-bottom);
  }
 
  /* ---------- Texture de fond : grille discrète d'atelier ---------- */
  body::before{
    content:"";
    position:fixed; inset:0;
    background-image:
      linear-gradient(var(--line) 1px, transparent 1px),
      linear-gradient(90deg, var(--line) 1px, transparent 1px);
    background-size: 28px 28px;
    opacity:0.35;
    pointer-events:none;
    z-index:0;
  }
 
  #app{ position:relative; z-index:1; max-width:480px; margin:0 auto; min-height:100vh; display:flex; flex-direction:column; }
 
  /* ---------- Header ---------- */
  header{
    background:var(--ink);
    color:var(--paper);
    padding:18px 18px 16px;
    position:sticky; top:0; z-index:20;
    border-bottom:3px solid var(--rust);
  }
  .brand{ display:flex; align-items:baseline; justify-content:space-between; }
  .brand h1{
    font-family:var(--mono);
    font-size:18px;
    font-weight:700;
    letter-spacing:0.04em;
    margin:0;
    text-transform:uppercase;
  }
  .brand h1 span{ color:var(--rust); }
  .status-dot{
    width:9px; height:9px; border-radius:50%;
    background:var(--ok);
    box-shadow:0 0 0 3px rgba(62,107,79,0.25);
    flex-shrink:0;
  }
  .status-row{ display:flex; align-items:center; gap:6px; font-family:var(--mono); font-size:10px; letter-spacing:0.06em; color:#A9A39A; margin-top:6px; text-transform:uppercase; }
 
  /* ---------- Onglets ---------- */
  nav.tabs{
    display:flex;
    background:var(--ink);
    padding:0 18px;
    gap:0;
    position:sticky; top:62px; z-index:19;
  }
  nav.tabs button{
    flex:1;
    background:none; border:none;
    color:#8A8780;
    font-family:var(--mono);
    font-size:11px;
    letter-spacing:0.05em;
    text-transform:uppercase;
    padding:12px 4px;
    cursor:pointer;
    border-bottom:2px solid transparent;
  }
  nav.tabs button.active{
    color:var(--paper);
    border-bottom-color:var(--rust);
  }
 
  main{ flex:1; padding:18px; padding-bottom:90px; }
 
  .panel{ display:none; animation:fade .18s ease; }
  .panel.active{ display:block; }
  @keyframes fade{ from{opacity:0; transform:translateY(4px);} to{opacity:1; transform:none;} }
 
  /* ---------- Cartes ---------- */
  .card{
    background:var(--paper-raised);
    border:1px solid var(--line);
    border-radius:3px;
    padding:16px;
    margin-bottom:14px;
    position:relative;
  }
  .card::before{
    content:attr(data-tag);
    position:absolute;
    top:-9px; left:14px;
    background:var(--paper-raised);
    padding:0 6px;
    font-family:var(--mono);
    font-size:10px;
    letter-spacing:0.08em;
    color:var(--brass);
    text-transform:uppercase;
  }
 
  label{
    display:block;
    font-family:var(--mono);
    font-size:10.5px;
    letter-spacing:0.05em;
    text-transform:uppercase;
    color:var(--ink-soft);
    margin-bottom:5px;
    margin-top:12px;
  }
  label:first-of-type{ margin-top:0; }
 
  input[type=text], input[type=number], select{
    width:100%;
    border:1px solid var(--line);
    background:var(--paper);
    border-radius:2px;
    padding:11px 10px;
    font-size:15px;
    font-family:var(--sans);
    color:var(--ink);
  }
  input:focus, select:focus{ outline:none; border-color:var(--rust); }
  input[readonly]{ color:var(--ink-soft); background:#EFEBE2; }
 
  .suggest{
    margin-top:2px;
    border:1px solid var(--line);
    border-top:none;
    max-height:200px;
    overflow-y:auto;
    display:none;
    background:var(--paper-raised);
  }
  .suggest div{
    padding:10px;
    font-size:13.5px;
    border-bottom:1px solid var(--line);
    display:flex; justify-content:space-between; gap:8px;
  }
  .suggest div b{ font-family:var(--mono); color:var(--rust-deep); font-weight:700; }
  .suggest div:active{ background:var(--warn-bg); }
 
  /* ---------- Affichage quantité ---------- */
  .qty-block{ text-align:center; padding:6px 0 14px; }
  .qty-num{
    font-family:var(--mono);
    font-size:52px;
    font-weight:700;
    line-height:1;
    color:var(--ink);
  }
  .qty-num.low{ color:var(--rust); }
  .qty-label{ font-family:var(--mono); font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-soft); margin-top:4px; }
 
  .btnrow{ display:flex; gap:8px; margin-bottom:10px; }
  button.op{
    flex:1;
    border:1.5px solid var(--ink);
    background:var(--paper-raised);
    color:var(--ink);
    font-family:var(--mono);
    font-weight:700;
    font-size:15px;
    padding:13px 0;
    border-radius:2px;
    cursor:pointer;
  }
  button.op:active{ background:var(--ink); color:var(--paper); }
  button.op:disabled{ opacity:0.35; }
  button.op.plus{ border-color:var(--ok); color:var(--ok); }
  button.op.plus:active{ background:var(--ok); color:var(--paper); }
 
  button.primary{
    width:100%;
    background:var(--rust);
    color:var(--paper);
    border:none;
    font-family:var(--mono);
    font-weight:700;
    font-size:14px;
    letter-spacing:0.03em;
    text-transform:uppercase;
    padding:14px 0;
    border-radius:2px;
    cursor:pointer;
  }
  button.primary:active{ background:var(--rust-deep); }
  button.primary:disabled{ opacity:0.4; }
 
  button.ghost{
    width:100%;
    background:none;
    border:1px solid var(--line);
    color:var(--ink-soft);
    font-family:var(--mono);
    font-size:12px;
    letter-spacing:0.03em;
    text-transform:uppercase;
    padding:11px 0;
    border-radius:2px;
    cursor:pointer;
    margin-top:8px;
  }
 
  .checkline{ display:flex; align-items:center; gap:9px; margin-top:10px; }
  .checkline input{ width:18px; height:18px; accent-color:var(--rust); }
  .checkline label{ margin:0; text-transform:none; font-family:var(--sans); font-size:13.5px; color:var(--ink); letter-spacing:0; }
 
  /* ---------- Liste alertes ---------- */
  .alert-row{
    display:flex; justify-content:space-between; align-items:center;
    padding:11px 4px;
    border-bottom:1px solid var(--line);
  }
  .alert-row:last-child{ border-bottom:none; }
  .alert-ref{ font-family:var(--mono); font-weight:700; color:var(--rust-deep); font-size:13px; }
  .alert-des{ font-size:12px; color:var(--ink-soft); margin-top:2px; }
  .alert-qty{
    font-family:var(--mono); font-weight:700; font-size:18px;
    background:var(--warn-bg); color:var(--warn-ink);
    padding:3px 9px; border-radius:2px;
  }
  .empty-state{ text-align:center; padding:30px 10px; }
  .empty-state .ok-mark{ font-size:30px; }
  .empty-state p{ font-family:var(--mono); font-size:12px; color:var(--ok); letter-spacing:0.04em; margin-top:8px; }
 
  /* ---------- Toast ---------- */
  #toast{
    position:fixed; left:50%; bottom:22px; transform:translate(-50%, 14px);
    background:var(--ink); color:var(--paper);
    font-family:var(--mono); font-size:12.5px;
    padding:11px 18px; border-radius:3px;
    opacity:0; pointer-events:none;
    transition:all .22s ease;
    max-width:88%; text-align:center;
    z-index:50;
    border-left:3px solid var(--rust);
  }
  #toast.show{ opacity:1; transform:translate(-50%, 0); }
 
  /* ---------- Compteur bas de carte ---------- */
  .meta-line{
    font-family:var(--mono); font-size:10px; color:var(--ink-soft);
    text-align:right; margin-top:8px; letter-spacing:0.03em;
  }
 
  ::-webkit-scrollbar{ width:0; height:0; }
 
  /* ---------- Écran de verrouillage ---------- */
  #lockScreen{
    position:fixed; inset:0; z-index:100;
    background:var(--ink);
    display:flex; align-items:center; justify-content:center;
    flex-direction:column;
    padding:24px;
  }
  #lockScreen .lock-icon{
    font-family:var(--mono); font-size:13px; letter-spacing:0.15em;
    color:var(--brass); text-transform:uppercase; margin-bottom:18px;
  }
  #lockScreen input{
    width:100%; max-width:220px;
    text-align:center;
    font-family:var(--mono); font-size:28px; letter-spacing:0.4em;
    padding:14px 10px;
    border:1.5px solid var(--rust);
    border-radius:2px;
    background:#23282E;
    color:var(--paper);
  }
  #lockScreen input:focus{ outline:none; }
  #lockScreen .lock-msg{
    font-family:var(--mono); font-size:11px; color:var(--rust);
    margin-top:14px; min-height:16px; letter-spacing:0.04em;
  }
  #lockScreen .lock-hint{
    font-family:var(--mono); font-size:10px; color:#6B6960;
    margin-top:30px; letter-spacing:0.03em; text-align:center;
  }
 
  /* ---------- Ligne d'alerte avec actions ---------- */
  .alert-row{ flex-direction:column; align-items:stretch; gap:8px; }
  .alert-row-top{ display:flex; justify-content:space-between; align-items:center; }
  .alert-actions{ display:flex; gap:8px; }
  .alert-actions button{
    flex:1;
    font-family:var(--mono); font-size:11px; letter-spacing:0.03em; text-transform:uppercase;
    padding:9px 0; border-radius:2px; cursor:pointer;
  }
  .btn-edit{ background:var(--paper); border:1px solid var(--brass); color:var(--brass); }
  .btn-edit:active{ background:var(--brass); color:var(--paper); }
  .btn-del{ background:var(--paper); border:1px solid var(--rust); color:var(--rust); }
  .btn-del:active{ background:var(--rust); color:var(--paper); }
 
  /* ---------- Modale d'édition ---------- */
  #editModal{
    position:fixed; inset:0; z-index:90;
    background:rgba(27,31,35,0.78);
    display:none;
    align-items:flex-end;
    justify-content:center;
  }
  #editModal.show{ display:flex; }
  #editModal .sheet{
    width:100%; max-width:480px;
    background:var(--paper-raised);
    border-radius:10px 10px 0 0;
    padding:20px 18px calc(20px + env(safe-area-inset-bottom));
    max-height:85vh;
    overflow-y:auto;
  }
  #editModal h2{
    font-family:var(--mono); font-size:13px; letter-spacing:0.05em; text-transform:uppercase;
    margin:0 0 14px; color:var(--ink); border-bottom:2px solid var(--rust); padding-bottom:10px;
  }
  .modal-actions{ display:flex; gap:8px; margin-top:16px; }
  .modal-actions button{ flex:1; }
 
  .sync-tag{
    display:inline-flex; align-items:center; gap:5px;
    font-family:var(--mono); font-size:9.5px; letter-spacing:0.05em; text-transform:uppercase;
    color:#7C8A7E; margin-left:8px;
  }
  .sync-tag.pending{ color:var(--rust); }
</style>
</head>
<body>
 
<div id="app">
 
  <header>
    <div class="brand">
      <h1>STOCK<span>//</span>ATELIER</h1>
      <div class="status-dot" id="statusDot" title="Stockage local actif"></div>
    </div>
    <div class="status-row"><span id="statusText">Données locales — 0 référence</span></div>
  </header>
 
  <nav class="tabs">
    <button class="active" data-tab="recherche">Recherche</button>
    <button data-tab="ajout">Ajouter</button>
    <button data-tab="alertes">Alertes</button>
  </nav>
 
  <main>
 
    <!-- ===================== RECHERCHE ===================== -->
    <section class="panel active" id="panel-recherche">
 
      <div class="card" data-tag="Référence">
        <label>Chercher par référence</label>
        <input type="text" id="searchRef" placeholder="ex. F2…" autocomplete="off">
        <div class="suggest" id="suggRef"></div>
 
        <label>Chercher par désignation</label>
        <input type="text" id="searchDes" placeholder="ex. vis…" autocomplete="off">
        <div class="suggest" id="suggDes"></div>
 
        <label>Emplacement</label>
        <select id="selectEmp"><option value="">—</option></select>
 
        <label>Type</label>
        <input type="text" id="fieldTyp" readonly>
      </div>
 
      <div class="card" data-tag="Quantité" id="cardQty" style="display:none;">
        <div class="qty-block">
          <div class="qty-num" id="qtyNum">0</div>
          <div class="qty-label" id="qtyRefLabel">—</div>
        </div>
 
        <div class="btnrow">
          <button class="op plus" data-d="1">+1</button>
          <button class="op" data-d="-1">−1</button>
          <button class="op" data-d="-5">−5</button>
          <button class="op" data-d="-10">−10</button>
        </div>
 
        <button class="primary" id="btnCommander">Commander — quantité à zéro</button>
 
        <div class="checkline">
          <input type="checkbox" id="chkS5">
          <label for="chkS5">Alerte sous seuil 5</label>
        </div>
        <div class="checkline">
          <input type="checkbox" id="chkS10">
          <label for="chkS10">Alerte sous seuil 10</label>
        </div>
 
        <button class="ghost" id="btnResetForm">Effacer la recherche</button>
      </div>
 
    </section>
 
    <!-- ===================== AJOUT ===================== -->
    <section class="panel" id="panel-ajout">
      <div class="card" data-tag="Nouvel article">
 
        <label>Référence *</label>
        <input type="text" id="newRef" autocomplete="off">
 
        <label>Emplacement *</label>
        <input type="text" id="newEmp" autocomplete="off">
 
        <label>Quantité initiale</label>
        <input type="number" id="newQte" value="0">
 
        <label>Désignation</label>
        <input type="text" id="newDes" autocomplete="off">
 
        <label>Type</label>
        <input type="text" id="newTyp" autocomplete="off">
 
        <div class="checkline">
          <input type="checkbox" id="newS5">
          <label for="newS5">Alerte sous seuil 5</label>
        </div>
        <div class="checkline">
          <input type="checkbox" id="newS10">
          <label for="newS10">Alerte sous seuil 10</label>
        </div>
 
        <button class="primary" id="btnAjouter" style="margin-top:14px;">Ajouter à l'inventaire</button>
      </div>
    </section>
 
    <!-- ===================== ALERTES ===================== -->
    <section class="panel" id="panel-alertes">
 
      <div id="alertesLocked" class="card" data-tag="Accès protégé">
        <label>Code d'accès</label>
        <input type="text" id="alertesPinInput" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off" style="text-align:center; font-family:var(--mono); font-size:22px; letter-spacing:0.5em;">
        <button class="primary" id="btnUnlockAlertes" style="margin-top:14px;">Déverrouiller</button>
        <div class="meta-line" id="alertesPinMsg" style="text-align:left; color:var(--rust);"></div>
      </div>
 
      <div id="alertesContent" style="display:none;">
        <div class="card" data-tag="Sous le seuil">
          <div id="alertesList"></div>
          <div class="meta-line" id="alertesMeta"></div>
        </div>
        <button class="ghost" id="btnExport">Exporter une sauvegarde (.json)</button>
        <button class="ghost" id="btnImport">Restaurer une sauvegarde (.json)</button>
        <input type="file" id="fileImport" accept="application/json" style="display:none;">
      </div>
 
    </section>
 
  </main>
 
</div>
 
<!-- ===================== MODALE ÉDITION ===================== -->
<div id="editModal">
  <div class="sheet">
    <h2>Modifier l'article</h2>
 
    <label>Référence</label>
    <input type="text" id="editRef">
 
    <label>Emplacement</label>
    <input type="text" id="editEmp">
 
    <label>Quantité</label>
    <input type="number" id="editQte">
 
    <label>Désignation</label>
    <input type="text" id="editDes">
 
    <label>Type</label>
    <input type="text" id="editTyp">
 
    <div class="checkline">
      <input type="checkbox" id="editS5">
      <label for="editS5">Alerte sous seuil 5</label>
    </div>
    <div class="checkline">
      <input type="checkbox" id="editS10">
      <label for="editS10">Alerte sous seuil 10</label>
    </div>
 
    <div class="modal-actions">
      <button class="ghost" id="btnEditCancel">Annuler</button>
      <button class="primary" id="btnEditSave">Enregistrer</button>
    </div>
  </div>
</div>
 
<div id="toast"></div>
 
<script src="db.js"></script>
<script src="app.js"></script>
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW non enregistré :', err));
    });
  }
</script>
</body>
</html>
 
