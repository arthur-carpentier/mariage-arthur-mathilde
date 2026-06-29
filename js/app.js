/* Liste de mariage Arthur & Mathilde — logique front, 100% statique (GitHub Pages) */

const state = {
  config: null,
  gifts: [],
  activeCategory: "Tous",
  current: { title: "", emoji: "🎁", amount: 0, id: "" },
};

const $ = (sel) => document.querySelector(sel);

/* ---------- Chargement des données ---------- */
async function load() {
  try {
    const [cfgRes, giftsRes] = await Promise.all([
      fetch("data/config.json"),
      fetch("data/gifts.json"),
    ]);
    state.config = await cfgRes.json();
    state.gifts = (await giftsRes.json()).gifts || [];
  } catch (e) {
    $("#gifts").innerHTML =
      '<p class="gifts__loading">Impossible de charger les cadeaux. ' +
      "Si vous testez en local, lancez un petit serveur (voir README). 🙏</p>";
    console.error(e);
    return;
  }
  applyConfig();
  renderJourney();
  renderFilters();
  renderGifts();
  bindFreeGift();
  bindModal();
}

/* ---------- Jauge de progression (France → Japon) ---------- */
function renderJourney() {
  const prog = state.config.progress || {};
  const collected = Math.max(0, Number(prog.collected) || 0);
  const goal =
    Number(prog.goal) > 0
      ? Number(prog.goal)
      : state.gifts.reduce((sum, g) => sum + (Number(g.price) || 0), 0);
  const pct = goal > 0 ? Math.min(100, (collected / goal) * 100) : 0;

  const label = $("#journey-label");
  if (label) {
    label.innerHTML =
      `💞 Déjà <strong>${formatPrice(collected)}</strong> réunis sur ` +
      `<strong>${formatPrice(goal)}</strong> — ` +
      `<span class="pct">${Math.round(pct)} %</span> du voyage financé ✈️`;
  }

  const fill = document.getElementById("journey-fill");
  const couple = document.getElementById("journey-couple");
  if (!fill || !couple) return;

  // on part de 0 puis on anime vers la cible (transition CSS sur width/left)
  requestAnimationFrame(() => {
    fill.style.width = pct + "%";
    couple.style.left = pct + "%";
  });
}

/* ---------- Textes du couple ---------- */
function applyConfig() {
  const c = state.config.couple || {};
  if (c.names) {
    $("#couple-names").textContent = c.names;
    document.title = `${c.names} — Liste de mariage`;
  }
  $("#couple-subtitle").textContent = c.subtitle || "";
  $("#couple-intro").textContent = c.intro || "";
  $("#couple-date").textContent = c.weddingDate || "";
}

/* ---------- Filtres par catégorie ---------- */
function renderFilters() {
  const cats = ["Tous", ...new Set(state.gifts.map((g) => g.category).filter(Boolean))];
  const wrap = $("#filters");
  wrap.innerHTML = "";
  cats.forEach((cat) => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.setAttribute("aria-pressed", cat === state.activeCategory ? "true" : "false");
    btn.addEventListener("click", () => {
      state.activeCategory = cat;
      renderFilters();
      renderGifts();
    });
    wrap.appendChild(btn);
  });
}

/* ---------- Grille de cadeaux ---------- */
function renderGifts() {
  const grid = $("#gifts");
  const list =
    state.activeCategory === "Tous"
      ? state.gifts
      : state.gifts.filter((g) => g.category === state.activeCategory);

  grid.innerHTML = "";
  list.forEach((g) => {
    const card = document.createElement("article");
    card.className = "card";

    const media = document.createElement("div");
    media.className = "card__media";
    if (g.image) {
      media.style.backgroundImage = `url('${g.image}')`;
      media.textContent = "";
    } else {
      media.textContent = g.emoji || "🎁";
    }

    const body = document.createElement("div");
    body.className = "card__body";
    body.innerHTML = `
      ${g.category ? `<span class="card__cat">${g.category}</span>` : ""}
      <h3 class="card__title">${g.emoji ? g.emoji + " " : ""}${escapeHtml(g.title)}</h3>
      <p class="card__desc">${escapeHtml(g.description || "")}</p>
      <div class="card__footer">
        <span class="card__price">${formatPrice(g.price)}</span>
      </div>`;

    const btn = document.createElement("button");
    btn.className = "btn btn--primary";
    btn.textContent = "Offrir 🎁";
    btn.addEventListener("click", () =>
      openModal({ title: g.title, emoji: g.emoji || "🎁", amount: g.price, id: g.id })
    );
    body.querySelector(".card__footer").appendChild(btn);

    card.appendChild(media);
    card.appendChild(body);
    grid.appendChild(card);
  });
}

/* ---------- Cadeau libre ---------- */
function bindFreeGift() {
  const amounts = $("#free-amounts");
  const input = $("#free-input");
  let selected = null;

  amounts.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      amounts.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      selected = Number(b.dataset.amount);
      input.value = "";
    });
  });

  input.addEventListener("input", () => {
    amounts.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
    selected = null;
  });

  $("#free-offer").addEventListener("click", () => {
    const amount = selected || Number(input.value);
    if (!amount || amount <= 0) {
      input.focus();
      return;
    }
    openModal({ title: "Cadeau d'un montant libre", emoji: "💛", amount, id: "libre" });
  });
}

/* ---------- Modale ---------- */
function openModal({ title, emoji, amount, id }) {
  state.current = { title, emoji, amount, id };
  $("#modal-emoji").textContent = emoji;
  $("#modal-title").textContent = title;
  $("#modal-amount").textContent = formatPrice(amount);
  renderPayMethods();
  showStep("pay");
  $("#modal").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  $("#modal").hidden = true;
  document.body.style.overflow = "";
  // reset confirm form
  $("#confirm-form").hidden = false;
  $("#confirm-done").hidden = true;
  $("#confirm-form").reset();
  const submitBtn = $("#confirm-form").querySelector('button[type="submit"]');
  submitBtn.disabled = false;
  submitBtn.textContent = "Envoyer 💛";
}

function showStep(step) {
  $("#step-pay").hidden = step !== "pay";
  $("#step-confirm").hidden = step !== "confirm";
}

function bindModal() {
  document.querySelectorAll("[data-close]").forEach((el) =>
    el.addEventListener("click", closeModal)
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#modal").hidden) closeModal();
  });
  $("#to-confirm").addEventListener("click", () => {
    $("#confirm-gift").value = state.current.title;
    $("#confirm-amount").value = state.current.amount;
    showStep("confirm");
  });
  $("#confirm-form").addEventListener("submit", submitConfirm);
}

/* ---------- Moyens de paiement ---------- */
function renderPayMethods() {
  const p = state.config.payment || {};
  const box = $("#paymethods");
  box.innerHTML = "";

  // PayPal
  if (p.paypalMe && p.paypalMe.enabled && isReal(p.paypalMe.url)) {
    const url = appendAmountPaypal(p.paypalMe.url, state.current.amount);
    box.appendChild(
      methodEl({
        icon: "🅿️",
        name: "PayPal",
        note: p.paypalMe.note,
        action: `<a class="btn btn--primary" href="${url}" target="_blank" rel="noopener">Payer ${formatPrice(state.current.amount)} sur PayPal</a>`,
        track: "PayPal",
      })
    );
  }

  // Virement
  if (p.bankTransfer && p.bankTransfer.enabled && isReal(p.bankTransfer.iban)) {
    const bt = p.bankTransfer;
    box.appendChild(
      methodEl({
        icon: "🏦",
        name: "Virement bancaire",
        note: bt.note,
        action: `
          ${copyRow("Titulaire", bt.accountHolder)}
          ${copyRow("IBAN", bt.iban)}
          ${bt.bic && isReal(bt.bic) ? copyRow("BIC", bt.bic) : ""}`,
        track: "Virement",
      })
    );
  }

  // Stripe
  if (p.stripe && p.stripe.enabled && isReal(p.stripe.url)) {
    box.appendChild(
      methodEl({
        icon: "💳",
        name: "Carte bancaire (Stripe)",
        note: p.stripe.note,
        action: `<a class="btn btn--ghost" href="${p.stripe.url}" target="_blank" rel="noopener">Payer par carte</a>`,
        track: "Stripe",
      })
    );
  } else if (p.stripe && p.stripe.note) {
    // Stripe pas encore configuré : on affiche quand même l'info des frais si activé un jour
  }

  if (!box.children.length) {
    box.innerHTML =
      '<p class="paymethod__note">Les moyens de paiement ne sont pas encore configurés. ' +
      "Revenez bientôt 🙏</p>";
  }
}

function methodEl({ icon, name, note, action, track }) {
  const el = document.createElement("div");
  el.className = "paymethod";
  el.innerHTML = `
    <div class="paymethod__head"><span class="paymethod__icon">${icon}</span><strong>${name}</strong></div>
    ${note ? `<p class="paymethod__note">${escapeHtml(note)}</p>` : ""}
    <div>${action}</div>`;
  // mémorise le moyen choisi pour le formulaire de confirmation
  el.addEventListener("click", () => {
    $("#confirm-method").value = track;
  });
  return el;
}

function copyRow(label, value) {
  const v = escapeHtml(value || "");
  return `<div class="paymethod__copy">
      <code><strong>${label} :</strong> ${v}</code>
      <button type="button" onclick="copyText('${v.replace(/'/g, "\\'")}', this)">Copier</button>
    </div>`;
}

window.copyText = function (text, btn) {
  navigator.clipboard?.writeText(text.replace(/&amp;/g, "&")).then(() => {
    const old = btn.textContent;
    btn.textContent = "Copié ✓";
    setTimeout(() => (btn.textContent = old), 1500);
  });
};

/* ---------- Envoi de la confirmation ---------- */
async function submitConfirm(e) {
  e.preventDefault();
  const cfg = state.config.notification || {};
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Envoi…";

  const showDone = () => {
    $("#confirm-form").hidden = true;
    $("#confirm-done").hidden = false;
  };

  if (!cfg.enabled || !isReal(cfg.formEndpoint)) {
    // Pas d'endpoint configuré : on remercie quand même (le couple sera prévenu par sa banque/PayPal).
    showDone();
    return;
  }

  try {
    const data = new FormData(form);
    data.append("_subject", `🎁 Nouveau cadeau de mariage : ${state.current.title}`);
    const res = await fetch(cfg.formEndpoint, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    showDone();
  } catch (err) {
    console.error(err);
    submitBtn.disabled = false;
    submitBtn.textContent = "Réessayer";
    alert("Oups, l'envoi a échoué. Vous pouvez réessayer, ou nous prévenir directement 🙏");
  }
}

/* ---------- Utilitaires ---------- */
function isReal(v) {
  return v && !/CHANGE_ME|XXXX/i.test(v);
}
function formatPrice(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
}
function appendAmountPaypal(url, amount) {
  const base = url.replace(/\/+$/, "");
  return amount ? `${base}/${amount}EUR` : base;
}
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

load();
