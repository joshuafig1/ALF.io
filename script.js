/* ═══════════════════════════════════════════════════════════════════
   ART LIFE FOUNDATION — script.js  v2.1
   Self-contained modules, initialised in App.init().
   Strict separation: JS handles logic and data only.
   All visual design is delegated to style.css via classes and
   data-attributes.
   ══════════════════════════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────────────────────────────
   1. UTILITIES — shared helpers used across all modules
──────────────────────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const lerp = (a, b, t) => a + (b - a) * t;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/** Generates an 8-character unique ID */
const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Touch / coarse-pointer detection.
 * Used to skip cursor, parallax, and hover-dependent logic on mobile.
 */
const Device = {
  isTouch: false,
  init() {
    this.isTouch = window.matchMedia('(pointer: coarse)').matches
      || 'ontouchstart' in window
      || navigator.maxTouchPoints > 0;
    if (this.isTouch) document.documentElement.classList.add('is-touch');
  },
};

/** Maps status keys to display labels */
const STATUS_LABELS = {
  available:   'Available',
  sold:        'Sold',
  reserved:    'Reserved',
  unavailable: 'Unavailable',
  promotion:   'On Promotion',
};

/** Maps category keys to display labels */
const CATEGORY_LABELS = {
  painting:     'Painting',
  sculpture:    'Sculpture',
  photography:  'Photography',
  digital:      'Digital Art',
  mixed:        'Mixed Media',
  printmaking:  'Printmaking',
};

/* ────────────────────────────────────────────────────────────────────
   2. PRELOADER — animated entry screen
   Counts from 0 → 100 then fades out.
──────────────────────────────────────────────────────────────────── */
const Preloader = {
  init() {
    const el     = $('#preloader');
    const numEl  = $('#preloader-num');
    const lineEl = $('#preloader-line');
    if (!el || !numEl) return;

    let count = 0;
    const duration  = 1800; // ms
    const interval  = 16;   // ~60 fps
    const steps     = duration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      count = Math.min(count + increment, 100);
      const rounded = Math.floor(count);
      numEl.textContent = rounded;
      if (lineEl) lineEl.style.width = rounded + '%';

      if (count >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          el.classList.add('hidden');
          el.addEventListener('transitionend', () => el.remove(), { once: true });
        }, 300);
      }
    }, interval);
  },
};

/* ────────────────────────────────────────────────────────────────────
   3. SCROLL PROGRESS BAR
   Creates and manages the #scroll-progress element.
──────────────────────────────────────────────────────────────────── */
const ScrollProgress = {
  el: null,
  init() {
    this.el = document.createElement('div');
    this.el.id = 'scroll-progress';
    document.body.prepend(this.el);
    window.addEventListener('scroll', this.update.bind(this), { passive: true });
  },
  update() {
    const scrolled = window.scrollY;
    const total    = document.body.scrollHeight - window.innerHeight;
    const pct      = total > 0 ? (scrolled / total) * 100 : 0;
    if (this.el) this.el.style.width = pct + '%';
  },
};

/* ────────────────────────────────────────────────────────────────────
   4. CUSTOM CURSOR — dot + ring with smooth lerp (desktop only)
   Completely disabled on touch/coarse-pointer devices to prevent
   ghost elements and RAF drain on mobile Safari.
──────────────────────────────────────────────────────────────────── */
const Cursor = {
  dot: null, ring: null, label: null,
  mx: 0, my: 0,
  rx: 0, ry: 0,
  active: false,

  init() {
    // Hard bail on touch devices — also hides #cursor via CSS .is-touch
    if (Device.isTouch || !window.matchMedia('(pointer: fine)').matches) return;

    this.dot   = $('#cursor-dot');
    this.ring  = $('#cursor-ring');
    this.label = $('#cursor-label');
    if (!this.dot) return;
    this.active = true;

    document.addEventListener('mousemove', (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
      this.dot.style.left = this.mx + 'px';
      this.dot.style.top  = this.my + 'px';
    });

    document.addEventListener('mouseenter', (e) => {
      const t = e.target;
      if (t.closest('.art-card')) {
        document.body.classList.add('cursor-hover');
        if (this.label) this.label.textContent = 'View';
      } else if (t.closest('.magnetic')) {
        document.body.classList.add('cursor-hover');
        if (this.label) this.label.textContent = '';
      }
    }, true);

    document.addEventListener('mouseleave', (e) => {
      if (e.target.closest?.('.magnetic') || e.target.closest?.('.art-card')) {
        document.body.classList.remove('cursor-hover');
      }
    }, true);

    this.animate();
  },

  animate() {
    if (!this.active) return;
    this.rx = lerp(this.rx, this.mx, 0.12);
    this.ry = lerp(this.ry, this.my, 0.12);
    if (this.ring) {
      this.ring.style.left = this.rx + 'px';
      this.ring.style.top  = this.ry + 'px';
    }
    if (this.label) {
      this.label.style.left = this.rx + 'px';
      this.label.style.top  = this.ry + 'px';
    }
    requestAnimationFrame(this.animate.bind(this));
  },
};

/* ────────────────────────────────────────────────────────────────────
   5. NAVIGATION — sticky header, glassmorphism mobile menu, active links
──────────────────────────────────────────────────────────────────── */
const Nav = {
  header:           null,
  menuToggle:       null,
  mobileMenu:       null,
  navLinks:         null,
  mobileLinks:      null,
  mobileThemeBtn:   null,
  mobileThemeLabel: null,
  isOpen:           false,

  init() {
    this.header           = $('#site-header');
    this.menuToggle       = $('#menu-toggle');
    this.mobileMenu       = $('#mobile-menu');
    this.navLinks         = $$('.nav-link');
    this.mobileLinks      = $$('.mobile-link');
    this.mobileThemeBtn   = $('#mobile-theme-toggle');
    this.mobileThemeLabel = $('.mobile-theme-label');

    window.addEventListener('scroll', debounce(this.onScroll.bind(this), 10), { passive: true });
    this.onScroll();

    this.menuToggle?.addEventListener('click', () => this.toggleMobile());

    // Close on link tap — also handle touch events explicitly
    this.mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        this.closeMobile();
      });
      // Ripple-like visual on touch
      link.addEventListener('touchstart', () => {
        link.style.opacity = '0.7';
      }, { passive: true });
      link.addEventListener('touchend', () => {
        link.style.opacity = '';
      }, { passive: true });
    });

    // Mobile theme toggle mirrors main toggle
    this.mobileThemeBtn?.addEventListener('click', () => {
      ThemeToggle.toggle();
      this._syncMobileThemeLabel();
    });

    // Close on overlay tap (outside nav)
    this.mobileMenu?.addEventListener('click', (e) => {
      if (e.target === this.mobileMenu || e.target.classList.contains('mobile-menu-glass')) {
        this.closeMobile();
      }
    });

    // ESC key closes menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.closeMobile();
    });

    window.addEventListener('scroll', debounce(this.updateActive.bind(this), 80), { passive: true });
    this.updateActive();
    this._syncMobileThemeLabel();
  },

  onScroll() {
    this.header?.classList.toggle('scrolled', window.scrollY > 30);
  },

  toggleMobile() {
    this.isOpen ? this.closeMobile() : this.openMobile();
  },

  openMobile() {
    this.isOpen = true;
    this.mobileMenu?.classList.add('open');
    this.menuToggle?.setAttribute('aria-expanded', 'true');
    this.mobileMenu?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Focus trap — move focus into menu
    setTimeout(() => this.mobileLinks[0]?.focus(), 350);
  },

  closeMobile() {
    this.isOpen = false;
    this.mobileMenu?.classList.remove('open');
    this.menuToggle?.setAttribute('aria-expanded', 'false');
    this.mobileMenu?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.menuToggle?.focus();
  },

  updateActive() {
    const headerH = this.header ? this.header.getBoundingClientRect().height : 72;
    const scrollY = window.scrollY + headerH + 20;
    let current   = '';
    $$('section[id]').forEach(s => { if (s.offsetTop <= scrollY) current = s.id; });
    this.navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  },

  _syncMobileThemeLabel() {
    if (!this.mobileThemeLabel) return;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    this.mobileThemeLabel.textContent = isDark ? 'Dark Mode' : 'Light Mode';
  },
};

/* ────────────────────────────────────────────────────────────────────
   6. THEME TOGGLE — Dark / Light mode
   Toggles data-theme on <html> and persists in localStorage.
   Key: "alf_theme"
──────────────────────────────────────────────────────────────────── */
const ThemeToggle = {
  btn:         null,
  htmlEl:      null,
  STORAGE_KEY: 'alf_theme',

  init() {
    this.btn    = $('#theme-toggle');
    this.htmlEl = document.documentElement;
    if (!this.btn) return;

    // Restore saved preference or respect OS preference
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      this.htmlEl.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      this.htmlEl.setAttribute('data-theme', 'light');
    }

    this.btn.addEventListener('click', () => this.toggle());
  },

  toggle() {
    const current = this.htmlEl.getAttribute('data-theme') || 'dark';
    const next    = current === 'dark' ? 'light' : 'dark';
    this.htmlEl.setAttribute('data-theme', next);
    localStorage.setItem(this.STORAGE_KEY, next);
    this.btn.setAttribute('aria-label',
      next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    // Sync mobile menu theme label if menu exists
    Nav._syncMobileThemeLabel?.();
  },
};

/* ────────────────────────────────────────────────────────────────────
   7. SCROLL REVEAL ANIMATIONS
   IntersectionObserver adds CSS classes that trigger transitions.
──────────────────────────────────────────────────────────────────── */
const Animations = {
  observer: null,

  init() {
    // Split .split-text elements into individually animated words
    $$('.split-text').forEach(el => this.splitWords(el));

    const options = { threshold: 0.15, rootMargin: '0px 0px -60px 0px' };
    this.observer = new IntersectionObserver(this.onIntersect.bind(this), options);
    $$('.reveal-fade, .reveal-scale, .split-text').forEach(el => this.observer.observe(el));
  },

  splitWords(el) {
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const words = node.textContent.split(/(\s+)/);
        const frag  = document.createDocumentFragment();
        words.forEach(word => {
          if (/^\s+$/.test(word)) {
            frag.appendChild(document.createTextNode(word));
          } else if (word) {
            const wrap  = document.createElement('span');
            wrap.className = 'word-wrap';
            const inner = document.createElement('span');
            inner.className = 'word';
            inner.textContent = word;
            wrap.appendChild(inner);
            frag.appendChild(wrap);
          }
        });
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        [...node.childNodes].forEach(walk);
      }
    };
    [...el.childNodes].forEach(walk);
  },

  onIntersect(entries) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const delay = parseFloat(el.dataset.delay || 0) * 1000;

      if (el.classList.contains('split-text')) {
        $$('.word', el).forEach((w, i) => {
          setTimeout(() => w.classList.add('in-view'), delay + i * 60);
        });
      } else {
        setTimeout(() => el.classList.add('in-view'), delay);
      }
      this.observer.unobserve(el);
    });
  },
};

/* ────────────────────────────────────────────────────────────────────
   8. ANIMATED COUNTERS (statistics section)
──────────────────────────────────────────────────────────────────── */
const Counters = {
  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        $$('.stat-number', entry.target).forEach(el => this.animate(el));
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    const statsEl = $('#about-stats');
    if (statsEl) observer.observe(statsEl);
  },

  animate(el) {
    const target   = parseInt(el.dataset.target || '0');
    const duration = 1800;
    const start    = performance.now();

    const step = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out quart
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  },
};

/* ────────────────────────────────────────────────────────────────────
   9. HERO PARALLAX — artwork follows cursor with lerp (desktop only)
──────────────────────────────────────────────────────────────────── */
const HeroParallax = {
  target: null,
  mx: 0, my: 0,
  cx: 0, cy: 0,

  init() {
    // Skip on touch — no cursor, and RAF causes battery drain
    if (Device.isTouch) return;
    this.target = $('#hero-artwork');
    if (!this.target) return;

    document.addEventListener('mousemove', (e) => {
      this.mx = (e.clientX / window.innerWidth  - 0.5) * 18;
      this.my = (e.clientY / window.innerHeight - 0.5) * 10;
    });
    this.animate();
  },

  animate() {
    this.cx = lerp(this.cx, this.mx, 0.06);
    this.cy = lerp(this.cy, this.my, 0.06);
    if (this.target) {
      this.target.style.transform = `translate(${this.cx}px, ${this.cy}px)`;
    }
    requestAnimationFrame(this.animate.bind(this));
  },
};

/* ────────────────────────────────────────────────────────────────────
   10. GALLERY DATA — CRUD with localStorage
   Key: "alf_gallery_data"

   Artwork model:
   { id, title, artist, price, category, status, year,
     dimensions, description, image, featured, createdAt }
──────────────────────────────────────────────────────────────────── */
const GalleryData = {
  STORAGE_KEY: 'alf_gallery_data',

  /** Loads artworks from localStorage. Returns 3 placeholders if empty. */
  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return this.defaults();
  },

  /** Persists the artwork array to localStorage */
  save(artworks) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(artworks));
    } catch (e) {
      console.warn('ALF: Failed to write to localStorage', e);
    }
  },

  /** Adds a new artwork and returns the updated array */
  add(artworks, data) {
    const artwork = { ...data, id: uid(), createdAt: Date.now() };
    const updated = [artwork, ...artworks];
    this.save(updated);
    return updated;
  },

  /** Updates an existing artwork by ID */
  update(artworks, id, data) {
    const updated = artworks.map(a => a.id === id ? { ...a, ...data } : a);
    this.save(updated);
    return updated;
  },

  /** Removes an artwork by ID */
  remove(artworks, id) {
    const updated = artworks.filter(a => a.id !== id);
    this.save(updated);
    return updated;
  },

  /** Three default placeholder artworks shown on the first visit */
  defaults() {
    return [
      {
        id:          'default-1',
        title:       'Luminescence in Red',
        artist:      'Ana Cavalcanti',
        price:       '18,500',
        category:    'painting',
        status:      'available',
        year:        '2023',
        dimensions:  '47 × 35 in',
        description: 'A large-scale canvas that explores the tension between light and shadow through dense layers of crimson pigment. A meditation on presence and absence.',
        image:       'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=600&q=80',
        featured:    true,
        createdAt:   Date.now() - 3000,
      },
      {
        id:          'default-2',
        title:       'Geometry of the Soul',
        artist:      'Marco Veltri',
        price:       '12,200',
        category:    'digital',
        status:      'available',
        year:        '2024',
        dimensions:  '32 × 32 in (print)',
        description: 'A digital work that translates mathematical structures into visual emotion. Printed on aluminium in a unique edition.',
        image:       'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=600&q=80',
        featured:    false,
        createdAt:   Date.now() - 2000,
      },
      {
        id:          'default-3',
        title:       'Inner Landscape III',
        artist:      'Sofia Brandt',
        price:       '9,800',
        category:    'photography',
        status:      'reserved',
        year:        '2022',
        dimensions:  '24 × 36 in',
        description: 'A photographic series capturing the memory of landscapes that never existed. Fine-art print on cotton rag paper.',
        image:       'https://images.unsplash.com/photo-1531913764164-f85c52e6e654?w=600&q=80',
        featured:    false,
        createdAt:   Date.now() - 1000,
      },
    ];
  },
};

/* ────────────────────────────────────────────────────────────────────
   11. GALLERY — dynamic card rendering
──────────────────────────────────────────────────────────────────── */
const Gallery = {
  artworks:      [],
  filtered:      [],
  currentFilter: 'all',
  PAGE_SIZE:     9,
  page:          1,
  grid:          null,
  emptyEl:       null,
  moreWrap:      null,
  moreBtn:       null,

  init() {
    this.grid     = $('#art-grid');
    this.emptyEl  = $('#gallery-empty');
    this.moreWrap = $('#gallery-more');
    this.moreBtn  = $('#load-more-btn');
    if (!this.grid) return;

    this.artworks = GalleryData.load();
    this.applyFilter('all');

    // Category filter buttons
    $$('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.page = 1;
        this.applyFilter(btn.dataset.filter);
      });
    });

    // Load more button
    this.moreBtn?.addEventListener('click', () => {
      this.page++;
      this.renderCards();
    });
  },

  applyFilter(filter) {
    this.currentFilter = filter;
    this.filtered = filter === 'all'
      ? [...this.artworks]
      : this.artworks.filter(a => a.category === filter);
    this.renderCards(true);
  },

  renderCards(reset = false) {
    if (reset) {
      $$('.art-card', this.grid).forEach(c => c.remove());
      this.page = 1;
    }

    const end   = this.page * this.PAGE_SIZE;
    const slice = this.filtered.slice(0, end);

    if (this.filtered.length === 0) {
      if (this.emptyEl) {
        this.emptyEl.style.display = '';
        this.emptyEl.innerHTML = '<p>No works found for this category.</p>';
      }
      if (this.moreWrap) this.moreWrap.style.display = 'none';
      return;
    }

    if (this.emptyEl) this.emptyEl.style.display = 'none';

    const existingIds = new Set($$('.art-card', this.grid).map(c => c.dataset.id));

    slice.forEach((artwork, i) => {
      if (existingIds.has(artwork.id)) return;
      const card = this.createCard(artwork);
      card.style.animationDelay = (i % this.PAGE_SIZE) * 60 + 'ms';
      this.grid.appendChild(card);
    });

    if (this.moreWrap) {
      this.moreWrap.style.display = this.filtered.length > end ? 'block' : 'none';
    }
  },

  createCard(artwork) {
    const card = document.createElement('article');
    card.className       = 'art-card magnetic';
    card.role            = 'listitem';
    card.dataset.id      = artwork.id;
    card.dataset.category = artwork.category;

    const statusLabel   = STATUS_LABELS[artwork.status]   || artwork.status;
    const categoryLabel = CATEGORY_LABELS[artwork.category] || artwork.category;

    card.innerHTML = `
      <div class="art-card-img-wrap">
        <img
          src="${artwork.image || 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80'}"
          alt="${artwork.title} — ${artwork.artist}"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80'"
        />
        <div class="art-card-overlay">
          <span class="art-card-view">View Work</span>
        </div>
        <div class="art-card-status">
          <span class="status-badge status-${artwork.status}">${statusLabel}</span>
        </div>
      </div>
      <div class="art-card-info">
        <h3 class="art-card-title">${artwork.title}</h3>
        <p class="art-card-artist">${artwork.artist}${artwork.year ? ' · ' + artwork.year : ''}</p>
        <div class="art-card-footer">
          <span class="art-card-price">$${artwork.price}</span>
          <span class="art-card-category">${categoryLabel}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => ProductModal.open(artwork));
    return card;
  },

  /** Reloads the gallery after data changes */
  reload() {
    this.artworks = GalleryData.load();
    this.applyFilter(this.currentFilter);
    FeaturedSection.render(this.artworks);
    HeroManager.render(this.artworks);
  },
};

/* ────────────────────────────────────────────────────────────────────
   12. FEATURED SECTION — renders the artwork marked as featured
   Respects alf_wotw_id override from Admin Featured tab.
──────────────────────────────────────────────────────────────────── */
const FeaturedSection = {
  WOTW_KEY: 'alf_wotw_id',

  render(artworks) {
    // Check for admin-selected Work of the Week override
    const wotwId = localStorage.getItem(this.WOTW_KEY);
    let artwork;
    if (wotwId) {
      artwork = artworks.find(a => a.id === wotwId);
    }
    if (!artwork) artwork = artworks.find(a => a.featured) || artworks[0];
    if (!artwork) return;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    const imgEl = $('#featured-img');
    if (imgEl) {
      imgEl.src = artwork.image || '';
      imgEl.alt = `${artwork.title} — ${artwork.artist}`;
    }
    setEl('featured-title',      artwork.title);
    setEl('featured-artist',     artwork.artist);
    setEl('featured-technique',  CATEGORY_LABELS[artwork.category] || artwork.category);
    setEl('featured-dimensions', artwork.dimensions || '—');

    const descEl = $('#featured-desc');
    if (descEl && artwork.description) {
      descEl.textContent = artwork.description.length > 180
        ? artwork.description.slice(0, 180) + '…'
        : artwork.description;
    }

    const ctaBtn = $('#featured-cta');
    const newBtn = ctaBtn?.cloneNode(true);
    if (ctaBtn && newBtn) {
      ctaBtn.replaceWith(newBtn);
      newBtn.addEventListener('click', () => ProductModal.open(artwork));
    }
  },
};

/* ────────────────────────────────────────────────────────────────────
   12b. HERO MANAGER — updates hero banner from admin selection
   Reads alf_hero_id from localStorage, updates hero img + caption.
──────────────────────────────────────────────────────────────────── */
const HeroManager = {
  HERO_KEY: 'alf_hero_id',

  render(artworks) {
    const heroId = localStorage.getItem(this.HERO_KEY);
    if (!heroId) return; // No override, keep default HTML

    const artwork = artworks.find(a => a.id === heroId);
    if (!artwork) return;

    const heroImg = $('#hero-artwork img');
    if (heroImg) {
      heroImg.src = artwork.image || heroImg.src;
      heroImg.alt = `${artwork.title} — ${artwork.artist}`;
    }
    const caption = $('#hero-artwork .caption-title');
    if (caption) caption.textContent = artwork.title;
  },
};


const ProductModal = {
  modal:      null,
  closeBtn:   null,
  overlay:    null,
  inquireBtn: null,

  init() {
    this.modal    = $('#product-modal');
    this.closeBtn = $('#product-modal-close');
    this.overlay  = $('#product-modal-overlay');
    if (!this.modal) return;

    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click',  () => this.close());

    this.inquireBtn = $('#product-modal-inquire');
    this.inquireBtn?.addEventListener('click', () => {
      const titleEl   = $('#product-modal-title');
      const subjectEl = $('#field-subject');
      if (subjectEl && titleEl) {
        subjectEl.value = `Acquisition inquiry: ${titleEl.textContent}`;
      }
      this.close();
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.hidden) this.close();
    });
  },

  open(artwork) {
    if (!this.modal) return;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    const imgEl = $('#product-modal-img');
    if (imgEl) { imgEl.src = artwork.image || ''; imgEl.alt = artwork.title; }

    setEl('product-modal-category', CATEGORY_LABELS[artwork.category] || artwork.category);
    setEl('product-modal-title',    artwork.title);
    setEl('product-modal-artist',   `${artwork.artist}${artwork.year ? ' · ' + artwork.year : ''}`);
    setEl('product-modal-desc',     artwork.description || '—');
    setEl('product-modal-price',    `$${artwork.price}`);

    const statusEl = $('#product-modal-status');
    if (statusEl) {
      statusEl.textContent = STATUS_LABELS[artwork.status] || artwork.status;
      statusEl.className   = `meta-value status-badge status-${artwork.status}`;
    }

    this.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    this.closeBtn?.focus();
  },

  close() {
    if (!this.modal) return;
    this.modal.hidden = true;
    document.body.style.overflow = '';
  },
};

/* ────────────────────────────────────────────────────────────────────
   14. PASSWORD VISIBILITY TOGGLE — eye icon
   Switches input type="password" ↔ type="text" and swaps the icons.
──────────────────────────────────────────────────────────────────── */
const PasswordToggle = {
  init() {
    const toggleBtn = $('#toggle-password');
    const passInput = $('#admin-pass');
    if (!toggleBtn || !passInput) return;

    const iconOpen   = $('.eye-open',   toggleBtn);
    const iconClosed = $('.eye-closed', toggleBtn);

    toggleBtn.addEventListener('click', () => {
      const isPassword = passInput.type === 'password';

      passInput.type = isPassword ? 'text' : 'password';

      if (iconOpen)   iconOpen.style.display   = isPassword ? 'none'  : 'block';
      if (iconClosed) iconClosed.style.display = isPassword ? 'block' : 'none';

      toggleBtn.setAttribute('aria-pressed', String(isPassword));
      toggleBtn.setAttribute('aria-label',   isPassword ? 'Hide password' : 'Show password');

      passInput.focus();
    });
  },
};

/* ────────────────────────────────────────────────────────────────────
   15. ADMIN LOGIN — credential validation
   Credentials: ALFADM / ALFADMPROJECT
──────────────────────────────────────────────────────────────────── */
const AdminLogin = {
  CREDENTIALS: { user: 'ALFADM', pass: 'ALFADMPROJECT' },

  modal:    null,
  overlay:  null,
  closeBtn: null,
  form:     null,
  errorEl:  null,
  trigger:  null,

  init() {
    this.modal    = $('#admin-modal');
    this.overlay  = $('#admin-modal-overlay');
    this.closeBtn = $('#admin-modal-close');
    this.form     = $('#login-form');
    this.errorEl  = this.form ? $('.login-error', this.form) : null;
    this.trigger  = $('#admin-trigger');

    this.trigger?.addEventListener('click',  () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click',  () => this.close());
    this.form?.addEventListener('submit',    (e) => this.handleSubmit(e));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && !this.modal.hidden) this.close();
    });
  },

  open() {
    if (!this.modal) return;
    this.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('#admin-user')?.focus();
    if (this.errorEl) this.errorEl.textContent = '';
  },

  close() {
    if (!this.modal) return;
    this.modal.hidden = true;
    document.body.style.overflow = '';
    this.form?.reset();
    // Reset eye icon state
    const passInput = $('#admin-pass');
    if (passInput) passInput.type = 'password';
    const toggleBtn = $('#toggle-password');
    if (toggleBtn) {
      const iconOpen   = $('.eye-open',   toggleBtn);
      const iconClosed = $('.eye-closed', toggleBtn);
      if (iconOpen)   iconOpen.style.display   = 'block';
      if (iconClosed) iconClosed.style.display = 'none';
      toggleBtn.setAttribute('aria-pressed', 'false');
      toggleBtn.setAttribute('aria-label',   'Show password');
    }
  },

  handleSubmit(e) {
    e.preventDefault();
    const user = $('#admin-user')?.value?.trim();
    const pass = $('#admin-pass')?.value;

    if (user === this.CREDENTIALS.user && pass === this.CREDENTIALS.pass) {
      this.close();
      AdminPanel.open();
    } else {
      if (this.errorEl) {
        this.errorEl.textContent = 'Incorrect username or password.';
        setTimeout(() => { if (this.errorEl) this.errorEl.textContent = ''; }, 3000);
      }
      $('#admin-pass')?.focus();
    }
  },
};

/* ────────────────────────────────────────────────────────────────────
   16. ADMIN DASHBOARD PANEL
   Tab 1: Add / Edit artwork
   Tab 2: Manage artworks (edit, delete)
   Data persisted via GalleryData (localStorage: "alf_gallery_data")
──────────────────────────────────────────────────────────────────── */
const AdminPanel = {
  panel:        null,
  overlay:      null,
  logoutBtn:    null,
  tabs:         null,
  form:         null,
  artList:      null,
  countBadge:   null,
  submitBtn:    null,
  cancelBtn:    null,
  feedbackEl:   null,
  emptyManage:  null,
  imagePreview: null,
  imageInput:   null,
  dropzone:     null,
  currentImage: '', // selected image (data URL or external URL)

  init() {
    this.panel        = $('#admin-panel');
    this.overlay      = $('#admin-panel-overlay');
    this.logoutBtn    = $('#admin-logout');
    this.tabs         = $$('.admin-tab');
    this.form         = $('#artwork-form');
    this.artList      = $('#admin-art-list');
    this.countBadge   = $('#admin-count-badge');
    this.submitBtn    = $('#artwork-submit');
    this.cancelBtn    = $('#artwork-cancel');
    this.feedbackEl   = this.form ? $('.form-feedback', this.form) : null;
    this.emptyManage  = $('#manage-empty');
    this.imagePreview = $('#upload-preview');
    this.imageInput   = $('#image-input');
    this.dropzone     = $('#upload-dropzone');

    this.logoutBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click',   () => this.close());

    this.tabs.forEach(tab => tab.addEventListener('click', () => this.switchTab(tab.dataset.tab)));

    this.form?.addEventListener('submit', (e) => this.handleArtworkSubmit(e));
    this.cancelBtn?.addEventListener('click', () => this.resetForm());

    // File upload handlers
    this.imageInput?.addEventListener('change', (e) => this.handleFileUpload(e));
    this.dropzone?.addEventListener('click', () => this.imageInput?.click());
    this.dropzone?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') this.imageInput?.click();
    });
    this.dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.classList.add('drag-over');
    });
    this.dropzone?.addEventListener('dragleave', () => this.dropzone.classList.remove('drag-over'));
    this.dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) this.processFile(file);
    });
  },

  open() {
    if (!this.panel) return;
    this.panel.hidden = false;
    document.body.style.overflow = 'hidden';
    this.refreshArtList();
    this.switchTab('add');
  },

  close() {
    if (!this.panel) return;
    this.panel.hidden = true;
    document.body.style.overflow = '';
    this.resetForm();
    Gallery.reload();
  },

  switchTab(tabName) {
    this.tabs.forEach(t => {
      const active = t.dataset.tab === tabName;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    $$('.admin-tab-content').forEach(content => {
      const active = content.id === `tab-${tabName}`;
      content.classList.toggle('active', active);
      content.hidden = !active;
    });
    if (tabName === 'manage')   this.refreshArtList();
    if (tabName === 'featured') AdminFeatured.populate();
    if (tabName === 'beyond')   { AdminBeyondBorders.refreshList(); AdminBeyondBorders.switchSubTab('bb-add'); }
  },

  handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) this.processFile(file);
  },

  processFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      this.showFeedback('Image is too large. Maximum size is 5 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentImage = e.target.result;
      this.showPreview(this.currentImage);
    };
    reader.readAsDataURL(file);
  },

  showPreview(src) {
    const placeholder = $('#upload-placeholder');
    if (this.imagePreview) {
      this.imagePreview.src    = src;
      this.imagePreview.hidden = false;
    }
    if (placeholder) placeholder.style.display = 'none';
  },

  handleArtworkSubmit(e) {
    e.preventDefault();
    const id       = $('#edit-id')?.value;
    const title    = $('#art-title')?.value?.trim();
    const artist   = $('#art-artist')?.value?.trim();
    const price    = $('#art-price')?.value?.trim();
    const category = $('#art-category')?.value;

    // Basic validation
    if (!title || !artist || !price || !category) {
      this.showFeedback('Please fill in all required fields (*).', 'error');
      return;
    }

    // Image priority: local upload > external URL > placeholder
    const urlInput = $('#art-image-url')?.value?.trim();
    const image    = this.currentImage
      || urlInput
      || 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80';

    const data = {
      title,
      artist,
      price,
      category,
      status:      $('#art-status')?.value || 'available',
      year:        $('#art-year')?.value?.trim()       || '',
      dimensions:  $('#art-dimensions')?.value?.trim() || '',
      description: $('#art-desc')?.value?.trim()       || '',
      image,
      featured:    $('#art-featured')?.checked || false,
    };

    let artworks = GalleryData.load();

    if (id) {
      artworks = GalleryData.update(artworks, id, data);
      this.showFeedback('Artwork updated successfully.', 'success');
    } else {
      artworks = GalleryData.add(artworks, data);
      this.showFeedback('Artwork published successfully.', 'success');
    }

    this.resetForm();
    this.refreshArtList();
    this.updateBadge(artworks.length);
  },

  resetForm() {
    if (!this.form) return;
    this.form.reset();
    if ($('#edit-id')) $('#edit-id').value = '';
    this.currentImage = '';

    if (this.submitBtn) $('span', this.submitBtn).textContent = 'Publish Artwork';
    if (this.cancelBtn) this.cancelBtn.hidden = true;

    if (this.imagePreview) { this.imagePreview.src = ''; this.imagePreview.hidden = true; }
    const placeholder = $('#upload-placeholder');
    if (placeholder) placeholder.style.display = '';

    if (this.feedbackEl) this.feedbackEl.textContent = '';
  },

  populateForm(artwork) {
    if ($('#edit-id'))        $('#edit-id').value        = artwork.id;
    if ($('#art-title'))      $('#art-title').value      = artwork.title;
    if ($('#art-artist'))     $('#art-artist').value     = artwork.artist;
    if ($('#art-price'))      $('#art-price').value      = artwork.price;
    if ($('#art-category'))   $('#art-category').value   = artwork.category;
    if ($('#art-status'))     $('#art-status').value     = artwork.status;
    if ($('#art-year'))       $('#art-year').value       = artwork.year       || '';
    if ($('#art-dimensions')) $('#art-dimensions').value = artwork.dimensions || '';
    if ($('#art-desc'))       $('#art-desc').value       = artwork.description || '';
    if ($('#art-featured'))   $('#art-featured').checked = artwork.featured   || false;

    if (artwork.image) {
      this.currentImage = artwork.image;
      this.showPreview(artwork.image);
      const urlInput = $('#art-image-url');
      if (urlInput && !artwork.image.startsWith('data:')) urlInput.value = artwork.image;
    }

    if (this.submitBtn) $('span', this.submitBtn).textContent = 'Save Changes';
    if (this.cancelBtn) this.cancelBtn.hidden = false;

    this.switchTab('add');
    this.panel?.querySelector('#tab-add')?.scrollIntoView({ behavior: 'smooth' });
  },

  refreshArtList() {
    if (!this.artList) return;
    const artworks = GalleryData.load();
    this.updateBadge(artworks.length);

    $$('.admin-art-item', this.artList).forEach(el => el.remove());

    if (artworks.length === 0) {
      if (this.emptyManage) this.emptyManage.style.display = '';
      return;
    }
    if (this.emptyManage) this.emptyManage.style.display = 'none';

    artworks.forEach(artwork => {
      const item = document.createElement('div');
      item.className  = 'admin-art-item';
      item.role       = 'listitem';
      item.dataset.id = artwork.id;

      item.innerHTML = `
        <img
          class="admin-art-thumb"
          src="${artwork.image || ''}"
          alt="${artwork.title}"
          loading="lazy"
          onerror="this.style.background='var(--bg-3)';this.src=''"
        />
        <div class="admin-art-info">
          <p class="admin-art-title">${artwork.title}</p>
          <p class="admin-art-meta">
            ${artwork.artist}
            · ${CATEGORY_LABELS[artwork.category] || artwork.category}
            · <span class="status-badge status-${artwork.status}">${STATUS_LABELS[artwork.status] || artwork.status}</span>
          </p>
        </div>
        <div class="admin-art-actions">
          <button class="btn-edit"   data-id="${artwork.id}" aria-label="Edit ${artwork.title}">Edit</button>
          <button class="btn-delete" data-id="${artwork.id}" aria-label="Delete ${artwork.title}">Delete</button>
        </div>
      `;

      item.querySelector('.btn-edit').addEventListener('click', () => {
        const found = GalleryData.load().find(a => a.id === artwork.id);
        if (found) this.populateForm(found);
      });

      item.querySelector('.btn-delete').addEventListener('click', () => {
        if (!confirm(`Delete "${artwork.title}"? This action cannot be undone.`)) return;
        let artworks = GalleryData.load();
        artworks = GalleryData.remove(artworks, artwork.id);
        item.remove();
        this.updateBadge(artworks.length);
        if (artworks.length === 0 && this.emptyManage) {
          this.emptyManage.style.display = '';
        }
      });

      this.artList.appendChild(item);
    });
  },

  updateBadge(count) {
    if (this.countBadge) this.countBadge.textContent = count;
  },

  showFeedback(msg, type = '') {
    if (!this.feedbackEl) return;
    this.feedbackEl.textContent = msg;
    this.feedbackEl.className   = `form-feedback ${type}`;
    setTimeout(() => {
      if (this.feedbackEl) {
        this.feedbackEl.textContent = '';
        this.feedbackEl.className   = 'form-feedback';
      }
    }, 4000);
  },
};

/* ────────────────────────────────────────────────────────────────────
   17. CONTACT FORM — validation and simulated submission
──────────────────────────────────────────────────────────────────── */
const ContactForm = {
  init() {
    const form = $('#contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name     = $('#field-name')?.value?.trim();
      const email    = $('#field-email')?.value?.trim();
      const message  = $('#field-message')?.value?.trim();
      const feedback = $('.form-feedback', form);

      if (!name || !email || !message) {
        if (feedback) {
          feedback.textContent = 'Please fill in all required fields.';
          feedback.className   = 'form-feedback error';
        }
        return;
      }

      const submitBtn = $('[type="submit"]', form);
      if (submitBtn) submitBtn.disabled = true;

      // Simulated send (no backend)
      setTimeout(() => {
        form.reset();
        if (feedback) {
          feedback.textContent = 'Message sent successfully. We will be in touch shortly.';
          feedback.className   = 'form-feedback success';
        }
        if (submitBtn) submitBtn.disabled = false;
        setTimeout(() => {
          if (feedback) {
            feedback.textContent = '';
            feedback.className   = 'form-feedback';
          }
        }, 5000);
      }, 1000);
    });
  },
};

/* ────────────────────────────────────────────────────────────────────
   18. SMOOTH SCROLL — anchor links with dynamic header offset
   Reads the actual rendered header height (includes safe-area-inset-top)
   so the section is never hidden under the nav on any device.
──────────────────────────────────────────────────────────────────── */
const SmoothScroll = {
  init() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (!target) return;

      // Use actual rendered height — respects safe-area-inset-top on iOS
      const headerEl = $('#site-header');
      const headerH  = headerEl ? headerEl.getBoundingClientRect().height : 72;
      const top      = target.getBoundingClientRect().top + window.scrollY - headerH - 8;

      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      Nav.closeMobile();
    });
  },
};

/* ────────────────────────────────────────────────────────────────────
   19a. ART BEYOND BORDERS — 10 community artworks with direct-buy
   Prices pre-assigned in $1,500–$3,000 USD range.
──────────────────────────────────────────────────────────────────── */
const BEYOND_BORDERS_DATA = [
  {
    id: 'bb-01',
    title: 'Roots of Hope',
    artist: 'Emmanuel Osei',
    price: '2,100',
    year: '2024',
    dimensions: '30 × 40 in',
    description: 'A vibrant canvas celebrating resilience and the beauty found in shared humanity. Rich ochres and earthy tones evoke the warmth of communal life.',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80',
  },
  {
    id: 'bb-02',
    title: 'Light Across the Valley',
    artist: 'Amara Diallo',
    price: '1,750',
    year: '2023',
    dimensions: '24 × 36 in',
    description: 'Golden morning light floods a landscape shaped by generations of hands. A meditation on persistence and dawn.',
    image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80',
  },
  {
    id: 'bb-03',
    title: 'Gathering Season',
    artist: 'Sofia Batista',
    price: '2,450',
    year: '2024',
    dimensions: '36 × 24 in',
    description: 'Community depicted at its most elemental — the gathering, the sharing, the quiet strength of togetherness rendered in bold, gestural brushwork.',
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80',
  },
  {
    id: 'bb-04',
    title: 'The Bridge Between',
    artist: 'Marcus Anane',
    price: '1,950',
    year: '2023',
    dimensions: '28 × 28 in',
    description: 'A conceptual landscape where two worlds meet across water. Translucent layers of acrylic build a sense of crossing and connection.',
    image: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=600&q=80',
  },
  {
    id: 'bb-05',
    title: 'Sown in Faith',
    artist: 'Leila Mensah',
    price: '2,800',
    year: '2024',
    dimensions: '40 × 30 in',
    description: 'Hands in fertile soil. A quiet testament to the labour of those who plant without certainty of the harvest, trusting in what cannot yet be seen.',
    image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=600&q=80',
  },
  {
    id: 'bb-06',
    title: 'Children of the Sun',
    artist: 'Kojo Asante',
    price: '1,600',
    year: '2023',
    dimensions: '20 × 30 in',
    description: 'Jubilant forms in warm cadmium and sienna. A celebration of childhood, freedom, and the irreplaceable joy that art exists to honour.',
    image: 'https://images.unsplash.com/photo-1531913764164-f85c52e6e654?w=600&q=80',
  },
  {
    id: 'bb-07',
    title: 'River Song',
    artist: 'Nadia Ferreira',
    price: '2,300',
    year: '2024',
    dimensions: '32 × 20 in',
    description: 'Water as memory, as journey, as life. Deep cobalt and turquoise undulate across the canvas in a rhythmic visual hymn to movement and survival.',
    image: 'https://images.unsplash.com/photo-1549887552-cb1071d3e5ca?w=600&q=80',
  },
  {
    id: 'bb-08',
    title: 'The Red Horizon',
    artist: 'Kwame Boateng',
    price: '2,950',
    year: '2024',
    dimensions: '48 × 24 in',
    description: 'A panoramic canvas of fire and rust. The horizon becomes a boundary between what was and what is being built — raw, urgent, and full of intent.',
    image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=600&q=80',
  },
  {
    id: 'bb-09',
    title: 'Quiet Dignity',
    artist: 'Isabelle Traoré',
    price: '1,850',
    year: '2023',
    dimensions: '24 × 24 in',
    description: 'A portrait study — not of fame or power, but of the quiet dignity worn by those who carry much and ask for little. A tribute to the unseen.',
    image: 'https://images.unsplash.com/photo-1593258368830-92e66db8a7ce?w=600&q=80',
  },
  {
    id: 'bb-10',
    title: 'New Covenant',
    artist: 'David Nkrumah',
    price: '3,000',
    year: '2025',
    dimensions: '40 × 40 in',
    description: 'A large-format canvas exploring the covenant between the human and the divine. Layered gold leaf and deep cerulean converge into a luminous centre.',
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80',
  },
];

/* ────────────────────────────────────────────────────────────────────
   19a. BEYOND BORDERS DATA — localStorage CRUD
   Key: "alf_bb_data". Falls back to BEYOND_BORDERS_DATA defaults.
──────────────────────────────────────────────────────────────────── */
const BeyondBordersData = {
  STORAGE_KEY: 'alf_bb_data',

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return BEYOND_BORDERS_DATA.map(a => ({ ...a, status: a.status || 'available' }));
  },

  save(items) {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items)); }
    catch (e) { console.warn('ALF-BB: localStorage write failed', e); }
  },

  add(items, data) {
    const item = { ...data, id: 'bb-' + uid(), createdAt: Date.now() };
    const updated = [item, ...items];
    this.save(updated);
    return updated;
  },

  update(items, id, data) {
    const updated = items.map(a => a.id === id ? { ...a, ...data } : a);
    this.save(updated);
    return updated;
  },

  remove(items, id) {
    const updated = items.filter(a => a.id !== id);
    this.save(updated);
    return updated;
  },
};

const BeyondBorders = {
  grid:    null,
  loading: null,

  init() {
    this.grid    = $('#bb-grid');
    this.loading = $('#bb-loading');
    if (!this.grid) return;

    setTimeout(() => this.render(), 300);
    this.initParallax();
    this.initCounters();
  },

  render() {
    if (this.loading) { this.loading.remove(); this.loading = null; }

    // Clear existing cards before re-render
    $$('.bb-card', this.grid).forEach(c => c.remove());

    const artworks = BeyondBordersData.load();
    artworks.forEach((artwork, i) => {
      const card = this.createCard(artwork, i);
      this.grid.appendChild(card);
    });
  },

  createCard(artwork, index) {
    const card = document.createElement('article');
    card.className  = 'bb-card';
    card.role       = 'listitem';
    card.dataset.id = artwork.id;
    card.style.animationDelay = (index * 80) + 'ms';

    card.innerHTML = `
      <div class="bb-card-img-wrap">
        <img
          src="${artwork.image}"
          alt="${artwork.title} — ${artwork.artist}"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80'"
        />
        <div class="bb-card-ribbon" aria-label="20% of proceeds donated">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 12s-5.5-3.5-5.5-7A3.5 3.5 0 0 1 7 2.5 3.5 3.5 0 0 1 12.5 5c0 3.5-5.5 7-5.5 7z"
                  stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" fill="currentColor" fill-opacity="0.3"/>
          </svg>
          20% Donated
        </div>
      </div>
      <div class="bb-card-info">
        <h3 class="bb-card-title">${artwork.title}</h3>
        <p class="bb-card-artist">${artwork.artist} · ${artwork.year}</p>
        <div class="bb-card-footer">
          <span class="bb-card-price">$${artwork.price}</span>
          <button class="btn-buy-now magnetic" aria-label="Purchase ${artwork.title} — $${artwork.price}">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2h1.5l2 6.5h5l1.5-4H4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="7" cy="11" r="1" fill="currentColor"/>
              <circle cx="10" cy="11" r="1" fill="currentColor"/>
            </svg>
            Purchase Now
          </button>
        </div>
      </div>
    `;

    card.querySelector('.btn-buy-now').addEventListener('click', (e) => {
      e.stopPropagation();
      DirectBuyModal.open(artwork);
    });

    return card;
  },

  initParallax() {
    // Skip parallax on touch devices — CSS handles static layers
    if (Device.isTouch) return;

    const section = $('#beyond-borders');
    const layers  = [
      { el: $('.bb-layer--1'), speed: 0.08 },
      { el: $('.bb-layer--2'), speed: 0.05 },
      { el: $('.bb-layer--3'), speed: 0.03 },
    ];

    if (!section || !layers[0].el) return;

    const onScroll = () => {
      const rect   = section.getBoundingClientRect();
      const offset = -rect.top;
      layers.forEach(({ el, speed }) => {
        if (el) el.style.transform = `translateY(${offset * speed}px)`;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  },

  initCounters() {
    const strip = $('.bb-impact-strip');
    if (!strip) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        $$('.bb-impact-num', entry.target).forEach(el => {
          const target   = parseInt(el.dataset.bbTarget || '0');
          const duration = 1600;
          const start    = performance.now();
          const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased    = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * target);
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = target;
          };
          requestAnimationFrame(step);
        });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    observer.observe(strip);
  },
};

/* ────────────────────────────────────────────────────────────────────
   19b. DIRECT BUY MODAL — streamlined checkout for BB collection
──────────────────────────────────────────────────────────────────── */
const DirectBuyModal = {
  modal:       null,
  overlay:     null,
  closeBtn:    null,
  formStep:    null,
  confirmStep: null,
  form:        null,
  feedback:    null,
  submitBtn:   null,
  doneBtn:     null,
  currentArtwork: null,

  init() {
    this.modal       = $('#direct-buy-modal');
    this.overlay     = $('#direct-buy-overlay');
    this.closeBtn    = $('#direct-buy-close');
    this.formStep    = $('#direct-buy-form-step');
    this.confirmStep = $('#direct-buy-confirm-step');
    this.form        = $('#direct-buy-form');
    this.feedback    = $('#direct-buy-feedback');
    this.submitBtn   = $('#direct-buy-submit');
    this.doneBtn     = $('#direct-buy-done');

    if (!this.modal) return;

    this.closeBtn?.addEventListener('click',  () => this.close());
    this.overlay?.addEventListener('click',   () => this.close());
    this.doneBtn?.addEventListener('click',   () => this.close());
    this.form?.addEventListener('submit',     (e) => this.handleSubmit(e));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && !this.modal.hidden) this.close();
    });
  },

  open(artwork) {
    if (!this.modal) return;
    this.currentArtwork = artwork;

    // Populate artwork info
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const img = $('#direct-buy-img');
    if (img) { img.src = artwork.image; img.alt = artwork.title; }

    setEl('direct-buy-title',  artwork.title);
    setEl('direct-buy-artist', `${artwork.artist} · ${artwork.year}`);
    setEl('direct-buy-price',  `$${artwork.price}`);

    // Reset to form step
    if (this.formStep)    this.formStep.hidden    = false;
    if (this.confirmStep) this.confirmStep.hidden = true;
    if (this.form)        this.form.reset();
    if (this.feedback)    this.feedback.textContent = '';

    this.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('buy-name')?.focus(), 100);
  },

  close() {
    if (!this.modal) return;
    this.modal.hidden = true;
    document.body.style.overflow = '';
    this.currentArtwork = null;
  },

  handleSubmit(e) {
    e.preventDefault();

    const name    = $('#buy-name')?.value?.trim();
    const email   = $('#buy-email')?.value?.trim();
    const address = $('#buy-address')?.value?.trim();
    const terms   = $('#buy-terms')?.checked;

    if (!name || !email || !address) {
      this.showFeedback('Please fill in all required fields.', 'error');
      return;
    }
    if (!terms) {
      this.showFeedback('Please accept the terms to complete your purchase.', 'error');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      this.showFeedback('Please enter a valid email address.', 'error');
      return;
    }

    // Disable button and simulate processing
    if (this.submitBtn) {
      this.submitBtn.disabled = true;
      $('span', this.submitBtn).textContent = 'Processing…';
    }

    setTimeout(() => {
      // Populate confirm step
      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setEl('confirm-buyer-name',    name);
      setEl('confirm-buyer-email',   email);
      setEl('confirm-artwork-title', this.currentArtwork?.title || '');

      if (this.formStep)    this.formStep.hidden    = true;
      if (this.confirmStep) this.confirmStep.hidden = false;
      if (this.submitBtn)   this.submitBtn.disabled  = false;
      $('span', this.submitBtn).textContent = 'Complete Purchase';

      // Focus the done button for accessibility
      this.doneBtn?.focus();
    }, 1200);
  },

  showFeedback(msg, type = '') {
    if (!this.feedback) return;
    this.feedback.textContent = msg;
    this.feedback.className   = `form-feedback ${type}`;
    setTimeout(() => {
      if (this.feedback) {
        this.feedback.textContent = '';
        this.feedback.className   = 'form-feedback';
      }
    }, 4500);
  },
};

/* ────────────────────────────────────────────────────────────────────
   19c. ADMIN FEATURED — select Hero image & Work of the Week
──────────────────────────────────────────────────────────────────── */
const AdminFeatured = {
  HERO_KEY: 'alf_hero_id',
  WOTW_KEY: 'alf_wotw_id',

  init() {
    // Nothing to bind at init; populated when tab opens via AdminPanel
  },

  populate() {
    const artworks = GalleryData.load();
    this._buildList('hero-select-list',  artworks, this.HERO_KEY, 'hero');
    this._buildList('wotw-select-list',  artworks, this.WOTW_KEY, 'wotw');
    this._updatePreview('hero', artworks);
    this._updatePreview('wotw', artworks);
  },

  _buildList(containerId, artworks, storageKey, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const selectedId = localStorage.getItem(storageKey);

    artworks.forEach(artwork => {
      const item = document.createElement('div');
      item.className  = 'admin-select-item' + (artwork.id === selectedId ? ' selected' : '');
      item.role       = 'option';
      item.dataset.id = artwork.id;
      item.setAttribute('aria-selected', String(artwork.id === selectedId));

      item.innerHTML = `
        <img src="${artwork.image || ''}" alt="${artwork.title}" loading="lazy"
             onerror="this.style.background='var(--bg-3)';this.src=''"/>
        <div class="admin-select-item-info">
          <strong>${artwork.title}</strong>
          <span>${artwork.artist}${artwork.year ? ' · ' + artwork.year : ''}</span>
        </div>
        <div class="admin-select-item-check"></div>
      `;

      item.addEventListener('click', () => {
        localStorage.setItem(storageKey, artwork.id);
        // Deselect others
        $$('.admin-select-item', container).forEach(el => {
          el.classList.remove('selected');
          el.setAttribute('aria-selected', 'false');
        });
        item.classList.add('selected');
        item.setAttribute('aria-selected', 'true');
        this._updatePreview(prefix, artworks);

        // Live-update the page
        if (prefix === 'wotw') FeaturedSection.render(artworks);
        if (prefix === 'hero') HeroManager.render(artworks);

        this._showFeedback(prefix === 'hero'
          ? `Hero updated to "${artwork.title}"`
          : `Work of the Week set to "${artwork.title}"`);
      });

      container.appendChild(item);
    });
  },

  _updatePreview(prefix, artworks) {
    const key       = prefix === 'hero' ? this.HERO_KEY : this.WOTW_KEY;
    const selectedId = localStorage.getItem(key);
    const artwork   = selectedId ? artworks.find(a => a.id === selectedId) : null;

    const imgEl    = document.getElementById(`${prefix}-preview-img`);
    const titleEl  = document.getElementById(`${prefix}-preview-title`);
    const artistEl = document.getElementById(`${prefix}-preview-artist`);

    if (imgEl)    imgEl.src         = artwork?.image  || '';
    if (titleEl)  titleEl.textContent  = artwork?.title  || 'No artwork selected';
    if (artistEl) artistEl.textContent = artwork?.artist || '—';
  },

  _showFeedback(msg) {
    const el = document.getElementById('featured-tab-feedback');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'form-feedback success';
    setTimeout(() => { if (el) { el.textContent = ''; el.className = 'form-feedback'; } }, 3500);
  },
};

/* ────────────────────────────────────────────────────────────────────
   19d. ADMIN BEYOND BORDERS — CRUD panel for BB collection
──────────────────────────────────────────────────────────────────── */
const AdminBeyondBorders = {
  form:         null,
  submitBtn:    null,
  cancelBtn:    null,
  feedbackEl:   null,
  bbList:       null,
  manageBadge:  null,
  tabBadge:     null,
  imagePreview: null,
  imageInput:   null,
  dropzone:     null,
  currentImage: '',

  init() {
    this.form         = $('#bb-artwork-form');
    this.submitBtn    = $('#bb-artwork-submit');
    this.cancelBtn    = $('#bb-artwork-cancel');
    this.feedbackEl   = $('#bb-form-feedback');
    this.bbList       = $('#admin-bb-list');
    this.manageBadge  = $('#bb-manage-badge');
    this.tabBadge     = $('#admin-bb-badge');
    this.imagePreview = $('#bb-upload-preview');
    this.imageInput   = $('#bb-image-input');
    this.dropzone     = $('#bb-upload-dropzone');

    if (!this.form) return;

    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.cancelBtn?.addEventListener('click', () => this.resetForm());

    // Sub-tab switching (add / manage)
    $$('[data-bbtab]').forEach(btn => {
      btn.addEventListener('click', () => this.switchSubTab(btn.dataset.bbtab));
    });

    // File upload
    this.imageInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processFile(file);
    });
    this.dropzone?.addEventListener('click', () => this.imageInput?.click());
    this.dropzone?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') this.imageInput?.click();
    });
    this.dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.classList.add('drag-over');
    });
    this.dropzone?.addEventListener('dragleave', () => this.dropzone.classList.remove('drag-over'));
    this.dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) this.processFile(file);
    });

    this.updateBadges();
  },

  switchSubTab(tabName) {
    $$('[data-bbtab]').forEach(btn => {
      const active = btn.dataset.bbtab === tabName;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    $$('.bb-subtab-content').forEach(el => {
      const active = el.id === `tab-${tabName}`;
      el.classList.toggle('active', active);
      el.hidden = !active;
    });
    if (tabName === 'bb-manage') this.refreshList();
  },

  processFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      this.showFeedback('Image too large. Max 5 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentImage = e.target.result;
      if (this.imagePreview) {
        this.imagePreview.src    = this.currentImage;
        this.imagePreview.hidden = false;
      }
      const ph = $('#bb-upload-placeholder');
      if (ph) ph.style.display = 'none';
    };
    reader.readAsDataURL(file);
  },

  handleSubmit(e) {
    e.preventDefault();
    const editId  = $('#bb-edit-id')?.value;
    const title   = $('#bb-art-title')?.value?.trim();
    const artist  = $('#bb-art-artist')?.value?.trim();
    const price   = $('#bb-art-price')?.value?.trim();

    if (!title || !artist || !price) {
      this.showFeedback('Please fill in all required fields.', 'error');
      return;
    }

    const urlInput = $('#bb-art-image-url')?.value?.trim();
    const image    = this.currentImage || urlInput
      || 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80';

    const data = {
      title,
      artist,
      price,
      year:        $('#bb-art-year')?.value?.trim()       || '',
      dimensions:  $('#bb-art-dimensions')?.value?.trim() || '',
      status:      $('#bb-art-status')?.value             || 'available',
      description: $('#bb-art-desc')?.value?.trim()       || '',
      image,
    };

    let items = BeyondBordersData.load();

    if (editId) {
      items = BeyondBordersData.update(items, editId, data);
      this.showFeedback('Artwork updated.', 'success');
    } else {
      items = BeyondBordersData.add(items, data);
      this.showFeedback('Artwork added to Beyond Borders.', 'success');
    }

    this.resetForm();
    this.updateBadges();
    BeyondBorders.render(); // live-refresh the section
  },

  resetForm() {
    if (!this.form) return;
    this.form.reset();
    if ($('#bb-edit-id')) $('#bb-edit-id').value = '';
    this.currentImage = '';
    if (this.imagePreview) { this.imagePreview.src = ''; this.imagePreview.hidden = true; }
    const ph = $('#bb-upload-placeholder');
    if (ph) ph.style.display = '';
    if (this.submitBtn) $('span', this.submitBtn).textContent = 'Publish to Beyond Borders';
    if (this.cancelBtn) this.cancelBtn.hidden = true;
    if (this.feedbackEl) this.feedbackEl.textContent = '';
  },

  populateForm(artwork) {
    if ($('#bb-edit-id'))         $('#bb-edit-id').value         = artwork.id;
    if ($('#bb-art-title'))       $('#bb-art-title').value       = artwork.title;
    if ($('#bb-art-artist'))      $('#bb-art-artist').value      = artwork.artist;
    if ($('#bb-art-price'))       $('#bb-art-price').value       = artwork.price;
    if ($('#bb-art-year'))        $('#bb-art-year').value        = artwork.year       || '';
    if ($('#bb-art-dimensions'))  $('#bb-art-dimensions').value  = artwork.dimensions || '';
    if ($('#bb-art-status'))      $('#bb-art-status').value      = artwork.status     || 'available';
    if ($('#bb-art-desc'))        $('#bb-art-desc').value        = artwork.description || '';

    if (artwork.image) {
      this.currentImage = artwork.image;
      if (this.imagePreview) {
        this.imagePreview.src    = artwork.image;
        this.imagePreview.hidden = false;
      }
      const ph = $('#bb-upload-placeholder');
      if (ph) ph.style.display = 'none';
      const urlInput = $('#bb-art-image-url');
      if (urlInput && !artwork.image.startsWith('data:')) urlInput.value = artwork.image;
    }

    if (this.submitBtn) $('span', this.submitBtn).textContent = 'Save Changes';
    if (this.cancelBtn) this.cancelBtn.hidden = false;
    this.switchSubTab('bb-add');
  },

  refreshList() {
    if (!this.bbList) return;
    const items = BeyondBordersData.load();
    this.updateBadges(items.length);

    $$('.admin-bb-item', this.bbList).forEach(el => el.remove());
    const emptyEl = $('#bb-manage-empty');

    if (items.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    items.forEach(artwork => {
      const item = document.createElement('div');
      item.className  = 'admin-bb-item';
      item.role       = 'listitem';
      item.dataset.id = artwork.id;

      item.innerHTML = `
        <img src="${artwork.image || ''}" alt="${artwork.title}" loading="lazy"
             onerror="this.style.background='var(--bg-3)';this.src=''"/>
        <div class="admin-bb-item-info">
          <strong>${artwork.title}</strong>
          <span>${artwork.artist}${artwork.year ? ' · ' + artwork.year : ''}
            <em class="bb-price-tag">$${artwork.price}</em>
          </span>
        </div>
        <div class="admin-bb-item-actions">
          <button class="btn-edit"   data-id="${artwork.id}" aria-label="Edit ${artwork.title}">Edit</button>
          <button class="btn-delete" data-id="${artwork.id}" aria-label="Delete ${artwork.title}">Delete</button>
        </div>
      `;

      item.querySelector('.btn-edit').addEventListener('click', () => {
        const found = BeyondBordersData.load().find(a => a.id === artwork.id);
        if (found) this.populateForm(found);
      });
      item.querySelector('.btn-delete').addEventListener('click', () => {
        if (!confirm(`Delete "${artwork.title}" from Beyond Borders? This cannot be undone.`)) return;
        let items = BeyondBordersData.load();
        items = BeyondBordersData.remove(items, artwork.id);
        item.remove();
        this.updateBadges(items.length);
        if (items.length === 0 && emptyEl) emptyEl.style.display = '';
        BeyondBorders.render();
      });

      this.bbList.appendChild(item);
    });
  },

  updateBadges(count) {
    const items = count !== undefined ? count : BeyondBordersData.load().length;
    if (this.manageBadge) this.manageBadge.textContent = items;
    if (this.tabBadge)    this.tabBadge.textContent    = items;
  },

  showFeedback(msg, type = '') {
    if (!this.feedbackEl) return;
    this.feedbackEl.textContent = msg;
    this.feedbackEl.className   = `form-feedback ${type}`;
    setTimeout(() => {
      if (this.feedbackEl) {
        this.feedbackEl.textContent = '';
        this.feedbackEl.className   = 'form-feedback';
      }
    }, 4000);
  },
};

/* ────────────────────────────────────────────────────────────────────
   19. APP — bootstraps all modules
──────────────────────────────────────────────────────────────────── */
const App = {
  init() {
    Device.init();      // ← must be first: sets .is-touch class and Device.isTouch flag
    Preloader.init();
    ScrollProgress.init();
    Cursor.init();
    ThemeToggle.init();
    Nav.init();
    SmoothScroll.init();
    HeroParallax.init();
    Animations.init();
    Counters.init();

    Gallery.init();
    FeaturedSection.render(Gallery.artworks);
    HeroManager.render(Gallery.artworks);

    ProductModal.init();
    AdminLogin.init();
    AdminPanel.init();
    AdminFeatured.init();
    AdminBeyondBorders.init();
    PasswordToggle.init();
    ContactForm.init();

    BeyondBorders.init();
    DirectBuyModal.init();

    console.info('✦ Art Life Foundation — ready.');
  },
};

// Boot when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
