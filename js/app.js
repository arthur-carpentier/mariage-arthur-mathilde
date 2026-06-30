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
  bindSort();
  bindShare();
  initDecor();
  initTilt();
  bindToCagnotte();
  // l'arc en pointillés est calculé en pixels : on le redessine au redimensionnement
  let arcTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(arcTimer);
    arcTimer = setTimeout(drawArc, 150);
  }, { passive: true });
}

/* Bouton flottant : remonte jusqu'à l'encart de la cagnotte (pas tout en haut) */
function bindToCagnotte() {
  const btn = document.getElementById("to-cagnotte");
  const journey = document.getElementById("journey");
  if (!btn || !journey) return;
  btn.addEventListener("click", () => {
    journey.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  });
  let ticking = false;
  const update = () => {
    ticking = false;
    // visible dès qu'on a dépassé le bas de la cagnotte (on est dans la liste)
    const show = journey.getBoundingClientRect().bottom < 0;
    btn.hidden = !show;
    btn.classList.toggle("to-cagnotte--show", show);
  };
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}

/* Inclinaison 3D + halo des cartes : souris au survol ET doigt en mobile */
function initTilt() {
  if (prefersReducedMotion()) return;
  const grid = document.getElementById("gifts");
  if (!grid) return;
  let active = null;
  let enterAt = 0;
  const RAMP = 320; // ms : durée d'arrivée progressive de l'inclinaison
  const ENTER_EASE = "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)";
  const reset = (card) => {
    if (!card) return;
    // on rétablit la transition CSS pour un retour à plat en douceur
    card.style.transition = "";
    card.style.transform = "";
    card.classList.remove("is-hovered");
    const em = card.querySelector(".card__emoji");
    if (em) { em.style.transition = ""; em.style.transform = ""; }
  };
  const tilt = (e) => {
    const card = e.target.closest(".card");
    if (!card || !grid.contains(card)) { reset(active); active = null; return; }
    if (active !== card) {
      if (active) reset(active);
      enterAt = e.timeStamp; // nouvelle carte : on (re)démarre l'arrivée progressive
    }
    active = card;
    card.classList.add("is-hovered");
    // À l'entrée : on amène l'inclinaison en douceur (sinon elle saute d'un
    // coup vers la valeur du bord). Passé le temps de RAMP, on colle au curseur.
    const ramping = e.timeStamp - enterAt < RAMP;
    const tr = ramping ? ENTER_EASE : "transform 0s";
    card.style.transition = "box-shadow 0.18s ease, " + tr;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(720px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-5px)`;
    // parallaxe : l'emoji (premier plan) glisse plus que le fond → effet de profondeur
    const em = card.querySelector(".card__emoji");
    if (em) {
      em.style.transition = tr;
      em.style.transform = `translate(${(px * 26).toFixed(1)}px, ${(py * 22).toFixed(1)}px) scale(1.08)`;
    }
  };
  const clear = () => { reset(active); active = null; };
  // pointermove couvre la souris (survol) et le tactile (doigt qui glisse).
  grid.addEventListener("pointermove", tilt);
  // En tactile on déclenche aussi dès le contact, et on relâche à la fin.
  grid.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") tilt(e); });
  grid.addEventListener("pointerup", clear);
  grid.addEventListener("pointercancel", clear);
  grid.addEventListener("pointerleave", clear);
}

const state_sort = { value: "default" };

function bindSort() {
  const sel = document.getElementById("sort");
  if (!sel) return;
  sel.addEventListener("change", () => {
    state_sort.value = sel.value;
    renderGifts();
  });
}

function bindShare() {
  const btn = document.getElementById("share-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const url = location.href.split("#")[0];
    const data = {
      title: "Liste de mariage d'Arthur & Mathilde",
      text: "Aide-nous à financer notre voyage de noces au Japon 🗾",
      url,
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        const old = btn.textContent;
        btn.textContent = "Lien copié ✓";
        setTimeout(() => (btn.textContent = old), 1800);
      } catch (e) {
        window.open("https://wa.me/?text=" + encodeURIComponent(data.text + " " + url), "_blank");
      }
    }
  });
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
  // le hero (destination) reste masqué tant que la transition n'est pas finie
  document.getElementById("hero")?.classList.add("hero--pending");
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
  // les éléments partagés volent vers leur position finale dans le hero.
  // Le hero est déjà masqué (hero--pending) : on ne voit donc que les éléments
  // qui volent, jamais le texte de destination avant la fin du vol.
  flipTo(document.getElementById("intro-torii"), heroTorii, 0.22);
  flipTo(document.getElementById("intro-title"), heroTitle, 1);
  document.getElementById("intro-torii").classList.add("fly");
  document.getElementById("intro-title").classList.add("fly");
  intro.classList.add("welcome--leaving");
  setTimeout(() => finishIntro(intro), 1300);
}

function finishIntro(intro) {
  // le vol est terminé : on révèle le hero (les prénoms et le torii prennent
  // exactement le relais des éléments volants) puis on retire l'accueil.
  const hero = document.getElementById("hero");
  if (hero) { hero.classList.remove("hero--pending"); hero.classList.add("hero--revealing"); }
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
    // pseudo-aléatoire déterministe (pas de Math.random requis)
    const r = (n) => ((Math.sin((i + 1) * n) + 1) / 2);
    // Trois plans de profondeur : arrière (petit, flou, lent), milieu, avant (gros, net, rapide).
    const depth = i % 3; // 0 = loin, 1 = milieu, 2 = près
    p.className = "petal petal--d" + depth;
    const base = [7, 11, 16][depth];
    const size = base + r(12.9) * (4 + depth * 4);
    p.style.left = (r(3.1) * 100).toFixed(1) + "%";
    p.style.width = p.style.height = size.toFixed(1) + "px";
    p.style.setProperty("--drift", (r(7.3) * 160 - 80).toFixed(0) + "px");
    p.style.setProperty("--spin", (360 + r(5.7) * 540).toFixed(0) + "deg");
    p.style.setProperty("--blur", [1.4, 0.6, 0].at(depth).toFixed(1) + "px");
    // Les plans proches tombent plus vite, les lointains plus lentement.
    const speed = [16, 12, 8][depth];
    p.style.animationDuration = (speed + r(9.4) * 6).toFixed(1) + "s";
    p.style.animationDelay = "-" + (r(2.2) * 14).toFixed(1) + "s";
    p.style.opacity = ([0.35, 0.55, 0.8][depth] + r(4.8) * 0.18).toFixed(2);
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
// le marqueur (au-dessus de la barre) pointe exactement le front de remplissage
function insetCalc(pct) {
  return pct + "%";
}
function setJourneyStatic(goal) {
  const label = $("#journey-label");
  if (label) {
    label.innerHTML =
      `💞 Déjà <span class="odo" id="odo"></span>&nbsp;€ réunis sur <strong>${formatPrice(goal)}</strong>`;
  }
}
/* construit l'odomètre dimensionné pour maxValue ; renvoie les rouleaux + leur rang */
function buildOdo(maxValue) {
  const odo = document.getElementById("odo");
  if (!odo) return [];
  const str = new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.round(maxValue)));
  const digits = str.replace(/\D/g, "");
  odo.innerHTML = "";
  const reels = [];
  let di = 0;
  for (const ch of str) {
    if (/[0-9]/.test(ch)) {
      const place = Math.pow(10, digits.length - 1 - di);
      di++;
      const cell = document.createElement("span");
      cell.className = "odo-cell";
      const reel = document.createElement("span");
      reel.className = "odo-reel";
      for (let n = 0; n <= 10; n++) {
        const s = document.createElement("span");
        s.textContent = String(n % 10);
        reel.appendChild(s);
      }
      cell.appendChild(reel);
      odo.appendChild(cell);
      reels.push({ reel, place });
    } else {
      const sep = document.createElement("span");
      sep.className = "odo-sep";
      sep.textContent = " "; // espace fine insécable
      odo.appendChild(sep);
    }
  }
  return reels;
}
function setOdo(reels, value) {
  // odomètre mécanique : chaque rouleau n'avance que lorsque les rangs
  // inférieurs approchent du passage à 0 → on retombe sur des entiers nets.
  reels.forEach(({ reel, place }) => {
    const v = Math.max(0, value);
    const digit = Math.floor(v / place) % 10;
    const lowerFrac = (v % place) / place; // progression dans ce rang (0..1)
    const roll = lowerFrac > 0.9 ? (lowerFrac - 0.9) / 0.1 : 0;
    const pos = digit + roll; // 0..10 (10 = cellule « 0 » de bouclage)
    reel.style.transform = `translateY(${(-pos).toFixed(3)}em)`;
  });
}
function setJourneyLabel(collected, goal) {
  setJourneyStatic(goal);
  setOdo(buildOdo(collected), collected);
}
function setJourneyBar(collected, goal) {
  const pct = goal > 0 ? Math.min(100, (collected / goal) * 100) : 0;
  const fill = document.getElementById("journey-fill");
  const couple = document.getElementById("journey-couple");
  if (fill) fill.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
  if (couple) couple.style.left = insetCalc(pct);
}
function animateNumber(from, to, goal, duration) {
  setJourneyStatic(goal);
  const reels = buildOdo(to);
  let start = null;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function frame(ts) {
    if (start === null) start = ts;
    const t = Math.min(1, (ts - start) / duration);
    setOdo(reels, from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(frame);
    else setOdo(reels, to);
  }
  requestAnimationFrame(frame);
}

function renderJourney() {
  const goal = goalAmount();
  const collected = currentCollected();
  setJourneyLabel(collected, goal);
  drawArc();
  requestAnimationFrame(() => {
    setJourneyBar(collected, goal);
    if (collected > 0) animateNumber(0, collected, goal, 1400);
    flyPlane();
  });
}

/* ---------- Arc en pointillés + avion qui traverse ---------- */
function journeyArcBox() {
  const journey = document.getElementById("journey");
  if (!journey) return null;
  const bar = journey.querySelector(".journey__bar");
  const fr = journey.querySelector(".journey__country--fr");
  const jp = journey.querySelector(".journey__country--jp");
  if (!bar || !fr || !jp) return null;
  if (getComputedStyle(bar).position === "static") bar.style.position = "relative";
  const br = bar.getBoundingClientRect();
  const a = fr.getBoundingClientRect();
  const b = jp.getBoundingClientRect();
  return {
    bar, w: br.width, h: br.height,
    x0: a.left + a.width / 2 - br.left,
    x1: b.left + b.width / 2 - br.left,
    y: a.top + a.height / 2 - br.top,
  };
}
function drawArc() {
  const g = journeyArcBox();
  if (!g) return;
  const apex = Math.max(8, g.y - 44);
  const ctrlY = 2 * apex - g.y; // contrôle quadratique pour un sommet ≈ apex
  const d = `M ${g.x0} ${g.y} Q ${(g.x0 + g.x1) / 2} ${ctrlY} ${g.x1} ${g.y}`;
  let svg = g.bar.querySelector(".journey__arc");
  if (!svg) {
    const NS = "http://www.w3.org/2000/svg";
    svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "journey__arc");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(NS, "path");
    path.setAttribute("class", "journey__arcpath");
    svg.appendChild(path);
    g.bar.appendChild(svg);
  }
  svg.setAttribute("viewBox", `0 0 ${g.w} ${g.h}`);
  svg.setAttribute("width", g.w);
  svg.setAttribute("height", g.h);
  svg.querySelector("path").setAttribute("d", d);
}
function flyPlane() {
  if (prefersReducedMotion()) return;
  const g = journeyArcBox();
  if (!g) return;
  drawArc();
  const path = g.bar.querySelector(".journey__arcpath");
  if (!path) return;
  let plane = g.bar.querySelector(".journey__plane");
  if (!plane) {
    plane = document.createElement("div");
    plane.className = "journey__plane";
    plane.textContent = "✈️";
    plane.setAttribute("aria-hidden", "true");
    g.bar.appendChild(plane);
  }
  const len = path.getTotalLength();
  const N = 40;
  const kf = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const pt = path.getPointAtLength(len * t);
    const pt2 = path.getPointAtLength(Math.min(len, len * t + 1));
    const ang = (Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180) / Math.PI;
    // l'emoji ✈️ pointe naturellement vers le haut-droite (≈ -45°) :
    // on compense pour que le nez suive la tangente de l'arc.
    const rot = ang + 45;
    const op = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1;
    kf.push({
      transform: `translate(${(pt.x - 10).toFixed(1)}px, ${(pt.y - 10).toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`,
      opacity: op,
    });
  }
  plane.animate(kf, { duration: 2600, easing: "ease-in-out" });
}

/* ---------- Séquence « récompense » à la validation d'un cadeau ---------- */
function celebrate(gift, nom) {
  const before = currentCollected();
  const arr = loadContribs();
  arr.push({ id: gift.id, title: gift.title, amount: Number(gift.amount) || 0, ts: Date.now() });
  saveContribs(arr);
  const after = currentCollected();
  const goal = goalAmount();

  if (gift.id && gift.id !== "libre") markOffered(gift.id);
  closeModal();
  showThanks(nom);

  const journey = document.getElementById("journey");
  if (!journey) return;
  journey.scrollIntoView({ behavior: "smooth", block: "center" });

  if (prefersReducedMotion()) {
    setJourneyBar(after, goal);
    setJourneyLabel(after, goal);
    return;
  }

  // palier franchi (tous les 5 %)
  const pctB = goal > 0 ? (before / goal) * 100 : 0;
  const pctA = goal > 0 ? (after / goal) * 100 : 0;
  const milestone = Math.floor(pctA / 5) * 5;
  const crossedMilestone = milestone >= 5 && Math.floor(pctA / 5) > Math.floor(pctB / 5);

  // on fige l'état de départ puis on relance la transition vers la nouvelle valeur
  const fill = document.getElementById("journey-fill");
  const couple = document.getElementById("journey-couple");
  const pctBefore = goal > 0 ? Math.min(100, (before / goal) * 100) : 0;
  const pctAfter = goal > 0 ? Math.min(100, (after / goal) * 100) : 0;
  fill.style.transition = "none";
  couple.style.transition = "none";
  fill.style.clipPath = `inset(0 ${100 - pctBefore}% 0 0)`;
  couple.style.left = insetCalc(pctBefore);
  void fill.offsetWidth;

  setTimeout(() => {
    fill.style.transition = "clip-path 1.1s cubic-bezier(0.22, 1, 0.36, 1)";
    couple.style.transition = "left 1.1s cubic-bezier(0.22, 1, 0.36, 1)";
    requestAnimationFrame(() => {
      fill.style.clipPath = `inset(0 ${100 - pctAfter}% 0 0)`;
      couple.style.left = insetCalc(pctAfter);
    });
    journey.classList.add("journey--reward");
    setTimeout(() => journey.classList.remove("journey--reward"), 1000);
    confettiBurst(journey);
    floatGain(Number(gift.amount) || 0, journey);
    animateNumber(before, after, goal, 1200);
    flyPlane();
    // palier fêté : double salve + bannière
    if (crossedMilestone) {
      setTimeout(() => {
        confettiBurst(journey);
        showMilestone(milestone);
      }, 700);
    }
  }, 480); // laisse le scroll « zoomer » sur la barre d'abord
}

/* Mot de remerciement personnalisé (toast) */
function showThanks(nom) {
  const el = document.createElement("div");
  el.className = "toast toast--thanks";
  const who = nom ? escapeHtml(nom) : "à vous";
  el.innerHTML = `<span class="toast__emoji">💛</span><div><strong>Merci ${who} !</strong><br>Votre cadeau fait avancer notre voyage. On a hâte de vous raconter ✨</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast--show"));
  setTimeout(() => el.classList.remove("toast--show"), 5000);
  setTimeout(() => el.remove(), 5600);
}

/* Bannière « palier atteint » */
function showMilestone(pct) {
  const el = document.createElement("div");
  el.className = "milestone";
  el.textContent = `🎊 ${pct} % du voyage financé !`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("milestone--show"));
  setTimeout(() => el.classList.remove("milestone--show"), 2200);
  setTimeout(() => el.remove(), 2800);
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

  // lien infos pratiques (Linktree…)
  const practical = (state.config.links || {}).practical;
  ["practical-link", "footer-link"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && isReal(practical)) {
      el.href = practical;
      el.hidden = false;
    }
  });
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
  let list =
    state.activeCategory === "Tous"
      ? state.gifts.slice()
      : state.gifts.filter((g) => g.category === state.activeCategory);
  if (state_sort.value === "price-asc") list.sort((a, b) => a.price - b.price);
  else if (state_sort.value === "price-desc") list.sort((a, b) => b.price - a.price);

  // FLIP : on mémorise la position des cartes déjà affichées pour les faire
  // glisser vers leur nouvelle place après filtrage/tri.
  const flip = !prefersReducedMotion() && grid.children.length > 0;
  const firstRects = {};
  if (flip) {
    for (const el of grid.children) {
      if (el.dataset && el.dataset.id) firstRects[el.dataset.id] = el.getBoundingClientRect();
    }
  }

  grid.innerHTML = "";
  const offered = offeredIds();
  list.forEach((g, i) => {
    const card = document.createElement("article");
    card.className = "card reveal";
    card.dataset.id = g.id;
    if (g.category) card.dataset.cat = g.category;
    card.style.transitionDelay = (i % 6) * 55 + "ms"; // cascade en vague


    const media = document.createElement("div");
    media.className = "card__media";
    if (g.image) {
      media.style.backgroundImage = `url('${g.image}')`;
    } else {
      // l'emoji est dans sa propre couche pour pouvoir flotter au-dessus du fond
      const em = document.createElement("span");
      em.className = "card__emoji";
      em.textContent = g.emoji || "🎁";
      media.appendChild(em);
    }

    const body = document.createElement("div");
    body.className = "card__body";
    body.innerHTML = `
      ${g.category ? `<span class="card__cat" data-cat="${escapeHtml(g.category)}">${escapeHtml(g.category)}</span>` : ""}
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

  // FLIP : applique l'écart (Invert) puis l'anime vers zéro (Play).
  if (flip) {
    requestAnimationFrame(() => {
      for (const el of grid.children) {
        const prev = firstRects[el.dataset && el.dataset.id];
        if (!prev) continue; // carte nouvellement révélée : laissée à l'apparition au scroll
        const now = el.getBoundingClientRect();
        const dx = prev.left - now.left;
        const dy = prev.top - now.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        // déjà visible : on neutralise l'effet d'apparition pour cette carte
        el.classList.add("is-visible");
        el.style.transitionDelay = "0ms";
        el.animate(
          [
            { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)` },
            { transform: "translate(0, 0)" },
          ],
          { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
      }
    });
  }
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
let lastFocused = null;
function openModal({ title, emoji, amount, id }) {
  state.current = { title, emoji, amount, id };
  $("#modal-emoji").textContent = emoji;
  $("#modal-title").textContent = title;
  $("#modal-amount").textContent = formatPrice(amount);
  renderPayMethods();
  renderPayRadios();
  showStep("pay");
  $("#modal").hidden = false;
  document.body.style.overflow = "hidden";
  // accessibilité : on mémorise le focus et on place le focus dans la modale
  lastFocused = document.activeElement;
  const close = $("#modal").querySelector(".modal__close");
  if (close) close.focus();
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
  // restaure le focus sur l'élément déclencheur
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}

/* piège le focus à l'intérieur de la modale (Tab / Maj+Tab) */
function trapFocus(e) {
  const modal = $("#modal");
  if (modal.hidden || e.key !== "Tab") return;
  const f = modal.querySelectorAll(
    'button:not([hidden]), a[href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const visible = Array.prototype.filter.call(f, (el) => el.offsetParent !== null);
  if (!visible.length) return;
  const first = visible[0];
  const last = visible[visible.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
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
    trapFocus(e);
  });
  $("#to-confirm").addEventListener("click", () => {
    $("#confirm-gift").value = state.current.title;
    $("#confirm-amount").value = state.current.amount;
    showStep("confirm");
  });
  $("#confirm-form").addEventListener("submit", submitConfirm);
}

/* ---------- Moyens de paiement ---------- */
// liste des moyens réellement disponibles selon la config
function availableMethods() {
  const p = state.config.payment || {};
  const list = [];
  if (p.paypalMe && p.paypalMe.enabled && isReal(p.paypalMe.url)) list.push({ track: "PayPal", label: "🅿️ PayPal" });
  if (p.wero && p.wero.enabled && (p.wero.recipients || []).some((r) => r && isReal(r.phone))) list.push({ track: "Wero", label: "📱 Wero" });
  if (p.bankTransfer && p.bankTransfer.enabled && isReal(p.bankTransfer.iban)) list.push({ track: "Virement", label: "🏦 Virement" });
  if (p.stripe && p.stripe.enabled && isReal(p.stripe.url)) list.push({ track: "Stripe", label: "💳 Carte" });
  return list;
}

// construit les radios « Comment avez-vous payé ? » selon les moyens dispos (+ Autre)
function renderPayRadios() {
  const fs = document.getElementById("payradio");
  if (!fs) return;
  const opts = availableMethods().concat([{ track: "Autre", label: "✨ Autre" }]);
  fs.innerHTML =
    "<legend>Comment avez-vous payé ?</legend>" +
    opts
      .map((o) => `<label><input type="radio" name="moyen" value="${o.track}" /> ${o.label}</label>`)
      .join("");
}

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

  // Wero
  if (p.wero && p.wero.enabled && (p.wero.recipients || []).length) {
    const rows = p.wero.recipients
      .filter((r) => r && isReal(r.phone))
      .map((r) => copyRow(r.name, r.phone))
      .join("");
    if (rows) {
      box.appendChild(
        methodEl({
          icon: "📱",
          name: "Wero",
          note: p.wero.note,
          action: rows,
          track: "Wero",
        })
      );
    }
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
  // pré-coche le moyen choisi dans le formulaire de confirmation
  el.addEventListener("click", () => {
    const radio = document.querySelector(`input[name="moyen"][value="${track}"]`);
    if (radio) radio.checked = true;
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

  const nom = (form.querySelector('[name="nom"]') || {}).value || "";
  const onConfirmed = () => {
    submitBtn.disabled = false;
    submitBtn.textContent = "Envoyer 💛";
    celebrate(state.current, nom.trim());
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
