/* ================================================================
   FICHE D'ACHAT — Logique applicative
   ================================================================ */

'use strict';

/* ── Configuration ─────────────────────────────────────────────── */
const CONFIG = {
  companyName: "Nom de l'entreprise",
  departments: [
    "Bureau",
    "Stock",
    "Conciergerie",
    "Atelier plaquettes CNC",
    "Atelier fraises circ.",
    "Atelier mécanique",
  ],
  TVA_RATE: 8.1,
};

/* ── État interne ──────────────────────────────────────────────── */
let rowCounter = 0;

/* ── Utilitaires ───────────────────────────────────────────────── */

/**
 * Retourne la monnaie sélectionnée (valeur display)
 */
function getCurrency() {
  const val = document.getElementById('monnaie')?.value;
  if (val === 'autres') {
    return document.getElementById('monnaie-autre')?.value.trim() || '';
  }
  return val || 'CHF';
}

/**
 * Formate un montant selon la monnaie active
 */
function formatAmount(n) {
  if (isNaN(n)) n = 0;
  const currency = getCurrency();
  if (currency === 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }
  if (currency === 'CHF') {
    return 'CHF\u00A0' + new Intl.NumberFormat('de-CH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }
  // Monnaie personnalisée
  const num = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return currency ? `${num}\u00A0${currency}` : num;
}

/* ── Initialisation ────────────────────────────────────────────── */

function initForm() {
  populateDepartments();
  addItemRow();

  const fallback = document.getElementById('pt-company-fallback');
  if (fallback) fallback.textContent = CONFIG.companyName;

  // Inputs conditionnels
  document.getElementById('monnaie')?.addEventListener('change', handleMonnaieChange);
  document.getElementById('delai')?.addEventListener('change', handleDelaiChange);

  // Recalcul quand la monnaie change
  document.getElementById('monnaie')?.addEventListener('change', recalcTotals);
  document.getElementById('monnaie-autre')?.addEventListener('input', recalcTotals);

  if (window.lucide) lucide.createIcons();
  bindButtons();
}

function populateDepartments() {
  const select = document.getElementById('departement');
  if (!select) return;
  CONFIG.departments.forEach((dept) => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    select.appendChild(opt);
  });
}

function handleMonnaieChange() {
  const val = document.getElementById('monnaie')?.value;
  const autreInput = document.getElementById('monnaie-autre');
  if (!autreInput) return;
  if (val === 'autres') {
    autreInput.removeAttribute('hidden');
    autreInput.focus();
  } else {
    autreInput.setAttribute('hidden', '');
    autreInput.value = '';
  }
  recalcTotals();
}

function handleDelaiChange() {
  const val = document.getElementById('delai')?.value;
  const autreInput = document.getElementById('delai-autre');
  if (!autreInput) return;
  if (val === 'autres') {
    autreInput.removeAttribute('hidden');
    autreInput.focus();
  } else {
    autreInput.setAttribute('hidden', '');
    autreInput.value = '';
  }
}

function bindButtons() {
  document.getElementById('btn-add-row')?.addEventListener('click', addItemRow);
  ['btn-reset-nav', 'btn-reset'].forEach((id) =>
    document.getElementById(id)?.addEventListener('click', confirmReset)
  );
  ['btn-export-nav', 'btn-export'].forEach((id) =>
    document.getElementById(id)?.addEventListener('click', exportPDF)
  );
}

/* ── Gestion des lignes d'articles ────────────────────────────── */

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
             aria-label="Description article ${rowCounter}">
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
    <td class="col-pu">
      <input type="number" class="field__input item-pu"
             min="0" step="0.01" placeholder="0.00"
             aria-label="Prix par pièce article ${rowCounter}">
    </td>
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

  tr.querySelector('.item-qty')?.addEventListener('input', recalcTotals);
  tr.querySelector('.item-pu')?.addEventListener('input', recalcTotals);
  tr.querySelector('.btn-del-row')?.addEventListener('click', () => removeItemRow(tr));

  recalcTotals();
}

function removeItemRow(tr) {
  const tbody = document.getElementById('items-body');
  if (!tbody) return;
  if (tbody.querySelectorAll('tr').length <= 1) {
    tr.querySelectorAll('input').forEach((i) => {
      i.value = i.type === 'number' && i.classList.contains('item-qty') ? '1' : '';
    });
    recalcTotals();
    return;
  }
  tr.classList.add('row-exit');
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

function recalcTotals() {
  const rows = document.getElementById('items-body')?.querySelectorAll('tr') || [];
  let totalHT = 0;

  rows.forEach((tr) => {
    const qty = parseFloat(tr.querySelector('.item-qty')?.value) || 0;
    const pu  = parseFloat(tr.querySelector('.item-pu')?.value)  || 0;
    totalHT += qty * pu;
  });

  const tvaAmount = totalHT * (CONFIG.TVA_RATE / 100);
  const totalTTC  = totalHT + tvaAmount;

  const elHT  = document.getElementById('total-ht');
  const elTVA = document.getElementById('total-tva');
  const elTTC = document.getElementById('total-ttc');
  if (elHT)  elHT.textContent  = formatAmount(totalHT);
  if (elTVA) elTVA.textContent = formatAmount(tvaAmount);
  if (elTTC) elTTC.textContent = formatAmount(totalTTC);
}

/* ── Validation ────────────────────────────────────────────────── */

function validateForm() {
  const errors = [];

  // Champs simples obligatoires
  const required = [
    { id: 'cmd-par',           errId: 'error-cmd-par',           label: 'Le champ "Commandé par"' },
    { id: 'fournisseur',       errId: 'error-fournisseur',       label: 'Le fournisseur' },
    { id: 'departement',       errId: 'error-departement',       label: 'Le département' },
    { id: 'adresse-livraison', errId: 'error-adresse-livraison', label: "L'adresse de livraison" },
  ];

  required.forEach(({ id, errId, label }) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.value.trim()) {
      errors.push({ fieldId: id, errorId: errId, message: `${label} est obligatoire.` });
    }
  });

  // Type de prix (radio)
  const prixSelected = document.querySelector('input[name="prix-type"]:checked');
  if (!prixSelected) {
    errors.push({
      fieldId:  'prix-type-group',
      errorId:  'error-prix-type',
      message:  'Veuillez sélectionner un type de prix.',
    });
  }

  // Monnaie "autres" : texte obligatoire
  if (document.getElementById('monnaie')?.value === 'autres') {
    const autreVal = document.getElementById('monnaie-autre')?.value.trim();
    if (!autreVal) {
      errors.push({
        fieldId:  'monnaie-autre',
        errorId:  'error-monnaie',
        message:  'Veuillez préciser la monnaie.',
      });
    }
  }

  // Lignes d'articles
  const rows = document.getElementById('items-body')?.querySelectorAll('tr') || [];
  let hasValidRow = false;
  let hasItemError = false;

  rows.forEach((tr) => {
    const desig = tr.querySelector('.item-designation')?.value.trim() || '';
    const qty   = parseFloat(tr.querySelector('.item-qty')?.value) || 0;
    const pu    = tr.querySelector('.item-pu')?.value.trim();

    if (desig) {
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
      tr.querySelector('.item-designation')?.classList.add('is-error');
      hasItemError = true;
    }
  });

  if (!hasValidRow || hasItemError) {
    errors.push({
      fieldId:  'items-body',
      errorId:  'error-items',
      message:  'Au moins un article doit être renseigné (description, quantité et prix obligatoires).',
    });
  }

  return errors;
}

function showErrors(errors) {
  const banner = document.getElementById('form-error-banner');
  const msg    = document.getElementById('form-error-msg');

  errors.forEach(({ fieldId, errorId, message }) => {
    const field = document.getElementById(fieldId);
    if (field) field.classList.add('is-error');
    const errEl = document.getElementById(errorId);
    if (errEl) {
      errEl.textContent = message;
      errEl.removeAttribute('hidden');
    }
  });

  if (banner && msg && errors.length > 0) {
    const n = errors.length;
    msg.textContent = `${n} champ${n > 1 ? 's' : ''} obligatoire${n > 1 ? 's' : ''} manquant${n > 1 ? 's' : ''}.`;
    banner.removeAttribute('hidden');
  }

  const firstField = document.getElementById(errors[0]?.fieldId);
  firstField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  firstField?.focus({ preventScroll: true });
}

function clearErrors() {
  document.querySelectorAll('.is-error').forEach((el) => el.classList.remove('is-error'));
  document.querySelectorAll('.field__error').forEach((el) => {
    el.setAttribute('hidden', '');
    el.textContent = '';
  });
  document.getElementById('form-error-banner')?.setAttribute('hidden', '');
}

/* ── Gabarit d'impression ──────────────────────────────────────── */

function populatePrintTemplate() {
  const v = (id) => document.getElementById(id)?.value.trim() || '—';
  const t = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  };

  // Bloc commande
  t('pt-cmd-par',    v('cmd-par'));
  t('pt-fournisseur', v('fournisseur'));
  t('pt-departement', v('departement'));

  const offreVal = v('offre-num');
  t('pt-offre-num', offreVal !== '—' ? offreVal : '—');

  // Prix type
  const prixSelected = document.querySelector('input[name="prix-type"]:checked');
  t('pt-prix-type', prixSelected
    ? (prixSelected.value === 'standards' ? 'Prix standards' : 'Prix négociés')
    : '—');

  // Monnaie
  const monnaieVal = document.getElementById('monnaie')?.value;
  const monnaieDisplay = monnaieVal === 'autres'
    ? (document.getElementById('monnaie-autre')?.value.trim() || '—')
    : (monnaieVal || '—');
  t('pt-monnaie', monnaieDisplay);

  // Délai
  const delaiVal = document.getElementById('delai')?.value;
  let delaiDisplay = '—';
  if (delaiVal === 'autres') {
    delaiDisplay = document.getElementById('delai-autre')?.value.trim() || '—';
  } else if (delaiVal) {
    delaiDisplay = 'En stock';
  }
  t('pt-delai', delaiDisplay);

  // Port
  const portVal = document.getElementById('port')?.value;
  t('pt-port', portVal === 'payant' ? 'Payant' : 'Gratuit');

  // Adresse
  const adresseEl = document.getElementById('adresse-livraison');
  const adresseText = adresseEl?.value ? adresseEl.options[adresseEl.selectedIndex]?.text : '—';
  t('pt-adresse', adresseText || '—');

  // Tableau articles
  buildPrintItemsTable();

  // Totaux
  t('pt-total-ht',  document.getElementById('total-ht')?.textContent  || '—');
  t('pt-total-tva', document.getElementById('total-tva')?.textContent || '—');
  t('pt-total-ttc', document.getElementById('total-ttc')?.textContent || '—');

  // Pied de page
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const genDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  t('pt-generated-date', genDate);
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
    const pu    = parseFloat(tr.querySelector('.item-pu')?.value) || 0;

    if (!desig) return;
    idx++;

    const ptRow = document.createElement('tr');
    ptRow.innerHTML = `
      <td class="pt-col-num">${idx}</td>
      <td class="pt-col-designation">${escapeHtml(desig)}</td>
      <td class="pt-col-ref">${escapeHtml(ref || '')}</td>
      <td class="pt-col-qty">${escapeHtml(qty || '1')}</td>
      <td class="pt-col-pu">${formatAmount(pu)}</td>
    `;
    tbody.appendChild(ptRow);
  });

  if (idx === 0) {
    const ptRow = document.createElement('tr');
    ptRow.innerHTML = `<td colspan="5" class="pt-empty-state">Aucun article renseigné</td>`;
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

  populatePrintTemplate();
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

  const inputs = document.getElementById('main-form')
    ?.querySelectorAll('input, select, textarea') || [];
  inputs.forEach((el) => {
    if (el.tagName === 'SELECT') {
      el.selectedIndex = 0;
    } else if (el.type === 'radio' || el.type === 'checkbox') {
      el.checked = false;
    } else {
      el.value = '';
    }
  });

  // Masquer les inputs conditionnels
  document.getElementById('monnaie-autre')?.setAttribute('hidden', '');
  document.getElementById('delai-autre')?.setAttribute('hidden', '');

  // Supprimer les lignes du tableau
  const tbody = document.getElementById('items-body');
  if (tbody) tbody.innerHTML = '';
  rowCounter = 0;

  addItemRow();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Point d'entrée ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initForm);
