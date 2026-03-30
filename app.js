/* ================================================================
   FICHE D'ACHAT — Logique applicative
   ================================================================ */

'use strict';

/* ── Configuration (modifiez ces valeurs selon votre entreprise) ── */
const CONFIG = {
  companyName: "Nom de l'entreprise",   // Affiché si logo.png absent
  departments: [
    "Direction",
    "Ressources Humaines",
    "Comptabilité / Finance",
    "Informatique",
    "Marketing",
    "Commercial",
    "Logistique",
    "Production",
    "Qualité",
    "R&D",
    "Juridique",
    "Autre",
  ],
  tvaRates: [0, 5.5, 10, 20],
  defaultTva: 20,
};

/* ── État interne ──────────────────────────────────────────────── */
let rowCounter = 0;

/* ── Utilitaires ───────────────────────────────────────────────── */

/**
 * Formate un nombre en devise EUR (ex: 1 234,56 €)
 */
function formatCurrency(n) {
  return new Intl.NumberFormat('fr-FR', {
    style:                 'currency',
    currency:              'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(isNaN(n) ? 0 : n);
}

/**
 * Formate une date ISO (YYYY-MM-DD) en JJ/MM/AAAA
 */
function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  if (!y || !m || !d) return str;
  return `${d}/${m}/${y}`;
}

/**
 * Retourne la date d'aujourd'hui au format YYYY-MM-DD
 */
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Génère un numéro de demande unique : DA-YYYYMMDD-XXX
 */
function generateRefNumber() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const datePart = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const key = `da-counter-${datePart}`;
  let counter = parseInt(sessionStorage.getItem(key) || '0', 10) + 1;
  sessionStorage.setItem(key, counter);
  return `DA-${datePart}-${String(counter).padStart(3, '0')}`;
}

/* ── Initialisation ────────────────────────────────────────────── */

function initForm() {
  // Numéro et date auto
  const refInput  = document.getElementById('doc-ref');
  const dateInput = document.getElementById('doc-date');
  if (refInput  && !refInput.value)  refInput.value  = generateRefNumber();
  if (dateInput && !dateInput.value) dateInput.value = todayISO();

  // Peuplement du select départements
  populateDepartments();

  // Ajout de la première ligne article
  addItemRow();

  // Nom entreprise pour le fallback logo
  const fallback = document.getElementById('pt-company-fallback');
  if (fallback) fallback.textContent = CONFIG.companyName;

  // Synchronisation en temps réel de la zone de validation demandeur
  document.getElementById('dem-nom')?.addEventListener('input', syncValidationZone);
  document.getElementById('doc-date')?.addEventListener('change', syncValidationZone);
  syncValidationZone();

  // Initialisation des icônes Lucide
  if (window.lucide) lucide.createIcons();

  // Boutons
  bindButtons();
}

function populateDepartments() {
  const select = document.getElementById('dem-service');
  if (!select) return;
  CONFIG.departments.forEach((dept) => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    select.appendChild(opt);
  });
}

function syncValidationZone() {
  const nom  = document.getElementById('dem-nom')?.value.trim() || '—';
  const date = document.getElementById('doc-date')?.value || '';
  const elNom  = document.getElementById('val-dem-nom');
  const elDate = document.getElementById('val-dem-date');
  if (elNom)  elNom.textContent  = nom  || '—';
  if (elDate) elDate.textContent = date ? formatDate(date) : '—';
}

function bindButtons() {
  // Bouton ajouter ligne
  document.getElementById('btn-add-row')
    ?.addEventListener('click', addItemRow);

  // Réinitialiser (nav + barre)
  ['btn-reset-nav', 'btn-reset']
    .forEach(id => document.getElementById(id)
      ?.addEventListener('click', confirmReset));

  // Exporter (nav + barre)
  ['btn-export-nav', 'btn-export']
    .forEach(id => document.getElementById(id)
      ?.addEventListener('click', exportPDF));
}

/* ── Gestion des lignes d'articles ────────────────────────────── */

function buildTvaOptions(selected) {
  return CONFIG.tvaRates.map((r) =>
    `<option value="${r}" ${r === selected ? 'selected' : ''}>${r.toLocaleString('fr-FR')} %</option>`
  ).join('');
}

function addItemRow() {
  rowCounter++;
  const tbody = document.getElementById('items-body');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.dataset.row = rowCounter;
  tr.innerHTML = `
    <td class="col-num">${rowCounter}</td>
    <td class="col-designation">
      <input type="text" class="field__input item-designation"
             placeholder="Description de l'article"
             aria-label="Désignation de l'article ${rowCounter}">
    </td>
    <td class="col-ref">
      <input type="text" class="field__input item-ref"
             placeholder="REF-001"
             aria-label="Référence article ${rowCounter}">
    </td>
    <td class="col-qty">
      <input type="number" class="field__input item-qty"
             min="0" step="1" value="1"
             aria-label="Quantité article ${rowCounter}">
    </td>
    <td class="col-unit">
      <input type="text" class="field__input item-unit"
             placeholder="pcs"
             aria-label="Unité article ${rowCounter}">
    </td>
    <td class="col-pu">
      <input type="number" class="field__input item-pu"
             min="0" step="0.01" placeholder="0.00"
             aria-label="Prix unitaire HT article ${rowCounter}">
    </td>
    <td class="col-tva">
      <select class="field__input field__select item-tva"
              aria-label="Taux TVA article ${rowCounter}">
        ${buildTvaOptions(CONFIG.defaultTva)}
      </select>
    </td>
    <td class="col-ttc item-ttc" aria-live="polite">0,00 €</td>
    <td class="col-del">
      <button type="button" class="btn-del-row" aria-label="Supprimer la ligne ${rowCounter}">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
             viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </td>
  `;

  tbody.appendChild(tr);

  // Écouteurs de recalcul
  tr.querySelector('.item-qty')?.addEventListener('input',  () => recalcRow(tr));
  tr.querySelector('.item-pu')?.addEventListener('input',   () => recalcRow(tr));
  tr.querySelector('.item-tva')?.addEventListener('change', () => recalcRow(tr));

  // Bouton suppression
  tr.querySelector('.btn-del-row')?.addEventListener('click', () => removeItemRow(tr));

  recalcTotals();
}

function removeItemRow(tr) {
  const tbody = document.getElementById('items-body');
  if (!tbody) return;
  if (tbody.querySelectorAll('tr').length <= 1) {
    // Conserver au moins une ligne : vider plutôt que supprimer
    tr.querySelectorAll('input').forEach(i => { i.value = i.type === 'number' && i.classList.contains('item-qty') ? '1' : ''; });
    tr.querySelector('.item-ttc').textContent = '0,00 €';
    recalcTotals();
    return;
  }
  tr.style.opacity = '0';
  tr.style.transition = 'opacity 150ms ease-out';
  setTimeout(() => {
    tr.remove();
    renumberRows();
    recalcTotals();
  }, 150);
}

function renumberRows() {
  const rows = document.getElementById('items-body')?.querySelectorAll('tr') || [];
  rows.forEach((tr, i) => {
    const numCell = tr.querySelector('.col-num');
    if (numCell) numCell.textContent = i + 1;
  });
}

/* ── Calculs ───────────────────────────────────────────────────── */

function recalcRow(tr) {
  const qty  = parseFloat(tr.querySelector('.item-qty')?.value)  || 0;
  const pu   = parseFloat(tr.querySelector('.item-pu')?.value)   || 0;
  const tva  = parseFloat(tr.querySelector('.item-tva')?.value)  || 0;
  const ttc  = qty * pu * (1 + tva / 100);
  const cell = tr.querySelector('.item-ttc');
  if (cell) cell.textContent = formatCurrency(ttc);
  recalcTotals();
}

function recalcTotals() {
  const rows = document.getElementById('items-body')?.querySelectorAll('tr') || [];
  let totalHT = 0;
  let totalTVA = 0;

  rows.forEach((tr) => {
    const qty = parseFloat(tr.querySelector('.item-qty')?.value) || 0;
    const pu  = parseFloat(tr.querySelector('.item-pu')?.value)  || 0;
    const tva = parseFloat(tr.querySelector('.item-tva')?.value) || 0;
    const ht  = qty * pu;
    totalHT  += ht;
    totalTVA += ht * (tva / 100);
  });

  const totalTTC = totalHT + totalTVA;

  const elHT  = document.getElementById('total-ht');
  const elTVA = document.getElementById('total-tva');
  const elTTC = document.getElementById('total-ttc');
  if (elHT)  elHT.textContent  = formatCurrency(totalHT);
  if (elTVA) elTVA.textContent = formatCurrency(totalTVA);
  if (elTTC) elTTC.textContent = formatCurrency(totalTTC);
}

/* ── Validation ────────────────────────────────────────────────── */

/**
 * Vérifie tous les champs obligatoires.
 * Retourne un tableau d'objets { fieldId, errorId, message }
 */
function validateForm() {
  const errors = [];

  // Champs simples obligatoires
  const required = [
    { id: 'doc-ref',     errId: 'error-doc-ref',     label: 'Le numéro de demande' },
    { id: 'doc-date',    errId: 'error-doc-date',     label: 'La date de demande' },
    { id: 'dem-nom',     errId: 'error-dem-nom',      label: 'Le nom du demandeur' },
    { id: 'dem-service', errId: 'error-dem-service',  label: 'Le service / département' },
    { id: 'fou-nom',     errId: 'error-fou-nom',      label: 'Le nom du fournisseur' },
    { id: 'motif',       errId: 'error-motif',        label: 'Le motif de l\'achat' },
  ];

  required.forEach(({ id, errId, label }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = el.value.trim();
    if (!val) {
      errors.push({ fieldId: id, errorId: errId, message: `${label} est obligatoire.` });
    }
  });

  // Lignes d'articles : au moins une avec désignation + qté > 0 + prix ≥ 0
  const rows = document.getElementById('items-body')?.querySelectorAll('tr') || [];
  let hasValidRow = false;
  let hasItemError = false;

  rows.forEach((tr, i) => {
    const desig = tr.querySelector('.item-designation')?.value.trim() || '';
    const qty   = parseFloat(tr.querySelector('.item-qty')?.value) || 0;
    const pu    = tr.querySelector('.item-pu')?.value.trim();

    if (desig) {
      // La ligne a une désignation — vérifier les autres champs
      if (qty <= 0) {
        tr.querySelector('.item-qty')?.classList.add('is-error');
        hasItemError = true;
      }
      if (pu === '' || pu === undefined) {
        tr.querySelector('.item-pu')?.classList.add('is-error');
        hasItemError = true;
      }
      if (!hasItemError || qty > 0) hasValidRow = true;
    } else if (rows.length === 1) {
      // Ligne unique sans désignation
      tr.querySelector('.item-designation')?.classList.add('is-error');
      hasItemError = true;
    }
  });

  if (!hasValidRow || hasItemError) {
    errors.push({
      fieldId:  'items-body',
      errorId:  'error-items',
      message:  'Au moins un article doit être renseigné (désignation, quantité et prix unitaire obligatoires).',
    });
  }

  return errors;
}

function showErrors(errors) {
  const banner = document.getElementById('form-error-banner');
  const msg    = document.getElementById('form-error-msg');

  errors.forEach(({ fieldId, errorId, message }) => {
    // Mettre le champ en erreur
    const field = document.getElementById(fieldId);
    if (field) field.classList.add('is-error');

    // Afficher le message sous le champ
    const errEl = document.getElementById(errorId);
    if (errEl) {
      errEl.textContent = message;
      errEl.removeAttribute('hidden');
    }
  });

  // Bannière d'erreur globale
  if (banner && msg && errors.length > 0) {
    const n = errors.length;
    msg.textContent = `${n} champ${n > 1 ? 's' : ''} obligatoire${n > 1 ? 's' : ''} manquant${n > 1 ? 's' : ''}.`;
    banner.removeAttribute('hidden');
  }

  // Scroll vers la première erreur
  const firstField = document.getElementById(errors[0]?.fieldId);
  firstField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  firstField?.focus({ preventScroll: true });
}

function clearErrors() {
  // Retirer toutes les classes d'erreur
  document.querySelectorAll('.is-error').forEach(el => el.classList.remove('is-error'));

  // Masquer tous les messages d'erreur
  document.querySelectorAll('.field__error').forEach(el => {
    el.setAttribute('hidden', '');
    el.textContent = '';
  });

  // Masquer la bannière
  document.getElementById('form-error-banner')?.setAttribute('hidden', '');
}

/* ── Gabarit d'impression ──────────────────────────────────────── */

/**
 * Copie les valeurs du formulaire dans le gabarit #print-template
 */
function populatePrintTemplate() {
  const v = (id) => document.getElementById(id)?.value.trim() || '—';
  const t = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  };

  // En-tête
  const refVal  = v('doc-ref');
  const dateVal = v('doc-date');
  t('pt-ref',  refVal);
  t('pt-date', formatDate(dateVal));

  // Demandeur
  t('pt-dem-nom',     v('dem-nom'));
  t('pt-dem-service', v('dem-service'));
  t('pt-dem-poste',   v('dem-poste') !== '—' ? v('dem-poste') : '');
  t('pt-dem-email',   v('dem-email') !== '—' ? v('dem-email') : '');

  // Fournisseur
  t('pt-fou-nom',     v('fou-nom'));
  t('pt-fou-contact', v('fou-contact') !== '—' ? v('fou-contact') : '');
  t('pt-fou-email',   v('fou-email')   !== '—' ? v('fou-email')   : '');
  t('pt-fou-tel',     v('fou-tel')     !== '—' ? v('fou-tel')     : '');

  const adresse = document.getElementById('fou-adresse')?.value.trim();
  t('pt-fou-adresse', adresse || '');

  // Tableau articles
  buildPrintItemsTable();

  // Totaux
  const elHT  = document.getElementById('total-ht');
  const elTVA = document.getElementById('total-tva');
  const elTTC = document.getElementById('total-ttc');
  t('pt-total-ht',  elHT?.textContent  || '—');
  t('pt-total-tva', elTVA?.textContent || '—');
  t('pt-total-ttc', elTTC?.textContent || '—');

  // Justification
  const motif = document.getElementById('motif')?.value.trim();
  t('pt-motif', motif || '—');

  const delai = document.getElementById('delai')?.value;
  const delaiRow = document.getElementById('pt-row-delai');
  if (delai) {
    t('pt-delai', formatDate(delai));
    delaiRow?.removeAttribute('hidden');
  } else {
    if (delaiRow) delaiRow.setAttribute('hidden', '');
  }

  const cout = document.getElementById('centre-cout')?.value.trim();
  const coutRow = document.getElementById('pt-row-cout');
  if (cout) {
    t('pt-centre-cout', cout);
    coutRow?.removeAttribute('hidden');
  } else {
    if (coutRow) coutRow.setAttribute('hidden', '');
  }

  const obs = document.getElementById('observations')?.value.trim();
  const obsRow = document.getElementById('pt-row-obs');
  if (obs) {
    t('pt-observations', obs);
    obsRow?.removeAttribute('hidden');
  } else {
    if (obsRow) obsRow.setAttribute('hidden', '');
  }

  // Signatures
  t('pt-sig-dem-nom',  v('dem-nom') !== '—' ? v('dem-nom') : '');
  t('pt-sig-dem-date', dateVal ? formatDate(dateVal) : '');

  // Pied de page
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const genDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  t('pt-generated-date', genDate);
  t('pt-footer-ref',     refVal !== '—' ? refVal : '');
}

function buildPrintItemsTable() {
  const tbody = document.getElementById('pt-items-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const rows = document.getElementById('items-body')?.querySelectorAll('tr') || [];
  let idx = 0;

  rows.forEach((tr) => {
    const desig = tr.querySelector('.item-designation')?.value.trim();
    const ref   = tr.querySelector('.item-ref')?.value.trim();
    const qty   = tr.querySelector('.item-qty')?.value.trim();
    const unit  = tr.querySelector('.item-unit')?.value.trim();
    const pu    = parseFloat(tr.querySelector('.item-pu')?.value) || 0;
    const tva   = parseFloat(tr.querySelector('.item-tva')?.value) || 0;
    const ttcEl = tr.querySelector('.item-ttc')?.textContent || '—';

    if (!desig) return; // Ignorer les lignes vides
    idx++;

    const ptRow = document.createElement('tr');
    ptRow.innerHTML = `
      <td class="pt-col-num">${idx}</td>
      <td class="pt-col-designation">${escapeHtml(desig)}</td>
      <td class="pt-col-ref">${escapeHtml(ref || '')}</td>
      <td class="pt-col-qty">${escapeHtml(qty || '1')}</td>
      <td class="pt-col-unit">${escapeHtml(unit || '')}</td>
      <td class="pt-col-pu">${formatCurrency(pu)}</td>
      <td class="pt-col-tva">${tva.toLocaleString('fr-FR')} %</td>
      <td class="pt-col-ttc">${ttcEl}</td>
    `;
    tbody.appendChild(ptRow);
  });

  if (idx === 0) {
    const ptRow = document.createElement('tr');
    ptRow.innerHTML = `<td colspan="8" style="text-align:center;color:#888;padding:10px;">Aucun article renseigné</td>`;
    tbody.appendChild(ptRow);
  }
}

/* Sécurité : échapper les valeurs pour insertion HTML */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/* ── Export PDF ────────────────────────────────────────────────── */

function exportPDF() {
  clearErrors();
  const errors = validateForm();

  if (errors.length > 0) {
    showErrors(errors);
    return;
  }

  // Peupler le gabarit d'impression
  populatePrintTemplate();

  // Lancer l'impression (l'utilisateur choisit "Enregistrer en PDF")
  window.print();
}

/* ── Réinitialisation ──────────────────────────────────────────── */

function confirmReset() {
  if (!window.confirm('Réinitialiser le formulaire ? Toutes les données saisies seront perdues.')) {
    return;
  }
  resetForm();
}

function resetForm() {
  clearErrors();

  // Champs texte / date / email / tel / select
  const inputs = document.getElementById('main-form')
    ?.querySelectorAll('input, select, textarea') || [];
  inputs.forEach((el) => {
    if (el.tagName === 'SELECT') {
      el.selectedIndex = 0;
    } else {
      el.value = '';
    }
  });

  // Supprimer toutes les lignes du tableau
  const tbody = document.getElementById('items-body');
  if (tbody) tbody.innerHTML = '';
  rowCounter = 0;

  // Ré-initialiser
  document.getElementById('doc-ref').value  = generateRefNumber();
  document.getElementById('doc-date').value = todayISO();
  addItemRow();
  syncValidationZone();

  // Scroll haut
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Point d'entrée ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initForm);
