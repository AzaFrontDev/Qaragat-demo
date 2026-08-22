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
   Room catalog (index.html and rooms.html)
   ========================================================= */
function initRoomsGrid() {
  const grids = document.querySelectorAll("[data-rooms-grid]");
  if (!grids.length) return;

  const render = () => {
    grids.forEach((grid) => {
      grid.classList.add("rooms-page-grid");
      grid.innerHTML = rooms.map((room) => {
        const info = room[lang];
        const price = new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-US").format(room.price);
        return `
          <article class="room-card">
            <a class="room-card__img-wrap" href="rooms.html?id=${room.id}">
              <img class="room-card__img" src="${room.image}" alt="${info.name}" />
              <span class="room-card__badge">${info.size} · ${info.guests}</span>
            </a>
            <div class="room-card__content">
              <div class="room-card__header">
                <h2 class="room-card__title">${info.name}</h2>
                <a class="room-card__arrow" href="rooms.html?id=${room.id}" aria-label="${info.name}">→</a>
              </div>
              <p class="room-card__desc">${info.short}</p>
              <div class="room-card__footer">
                <span class="room-card__from">${t("rooms.priceFrom")}</span>
                <span class="room-card__price">${price} ${t("rooms.currency")}</span>
              </div>
            </div>
          </article>
        `;
      }).join("");
    });
  };

  render();
  document.addEventListener("langchange", render);
}

/* =========================================================
   Room detail (rooms.html?id=xxx)
   ========================================================= */
const amenityIcons = {
  desk: '<path d="M4 19h16M7 19v-4h10v4M9 15V5h6v10M6 8h12" />',
  safe: '<rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M12 9v3l2 1M8 6h.01M8 18h.01" />',
  minibar: '<path d="M5 4h14v16H5zM5 9h14M8 6h.01M11 6h.01" />',
  ac: '<rect x="3" y="5" width="18" height="8" rx="2" /><path d="M7 17h10M9 13v4M15 13v4M12 13v4" />',
  tv: '<rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8M12 18v3" />',
  kitchen: '<path d="M4 20h16M6 20V5h12v15M9 8h6M9 12h6M9 16h2M14 16h1" />',
};

function getAmenityIcon(label) {
  const value = label.toLowerCase();
  const type = value.includes("стол") || value.includes("desk") ? "desk"
    : value.includes("сейф") || value.includes("safe") ? "safe"
    : value.includes("бар") || value.includes("bar") ? "minibar"
    : value.includes("кондиционер") || value.includes("conditioning") ? "ac"
    : value.includes("телевизор") || value === "tv" ? "tv"
    : value.includes("кух") || value.includes("kitchen") ? "kitchen"
    : null;

  return type ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${amenityIcons[type]}</svg>` : "";
}

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
    
    const amenitiesHTML = info.amenities ? info.amenities.map(item => `
      <div style="display: flex; align-items: center; gap: 10px; color: var(--muted);">
        ${getAmenityIcon(item)}
        <span style="font-size: 15px;">${item}</span>
      </div>
    `).join('') : '';

    wrap.innerHTML = `
      <div class="room-detail-head">
        <h1 class="serif" style="margin-top:12px;">${info.name}</h1>
        <p>${info.short}</p>
      </div>
      <div class="container">
  <div class="room-detail-hero">
    <img src="${room.image}" alt="${info.name}" />
    <div class="kicker">${info.size} · ${info.guests}</div>
  </div>
  <div class="split">
          
          <!-- ЛЕВАЯ КОЛОНКА: Описание и иконки -->
          <div>
            <h2 class="serif">${lang === "ru" ? "О номере" : "About the room"}</h2>
            <p class="muted" style="margin-top:16px;font-size:16px;">${info.short}</p>
            <p class="muted" style="margin-top:14px;font-size:15px;">
              ${lang === "ru"
                ? "Каждая деталь в номере продумана для вашего комфорта: премиальные матрасы, звукоизоляция, кондиционер, безопасный сейф, чайная станция и халаты с тапочками."
                : "Every detail is designed for your comfort: premium mattresses, sound insulation, air conditioning, in-room safe, tea station, bathrobes and slippers."}
            </p>
            
            <!-- Сетка удобств -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 40px; padding-top: 40px; border-top: 1px solid var(--border);">
              ${amenitiesHTML}
            </div>
          </div>
          
          <!-- ПРАВАЯ КОЛОНКА: Карточка цены и кнопка -->
          <div class="form-card" style="background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 32px; position: sticky; top: 100px;">
            <h3 class="serif" style="text-align: center; margin-bottom: 24px;">${lang === "ru" ? "Стоимость" : "Rate"}</h3>
            
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 24px; border-bottom: 1px solid var(--border); margin-bottom: 24px;">
              <span class="muted" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
                ${t("rooms.priceFrom")}
              </span>
              <div style="display: flex; align-items: baseline; gap: 8px;">
                <strong style="font-family: var(--font-serif); font-size: 38px; color: var(--accent); line-height: 1;">${price}</strong>
                <span class="muted" style="font-size: 16px;">${t("rooms.currency")}</span>
              </div>
            </div>
            
            <a href="contacts.html" class="btn btn-primary btn-block" style="display: flex; align-items: center; justify-content: center; width: 100%; padding: 14px; font-weight: 600;">
              ${t("nav.book")}
            </a>
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
  const items = Array.from(document.querySelectorAll(".gallery-media-grid .item"));
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
