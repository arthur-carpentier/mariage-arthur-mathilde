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
  initDecor();
}

/* ---------- Décor vivant : pétales, parallaxe, apparitions ---------- */
function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function initDecor() {
  initReveal();
  if (prefersReducedMotion()) return;
  spawnPetals($("#petals"), 22);
  initParallax();
}

/* ---------- Écran d'accueil + transition « élément partagé » ---------- */
function initIntro() {
  const intro = document.getElementById("intro");
  if (!intro) return;
  let entered = false;
  try { entered = sessionStorage.getItem("am_entered") === "1"; } catch (e) {}
  if (entered) { intro.remove(); return; }

  document.body.classList.add("intro-open");
  const reduce = prefersReducedMotion();
  if (reduce) intro.classList.add("welcome--noanim");
  else spawnPetals(document.getElementById("intro-petals"), 16);

  const enter = document.getElementById("intro-enter");
  if (enter) enter.addEventListener("click", () => leaveIntro(intro, reduce), { once: true });
}

function leaveIntro(intro, reduce) {
  try { sessionStorage.setItem("am_entered", "1"); } catch (e) {}
  if (reduce) { finishIntro(intro); return; }
  const heroTorii = document.querySelector(".hero__torii");
  const heroTitle = document.getElementById("couple-names");
  // les éléments partagés volent vers leur position finale dans le hero
  // (flipTo mesure la cible AVANT qu'on la masque)
  flipTo(document.getElementById("intro-torii"), heroTorii, 0.22);
  flipTo(document.getElementById("intro-title"), heroTitle, 1);
  // on masque les éléments du hero pendant le vol pour éviter toute superposition
  if (heroTorii) heroTorii.style.opacity = "0";
  if (heroTitle) heroTitle.style.visibility = "hidden";
  document.getElementById("intro-torii").classList.add("fly");
  document.getElementById("intro-title").classList.add("fly");
  intro.classList.add("welcome--leaving");
  setTimeout(() => finishIntro(intro), 1300);
}

function finishIntro(intro) {
  // on redonne la main aux éléments du hero (à l'endroit exact où le vol s'achève)
  const heroTorii = document.querySelector(".hero__torii");
  const heroTitle = document.getElementById("couple-names");
  if (heroTorii) heroTorii.style.opacity = "";
  if (heroTitle) heroTitle.style.visibility = "";
  intro.remove();
  document.body.classList.remove("intro-open");
}

function flipTo(el, target, endOpacity) {
  if (!el || !target) return;
  const a = el.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const scale = a.width ? b.width / a.width : 1;
  // coupe l'animation d'entrée : avec fill-mode "both", elle continue de figer
  // la propriété transform (à none) et empêcherait le vol.
  el.style.animation = "none";
  el.style.transformOrigin = "center center";
  el.style.transition = "none";
  el.style.transform = "translate(0px, 0px) scale(1)";
  void el.offsetWidth; // reflow pour fixer l'état de départ
  el.style.transition = "transform 1s cubic-bezier(0.66, 0, 0.2, 1), opacity 1s ease";
  requestAnimationFrame(() => {
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    if (endOpacity != null) el.style.opacity = endOpacity;
  });
}

function spawnPetals(layer, count) {
  if (!layer) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "petal";
    // pseudo-aléatoire déterministe (pas de Math.random requis)
    const r = (n) => ((Math.sin((i + 1) * n) + 1) / 2);
    const size = 8 + r(12.9) * 12;
    p.style.left = (r(3.1) * 100).toFixed(1) + "%";
    p.style.width = p.style.height = size.toFixed(1) + "px";
    p.style.setProperty("--drift", (r(7.3) * 160 - 80).toFixed(0) + "px");
    p.style.setProperty("--spin", (360 + r(5.7) * 540).toFixed(0) + "deg");
    p.style.animationDuration = (8 + r(9.4) * 8).toFixed(1) + "s";
    p.style.animationDelay = "-" + (r(2.2) * 12).toFixed(1) + "s";
    p.style.opacity = (0.5 + r(4.8) * 0.4).toFixed(2);
    layer.appendChild(p);
  }
}

function initParallax() {
  const branches = document.querySelectorAll(".hero__branch");
  const torii = $(".hero__torii");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      branches.forEach((b, i) => {
        b.style.transform =
          (b.classList.contains("hero__branch--right") ? "scaleX(-1) " : "") +
          `translateY(${y * 0.18}px)`;
      });
      if (torii) torii.style.transform = `translate(-50%, calc(-52% + ${y * 0.08}px))`;
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
}

let revealObserver = null;
function initReveal() {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    return;
  }
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          revealObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  observeReveals();
}

/* (Ré)observe les éléments .reveal pas encore révélés — appelé après chaque rendu */
function observeReveals() {
  if (!revealObserver) {
    // observer pas encore prêt (rendu initial avant initDecor) : on révèle sans animation
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => el.classList.add("is-visible"));
    return;
  }
  document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => revealObserver.observe(el));
}

/* ---------- Contributions mémorisées (cache front) ---------- */
const STORE_KEY = "am_contribs";
function loadContribs() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; }
}
function saveContribs(arr) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(arr)); } catch (e) {}
}
function localTotal() {
  return loadContribs().reduce((s, c) => s + (Number(c.amount) || 0), 0);
}
function offeredIds() {
  return new Set(loadContribs().map((c) => c.id).filter((id) => id && id !== "libre"));
}
function baseCollected() {
  return Math.max(0, Number((state.config.progress || {}).collected) || 0);
}
function goalAmount() {
  const p = state.config.progress || {};
  return Number(p.goal) > 0 ? Number(p.goal) : state.gifts.reduce((s, g) => s + (Number(g.price) || 0), 0);
}
function currentCollected() {
  return baseCollected() + localTotal();
}

/* ---------- Jauge de progression (France → Japon) ---------- */
const COUPLE_INSET = 30; // demi-largeur du marqueur, garde le couple dans la piste
function insetCalc(pct) {
  return `calc(${COUPLE_INSET}px + (100% - ${2 * COUPLE_INSET}px) * ${pct / 100})`;
}
function setJourneyLabel(collected, goal) {
  const label = $("#journey-label");
  if (label) {
    label.innerHTML =
      `💞 Déjà <strong>${formatPrice(collected)}</strong> réunis sur <strong>${formatPrice(goal)}</strong>`;
  }
}
function setJourneyBar(collected, goal) {
  const pct = goal > 0 ? Math.min(100, (collected / goal) * 100) : 0;
  const fill = document.getElementById("journey-fill");
  const couple = document.getElementById("journey-couple");
  if (fill) fill.style.width = pct + "%";
  if (couple) couple.style.left = insetCalc(pct);
}
function animateNumber(from, to, goal, duration) {
  let start = null;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function frame(ts) {
    if (start === null) start = ts;
    const t = Math.min(1, (ts - start) / duration);
    setJourneyLabel(Math.round(from + (to - from) * ease(t)), goal);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function renderJourney() {
  const goal = goalAmount();
  const collected = currentCollected();
  setJourneyLabel(collected, goal);
  // animation d'arrivée : barre + couple partent de 0, compteur grimpe
  requestAnimationFrame(() => {
    setJourneyBar(collected, goal);
    if (collected > 0) animateNumber(0, collected, goal, 1400);
  });
}

/* ---------- Séquence « récompense » à la validation d'un cadeau ---------- */
function celebrate(gift) {
  const before = currentCollected();
  const arr = loadContribs();
  arr.push({ id: gift.id, title: gift.title, amount: Number(gift.amount) || 0, ts: Date.now() });
  saveContribs(arr);
  const after = currentCollected();
  const goal = goalAmount();

  if (gift.id && gift.id !== "libre") markOffered(gift.id);
  closeModal();

  const journey = document.getElementById("journey");
  if (!journey) return;
  journey.scrollIntoView({ behavior: "smooth", block: "center" });

  if (prefersReducedMotion()) {
    setJourneyBar(after, goal);
    setJourneyLabel(after, goal);
    return;
  }

  // on fige l'état de départ puis on relance la transition vers la nouvelle valeur
  const fill = document.getElementById("journey-fill");
  const couple = document.getElementById("journey-couple");
  const pctBefore = goal > 0 ? Math.min(100, (before / goal) * 100) : 0;
  const pctAfter = goal > 0 ? Math.min(100, (after / goal) * 100) : 0;
  fill.style.transition = "none";
  couple.style.transition = "none";
  fill.style.width = pctBefore + "%";
  couple.style.left = insetCalc(pctBefore);
  void fill.offsetWidth;

  setTimeout(() => {
    fill.style.transition = "width 1.1s cubic-bezier(0.22, 1, 0.36, 1)";
    couple.style.transition = "left 1.1s cubic-bezier(0.22, 1, 0.36, 1)";
    requestAnimationFrame(() => {
      fill.style.width = pctAfter + "%";
      couple.style.left = insetCalc(pctAfter);
    });
    journey.classList.add("journey--reward");
    setTimeout(() => journey.classList.remove("journey--reward"), 1000);
    confettiBurst(journey);
    floatGain(Number(gift.amount) || 0, journey);
    animateNumber(before, after, goal, 1200);
  }, 480); // laisse le scroll « zoomer » sur la barre d'abord
}

function markOffered(id) {
  document.querySelectorAll(`.card[data-id="${cssEscape(id)}"]`).forEach(decorateOffered);
}
function decorateOffered(card) {
  if (!card || card.classList.contains("card--offered")) return;
  card.classList.add("card--offered");
  const badge = document.createElement("div");
  badge.className = "card__badge";
  badge.textContent = "✓ Déjà offert";
  card.appendChild(badge);
}
function cssEscape(s) {
  return String(s).replace(/["\\]/g, "\\$&");
}

/* Confettis maison (canvas plein écran, sans dépendance) */
function confettiBurst(target) {
  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = target.getBoundingClientRect();
  const ox = r.left + r.width / 2;
  const oy = r.top + r.height / 2;
  const colors = ["#B05078", "#3A6E8C", "#4E7A60", "#F6D5E0", "#D6E7F1", "#E6B422"];
  const parts = [];
  const N = 150;
  for (let i = 0; i < N; i++) {
    const ang = Math.PI * 2 * (i / N) + Math.random() * 0.5;
    const spd = 4 + Math.random() * 8;
    parts.push({
      x: ox, y: oy,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - (3 + Math.random() * 4),
      g: 0.16 + Math.random() * 0.14,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.5,
      w: 6 + Math.random() * 7, h: 9 + Math.random() * 9,
      color: colors[i % colors.length],
      life: 0, max: 70 + Math.random() * 45,
    });
  }
  let frame = 0;
  function tick() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let alive = false;
    for (const p of parts) {
      if (p.life > p.max) continue;
      alive = true;
      p.life++;
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    frame++;
    if (alive && frame < 240) requestAnimationFrame(tick);
    else canvas.remove();
  }
  requestAnimationFrame(tick);
}

/* « +X € » qui s'envole au-dessus de la barre */
function floatGain(amount, target) {
  if (!amount) return;
  const el = document.createElement("div");
  el.className = "gain-float";
  el.textContent = "+" + formatPrice(amount);
  document.body.appendChild(el);
  const r = target.getBoundingClientRect();
  el.style.left = r.left + r.width / 2 + "px";
  el.style.top = r.top + r.height / 2 + "px";
  requestAnimationFrame(() => el.classList.add("gain-float--go"));
  setTimeout(() => el.remove(), 1600);
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
  const offered = offeredIds();
  list.forEach((g) => {
    const card = document.createElement("article");
    card.className = "card reveal";
    card.dataset.id = g.id;

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
      <h3 class="card__title">${escapeHtml(g.title)}</h3>
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
    if (offered.has(g.id)) decorateOffered(card);
    grid.appendChild(card);
  });
  observeReveals();
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

  const onConfirmed = () => {
    submitBtn.disabled = false;
    submitBtn.textContent = "Envoyer 💛";
    celebrate(state.current);
  };

  if (!cfg.enabled || !isReal(cfg.formEndpoint)) {
    // Pas d'endpoint configuré : on fête quand même (le couple sera prévenu par sa banque/PayPal).
    onConfirmed();
    return;
  }

  try {
    const data = new FormData(form);
    data.append("_subject", `🎁 Nouveau cadeau de mariage : ${state.current.title}`);
    data.append("_captcha", "false");
    data.append("_template", "table");
    const res = await fetch(cfg.formEndpoint, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    onConfirmed();
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

initIntro();
load();
