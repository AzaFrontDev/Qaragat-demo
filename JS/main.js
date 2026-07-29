import { dict, rooms, conferenceSpecs, conferenceEquipment } from "./i18n.js";

/* =========================================================
   Language state
   ========================================================= */
const LANG_KEY = "karagat.lang";
let lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "ru";

function t(key) {
  return dict[lang][key] ?? dict.ru[key] ?? key;
}

function applyI18n() {
  document.documentElement.lang = lang;
  
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    // Вставляем через innerHTML, чтобы подтягивались теги <span>, <strong> и т.д.
    el.innerHTML = t(el.dataset.i18n);
  });
  
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });
  
  document.querySelectorAll(".lang [data-lang]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  
  // page-level renderers may re-render
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

function setLang(next) {
  if (next === lang) return;
  lang = next;
  localStorage.setItem(LANG_KEY, lang);
  applyI18n();
}

/* =========================================================
   Header: scroll shadow + mobile menu + language buttons
   ========================================================= */
function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const toggle = header.querySelector(".menu-toggle");
  const nav = header.querySelector(".nav");
  toggle?.addEventListener("click", () => nav?.classList.toggle("open"));
  nav?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => nav.classList.remove("open"))
  );

  header.querySelectorAll(".lang [data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  // mark active nav item
  const path = location.pathname.replace(/\/$/, "") || "/";
  header.querySelectorAll(".nav a").forEach((a) => {
    const href = a.getAttribute("href").replace(/\/$/, "") || "/";
    if (href === path || (href !== "/" && path.startsWith(href))) {
      a.classList.add("active");
    }
  });
}

/* =========================================================
   Toast notifications
   ========================================================= */
function toast(title, body) {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<strong></strong><span></span>`;
  el.querySelector("strong").textContent = title;
  el.querySelector("span").textContent = body;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 4200);
}

/* =========================================================
   Booking form
   ========================================================= */
function initBookingForm() {
  const form = document.querySelector("#booking-form");
  if (!form) return;

  // Populate room <select> with translated options
  const roomSelect = form.querySelector("select[name='room']");
  const renderRoomOptions = () => {
    if (!roomSelect) return;
    const current = roomSelect.value;
    roomSelect.innerHTML = "";
    rooms.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r[lang].name;
      roomSelect.appendChild(opt);
    });
    if (current) roomSelect.value = current;
  };
  renderRoomOptions();
  document.addEventListener("langchange", renderRoomOptions);

  const submitBtn = form.querySelector("button[type='submit']");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = t("booking.sending");
    // TODO(backend): replace with POST to your booking endpoint.
    console.log("[karagat] booking submission", data);
    await new Promise((r) => setTimeout(r, 400));
    toast(t("booking.successTitle"), t("booking.successBody"));
    form.reset();
    renderRoomOptions();
    submitBtn.disabled = false;
    submitBtn.textContent = original;
  });
}

/* =========================================================
   Contact form
   ========================================================= */
function initContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;
  const submitBtn = form.querySelector("button[type='submit']");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = t("booking.sending");
    // TODO(backend): replace with POST to your contact endpoint.
    console.log("[karagat] contact submission", data);
    await new Promise((r) => setTimeout(r, 400));
    toast(t("contactForm.successTitle"), t("contactForm.successBody"));
    form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = original;
  });
}

/* =========================================================
   Rooms grid rendering
   ========================================================= */
function initRoomsGrid() {
  const grids = document.querySelectorAll("[data-rooms-grid]");
  if (!grids.length) return;

  const render = () => {
    grids.forEach((grid) => {
      const limit = parseInt(grid.dataset.limit || "0", 10) || rooms.length;
      
      grid.innerHTML = rooms.slice(0, limit).map((room) => {
        const data = room[lang] || room.ru;
        const priceFormatted = new Intl.NumberFormat(
          lang === "ru" ? "ru-RU" : "en-US"
        ).format(room.price);

        return `
          <div class="room-card">
            <div class="room-card__img-wrap">
              <img src="${room.image}" alt="${data.name}" class="room-card__img" loading="lazy" />
              <div class="room-card__badge">${data.size} · ${data.guests}</div>
            </div>
            <div class="room-card__content">
              <div class="room-card__header">
                <h3 class="room-card__title">${data.name}</h3>
                <a href="/rooms.html?id=${room.id}" class="room-card__arrow" aria-label="${data.name}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M7 17L17 7M17 7H7M17 7V17"/>
                  </svg>
                </a>
              </div>
              <p class="room-card__desc">${data.short}</p>
              <div class="room-card__footer">
                <span class="room-card__from">${t("rooms.priceFrom")}</span>
                <span class="room-card__price">${priceFormatted} ${t("rooms.currency")}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    });
  };

  render();
  document.addEventListener("langchange", render);
}

/* =========================================================
   Room detail (rooms.html?id=xxx)
   ========================================================= */
function initRoomDetail() {
  const wrap = document.querySelector("#room-detail");
  if (!wrap) return;
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const listWrap = document.querySelector("#rooms-list");

  if (!id) {
    wrap.style.display = "none";
    return;
  }
  const room = rooms.find((r) => r.id === id);
  if (!room) {
    wrap.style.display = "none";
    return;
  }
  if (listWrap) listWrap.style.display = "none";

  const render = () => {
    const info = room[lang];
    const price = new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-US").format(room.price);
    wrap.innerHTML = `
      <div class="page-head">
        <div class="kicker">${info.size} · ${info.guests}</div>
        <h1 class="serif" style="margin-top:12px;">${info.name}</h1>
        <p>${info.short}</p>
      </div>
      <div class="container">
        <div class="room-detail-hero"><img src="${room.image}" alt="${info.name}" /></div>
        <div class="split">
          <div>
            <h2 class="serif">${lang === "ru" ? "О номере" : "About the room"}</h2>
            <p class="muted" style="margin-top:16px;font-size:16px;">${info.short}</p>
            <p class="muted" style="margin-top:14px;font-size:15px;">
              ${lang === "ru"
                ? "Каждая деталь в номере продумана для вашего комфорта: премиальные матрасы, звукоизоляция, кондиционер, безопасный сейф, чайная станция и халаты с тапочками."
                : "Every detail is designed for your comfort: premium mattresses, sound insulation, air conditioning, in-room safe, tea station, bathrobes and slippers."}
            </p>
          </div>
          <div class="form-card">
            <h3 class="serif">${lang === "ru" ? "Стоимость" : "Rate"}</h3>
            <div style="display:flex;align-items:baseline;justify-content:space-between;padding:12px 0 20px;border-bottom:1px solid var(--border);">
              <span class="muted" style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;">${t("rooms.priceFrom")}</span>
              <strong style="font-family:var(--serif);font-size:34px;color:var(--gold);">${price}</strong>
            </div>
            <p class="muted" style="font-size:13px;margin:16px 0 24px;">${t("rooms.currency")}</p>
            <a href="/contacts.html" class="btn btn-primary btn-block">${t("nav.book")}</a>
          </div>
        </div>
      </div>
    `;
  };
  render();
  document.addEventListener("langchange", render);
}
/* =========================================================
   Conference page rendering
   ========================================================= */
function initConference() {
  const specWrap = document.querySelector("#conf-specs");
  const eqWrap = document.querySelector("#conf-equipment");
  if (!specWrap && !eqWrap) return;
  const render = () => {
    if (specWrap) {
      specWrap.innerHTML = conferenceSpecs[lang]
        .map(
          (s) => `<div class="spec-row"><div class="l"><span class="ic">${s.icon}</span><span>${s.label}</span></div><span>${s.value}</span></div>`
        )
        .join("");
    }
    if (eqWrap) {
      eqWrap.innerHTML = conferenceEquipment[lang].map((i) => `<li>${i}</li>`).join("");
    }
  };
  render();
  document.addEventListener("langchange", render);
}

/* =========================================================
   Gallery lightbox
   ========================================================= */
function initGallery() {
  const items = Array.from(document.querySelectorAll(".gallery-grid .item"));
  if (!items.length) return;
  const images = items.map((it) => ({
    src: it.querySelector("img").src,
    alt: it.querySelector("img").alt,
  }));

  const box = document.createElement("div");
  box.className = "lightbox";
  box.innerHTML = `
    <button class="close" aria-label="Close">×</button>
    <button class="prev" aria-label="Previous">‹</button>
    <button class="next" aria-label="Next">›</button>
    <img alt="" />
  `;
  document.body.appendChild(box);
  const bigImg = box.querySelector("img");
  let idx = 0;

  const show = (i) => {
    idx = (i + images.length) % images.length;
    bigImg.src = images[idx].src;
    bigImg.alt = images[idx].alt;
  };
  const open = (i) => {
    show(i);
    box.classList.add("open");
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    box.classList.remove("open");
    document.body.style.overflow = "";
  };

  items.forEach((it, i) => it.addEventListener("click", () => open(i)));
  box.querySelector(".close").addEventListener("click", close);
  box.querySelector(".prev").addEventListener("click", (e) => { e.stopPropagation(); show(idx - 1); });
  box.querySelector(".next").addEventListener("click", (e) => { e.stopPropagation(); show(idx + 1); });
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  document.addEventListener("keydown", (e) => {
    if (!box.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
  });
}

/* =========================================================
   Year in footer
   ========================================================= */
function initYear() {
  const y = document.querySelector("#year");
  if (y) y.textContent = new Date().getFullYear();
}

/* =========================================================
   Bootstrap
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  applyI18n();
  initBookingForm();
  initContactForm();
  initRoomsGrid();
  initRoomDetail();
  initConference();
  initGallery();
  initYear();
});

// Отслеживание прокрутки для изменения шапки
const header = document.querySelector('.site-header');

window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});
