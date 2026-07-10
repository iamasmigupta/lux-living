/* ==========================================================================
   LuxLiving — site application
   Hash-routed vanilla JS implementation of the Claude Design prototype.
   Views: home, products, category, product, brands, brand, craft.
   ========================================================================== */
(function () {
  'use strict';

  var WA = '919034116534';
  var MAPS = 'https://maps.app.goo.gl/NP5b9cA1UCatDeWW8';
  var IG_URL = 'https://www.instagram.com/lux.living34/';
  var EASE = 'cubic-bezier(0.22,1,0.36,1)';
  var ARR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
  var ARR12 = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
  var WA_SVG = '<svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor"><path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.916 15.916 0 0016.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.316 22.612c-.39 1.1-1.932 2.014-3.17 2.28-.846.182-1.95.326-5.67-1.218-4.762-1.976-7.824-6.804-8.062-7.118-.228-.314-1.916-2.55-1.916-4.862s1.214-3.448 1.644-3.92c.39-.428.916-.628 1.222-.628.15 0 .284.008.404.014.43.018.646.042.93.718.356.846 1.222 2.982 1.328 3.2.108.22.214.516.068.828-.138.32-.258.46-.478.71-.22.25-.428.44-.648.71-.198.24-.422.494-.178.924.244.424 1.082 1.784 2.324 2.89 1.596 1.422 2.868 1.882 3.354 2.076.358.144.784.108 1.04-.166.322-.348.72-.924 1.124-1.494.288-.408.65-.46 1.04-.314.396.14 2.508 1.182 2.938 1.398.43.216.716.326.822.504.104.178.104 1.028-.286 2.128z"></path></svg>';
  var STAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#C4985A"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"></path></svg>';

  var cats = LUX._categories();
  var products = LUX._products();
  var brands = LUX._brands();

  // ---------- state ----------
  var state = {
    menuOpen: false, menuProducts: false,
    heroSlide: 0, heroPlaying: true, discSlide: 0, tIndex: 0,
    formSubmitted: false, newsDone: false, statsDone: false,
    pdpImg: 0, pdpPlaying: true, pdpZoomScale: 1,
    craftSlide: 0, wallSlide: 0,
  };
  var route = { view: 'home' };
  var prevRoute = null;
  var viewTimers = [];
  var app = document.getElementById('app');

  function timer(fn, ms) { viewTimers.push(setInterval(fn, ms)); }
  function clearViewTimers() { viewTimers.forEach(clearInterval); viewTimers = []; }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ---------- hover styles (data-hover="css") ----------
  // Touch screens fire mouseenter on tap but never mouseleave, leaving hover styles
  // stuck — so hover styling is only wired up for real pointers.
  var CAN_HOVER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function bindHover(root) {
    if (!CAN_HOVER) return;
    qsa('[data-hover]', root).forEach(function (el) {
      if (el.__hoverBound) return;
      el.__hoverBound = true;
      el.addEventListener('mouseenter', function () {
        el.__baseStyle = el.getAttribute('style') || '';
        el.setAttribute('style', el.__baseStyle + ';' + el.getAttribute('data-hover'));
      });
      el.addEventListener('mouseleave', function () {
        if (el.__baseStyle != null) el.setAttribute('style', el.__baseStyle);
      });
    });
  }

  // ---------- routing ----------
  function parseHash() {
    var raw = location.hash.replace(/^#\/?/, '');
    var seg = raw.split('/').map(function (s) { try { return decodeURIComponent(s); } catch (e) { return s; } });
    switch (seg[0]) {
      case '': case undefined: return { view: 'home' };
      case 'about': case 'consultation': case 'contact': return { view: 'home', section: seg[0] };
      case 'products': return { view: 'products' };
      case 'category': return { view: 'category', key: seg[1] || 'living', tab: seg[2] || 'All' };
      case 'product': return { view: 'product', id: seg[1] || products[0].id };
      case 'brands': return { view: 'brands' };
      case 'brand': return { view: 'brand', id: seg[1] || 'aprilstory' };
      case 'craft': return { view: 'craft' };
      default: return { view: 'home' };
    }
  }
  function catHref(key) { return '#/category/' + key; }
  function tabHref(key, tab) { return '#/category/' + key + '/' + encodeURIComponent(tab); }
  function prodHref(id) { return '#/product/' + id; }

  // WhatsApp enquiry text for a product. wa.me can only prefill text (no file
  // attachments), so the product photo is included as a direct URL — WhatsApp
  // renders it as a tappable image preview once the site is on a public domain.
  function waProductMessage(p) {
    var dir = location.origin + location.pathname.replace(/[^/]*$/, '');
    var msg = 'Hi LuxLiving! I want to know more about this piece — ' + p.name +
      '\n\nProduct page: ' + dir.replace(/\/$/, '') + '/#' + prodHref(p.id).slice(1) +
      '\nPhoto: ' + dir + p.imgs[0];
    return encodeURIComponent(msg);
  }

  // ---------- shared fragments ----------
  function luxCard(p, fit, titleSize) {
    var img2 = p.img2 || p.img; // single-image products zoom their own photo on hover instead of going blank
    return '' +
      '<a href="' + prodHref(p.id) + '" data-cursor="1" class="lux-card" style="display: block; text-decoration: none; color: #1C1C1E;">' +
        '<div style="position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: #F0EAE0; margin-bottom: 16px;">' +
          '<img src="' + p.img + '" alt="' + p.name + '" loading="lazy" class="lux-card-img1" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: ' + fit + '; transition: opacity 0.7s ' + EASE + ', transform 0.9s ' + EASE + ';" />' +
          '<img src="' + img2 + '" alt="" loading="lazy" aria-hidden="true" class="lux-card-img2" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: ' + fit + '; opacity: 0; transform: scale(1.06); transition: opacity 0.7s ' + EASE + ', transform 0.9s ' + EASE + ';" />' +
          '<span class="lux-card-arrow" style="position: absolute; right: 16px; bottom: 16px; width: 42px; height: 42px; border-radius: 50%; background: rgba(245,241,235,0.92); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; color: #1C1C1E; opacity: 0; transform: translateY(8px); transition: opacity 0.45s ' + EASE + ', transform 0.45s ' + EASE + ';">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"></path></svg>' +
          '</span>' +
        '</div>' +
        '<div style="font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #C4985A; margin-bottom: 6px;">' + p.sub + '</div>' +
        '<div class="lux-card-title" style="font-family: \'Playfair Display\', serif; font-size: ' + titleSize + 'px; font-weight: 400; line-height: 1.3; transition: color 0.35s;">' + p.name + '</div>' +
        '<div style="font-size: 12px; color: #9B9590; margin-top: 6px; display: inline-flex; align-items: center; gap: 6px;">View details ' + ARR12 + '</div>' +
      '</a>';
  }

  function pillDark(href, label, extra) {
    return '<a href="' + href + '" ' + (extra || '') + ' data-hover="transform: translateY(-1px); background: #C4985A;" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 16px 40px; background: #1C1C1E; color: #F5F1EB; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; border-radius: 32px; text-decoration: none; transition: transform 0.3s, background 0.5s;"><span>' + label + '</span></a>';
  }
  function pillOutline(href, label) {
    return '<a href="' + href + '" data-hover="background: #1C1C1E; color: #F5F1EB;" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 16px 44px; background: transparent; color: #1C1C1E; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; border: 1px solid #1C1C1E; border-radius: 32px; text-decoration: none; transition: all 0.35s;"><span>' + label + '</span></a>';
  }

  // ---------- HOME ----------
  var heroData = [
    { img: 'assets/shop/three/01.jpg', eyebrow: 'Lux Living — Est. 2024', l1: 'Comfort,', l2: 'Elevated.', cta: 'Explore Collections', href: '#/products' },
    { img: 'assets/shop/dining/16.jpg', eyebrow: 'New — The Dining Collection', l1: 'The Art of', l2: 'Gathering.', cta: 'Explore Dining', href: catHref('dining') },
    { img: 'assets/shop/bedroom/01.jpg', eyebrow: 'The Bedroom Collection', l1: 'Rest,', l2: 'Reimagined.', cta: 'Shop Bedroom', href: catHref('bedroom') },
    { img: 'assets/shop/lighting/09.jpg', eyebrow: 'New — The Lighting Studio', l1: 'Light,', l2: 'Sculpted.', cta: 'Shop Lighting', href: catHref('lighting') },
    { img: 'assets/shop2/triple/01a.jpg', eyebrow: 'The Living Collection', l1: 'Gather,', l2: 'Beautifully.', cta: 'Shop Living', href: catHref('living') },
    { img: 'assets/shop/arm/07.jpg', eyebrow: 'Armchairs & Loungers', l1: 'One Seat,', l2: 'Every Evening.', cta: 'Shop Armchairs', href: catHref('armchairs') },
    { img: 'assets/shop/tables/03.jpg', eyebrow: 'Marble & Stone Tables', l1: 'Stone,', l2: 'Softened.', cta: 'Shop Tables', href: catHref('tables') },
    { img: 'assets/shop/art/06.jpg', eyebrow: 'The Gallery Wall', l1: 'Art that', l2: 'Anchors.', cta: 'Shop Wall Art', href: catHref('art') },
  ];
  var FEATURED_IDS = ['crestone-sectional', 'sahara-leather-set', 'saffron-recliner', 'cocoon-bed', 'dorado-dining', 'cascade-chandelier', 'meridian-split-table', 'verve-lounge-pair'];

  function sectionHead(eyebrow, titleHtml, center) {
    return '<div data-reveal style="text-align: ' + (center ? 'center' : 'left') + '; margin-bottom: 60px;">' +
      '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 18px;">' + eyebrow + '</span>' +
      '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.1; letter-spacing: -0.5px; text-transform: lowercase; font-size: clamp(32px, 4.5vw, 52px); margin: 0;">' + titleHtml + '</h2>' +
    '</div>';
  }

  function tmplHome() {
    var h = '';
    // Hero campaign slider
    h += '<section data-cursor="1" style="position: relative; min-height: 100vh; overflow: hidden; background: #1C1C1E;">';
    heroData.forEach(function (hs, i) {
      h += '<div class="hero-slide" data-i="' + i + '" style="position: absolute; inset: 0; opacity: 0; transition: opacity 1.3s ' + EASE + '; pointer-events: none;">' +
        '<img src="' + hs.img + '" alt="' + hs.l1 + ' ' + hs.l2 + '" class="hero-kb" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;" />' +
        '<div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(28,28,30,0.2) 0%, rgba(28,28,30,0.05) 40%, rgba(28,28,30,0.55) 100%);"></div>' +
        '<div style="position: absolute; bottom: 88px; left: 52px; right: 52px; color: #fff;">' +
          '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #DFC9A8; margin-bottom: 20px;">' + hs.eyebrow + '</span>' +
          '<h1 style="font-family: \'Playfair Display\', serif; font-size: clamp(48px, 7vw, 96px); font-weight: 400; line-height: 1.08; margin: 0 0 30px; text-shadow: 0 2px 40px rgba(0,0,0,0.2);">' + hs.l1 + '<br /><em>' + hs.l2 + '</em></h1>' +
          '<a href="' + hs.href + '" data-hover="gap: 14px; border-bottom: 1px solid #fff;" style="display: inline-flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 500; letter-spacing: 1px; color: #fff; text-decoration: none; position: relative; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.5); transition: gap 0.4s ' + EASE + ', border-color 0.3s;"><span>' + hs.cta + '</span>' + ARR + '</a>' +
        '</div>' +
      '</div>';
    });
    h += '<div style="position: absolute; right: 52px; bottom: 92px; z-index: 4; display: flex; align-items: center; gap: 8px;">';
    heroData.forEach(function (_, i) {
      h += '<button class="hero-bar" data-i="' + i + '" aria-label="Go to slide" style="width: 52px; height: 40px; border: none; background: none; cursor: pointer; display: flex; align-items: center; padding: 0;">' +
        '<span style="width: 100%; height: 2px; background: rgba(255,255,255,0.25); overflow: hidden; display: block;">' +
          '<span class="hero-bar-fill" style="display: block; height: 100%; width: 100%; background: #DFC9A8; transform-origin: left center; transform: scaleX(0);"></span>' +
        '</span>' +
      '</button>';
    });
    h += '<button id="hero-toggle" aria-label="Pause or play slideshow" data-hover="background: rgba(255,255,255,0.15);" style="width: 44px; height: 44px; margin-left: 8px; border: 1px solid rgba(255,255,255,0.35); border-radius: 50%; background: none; cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center; transition: all 0.35s;"></button>';
    h += '</div></section>';

    // Collections slideshow
    h += '<section data-cursor="1" style="position: relative; height: 88vh; min-height: 560px; overflow: hidden; background: #1C1C1E;">';
    cats.forEach(function (c, i) {
      h += '<div class="disc-slide" data-i="' + i + '" style="position: absolute; inset: 0; opacity: 0; transition: opacity 1.1s ' + EASE + '; pointer-events: none;">' +
        '<img src="' + c.img + '" alt="' + c.name + '" class="disc-kb" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;" />' +
        '<div style="position: absolute; inset: 0; background: rgba(28,28,30,0.42);"></div>' +
        '<a href="' + catHref(c.key) + '" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-decoration: none;">' +
          '<h2 data-hover="letter-spacing: 6px;" style="font-family: \'Playfair Display\', serif; font-size: clamp(52px, 9vw, 130px); font-weight: 400; text-transform: lowercase; color: #fff; margin: 0; text-shadow: 0 2px 60px rgba(0,0,0,0.3); transition: letter-spacing 0.6s ' + EASE + ';">' + c.name.toLowerCase() + '</h2>' +
        '</a>' +
      '</div>';
    });
    h += '<div style="position: absolute; top: 110px; left: 0; right: 0; text-align: center; z-index: 3; pointer-events: none;">' +
      '<span style="font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #DFC9A8;">Our Collections</span></div>';
    h += '<button id="disc-prev" aria-label="Previous collection" data-hover="background: #C4985A; border-color: #C4985A;" style="position: absolute; left: 52px; top: 50%; transform: translateY(-50%); z-index: 3; width: 52px; height: 52px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.4); background: rgba(28,28,30,0.25); backdrop-filter: blur(6px); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.35s;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"></path></svg></button>' +
      '<button id="disc-next" aria-label="Next collection" data-hover="background: #C4985A; border-color: #C4985A;" style="position: absolute; right: 52px; top: 50%; transform: translateY(-50%); z-index: 3; width: 52px; height: 52px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.4); background: rgba(28,28,30,0.25); backdrop-filter: blur(6px); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.35s;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></button>';
    h += '<div style="position: absolute; bottom: 72px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 28px; z-index: 3;">' +
      '<div style="display: flex; gap: 10px;">';
    cats.forEach(function (_, i) {
      h += '<button class="disc-dot" data-i="' + i + '" aria-label="Go to collection" style="width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.4); border: none; cursor: pointer; transition: all 0.35s; transform: scale(1); padding: 0;"></button>';
    });
    h += '</div>' +
      '<a href="#/products" data-hover="background: #C4985A; border-color: #C4985A;" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 16px 44px; background: transparent; color: #fff; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; border: 1px solid rgba(255,255,255,0.55); border-radius: 32px; text-decoration: none; backdrop-filter: blur(4px); transition: all 0.4s;"><span>Discover Our Collections</span></a>' +
    '</div></section>';

    // Featured pieces
    h += '<section style="padding: 130px 0; background: #F5F1EB;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
      '<div data-reveal style="display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 52px; flex-wrap: wrap;">' +
        '<div><span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 16px;">Handpicked</span>' +
        '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.1; letter-spacing: -0.5px; text-transform: lowercase; font-size: clamp(32px, 4.5vw, 52px); margin: 0;">featured <em style="font-style: italic; color: #C4985A;">pieces.</em></h2></div>' +
        '<a href="#/products" data-hover="gap: 16px;" style="display: inline-flex; align-items: center; gap: 10px; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #1C1C1E; text-decoration: none; padding-bottom: 6px; border-bottom: 1px solid #C4985A;"><span>View All Products</span>' + ARR + '</a>' +
      '</div>' +
      '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 30px 24px;">';
    FEATURED_IDS.forEach(function (id) {
      var p = products.find(function (x) { return x.id === id; });
      if (p) h += luxCard({ id: p.id, name: p.name, sub: p.sub, img: p.imgs[0], img2: p.imgs[1] || p.imgs[0] }, 'cover', 20);
    });
    h += '</div></div></section>';

    // Heritage
    h += '<section style="padding: 130px 0; background: #EDE8DC;">' +
      '<div data-reveal style="text-align: center; max-width: 720px; margin: 0 auto; padding: 0 52px;">' +
        '<div style="width: 48px; height: 1.5px; background: #C4985A; margin: 0 auto 32px;"></div>' +
        '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.1; letter-spacing: -0.5px; text-transform: lowercase; font-size: clamp(34px, 5vw, 58px); margin: 0 0 28px; color: #1C1C1E; text-wrap: balance;">where craftsmanship<br />meets <em style="font-style: italic; color: #C4985A;">luxury.</em></h2>' +
        '<p style="font-family: \'Cormorant Garamond\', serif; font-size: 19px; line-height: 1.9; color: #57524D; font-style: italic; margin: 0; text-wrap: pretty;">At LuxLiving, every piece tells a story of exceptional artisanship. From Italian-inspired sofas to handcrafted lighting, we curate furniture that transforms your home into a sanctuary of timeless elegance.</p>' +
      '</div></section>';

    // Brand story
    h += '<section id="about" style="padding: 130px 0; background: #FFFFFF;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
      '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 90px; align-items: center;">' +
        '<div data-reveal style="position: relative;">' +
          '<div style="position: absolute; top: 24px; left: 24px; right: -24px; bottom: -24px; border: 1px solid #DFC9A8; z-index: 0; pointer-events: none;"></div>' +
          '<div data-tilt="1" style="position: relative; z-index: 1; overflow: hidden; box-shadow: 0 30px 70px rgba(28,28,30,0.12);">' +
            '<img src="assets/shop/set/08.jpg" alt="LuxLiving showroom" loading="lazy" class="about-media" data-hover="transform: scale(1.04);" style="width: 100%; height: 540px; object-fit: cover; display: block; transition: transform 1.1s ' + EASE + ';" />' +
          '</div>' +
          '<div style="position: absolute; left: -20px; bottom: 44px; z-index: 2; background: #1C1C1E; color: #F5F1EB; padding: 20px 26px; box-shadow: 0 18px 44px rgba(28,28,30,0.24);">' +
            '<span style="display: block; font-family: \'Playfair Display\', serif; font-size: 34px; font-weight: 400; line-height: 1;">2024</span>' +
            '<span style="display: block; font-size: 9px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #DFC9A8; margin-top: 6px;">Established</span>' +
          '</div>' +
        '</div>' +
        '<div data-reveal>' +
          '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 18px;">Our Story</span>' +
          '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.1; letter-spacing: -0.5px; text-transform: lowercase; font-size: clamp(32px, 4.5vw, 50px); margin: 0 0 30px; text-wrap: balance;">crafting luxury<br /><em style="font-style: italic; color: #C4985A;">since 2024.</em></h2>' +
          '<p style="color: #6B6560; margin: 0 0 18px; line-height: 1.9; font-size: 14px;">Established in 2024, Lux Living is the authorised Indian home for three world-class furniture houses — aprilstory of China, Italian atelier Ares Italia, and fabric specialist Home Feeling — in 100% genuine leather and premium fabric.</p>' +
          '<p style="color: #6B6560; margin: 0; line-height: 1.9; font-size: 14px;">In our first years we\'ve delivered 500+ pieces to 500+ happy homes, each backed by white-glove delivery and an imported care kit. Every piece is engineered to be kept.</p>' +
          '<div style="display: flex; gap: 36px; margin-top: 40px; flex-wrap: wrap;">' +
            '<div style="display: flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #1C1C1E;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4985A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"></path><path d="M11 3 8 9l4 13 4-13-3-6"></path><path d="M2 9h20"></path></svg><span>Premium Materials</span></div>' +
            '<div style="display: flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #1C1C1E;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4985A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3z"></path><path d="M14 10h4l3 3v3h-7"></path><circle cx="7" cy="18" r="1.8"></circle><circle cx="17" cy="18" r="1.8"></circle></svg><span>White Glove Delivery</span></div>' +
            '<div style="display: flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #1C1C1E;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4985A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3a3 3 0 0 0-3 3 3 3 0 0 0 .2 1L9 13.2A3 3 0 0 0 8 13a3 3 0 1 0 3 3 3 3 0 0 0-.2-1l6.2-6.2A3 3 0 0 0 18 9a3 3 0 1 0 0-6z"></path></svg><span>Custom Design</span></div>' +
          '</div>' +
        '</div>' +
      '</div></div></section>';

    // Stats
    var statMeta = [
      { label: 'Established', suffix: '', target: 2024, year: true },
      { label: 'Happy Customers', suffix: '+', target: 500, year: false },
      { label: 'Products Delivered', suffix: '+', target: 500, year: false },
      { label: 'Brand Partners', suffix: '', target: 3, year: false },
    ];
    h += '<section data-stats style="padding: 80px 0; background: #F5F1EB; border-top: 1px solid #E8E3DA; border-bottom: 1px solid #E8E3DA;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
      '<div style="display: flex; justify-content: center; gap: 0; flex-wrap: wrap;">';
    statMeta.forEach(function (m, i) {
      var val = state.statsDone ? (m.year ? String(m.target) : m.target.toLocaleString()) : '0';
      h += '<div style="text-align: center; padding: 6px 62px; border-left: ' + (i === 0 ? 'none' : '1px solid #E2DCD0') + ';">' +
        '<span class="stat-val" data-target="' + m.target + '" data-year="' + m.year + '" style="font-family: \'Playfair Display\', serif; font-size: 58px; font-weight: 400; color: #1C1C1E; line-height: 1;">' + val + '</span><span style="font-family: \'Playfair Display\', serif; font-size: 32px; color: #C4985A; margin-left: 2px;">' + m.suffix + '</span>' +
        '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #9B9590; margin-top: 12px;">' + m.label + '</span>' +
      '</div>';
    });
    h += '</div></div></section>';

    // Consultation
    h += '<section id="consultation" style="padding: 130px 0; background: #F5F1EB;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
      '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: flex-start;">' +
        '<div data-reveal>' +
          '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 18px;">Design Service</span>' +
          '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.1; letter-spacing: -0.5px; text-transform: lowercase; font-size: clamp(32px, 4.5vw, 50px); margin: 0 0 26px; text-wrap: balance;">your vision,<br /><em style="font-style: italic; color: #C4985A;">our expertise.</em></h2>' +
          '<p style="color: #6B6560; line-height: 1.9; margin: 0 0 40px; font-size: 14px;">Our interior design experts will help you create a cohesive look for your entire home. Book a free consultation and let us bring your dream space to life.</p>' +
          '<div style="display: flex; flex-direction: column; gap: 28px;">' +
            '<div style="display: flex; gap: 24px; align-items: flex-start;"><span style="font-family: \'Playfair Display\', serif; font-size: 34px; font-weight: 400; color: #C4985A; line-height: 1; flex-shrink: 0; width: 48px;">01</span><div><h4 style="font-size: 14px; font-weight: 600; margin: 0 0 4px;">Share Your Vision</h4><p style="font-size: 13px; color: #6B6560; margin: 0;">Tell us about your space, style, and budget.</p></div></div>' +
            '<div style="display: flex; gap: 24px; align-items: flex-start;"><span style="font-family: \'Playfair Display\', serif; font-size: 34px; font-weight: 400; color: #C4985A; line-height: 1; flex-shrink: 0; width: 48px;">02</span><div><h4 style="font-size: 14px; font-weight: 600; margin: 0 0 4px;">Expert Curation</h4><p style="font-size: 13px; color: #6B6560; margin: 0;">We craft a personalized plan with product picks.</p></div></div>' +
            '<div style="display: flex; gap: 24px; align-items: flex-start;"><span style="font-family: \'Playfair Display\', serif; font-size: 34px; font-weight: 400; color: #C4985A; line-height: 1; flex-shrink: 0; width: 48px;">03</span><div><h4 style="font-size: 14px; font-weight: 600; margin: 0 0 4px;">Transform Your Space</h4><p style="font-size: 13px; color: #6B6560; margin: 0;">We handle delivery &amp; installation seamlessly.</p></div></div>' +
          '</div>' +
        '</div>' +
        '<div data-reveal id="consult-box" style="background: #F0EAE0; padding: 52px; box-shadow: 0 4px 40px rgba(0,0,0,0.04);">' + consultInner() + '</div>' +
      '</div></div></section>';

    // Testimonials
    var tst = LUX._testimonials();
    h += '<section style="padding: 130px 0; background: #FFFFFF; overflow: hidden;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
      '<div data-reveal style="text-align: center; margin-bottom: 60px;">' +
        '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 18px;">Testimonials</span>' +
        '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.1; letter-spacing: -0.5px; text-transform: lowercase; font-size: clamp(32px, 4.5vw, 52px); margin: 0;">what our clients <em style="font-style: italic; color: #C4985A;">say</em></h2>' +
      '</div>' +
      '<div style="max-width: 720px; margin: 0 auto; overflow: hidden;">' +
        '<div id="t-track" style="display: flex; transition: transform 0.7s ' + EASE + '; transform: translateX(0%);">';
    tst.forEach(function (tc) {
      h += '<div style="flex: 0 0 100%; text-align: center; padding: 0 24px; box-sizing: border-box;">' +
        '<div style="display: flex; justify-content: center; gap: 3px; margin-bottom: 30px;">' + STAR + STAR + STAR + STAR + STAR + '</div>' +
        '<div style="font-family: \'Playfair Display\', serif; font-size: 72px; line-height: 0.5; color: #DFC9A8; margin: 0 0 8px; height: 34px;">“</div>' +
        '<p style="font-family: \'Cormorant Garamond\', serif; font-size: 27px; font-style: italic; font-weight: 500; line-height: 1.6; letter-spacing: 0.2px; color: #1C1C1E; margin: 0 0 36px; text-wrap: balance;">' + tc.text + '</p>' +
        '<div style="display: flex; align-items: center; justify-content: center; gap: 14px;">' +
          '<div style="width: 48px; height: 48px; border-radius: 50%; background: #C4985A; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; letter-spacing: 1px;">' + tc.initials + '</div>' +
          '<div style="text-align: left;"><strong style="display: block; font-family: \'Playfair Display\', serif; font-size: 17px; font-weight: 500;">' + tc.author + '</strong><span style="display: block; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #9B9590; margin-top: 2px;">' + tc.loc + '</span></div>' +
        '</div>' +
      '</div>';
    });
    h += '</div>' +
      '<div style="display: flex; align-items: center; justify-content: center; gap: 26px; margin-top: 44px;">' +
        '<button id="t-prev" aria-label="Previous" data-hover="background: #1C1C1E; border-color: #1C1C1E; color: #F5F1EB;" style="width: 50px; height: 50px; border-radius: 50%; border: 1px solid #D8D2C8; background: none; display: flex; align-items: center; justify-content: center; color: #1C1C1E; cursor: pointer; transition: all 0.35s;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"></path></svg></button>' +
        '<div style="display: flex; gap: 10px;">';
    tst.forEach(function (_, i) {
      h += '<button class="t-dot" data-i="' + i + '" aria-label="Go to testimonial" style="width: 8px; height: 8px; border-radius: 50%; background: #D8D2C8; border: none; cursor: pointer; transition: all 0.35s; transform: scale(1); padding: 0;"></button>';
    });
    h += '</div>' +
        '<button id="t-next" aria-label="Next" data-hover="background: #1C1C1E; border-color: #1C1C1E; color: #F5F1EB;" style="width: 50px; height: 50px; border-radius: 50%; border: 1px solid #D8D2C8; background: none; display: flex; align-items: center; justify-content: center; color: #1C1C1E; cursor: pointer; transition: all 0.35s;">' + ARR.replace('width="16" height="16"', 'width="18" height="18"') + '</button>' +
      '</div></div></div></section>';

    // Collab
    h += '<section style="padding: 130px 0; background: #F0EAE0; overflow: hidden;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
      '<div style="display: grid; grid-template-columns: 1.05fr 1fr; gap: 80px; align-items: center;">' +
        '<div data-reveal data-cursor="1" style="position: relative;">' +
          '<div data-tilt="1" style="position: relative; aspect-ratio: 5 / 4; overflow: hidden; background: #EDE8DC; box-shadow: 0 30px 70px rgba(28,28,30,0.14);">' +
            '<img src="assets/shop/three/07.jpg" alt="aprilstory showroom" loading="lazy" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;" />' +
            '<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(28,28,30,0.28), transparent 55%);"></div>' +
          '</div>' +
          '<div style="position: absolute; right: -20px; bottom: -28px; width: 220px; background: #fff; padding: 22px 24px; box-shadow: 0 18px 44px rgba(28,28,30,0.16); border-radius: 2px;">' +
            '<img src="images/logo-collab.png" alt="aprilstory × Lux Living" style="width: 100%; height: auto; object-fit: contain; display: block;" />' +
          '</div>' +
          '<span style="position: absolute; top: 22px; left: 22px; background: rgba(28,28,30,0.72); backdrop-filter: blur(6px); color: #fff; font-size: 9px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; padding: 8px 15px; border-radius: 20px;">Official Franchise Partner</span>' +
        '</div>' +
        '<div data-reveal>' +
          '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 18px;">Exclusive Collaboration</span>' +
          '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.12; text-transform: lowercase; font-size: clamp(30px, 4.2vw, 46px); margin: 0 0 22px;">refined &amp; meaningful<br />living spaces</h2>' +
          '<p style="font-size: 14px; line-height: 1.9; color: #6B6560; margin: 0 0 34px; max-width: 460px;">We\'re proud to partner with <strong>aprilstory Furniture</strong>, one of China\'s leading furniture houses — bringing its contemporary design philosophy together with our commitment to luxury and comfort. Exclusive pieces you won\'t find anywhere else.</p>' +
          '<div style="display: flex; gap: 16px; flex-wrap: wrap;">' +
            pillDark('#/brands', 'Browse the Brands') +
            '<a href="#/brand/aprilstory" data-hover="gap: 15px; color: #C4985A; border-color: #C4985A;" style="display: inline-flex; align-items: center; gap: 10px; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #1C1C1E; text-decoration: none; align-self: center; padding-bottom: 5px; border-bottom: 1px solid #1C1C1E; transition: gap 0.4s ' + EASE + ', color 0.35s, border-color 0.35s;"><span>Meet aprilstory</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></a>' +
          '</div>' +
        '</div>' +
      '</div></div></section>';

    // Craftsmanship teaser
    h += '<section data-cursor="1" style="position: relative; height: 72vh; min-height: 480px; overflow: hidden; background: #1C1C1E;">' +
      '<a href="#/craft" style="position: absolute; inset: 0; display: block; text-decoration: none;">' +
        '<img src="assets/catalog/craft/1.jpg" alt="How our products are made" loading="lazy" data-hover="transform: scale(1.04);" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 30%; opacity: 0.55; transition: transform 1.2s ' + EASE + ';" />' +
        '<div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(28,28,30,0.35), rgba(28,28,30,0.55));"></div>' +
        '<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #fff; padding: 0 52px;">' +
          '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #DFC9A8; margin-bottom: 20px;">Behind the Scenes</span>' +
          '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.12; text-transform: lowercase; font-size: clamp(34px, 5vw, 60px); margin: 0 0 26px; text-shadow: 0 2px 40px rgba(0,0,0,0.3);">how our products are made</h2>' +
          '<span style="display: inline-flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.5); padding-bottom: 6px;">Take the Craft Tour ' + ARR + '</span>' +
        '</div>' +
      '</a></section>';

    // Brands teaser
    h += '<section style="background: #F5F1EB; padding: 130px 0;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
      '<div data-reveal style="display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; margin-bottom: 56px; flex-wrap: wrap;">' +
        '<div><span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 18px;">Our Partners</span>' +
        '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.12; text-transform: lowercase; font-size: clamp(32px, 4.5vw, 52px); margin: 0;">the brands we work with</h2></div>' +
        '<a href="#/brands" data-hover="gap: 16px; color: #C4985A; border-color: #C4985A;" style="display: inline-flex; align-items: center; gap: 10px; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #1C1C1E; text-decoration: none; padding-bottom: 6px; border-bottom: 1px solid #1C1C1E; transition: gap 0.4s ' + EASE + ', color 0.35s, border-color 0.35s;"><span>View All Brands</span>' + ARR + '</a>' +
      '</div>' +
      '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">';
    brands.forEach(function (b) {
      h += '<a href="#/brand/' + b.id + '" data-cursor="1" class="brand-card" style="display: block; text-decoration: none; color: #1C1C1E;">' +
        '<div style="position: relative; aspect-ratio: 4 / 5; overflow: hidden; background: #EDE8DC; margin-bottom: 18px;">' +
          '<img src="' + b.img + '" alt="' + b.name + '" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: ' + b.pos + ';" />' +
          '<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(28,28,30,0.55), transparent 55%);"></div>' +
          '<span style="position: absolute; top: 20px; left: 20px; background: rgba(28,28,30,0.72); backdrop-filter: blur(6px); color: #fff; font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; padding: 7px 13px; border-radius: 20px;">' + b.origin + '</span>' +
          '<div style="position: absolute; left: 24px; right: 24px; bottom: 22px; color: #fff;">' +
            '<div class="brand-card-name" style="font-family: \'Playfair Display\', serif; font-size: 26px; font-weight: 400; line-height: 1.1;">' + b.name + '</div>' +
            '<div style="font-size: 11px; letter-spacing: 1px; color: rgba(255,255,255,0.75); margin-top: 6px;">' + b.material + '</div>' +
          '</div>' +
        '</div>' +
      '</a>';
    });
    h += '</div></div></section>';

    // Instagram
    var insta = LUX._instaData();
    h += '<section style="padding: 130px 0 0; background: #F5F1EB;">' +
      '<div data-reveal style="max-width: 720px; margin: 0 auto 44px; padding: 0 52px; display: flex; align-items: center; gap: 24px;">' +
        '<a href="' + IG_URL + '" target="_blank" rel="noopener noreferrer" style="flex-shrink: 0; width: 84px; height: 84px; border-radius: 50%; padding: 3px; background: conic-gradient(from 30deg, #C4985A, #DFC9A8, #C4985A, #1C1C1E, #C4985A); display: block;">' +
          '<span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 50%; background: #1C1C1E; border: 3px solid #F5F1EB;"><img src="images/image-Photoroom (8).png" alt="Lux Living" style="width: 52px; height: 52px; object-fit: contain; filter: brightness(0) invert(1);" /></span>' +
        '</a>' +
        '<div style="flex: 1;">' +
          '<div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 8px;">' +
            '<a href="' + IG_URL + '" target="_blank" rel="noopener noreferrer" style="font-family: \'Playfair Display\', serif; font-size: 24px; font-weight: 400; color: #1C1C1E; text-decoration: none;">@lux.living34</a>' +
            '<a href="' + IG_URL + '" target="_blank" rel="noopener noreferrer" data-hover="background: #C4985A;" style="display: inline-flex; align-items: center; gap: 7px; padding: 8px 20px; background: #1C1C1E; color: #F5F1EB; font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; border-radius: 24px; text-decoration: none; transition: background 0.4s;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"></circle></svg>Follow</a>' +
          '</div>' +
          '<div style="display: flex; gap: 26px;">' +
            '<span style="font-size: 13px; color: #6B6560;"><strong style="color: #1C1C1E;">248</strong> posts</span>' +
            '<span style="font-size: 13px; color: #6B6560;"><strong style="color: #1C1C1E;">12.4k</strong> followers</span>' +
            '<span style="font-size: 13px; color: #6B6560;"><strong style="color: #1C1C1E;">312</strong> following</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 0;">';
    insta.forEach(function (p, i) {
      h += '<a href="' + p.url + '" class="ig-item" data-i="' + i + '" data-cursor="1" style="position: relative; aspect-ratio: 1; overflow: hidden; display: block; cursor: pointer;">' +
        '<img src="' + p.img + '" alt="Instagram post" loading="lazy" class="ig-img" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s ' + EASE + '; display: block;" />' +
        '<div class="ig-overlay" style="position: absolute; inset: 0; background: rgba(28,28,30,0.5); display: flex; align-items: center; justify-content: center; gap: 22px; color: #fff; opacity: 0; transition: opacity 0.4s; pointer-events: none;">' +
          '<span style="display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 600;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>' + p.likes + '</span>' +
          '<span style="display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 600;"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' + p.comments + '</span>' +
        '</div>' +
      '</a>';
    });
    h += '</div></section>';

    // Contact
    h += '<section id="contact" style="padding: 130px 0; background: #F5F1EB;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
      '<div data-reveal style="text-align: center; margin-bottom: 60px;">' +
        '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 18px;">Visit Us</span>' +
        '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.1; letter-spacing: -0.5px; text-transform: lowercase; font-size: clamp(32px, 4.5vw, 52px); margin: 0;">visit our <em style="font-style: italic; color: #C4985A;">showroom</em></h2>' +
      '</div>' +
      '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: stretch;">' +
        '<div data-reveal style="display: flex; flex-direction: column; gap: 8px;">' +
          '<div class="contact-item" style="display: flex; gap: 22px; align-items: flex-start; padding: 22px 0; border-bottom: 1px solid #E6E1D6;">' +
            '<div class="contact-icon" style="width: 52px; height: 52px; border-radius: 50%; border: 1px solid #D8D2C8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #C4985A;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>' +
            '<div><div style="font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #C4985A; margin: 4px 0 8px;">Address</div><p style="font-family: \'Playfair Display\', serif; font-size: 18px; font-weight: 400; color: #1C1C1E; line-height: 1.5; margin: 0;">Khadi Aashram, Near Grand Trunk Rd,<br />Panipat, Haryana 132104</p></div>' +
          '</div>' +
          '<div class="contact-item" style="display: flex; gap: 22px; align-items: flex-start; padding: 22px 0; border-bottom: 1px solid #E6E1D6;">' +
            '<div class="contact-icon" style="width: 52px; height: 52px; border-radius: 50%; border: 1px solid #D8D2C8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #C4985A;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></div>' +
            '<div><div style="font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #C4985A; margin: 4px 0 8px;">Call Us</div><a href="tel:+919034116534" data-hover="color: #C4985A;" style="font-family: \'Playfair Display\', serif; font-size: 22px; font-weight: 400; color: #1C1C1E; text-decoration: none; letter-spacing: 0.5px; transition: color 0.3s;">+91 90341 16534</a></div>' +
          '</div>' +
          '<div class="contact-item" style="display: flex; gap: 22px; align-items: flex-start; padding: 22px 0; border-bottom: 1px solid #E6E1D6;">' +
            '<div class="contact-icon" style="width: 52px; height: 52px; border-radius: 50%; border: 1px solid #D8D2C8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #C4985A;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg></div>' +
            '<div><div style="font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #C4985A; margin: 4px 0 8px;">Opening Hours</div><p style="font-size: 14px; color: #57524D; line-height: 1.9; margin: 0;">Mon – Sat &nbsp;·&nbsp; 10:30 AM – 8:00 PM<br />Sunday &nbsp;·&nbsp; 11:00 AM – 6:00 PM</p></div>' +
          '</div>' +
          '<a href="' + MAPS + '" target="_blank" rel="noopener noreferrer" data-hover="transform: translateY(-2px); background: #C4985A;" style="display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 17px 44px; background: #1C1C1E; color: #F5F1EB; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; border-radius: 32px; text-decoration: none; margin-top: 24px; align-self: flex-start; transition: transform 0.3s, background 0.5s;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg><span>Get Directions</span></a>' +
        '</div>' +
        '<a href="' + MAPS + '" target="_blank" rel="noopener noreferrer" data-reveal class="map-premium" aria-label="Open Lux Living on Google Maps" style="position: relative; display: block; overflow: hidden; min-height: 440px; background: #F0EAE0; text-decoration: none; border: 1px solid #E2DCD0; box-shadow: 0 20px 50px rgba(28,28,30,0.1);">' +
          '<iframe src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3476.8624992912155!2d76.9745986!3d29.374315!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390ddba83ec6336f%3A0x6f6f7bf43110df!2sLux%20Living!5e0!3m2!1sen!2sin!4v1774434095874!5m2!1sen!2sin" width="100%" height="100%" style="border: 0; min-height: 440px; display: block; pointer-events: none;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="LuxLiving Store"></iframe>' +
          '<span style="position: absolute; inset: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.4); pointer-events: none;"></span>' +
          '<span style="position: absolute; top: 16px; left: 16px; z-index: 3; display: flex; flex-direction: column; min-width: 268px; max-width: 288px; box-sizing: border-box; padding: 20px 24px 18px; background: rgba(245,241,235,0.97); backdrop-filter: blur(8px); border: 1px solid #E2DCD0; box-shadow: 0 14px 40px rgba(28,28,30,0.18); pointer-events: none;">' +
            '<span style="font-family: \'Playfair Display\', serif; font-size: 22px; font-weight: 400; color: #1C1C1E; line-height: 1.2;">Lux Living</span>' +
            '<span style="font-family: \'Cormorant Garamond\', serif; font-style: italic; font-size: 13px; color: #C4985A; letter-spacing: 0.5px; margin-top: 2px;">Where Luxury Meets Comfort</span>' +
            '<span style="display: block; width: 34px; height: 1px; background: #DFC9A8; margin: 10px 0;"></span>' +
            '<span style="font-family: \'Inter\', sans-serif; font-size: 11px; line-height: 1.7; color: #57524D;">Khadi Aashram, Near Grand Trunk Rd,<br />Panipat, Haryana 132104</span>' +
            '<span style="font-family: \'Inter\', sans-serif; font-size: 10px; letter-spacing: 1.5px; color: #C4985A; margin-top: 8px;">★★★★★ &nbsp;5.0 &nbsp;·&nbsp; 18 GOOGLE REVIEWS</span>' +
          '</span>' +
          '<span class="map-flagship" style="position: absolute; top: 20px; right: 20px; display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; background: rgba(255,255,255,0.94); backdrop-filter: blur(6px); color: #1C1C1E; font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; border-radius: 24px; box-shadow: 0 6px 18px rgba(28,28,30,0.14);"><span style="width: 6px; height: 6px; border-radius: 50%; background: #C4985A;"></span>Panipat Flagship</span>' +
          '<span data-hover="transform: translateY(-2px); background: #C4985A; color: #fff;" style="position: absolute; left: 20px; bottom: 20px; display: inline-flex; align-items: center; gap: 9px; padding: 13px 22px; background: #FFFFFF; color: #1C1C1E; font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; border-radius: 30px; box-shadow: 0 8px 24px rgba(28,28,30,0.18); transition: transform 0.4s ' + EASE + ', background 0.4s, color 0.4s;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>Open in Google Maps</span>' +
        '</a>' +
      '</div></div></section>';

    return '<div style="animation: pageEnter 0.6s ' + EASE + ' both;">' + h + '</div>';
  }

  function consultInner() {
    if (state.formSubmitted) {
      return '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 360px; text-align: center;">' +
        '<div style="width: 72px; height: 72px; border-radius: 50%; background: #C4985A; color: #fff; font-size: 32px; font-weight: 600; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; animation: successPulse 1.5s ease-in-out;">✓</div>' +
        '<h3 style="font-family: \'Playfair Display\', serif; font-size: 28px; font-weight: 400; margin: 0 0 12px;">Thank You!</h3>' +
        '<p style="font-size: 14px; color: #6B6560; line-height: 1.7; max-width: 320px; margin: 0;">Your email to <strong style="color: #1C1C1E;">luxliving34@gmail.com</strong> is ready to send — just hit send in your mail app. Our design team replies within 24 hours.</p>' +
      '</div>';
    }
    var f = 'width: 100%; box-sizing: border-box; padding: 15px 0; border: none; border-bottom: 1px solid #D8D2C8; background: transparent; font-family: \'Inter\', sans-serif; font-size: 14px; margin-bottom: 20px; outline: none; border-radius: 0; color: #1C1C1E;';
    return '<form id="consult-form">' +
      '<h3 style="font-family: \'Playfair Display\', serif; font-size: 24px; font-weight: 400; margin: 0 0 36px;">Book Free Consultation</h3>' +
      '<input name="name" type="text" placeholder="Your Name *" required class="field" style="' + f + '" />' +
      '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">' +
        '<input name="email" type="email" placeholder="Email" class="field" style="' + f + '" />' +
        '<input name="phone" type="tel" placeholder="Phone *" required class="field" style="' + f + '" />' +
      '</div>' +
      '<select name="service" class="field" style="' + f + '">' +
        '<option value="">Select Service</option><option>Living Room Design</option><option>Bedroom Design</option><option>Complete Home</option><option>Lighting Consultation</option>' +
      '</select>' +
      '<textarea name="message" rows="3" placeholder="Tell us about your project..." class="field" style="' + f + ' resize: vertical;"></textarea>' +
      '<button type="submit" data-hover="transform: translateY(-1px); background: #C4985A;" style="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 16px 44px; background: #1C1C1E; color: #F5F1EB; font-family: \'Inter\', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; border: none; border-radius: 32px; cursor: pointer; transition: transform 0.3s, background 0.5s;"><span>Request Consultation</span></button>' +
      '<p style="text-align: center; font-size: 11px; color: #9B9590; margin: 18px 0 0;">We\'ll get back to you within 24 hours.</p>' +
    '</form>';
  }

  // ---------- HOME behaviors ----------
  function bindHome() {
    // hero slider
    var slides = qsa('.hero-slide', app);
    var bars = qsa('.hero-bar', app);
    var toggleBtn = qs('#hero-toggle', app);
    function paintHero() {
      slides.forEach(function (el, i) {
        var act = i === state.heroSlide;
        el.style.opacity = act ? '1' : '0';
        el.style.pointerEvents = act ? 'auto' : 'none';
        qs('.hero-kb', el).style.animation = act && state.heroPlaying ? 'craftKb 6.4s linear forwards' : 'none';
      });
      bars.forEach(function (b, i) {
        var fill = qs('.hero-bar-fill', b);
        fill.style.animation = (i === state.heroSlide && state.heroPlaying) ? 'barFill6s 6s linear forwards' : 'none';
        fill.style.transform = i < state.heroSlide ? 'scaleX(1)' : (i === state.heroSlide && !state.heroPlaying ? 'scaleX(1)' : 'scaleX(0)');
      });
      toggleBtn.innerHTML = state.heroPlaying
        ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>'
        : '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"></path></svg>';
    }
    var heroTick;
    function startHero() {
      clearInterval(heroTick);
      heroTick = setInterval(function () {
        if (state.heroPlaying && !document.hidden && !document.getElementById('preloader')) {
          state.heroSlide = (state.heroSlide + 1) % heroData.length;
          paintHero();
        }
      }, 6000);
      viewTimers.push(heroTick);
    }
    bars.forEach(function (b, i) {
      b.addEventListener('click', function () { state.heroSlide = i; paintHero(); startHero(); });
    });
    toggleBtn.addEventListener('click', function () { state.heroPlaying = !state.heroPlaying; paintHero(); startHero(); });
    paintHero(); startHero();

    // collections slideshow
    var dslides = qsa('.disc-slide', app);
    var ddots = qsa('.disc-dot', app);
    function paintDisc() {
      dslides.forEach(function (el, i) {
        var act = i === state.discSlide;
        el.style.opacity = act ? '1' : '0';
        el.style.pointerEvents = act ? 'auto' : 'none';
        qs('.disc-kb', el).style.animation = act ? 'craftKb 4.6s linear forwards' : 'none';
      });
      ddots.forEach(function (d, i) {
        d.style.background = i === state.discSlide ? '#C4985A' : 'rgba(255,255,255,0.4)';
        d.style.transform = i === state.discSlide ? 'scale(1.5)' : 'scale(1)';
      });
    }
    ddots.forEach(function (d, i) { d.addEventListener('click', function () { state.discSlide = i; paintDisc(); }); });
    qs('#disc-prev', app).addEventListener('click', function () { state.discSlide = (state.discSlide + cats.length - 1) % cats.length; paintDisc(); });
    qs('#disc-next', app).addEventListener('click', function () { state.discSlide = (state.discSlide + 1) % cats.length; paintDisc(); });
    paintDisc();
    timer(function () {
      if (!document.hidden && !document.getElementById('preloader')) { state.discSlide = (state.discSlide + 1) % cats.length; paintDisc(); }
    }, 4200);

    // ig hover + modal
    qsa('.ig-item', app).forEach(function (a) {
      a.addEventListener('mouseenter', function () { qs('.ig-img', a).style.transform = 'scale(1.08)'; qs('.ig-overlay', a).style.opacity = '1'; });
      a.addEventListener('mouseleave', function () { qs('.ig-img', a).style.transform = 'scale(1)'; qs('.ig-overlay', a).style.opacity = '0'; });
      a.addEventListener('click', function (e) { e.preventDefault(); openIgModal(parseInt(a.getAttribute('data-i'), 10)); });
    });

    // testimonials
    var track = qs('#t-track', app);
    var tdots = qsa('.t-dot', app);
    function paintT() {
      track.style.transform = 'translateX(-' + (state.tIndex * 100) + '%)';
      tdots.forEach(function (d, i) {
        d.style.background = i === state.tIndex ? '#C4985A' : '#D8D2C8';
        d.style.transform = i === state.tIndex ? 'scale(1.5)' : 'scale(1)';
      });
    }
    qs('#t-prev', app).addEventListener('click', function () { state.tIndex = state.tIndex === 0 ? 3 : state.tIndex - 1; paintT(); });
    qs('#t-next', app).addEventListener('click', function () { state.tIndex = (state.tIndex + 1) % 4; paintT(); });
    tdots.forEach(function (d, i) { d.addEventListener('click', function () { state.tIndex = i; paintT(); }); });
    paintT();
    timer(function () { if (!document.hidden) { state.tIndex = (state.tIndex + 1) % 4; paintT(); } }, 5000);

    // consultation form
    bindConsultForm();
  }

  function bindConsultForm() {
    var form = qs('#consult-form', app);
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value, phone = form.phone.value;
      if (!name || !phone) return;
      var email = form.email.value || 'Not provided';
      var service = form.service.value || 'General enquiry';
      var message = form.message.value || 'No additional details';
      var subject = 'New Consultation Request — ' + name;
      var nl = '%0D%0A';
      var body = 'Hello Lux Living team,' + nl + nl +
        'I would like to book a free design consultation. Here are my details:' + nl + nl +
        'Name: ' + name + nl + 'Phone: ' + phone + nl + 'Email: ' + email + nl +
        'Service of interest: ' + service + nl + 'Project details: ' + message + nl + nl +
        'Looking forward to hearing from you.' + nl + '— ' + name;
      window.location.href = 'mailto:luxliving34@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + body;
      state.formSubmitted = true;
      var box = qs('#consult-box', app);
      box.innerHTML = consultInner();
      setTimeout(function () {
        state.formSubmitted = false;
        var b = qs('#consult-box', app);
        if (b) { b.innerHTML = consultInner(); bindHover(b); bindConsultForm(); }
      }, 5000);
    });
  }

  // ---------- IG MODAL ----------
  function openIgModal(i) {
    var p = LUX._instaData()[i];
    var root = document.getElementById('modal-root');
    root.innerHTML = '' +
      '<div id="ig-backdrop" style="position: fixed; inset: 0; z-index: 3100; background: rgba(20,20,22,0.9); display: flex; align-items: center; justify-content: center; padding: 24px; animation: fadeIn 0.3s ease both; cursor: zoom-out;">' +
        '<div id="ig-card" style="display: flex; width: min(960px, 96vw); max-height: 88vh; background: #fff; border-radius: 4px; overflow: hidden; cursor: default; box-shadow: 0 40px 100px rgba(0,0,0,0.5);">' +
          '<div style="flex: 1.15; min-width: 0; background: #EDE8DC; position: relative;"><img src="' + p.img + '" alt="Instagram post" style="width: 100%; height: 100%; max-height: 88vh; object-fit: contain; display: block;" /></div>' +
          '<div style="flex: 0.85; min-width: 300px; display: flex; flex-direction: column;">' +
            '<div style="display: flex; align-items: center; gap: 12px; padding: 18px 22px; border-bottom: 1px solid #EFEAE0;">' +
              '<span style="width: 40px; height: 40px; border-radius: 50%; padding: 2px; background: conic-gradient(from 30deg, #C4985A, #DFC9A8, #1C1C1E, #C4985A); flex-shrink: 0;"><span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 50%; background: #1C1C1E; border: 2px solid #fff;"><img src="images/image-Photoroom (8).png" alt="Lux Living" style="width: 24px; height: 24px; object-fit: contain; filter: brightness(0) invert(1);" /></span></span>' +
              '<div style="flex: 1;"><div style="font-size: 13px; font-weight: 700; color: #1C1C1E;">lux.living34</div><div style="font-size: 11px; color: #9B9590;">Panipat, Haryana</div></div>' +
              '<button id="ig-close" aria-label="Close" data-hover="background: #E8E3DA;" style="width: 34px; height: 34px; border-radius: 50%; border: none; background: #F5F1EB; color: #1C1C1E; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.3s;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>' +
            '</div>' +
            '<div style="flex: 1; overflow-y: auto; padding: 20px 22px;">' +
              '<p style="font-size: 13px; line-height: 1.7; color: #1C1C1E; margin: 0 0 16px;"><strong style="font-weight: 700;">lux.living34</strong> ' + p.caption + '</p>' +
              '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">' + p.tags.map(function (t) { return '<span style="font-size: 12px; color: #C4985A;">' + t + '</span>'; }).join('') + '</div>' +
              '<div style="font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #C4C0B8;">' + p.time + '</div>' +
            '</div>' +
            '<div style="border-top: 1px solid #EFEAE0; padding: 16px 22px;">' +
              '<div style="display: flex; align-items: center; gap: 20px; margin-bottom: 14px;">' +
                '<span style="display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: #1C1C1E;"><svg width="20" height="20" viewBox="0 0 24 24" fill="#E0245E"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>' + p.likes + ' likes</span>' +
                '<span style="display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: #1C1C1E;"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' + p.comments + '</span>' +
              '</div>' +
              '<a href="' + p.url + '" target="_blank" rel="noopener noreferrer" data-hover="background: #C4985A;" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-sizing: border-box; padding: 13px; background: #1C1C1E; color: #F5F1EB; font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; border-radius: 26px; text-decoration: none; transition: background 0.4s;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"></circle></svg>View on Instagram</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    qs('#ig-backdrop').addEventListener('click', closeModals);
    qs('#ig-card').addEventListener('click', function (e) { e.stopPropagation(); });
    qs('#ig-close').addEventListener('click', closeModals);
    bindHover(root);
  }

  function closeModals() { document.getElementById('modal-root').innerHTML = ''; }

  // ---------- PRODUCTS ----------
  function tmplProducts() {
    var h = '<div style="animation: pageEnter 0.6s ' + EASE + ' both; padding-top: 72px;">' +
      '<div style="max-width: 1340px; margin: 0 auto; padding: 80px 52px 130px;">' +
        '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 18px;">Our Collections</span>' +
        '<h1 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.12; text-transform: lowercase; font-size: clamp(36px, 5vw, 64px); margin: 0 0 60px;">browse by room</h1>' +
        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px;">';
    cats.forEach(function (c) {
      var count = products.filter(function (p) { return p.cat === c.key; }).length;
      h += '<a href="' + catHref(c.key) + '" data-cursor="1" data-tilt="1" style="position: relative; display: block; overflow: hidden; aspect-ratio: 16 / 10; text-decoration: none; background: #F0EAE0; transform-style: preserve-3d;">' +
        '<img src="' + c.img + '" alt="' + c.name + '" data-hover="transform: scale(1.05);" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s ' + EASE + ';" />' +
        '<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(28,28,30,0.65), transparent 55%);"></div>' +
        '<div style="position: absolute; left: 32px; bottom: 28px; color: #fff;">' +
          '<div style="font-family: \'Playfair Display\', serif; font-size: 32px; font-weight: 400;">' + c.name + '</div>' +
          '<div style="font-size: 12px; letter-spacing: 1px; color: rgba(255,255,255,0.75); margin-top: 4px;">' + c.desc + ' · ' + count + ' pieces</div>' +
        '</div>' +
      '</a>';
    });
    h += '</div></div></div>';
    return h;
  }

  // ---------- CATEGORY ----------
  function tmplCategory() {
    var cat = cats.find(function (c) { return c.key === route.key; }) || cats[0];
    var tab = cat.tabs.indexOf(route.tab) !== -1 ? route.tab : 'All';
    var all = products.filter(function (p) { return p.cat === cat.key; });
    var list = (tab === 'All' ? all : all.filter(function (p) { return p.sub === tab; }));
    var groups;
    if (cat.key === 'dining') {
      groups = [
        { n: 6, eyebrow: 'Intimate Dining', heading: 'seats six' },
        { n: 8, eyebrow: 'Family Gatherings', heading: 'seats eight' },
        { n: 10, eyebrow: 'The Grand Table', heading: 'seats ten' },
      ].map(function (d) {
        return { hasHeading: true, eyebrow: d.eyebrow, heading: d.heading, items: all.filter(function (p) { return p.seats === d.n; }) };
      }).filter(function (g) { return g.items.length > 0; });
    } else {
      groups = [{ hasHeading: false, items: list }];
    }
    var empty = list.length === 0;

    var h = '<div style="animation: pageEnter 0.6s ' + EASE + ' both;">' +
      '<section style="position: relative; height: 46vh; min-height: 340px; overflow: hidden; background: #1C1C1E;">' +
        '<img src="' + cat.img + '" alt="' + cat.name + '" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.75;" />' +
        '<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(28,28,30,0.7), rgba(28,28,30,0.2));"></div>' +
        '<div style="position: absolute; left: 52px; bottom: 48px; color: #fff; z-index: 2;">' +
          '<a href="#/products" data-hover="color: #fff;" style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.7); text-decoration: none;">← All Collections</a>' +
          '<h1 style="font-family: \'Playfair Display\', serif; font-size: clamp(40px, 6vw, 72px); font-weight: 400; margin: 10px 0 6px; text-transform: lowercase;">' + cat.name.toLowerCase() + '</h1>' +
          '<p style="font-size: 13px; letter-spacing: 1px; color: rgba(255,255,255,0.8); margin: 0;">' + cat.desc + '</p>' +
        '</div>' +
      '</section>' +
      '<section style="padding: 60px 0 130px; background: #F5F1EB;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
        '<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 48px;">';
    cat.tabs.forEach(function (t) {
      var act = t === tab;
      h += '<a href="' + tabHref(cat.key, t) + '" data-hover="border-color: #1C1C1E;" style="display: inline-block; padding: 11px 26px; border-radius: 32px; border: 1px solid ' + (act ? '#1C1C1E' : '#D8D2C8') + '; background: ' + (act ? '#1C1C1E' : 'transparent') + '; color: ' + (act ? '#F5F1EB' : '#1C1C1E') + '; font-family: \'Inter\', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; text-decoration: none; transition: all 0.35s;">' + t + '</a>';
    });
    h += '</div>';
    groups.forEach(function (g) {
      if (g.hasHeading) {
        h += '<div style="margin: 6px 0 28px;">' +
          '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #C4985A; margin-bottom: 8px;">' + g.eyebrow + '</span>' +
          '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; font-size: clamp(26px, 3.4vw, 40px); text-transform: lowercase; margin: 0; line-height: 1;">' + g.heading + '</h2>' +
          '<div style="height: 1px; background: #E2DCD0; margin-top: 22px;"></div>' +
        '</div>';
      }
      h += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px 24px; margin-bottom: 64px;">';
      g.items.forEach(function (p) {
        h += luxCard({ id: p.id, name: p.name, sub: p.sub, img: p.imgs[0], img2: p.imgs[1] || '' }, 'contain', 21);
      });
      h += '</div>';
    });
    if (empty) {
      h += '<div style="text-align: center; padding: 50px 0 30px;">' +
        '<div style="width: 44px; height: 1.5px; background: #C4985A; margin: 0 auto 26px;"></div>' +
        '<div style="font-family: \'Playfair Display\', serif; font-weight: 400; font-size: 30px; text-transform: lowercase; color: #1C1C1E; margin-bottom: 12px;">arriving on the floor soon</div>' +
        '<p style="font-family: \'Cormorant Garamond\', serif; font-style: italic; font-size: 18px; color: #6B6560; margin: 0 auto 26px; max-width: 440px; line-height: 1.7;">We\'re curating this collection now. Message us and we\'ll share exactly what\'s in the showroom today.</p>' +
        '<a href="https://wa.me/' + WA + '" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; padding: 15px 40px; background: #1C1C1E; color: #F5F1EB; font-family: \'Inter\', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; border-radius: 32px;">Enquire on WhatsApp</a>' +
      '</div>';
    }
    h += '</div></section></div>';
    return h;
  }

  // ---------- PRODUCT DETAIL ----------
  function tmplProduct() {
    var p = products.find(function (x) { return x.id === route.id; }) || products[0];
    var cat = cats.find(function (c) { return c.key === p.cat; });
    var related = products.filter(function (x) { return x.cat === p.cat && x.id !== p.id; }).slice(0, 4);
    var multi = p.imgs.length > 1;
    var navBtn = 'position: absolute; top: 50%; transform: translateY(-50%); width: 46px; height: 46px; border-radius: 50%; border: none; background: rgba(245,241,235,0.9); backdrop-filter: blur(6px); color: #1C1C1E; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 18px rgba(0,0,0,0.12); transition: all 0.3s; z-index: 3;';

    var h = '<div style="animation: pageEnter 0.6s ' + EASE + ' both; padding-top: 72px;">' +
      '<div style="max-width: 1340px; margin: 0 auto; padding: 48px 52px 130px;">' +
        '<div style="font-size: 12px; color: #9B9590; margin-bottom: 32px; display: flex; gap: 8px; align-items: center;">' +
          '<a href="#/" data-hover="color: #C4985A;" style="color: #9B9590; text-decoration: none;">Home</a><span>/</span>' +
          '<a href="' + catHref(cat.key) + '" data-hover="color: #C4985A;" style="color: #9B9590; text-decoration: none;">' + cat.name + '</a><span>/</span>' +
          '<span style="color: #1C1C1E;">' + p.name + '</span>' +
        '</div>' +
        '<div style="display: grid; grid-template-columns: 7fr 5fr; gap: 72px; align-items: start;">' +
          '<div>' +
            '<div id="pdp-stage" style="position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: #F0EAE0; margin-bottom: 14px; cursor: zoom-in;">';
    p.imgs.forEach(function (img, i) {
      h += '<img class="pdp-slide" data-i="' + i + '" src="' + img + '" alt="' + p.name + '" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; transform: scale(1); transition: opacity 0.9s ' + EASE + ', transform 5.5s ' + EASE + ';" />';
    });
    h += '<button id="pdp-zoom-btn" aria-label="Zoom image" data-hover="background: #C4985A; color: #fff;" style="position: absolute; left: 18px; top: 18px; width: 42px; height: 42px; border-radius: 50%; border: none; background: rgba(245,241,235,0.9); backdrop-filter: blur(6px); color: #1C1C1E; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 18px rgba(0,0,0,0.12); transition: all 0.3s; z-index: 3;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"></path></svg></button>';
    if (multi) {
      h += '<button id="pdp-prev" aria-label="Previous image" data-hover="background: #C4985A; color: #fff;" style="left: 18px; ' + navBtn + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"></path></svg></button>' +
        '<button id="pdp-next" aria-label="Next image" data-hover="background: #C4985A; color: #fff;" style="right: 18px; ' + navBtn + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg></button>' +
        '<div style="position: absolute; left: 0; right: 0; bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 10px; z-index: 3;">';
      p.imgs.forEach(function (_, i) {
        h += '<button class="pdp-dot" data-i="' + i + '" aria-label="Go to image" style="width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.6); border: none; cursor: pointer; transition: all 0.35s; transform: scale(1); padding: 0; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></button>';
      });
      h += '</div>' +
        '<button id="pdp-play" aria-label="Play or pause slideshow" data-hover="background: #C4985A;" style="position: absolute; right: 18px; bottom: 14px; width: 40px; height: 40px; border-radius: 50%; border: none; background: rgba(28,28,30,0.55); backdrop-filter: blur(6px); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s; z-index: 3;"></button>';
    }
    h += '</div>' +
      '<div class="pdp-thumbs" style="display: flex; gap: 12px;">';
    p.imgs.forEach(function (img, i) {
      h += '<button class="pdp-thumb" data-i="' + i + '" style="width: 110px; height: 82px; padding: 0; border: 2px solid transparent; background: #F0EAE0; cursor: pointer; overflow: hidden; transition: border-color 0.3s;"><img src="' + img + '" alt="View" style="width: 100%; height: 100%; object-fit: cover; display: block;" /></button>';
    });
    h += '</div></div>' +
      '<div style="position: sticky; top: 104px;">' +
        '<div style="font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #C4985A; margin-bottom: 14px;">' + p.sub + ' · aprilstory × LuxLiving</div>' +
        '<h1 style="font-family: \'Playfair Display\', serif; font-size: clamp(30px, 3.5vw, 44px); font-weight: 400; line-height: 1.15; margin: 0 0 22px;">' + p.name + '</h1>' +
        '<p style="font-size: 14px; line-height: 1.9; color: #6B6560; margin: 0 0 28px;">' + p.desc + '</p>' +
        '<div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 36px;">' +
        p.feats.map(function (f) {
          return '<div style="display: flex; align-items: center; gap: 12px; font-size: 13px; color: #1C1C1E;"><span style="width: 5px; height: 5px; border-radius: 50%; background: #C4985A; flex-shrink: 0;"></span>' + f + '</div>';
        }).join('') +
        '</div>' +
        '<div style="border-top: 1px solid #E8E3DA; padding-top: 28px;">' +
          '<p style="font-family: \'Cormorant Garamond\', serif; font-style: italic; font-size: 16px; color: #6B6560; margin: 0 0 18px;">For pricing and availability, message us directly — we reply within minutes.</p>' +
          '<a href="https://wa.me/' + WA + '?text=' + waProductMessage(p) + '" target="_blank" rel="noopener noreferrer" data-hover="transform: translateY(-2px); box-shadow: 0 8px 28px rgba(37,211,102,0.35);" style="display: inline-flex; width: 100%; box-sizing: border-box; align-items: center; justify-content: center; gap: 10px; padding: 17px 44px; background: #25D366; color: #fff; font-size: 11px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; border-radius: 32px; text-decoration: none; transition: transform 0.3s, box-shadow 0.3s;">' + WA_SVG + '<span>Enquire on WhatsApp</span></a>' +
          '<a href="tel:+919034116534" data-hover="background: #1C1C1E; border-color: #1C1C1E; color: #F5F1EB;" style="display: inline-flex; width: 100%; box-sizing: border-box; align-items: center; justify-content: center; gap: 8px; padding: 15px 44px; margin-top: 12px; background: transparent; color: #1C1C1E; font-size: 11px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; border: 1px solid #D8D2C8; border-radius: 32px; text-decoration: none; transition: all 0.35s;"><span>Call the Showroom</span></a>' +
        '</div>' +
      '</div>' +
    '</div>';
    if (related.length) {
      h += '<div style="margin-top: 110px;">' +
        '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; text-transform: lowercase; font-size: clamp(26px, 3vw, 38px); margin: 0 0 36px;">you may also like</h2>' +
        '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">';
      related.forEach(function (rp) {
        h += '<a href="' + prodHref(rp.id) + '" style="display: block; text-decoration: none; color: #1C1C1E;">' +
          '<div style="position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: #F0EAE0; margin-bottom: 12px;">' +
            '<img src="' + rp.imgs[0] + '" alt="' + rp.name + '" loading="lazy" data-hover="transform: scale(1.06);" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; transition: transform 0.7s ' + EASE + ';" />' +
          '</div>' +
          '<div style="font-family: \'Playfair Display\', serif; font-size: 17px; line-height: 1.3;">' + rp.name + '</div>' +
          '<div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #9B9590; margin-top: 4px;">' + rp.sub + '</div>' +
        '</a>';
      });
      h += '</div></div>';
    }
    h += '</div></div>';
    return h;
  }

  function bindProduct() {
    var p = products.find(function (x) { return x.id === route.id; }) || products[0];
    var slides = qsa('.pdp-slide', app);
    var dots = qsa('.pdp-dot', app);
    var thumbs = qsa('.pdp-thumb', app);
    var playBtn = qs('#pdp-play', app);
    var n = p.imgs.length;
    function cur() { return Math.min(state.pdpImg, n - 1); }
    function paint() {
      slides.forEach(function (el, i) {
        var act = i === cur();
        el.style.opacity = act ? '1' : '0';
        el.style.transform = act ? 'scale(1.05)' : 'scale(1)';
      });
      dots.forEach(function (d, i) {
        d.style.background = i === cur() ? '#C4985A' : 'rgba(255,255,255,0.6)';
        d.style.transform = i === cur() ? 'scale(1.5)' : 'scale(1)';
      });
      thumbs.forEach(function (t, i) { t.style.borderColor = i === cur() ? '#C4985A' : 'transparent'; });
      if (playBtn) {
        playBtn.innerHTML = state.pdpPlaying
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>'
          : '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"></path></svg>';
      }
      var counter = qs('#zoom-counter');
      if (counter) counter.textContent = (cur() + 1) + ' / ' + n;
      var zimg = qs('#zoom-img');
      if (zimg) zimg.src = p.imgs[cur()];
    }
    function prev() { state.pdpImg = (cur() + n - 1) % n; state.pdpPlaying = false; paint(); }
    function next() { state.pdpImg = (cur() + 1) % n; state.pdpPlaying = false; paint(); }
    dots.forEach(function (d, i) { d.addEventListener('click', function (e) { e.stopPropagation(); state.pdpImg = i; state.pdpPlaying = false; paint(); }); });
    thumbs.forEach(function (t, i) { t.addEventListener('click', function () { state.pdpImg = i; state.pdpPlaying = false; paint(); }); });
    var pb = qs('#pdp-prev', app), nb = qs('#pdp-next', app);
    if (pb) pb.addEventListener('click', function (e) { e.stopPropagation(); prev(); });
    if (nb) nb.addEventListener('click', function (e) { e.stopPropagation(); next(); });
    if (playBtn) playBtn.addEventListener('click', function (e) { e.stopPropagation(); state.pdpPlaying = !state.pdpPlaying; paint(); });
    qs('#pdp-stage', app).addEventListener('click', function () { openZoom(p, cur, prev, next, paint); });
    qs('#pdp-zoom-btn', app).addEventListener('click', function (e) { e.stopPropagation(); openZoom(p, cur, prev, next, paint); });
    paint();
    timer(function () {
      if (state.pdpPlaying && !document.hidden && !qs('#zoom-backdrop') && n > 1) {
        state.pdpImg = (cur() + 1) % n; paint();
      }
    }, 3600);
  }

  function openZoom(p, cur, prev, next, paintGallery) {
    state.pdpPlaying = false;
    state.pdpZoomScale = 1;
    paintGallery();
    var root = document.getElementById('modal-root');
    var navBtn = 'width: 46px; height: 46px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.06); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s;';
    root.innerHTML = '' +
      '<div id="zoom-backdrop" style="position: fixed; inset: 0; z-index: 3000; background: rgba(20,20,22,0.94); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.35s ease both; cursor: zoom-out;">' +
        '<button id="zoom-close" aria-label="Close" data-hover="background: rgba(255,255,255,0.16);" style="position: absolute; top: 28px; right: 32px; width: 48px; height: 48px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.06); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s; z-index: 3;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>' +
        '<div id="zoom-stage" style="position: relative; width: min(88vw, 1200px); height: min(84vh, 860px); overflow: hidden; cursor: zoom-in; border-radius: 2px;">' +
          '<img id="zoom-img" src="' + p.imgs[cur()] + '" alt="' + p.name + '" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; transform-origin: center center; transform: scale(1); transition: transform 0.35s ' + EASE + ';" />' +
        '</div>' +
        '<div style="position: absolute; bottom: 30px; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 22px; z-index: 3;">' +
          '<button id="zoom-prev" aria-label="Previous" data-hover="background: #C4985A; border-color: #C4985A;" style="' + navBtn + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"></path></svg></button>' +
          '<span id="zoom-counter" style="font-size: 12px; letter-spacing: 2px; color: rgba(255,255,255,0.7); min-width: 54px; text-align: center;">' + (cur() + 1) + ' / ' + p.imgs.length + '</span>' +
          '<button id="zoom-next" aria-label="Next" data-hover="background: #C4985A; border-color: #C4985A;" style="' + navBtn + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg></button>' +
        '</div>' +
        '<span style="position: absolute; top: 32px; left: 32px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.5); z-index: 3;">Click image to zoom · move to pan</span>' +
      '</div>';
    var img = qs('#zoom-img'), stage = qs('#zoom-stage');
    qs('#zoom-backdrop').addEventListener('click', closeModals);
    qs('#zoom-close').addEventListener('click', function (e) { e.stopPropagation(); closeModals(); });
    qs('#zoom-prev').addEventListener('click', function (e) { e.stopPropagation(); prev(); });
    qs('#zoom-next').addEventListener('click', function (e) { e.stopPropagation(); next(); });
    stage.addEventListener('click', function (e) {
      e.stopPropagation();
      state.pdpZoomScale = state.pdpZoomScale > 1 ? 1 : 2.3;
      img.style.transform = 'scale(' + state.pdpZoomScale + ')';
      stage.style.cursor = state.pdpZoomScale > 1 ? 'zoom-out' : 'zoom-in';
    });
    stage.addEventListener('mousemove', function (e) {
      if (state.pdpZoomScale <= 1) return;
      var r = stage.getBoundingClientRect();
      img.style.transformOrigin = (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '% ' + (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%';
    });
    stage.addEventListener('mouseleave', function () {
      if (state.pdpZoomScale > 1) { state.pdpZoomScale = 1; img.style.transform = 'scale(1)'; stage.style.cursor = 'zoom-in'; }
    });
    bindHover(root);
  }

  // ---------- BRANDS ----------
  function tmplBrands() {
    var h = '<div style="animation: pageEnter 0.6s ' + EASE + ' both;">' +
      '<section style="position: relative; padding: 190px 52px 90px; background: #1C1C1E; color: #fff; overflow: hidden;">' +
        '<div style="max-width: 1340px; margin: 0 auto; position: relative; z-index: 2;">' +
          '<span data-reveal style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #DFC9A8; margin-bottom: 22px;">Our Partners</span>' +
          '<h1 data-reveal style="font-family: \'Playfair Display\', serif; font-size: clamp(44px, 6.5vw, 84px); font-weight: 400; line-height: 1.08; margin: 0 0 28px; text-transform: lowercase;">the brands<br />we work with</h1>' +
          '<p data-reveal style="font-family: \'Cormorant Garamond\', serif; font-style: italic; font-size: 19px; line-height: 1.85; color: rgba(255,255,255,0.72); max-width: 640px; margin: 0;">As authorised franchise partners, we bring three of the world\'s most considered furniture houses under one roof — from a leading Chinese design label to Italian ateliers, in 100% leather and premium fabric.</p>' +
        '</div>' +
      '</section>' +
      '<section style="background: #F5F1EB; padding: 100px 0 130px;">' +
        '<div style="max-width: 1340px; margin: 0 auto; padding: 0 52px; display: flex; flex-direction: column; gap: 32px;">';
    brands.forEach(function (b) {
      h += '<div data-reveal data-cursor="1" class="brand-list-card" style="display: grid; grid-template-columns: 1.1fr 1fr; background: #FFFFFF; overflow: hidden; box-shadow: 0 4px 40px rgba(28,28,30,0.06); min-height: 440px;">' +
        '<div data-tilt="1" style="position: relative; overflow: hidden; background: #EDE8DC;">' +
          '<img src="' + b.img + '" alt="' + b.name + '" loading="lazy" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: ' + b.pos + '; transition: transform 1s ' + EASE + ';" />' +
          '<span style="position: absolute; top: 26px; left: 26px; background: rgba(28,28,30,0.72); backdrop-filter: blur(6px); color: #fff; font-size: 9px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; padding: 8px 15px; border-radius: 20px;">' + b.origin + '</span>' +
        '</div>' +
        '<div style="padding: 60px 56px; display: flex; flex-direction: column; justify-content: center;">' +
          '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #C4985A; margin-bottom: 16px;">' + b.kicker + '</span>' +
          '<h2 style="font-family: \'Playfair Display\', serif; font-size: clamp(30px, 3.5vw, 44px); font-weight: 400; line-height: 1.12; margin: 0 0 18px;">' + b.name + '</h2>' +
          '<p style="font-size: 14px; line-height: 1.9; color: #6B6560; margin: 0 0 28px;">' + b.blurb + '</p>' +
          '<div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 36px;">' +
          b.tags.map(function (t) { return '<span style="font-size: 11px; letter-spacing: 1px; color: #1C1C1E; border: 1px solid #E2DCD0; padding: 7px 14px; border-radius: 20px;">' + t + '</span>'; }).join('') +
          '</div>' +
          '<a href="#/brand/' + b.id + '" data-hover="gap: 16px; color: #C4985A; border-color: #C4985A;" style="display: inline-flex; align-items: center; gap: 10px; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #1C1C1E; text-decoration: none; align-self: flex-start; padding-bottom: 6px; border-bottom: 1px solid #1C1C1E; transition: gap 0.4s ' + EASE + ', color 0.35s, border-color 0.35s;"><span>Explore Brand</span>' + ARR + '</a>' +
        '</div>' +
      '</div>';
    });
    h += '</div></section></div>';
    return h;
  }

  // ---------- BRAND DETAIL ----------
  function tmplBrand() {
    var b = brands.find(function (x) { return x.id === route.id; }) || brands[0];
    var wa = 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Hi, I would like to know more about ' + b.name + ' — availability and delivery.');
    var h = '<div style="animation: pageEnter 0.6s ' + EASE + ' both;">' +
      '<section style="position: relative; height: 78vh; min-height: 520px; overflow: hidden; background: #1C1C1E;">' +
        '<img src="' + b.img + '" alt="' + b.name + '" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: ' + b.pos + '; opacity: 0.62;" />' +
        '<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(28,28,30,0.82) 0%, rgba(28,28,30,0.15) 55%, rgba(28,28,30,0.35) 100%);"></div>' +
        '<div style="position: absolute; left: 52px; right: 52px; bottom: 60px; z-index: 2; color: #fff; max-width: 1340px; margin: 0 auto;">' +
          '<a href="#/brands" data-hover="gap: 12px; color: #fff;" style="display: inline-flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.7); text-decoration: none; margin-bottom: 26px; transition: gap 0.35s, color 0.35s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"></path></svg>All Brands</a>' +
          '<span style="display: block; font-size: 11px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #DFC9A8; margin-bottom: 16px;">' + b.origin + ' · ' + b.material + '</span>' +
          '<h1 style="font-family: \'Playfair Display\', serif; font-size: clamp(44px, 6.5vw, 88px); font-weight: 400; line-height: 1.05; margin: 0;">' + b.name + '</h1>' +
        '</div>' +
      '</section>' +
      '<section style="background: #F5F1EB; padding: 110px 0;">' +
        '<div style="max-width: 1340px; margin: 0 auto; padding: 0 52px; display: grid; grid-template-columns: 1fr 1.2fr; gap: 80px; align-items: start;">' +
          '<div data-reveal><div style="width: 48px; height: 1.5px; background: #C4985A; margin-bottom: 28px;"></div>' +
          '<h2 style="font-family: \'Playfair Display\', serif; font-size: clamp(28px, 3.5vw, 40px); font-weight: 400; line-height: 1.15; margin: 0; text-transform: lowercase;">' + b.tagline + '</h2></div>' +
          '<div data-reveal>' + b.paras.map(function (bp) { return '<p style="font-size: 15px; line-height: 1.95; color: #57524D; margin: 0 0 22px;">' + bp + '</p>'; }).join('') + '</div>' +
        '</div>' +
      '</section>' +
      '<section style="background: #1C1C1E; color: #F5F1EB; padding: 80px 0;">' +
        '<div style="max-width: 1340px; margin: 0 auto; padding: 0 52px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px;">' +
        b.facts.map(function (bf) {
          return '<div data-reveal><div style="font-size: 9px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #C4985A; margin-bottom: 14px;">' + bf.label + '</div>' +
            '<div style="font-family: \'Playfair Display\', serif; font-size: clamp(20px, 2.2vw, 27px); font-weight: 400; line-height: 1.25;">' + bf.value + '</div></div>';
        }).join('') +
        '</div>' +
      '</section>' +
      '<section style="background: #F5F1EB; padding: 110px 0;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
        '<div data-reveal style="text-align: center; margin-bottom: 56px;">' +
          '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 16px;">' + b.locLabel + '</span>' +
          '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; font-size: clamp(30px, 4vw, 46px); text-transform: lowercase; margin: 0;">' + b.locTitle + '</h2>' +
        '</div>' +
        '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">' +
        b.locations.map(function (bl) {
          var parts = bl.split(' · ');
          var tag = parts[1] ? '<div style="font-size: 9px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #C4985A; margin-top: 8px;">' + parts[1] + '</div>' : '';
          return '<div data-reveal data-tilt="1" style="background: #fff; padding: 34px 30px; box-shadow: 0 4px 30px rgba(0,0,0,0.04); text-align: center;' + (parts[1] ? ' border: 1px solid #DFC9A8;' : '') + '">' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C4985A" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>' +
            '<div style="font-family: \'Playfair Display\', serif; font-size: 21px; font-weight: 400;">' + parts[0] + '</div>' + tag + '</div>';
        }).join('') +
        '</div>' +
      '</div></section>' +
      '<section style="background: #EDE8DC; padding: 100px 0; text-align: center;">' +
        '<div data-reveal style="max-width: 620px; margin: 0 auto; padding: 0 52px;">' +
          '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; font-size: clamp(30px, 4vw, 46px); text-transform: lowercase; margin: 0 0 22px;">bring ' + b.name + ' home.</h2>' +
          '<p style="font-family: \'Cormorant Garamond\', serif; font-style: italic; font-size: 17px; line-height: 1.9; color: #6B6560; margin: 0 0 38px;">Talk to our team about availability, finishes and delivery to your city.</p>' +
          '<div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">' +
            pillDark(wa, 'Enquire on WhatsApp', 'target="_blank" rel="noopener noreferrer"') +
            '<a href="#/products" data-hover="background: #1C1C1E; color: #F5F1EB;" style="display: inline-flex; align-items: center; gap: 8px; padding: 16px 40px; background: transparent; color: #1C1C1E; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; border: 1px solid #1C1C1E; border-radius: 32px; text-decoration: none; transition: all 0.35s;"><span>Browse Collections</span></a>' +
          '</div>' +
        '</div>' +
      '</section></div>';
    return h;
  }

  // ---------- CRAFT ----------
  function tmplCraft() {
    var slides = LUX._craftSlides();
    var h = '<div style="animation: pageEnter 0.6s ' + EASE + ' both;">' +
      '<section style="position: relative; height: 64vh; min-height: 440px; overflow: hidden; background: #1C1C1E;">' +
        '<img src="assets/catalog/craft/2.jpg" alt="The aprilstory techniques wall" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 32%; opacity: 0.5;" />' +
        '<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(28,28,30,0.75), rgba(28,28,30,0.2));"></div>' +
        '<div style="position: absolute; left: 52px; bottom: 56px; color: #fff; z-index: 2; max-width: 640px;">' +
          '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #DFC9A8; margin-bottom: 16px;">aprilstory × LuxLiving</span>' +
          '<h1 style="font-family: \'Playfair Display\', serif; font-size: clamp(40px, 6vw, 72px); font-weight: 400; margin: 0 0 16px; text-transform: lowercase; line-height: 1.1;">how our products<br />are made</h1>' +
          '<p style="font-family: \'Cormorant Garamond\', serif; font-style: italic; font-size: 17px; line-height: 1.8; color: rgba(255,255,255,0.85); margin: 0;">Seven stations on our showroom floor put the materials in your hands — frame, adhesive, leather, springs and foam, tested far beyond the standard.</p>' +
        '</div>' +
      '</section>' +
      '<section style="background: #1C1C1E; padding: 110px 0; color: #F5F1EB; overflow: hidden;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;">' +
          '<div>' +
            '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 28px;">The Craft Tour</span>' +
            '<div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 18px;">' +
              '<span id="craft-num" style="font-family: \'Playfair Display\', serif; font-size: 72px; font-weight: 400; line-height: 1; color: #F5F1EB;">01</span>' +
              '<span style="font-family: \'Playfair Display\', serif; font-size: 22px; color: rgba(245,241,235,0.35);">/ 07</span>' +
            '</div>' +
            '<h2 id="craft-title" style="font-family: \'Playfair Display\', serif; font-weight: 400; font-size: clamp(28px, 3.5vw, 42px); text-transform: lowercase; line-height: 1.15; margin: 0 0 20px; min-height: 2.3em;"></h2>' +
            '<p id="craft-text" style="font-size: 14px; line-height: 1.9; color: rgba(245,241,235,0.65); margin: 0 0 40px; min-height: 5.7em;"></p>' +
            '<div style="display: flex; align-items: center; gap: 24px;">' +
              '<button id="craft-prev" aria-label="Previous" data-hover="background: #C4985A; border-color: #C4985A;" style="width: 50px; height: 50px; border-radius: 50%; border: 1px solid rgba(245,241,235,0.25); background: none; display: flex; align-items: center; justify-content: center; color: #F5F1EB; cursor: pointer; transition: all 0.35s;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"></path></svg></button>' +
              '<div style="display: flex; gap: 10px;">' +
              slides.map(function (_, i) { return '<button class="craft-dot" data-i="' + i + '" aria-label="Go to slide" style="width: 8px; height: 8px; border-radius: 50%; background: rgba(245,241,235,0.25); border: none; cursor: pointer; transition: all 0.35s; transform: scale(1); padding: 0;"></button>'; }).join('') +
              '</div>' +
              '<button id="craft-next" aria-label="Next" data-hover="background: #C4985A; border-color: #C4985A;" style="width: 50px; height: 50px; border-radius: 50%; border: 1px solid rgba(245,241,235,0.25); background: none; display: flex; align-items: center; justify-content: center; color: #F5F1EB; cursor: pointer; transition: all 0.35s;">' + ARR.replace('width="16" height="16"', 'width="18" height="18"') + '</button>' +
            '</div>' +
            '<div style="margin-top: 32px; width: 220px; height: 2px; background: rgba(245,241,235,0.12); overflow: hidden;">' +
              '<div id="craft-progress" style="height: 100%; background: #C4985A; transition: width 0.6s ' + EASE + '; width: 14.3%;"></div>' +
            '</div>' +
          '</div>' +
          '<div data-cursor="1" style="perspective: 1200px;">' +
            '<div data-tilt="1" style="position: relative; aspect-ratio: 3 / 4; max-height: 660px; overflow: hidden; background: #242427; box-shadow: 0 30px 80px rgba(0,0,0,0.45);">' +
            slides.map(function (cs, i) { return '<img class="craft-slide" data-i="' + i + '" src="' + cs.img + '" alt="' + cs.title + '" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.9s ' + EASE + ';" />'; }).join('') +
            '<div id="craft-caption" style="position: absolute; left: 0; right: 0; bottom: 0; padding: 40px 28px 20px; background: linear-gradient(to top, rgba(28,28,30,0.8), transparent); font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.85);"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div></section>' +
      tmplWallTour() +
      '<section style="background: #F5F1EB; padding: 130px 0;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
        '<div data-reveal style="text-align: center; margin-bottom: 64px;">' +
          '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 18px;">Engineered to Last</span>' +
          '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.12; text-transform: lowercase; font-size: clamp(32px, 4.5vw, 52px); margin: 0;">six exclusive techniques</h2>' +
        '</div>' +
        '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; perspective: 1400px;">' +
        LUX._techniques().map(function (tq) {
          return '<div data-tilt="1" data-reveal style="background: #FFFFFF; padding: 44px 36px; box-shadow: 0 4px 30px rgba(0,0,0,0.04); transform-style: preserve-3d;">' +
            '<div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 22px;">' +
              '<span style="font-family: \'Playfair Display\', serif; font-size: 52px; font-weight: 400; color: #DFC9A8; line-height: 1;">' + tq.num + '</span>' +
              '<span style="font-size: 9px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #C4985A;">' + tq.tag + '</span>' +
            '</div>' +
            '<h3 style="font-family: \'Playfair Display\', serif; font-size: 24px; font-weight: 400; margin: 0 0 12px; text-transform: lowercase;">' + tq.title + '</h3>' +
            '<p style="font-size: 13px; line-height: 1.85; color: #6B6560; margin: 0;">' + tq.desc + '</p>' +
          '</div>';
        }).join('') +
        '</div>' +
      '</div></section>' +
      '<section style="background: #EDE8DC; padding: 110px 0; text-align: center;">' +
        '<div data-reveal style="max-width: 640px; margin: 0 auto; padding: 0 52px;">' +
          '<div style="width: 48px; height: 1.5px; background: #C4985A; margin: 0 auto 32px;"></div>' +
          '<h2 style="font-family: \'Playfair Display\', serif; font-weight: 400; line-height: 1.12; text-transform: lowercase; font-size: clamp(30px, 4vw, 46px); margin: 0 0 22px;">built to be kept.</h2>' +
          '<p style="font-family: \'Cormorant Garamond\', serif; font-style: italic; font-size: 17px; line-height: 1.9; color: #6B6560; margin: 0 0 40px;">See the pieces these techniques build — on our floor, ready to try.</p>' +
          '<div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">' +
            pillDark('#/products', 'Browse Collections') + pillOutline('#/consultation', 'Book a Consultation') +
          '</div>' +
        '</div>' +
      '</section></div>';
    return h;
  }

  // Wall Tour — the techniques wall, told station by station (light counterpart of the Craft Tour)
  function tmplWallTour() {
    var walls = LUX._wallSlides();
    return '<section style="background: #EDE8DC; padding: 110px 0; color: #1C1C1E; overflow: hidden;"><div style="max-width: 1340px; margin: 0 auto; padding: 0 52px;">' +
      '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;">' +
        '<div data-cursor="1" style="perspective: 1200px;">' +
          '<div data-tilt="1" style="position: relative; aspect-ratio: 5 / 4; overflow: hidden; background: #F5F1EB; box-shadow: 0 30px 70px rgba(28,28,30,0.18);">' +
          walls.map(function (w, i) { return '<img class="wall-slide" data-i="' + i + '" src="' + w.img + '" alt="' + w.title + '" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.9s ' + EASE + ';" />'; }).join('') +
          '<div id="wall-caption" style="position: absolute; left: 0; right: 0; bottom: 0; padding: 40px 28px 20px; background: linear-gradient(to top, rgba(28,28,30,0.8), transparent); font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.85);"></div>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<span style="display: block; font-size: 10px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #C4985A; margin-bottom: 28px;">The Wall Tour</span>' +
          '<div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 18px;">' +
            '<span id="wall-num" style="font-family: \'Playfair Display\', serif; font-size: 72px; font-weight: 400; line-height: 1; color: #1C1C1E;">01·02</span>' +
            '<span style="font-family: \'Playfair Display\', serif; font-size: 22px; color: rgba(28,28,30,0.35);">/ 04</span>' +
          '</div>' +
          '<h2 id="wall-title" style="font-family: \'Playfair Display\', serif; font-weight: 400; font-size: clamp(28px, 3.5vw, 42px); text-transform: lowercase; line-height: 1.15; margin: 0 0 20px; min-height: 2.3em;"></h2>' +
          '<p id="wall-text" style="font-size: 14px; line-height: 1.9; color: #6B6560; margin: 0 0 40px; min-height: 5.7em;"></p>' +
          '<div style="display: flex; align-items: center; gap: 24px;">' +
            '<button id="wall-prev" aria-label="Previous" data-hover="background: #C4985A; border-color: #C4985A; color: #fff;" style="width: 50px; height: 50px; border-radius: 50%; border: 1px solid rgba(28,28,30,0.25); background: none; display: flex; align-items: center; justify-content: center; color: #1C1C1E; cursor: pointer; transition: all 0.35s;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"></path></svg></button>' +
            '<div style="display: flex; gap: 10px;">' +
            walls.map(function (_, i) { return '<button class="wall-dot" data-i="' + i + '" aria-label="Go to slide" style="width: 8px; height: 8px; border-radius: 50%; background: rgba(28,28,30,0.2); border: none; cursor: pointer; transition: all 0.35s; transform: scale(1); padding: 0;"></button>'; }).join('') +
            '</div>' +
            '<button id="wall-next" aria-label="Next" data-hover="background: #C4985A; border-color: #C4985A; color: #fff;" style="width: 50px; height: 50px; border-radius: 50%; border: 1px solid rgba(28,28,30,0.25); background: none; display: flex; align-items: center; justify-content: center; color: #1C1C1E; cursor: pointer; transition: all 0.35s;">' + ARR.replace('width="16" height="16"', 'width="18" height="18"') + '</button>' +
          '</div>' +
          '<div style="margin-top: 32px; width: 220px; height: 2px; background: rgba(28,28,30,0.12); overflow: hidden;">' +
            '<div id="wall-progress" style="height: 100%; background: #C4985A; transition: width 0.6s ' + EASE + '; width: 25%;"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div></section>';
  }

  function bindWallTour() {
    var walls = LUX._wallSlides();
    var imgs = qsa('.wall-slide', app);
    var dots = qsa('.wall-dot', app);
    function paint() {
      var i = state.wallSlide;
      imgs.forEach(function (el, k) {
        el.style.opacity = k === i ? '1' : '0';
        el.style.animation = k === i ? 'craftKb 6s linear forwards' : 'none';
      });
      dots.forEach(function (d, k) {
        d.style.background = k === i ? '#C4985A' : 'rgba(28,28,30,0.2)';
        d.style.transform = k === i ? 'scale(1.5)' : 'scale(1)';
      });
      qs('#wall-num', app).textContent = walls[i].num;
      qs('#wall-title', app).textContent = walls[i].title;
      qs('#wall-text', app).textContent = walls[i].text;
      qs('#wall-caption', app).textContent = walls[i].caption;
      qs('#wall-progress', app).style.width = (((i + 1) / walls.length) * 100).toFixed(1) + '%';
    }
    qs('#wall-prev', app).addEventListener('click', function () { state.wallSlide = state.wallSlide === 0 ? walls.length - 1 : state.wallSlide - 1; paint(); });
    qs('#wall-next', app).addEventListener('click', function () { state.wallSlide = (state.wallSlide + 1) % walls.length; paint(); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { state.wallSlide = i; paint(); }); });
    paint();
    timer(function () { if (!document.hidden) { state.wallSlide = (state.wallSlide + 1) % walls.length; paint(); } }, 6000);
  }

  function bindCraft() {
    var slides = LUX._craftSlides();
    var imgs = qsa('.craft-slide', app);
    var dots = qsa('.craft-dot', app);
    function paint() {
      var i = state.craftSlide;
      imgs.forEach(function (el, k) {
        el.style.opacity = k === i ? '1' : '0';
        el.style.animation = k === i ? 'craftKb 5.2s linear forwards' : 'none';
      });
      dots.forEach(function (d, k) {
        d.style.background = k === i ? '#C4985A' : 'rgba(245,241,235,0.25)';
        d.style.transform = k === i ? 'scale(1.5)' : 'scale(1)';
      });
      qs('#craft-num', app).textContent = String(i + 1).padStart(2, '0');
      qs('#craft-title', app).textContent = slides[i].title;
      qs('#craft-text', app).textContent = slides[i].text;
      qs('#craft-caption', app).textContent = slides[i].caption;
      qs('#craft-progress', app).style.width = (((i + 1) / slides.length) * 100).toFixed(1) + '%';
    }
    qs('#craft-prev', app).addEventListener('click', function () { state.craftSlide = state.craftSlide === 0 ? slides.length - 1 : state.craftSlide - 1; paint(); });
    qs('#craft-next', app).addEventListener('click', function () { state.craftSlide = (state.craftSlide + 1) % slides.length; paint(); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { state.craftSlide = i; paint(); }); });
    paint();
    timer(function () { if (!document.hidden) { state.craftSlide = (state.craftSlide + 1) % slides.length; paint(); } }, 5200);
  }

  // ---------- FOOTER ----------
  function renderFooter() {
    var root = document.getElementById('footer-root');
    var fl = 'color: rgba(255,255,255,0.55); text-decoration: none; font-size: 13px; transition: color 0.3s; width: fit-content;';
    root.innerHTML = '' +
      '<footer style="background: #1C1C1E; color: rgba(255,255,255,0.75); padding: 80px 48px 40px;"><div style="max-width: 1340px; margin: 0 auto;">' +
        '<div style="display: flex; align-items: flex-start; gap: 80px; margin-bottom: 48px;">' +
          '<div style="display: flex; flex-direction: column; align-items: center; gap: 14px; flex-shrink: 0;">' +
            '<img src="images/image-Photoroom (8).png" alt="Lux Living" data-hover="transform: scale(1.05) rotate(6deg); filter: brightness(0) invert(0.85) sepia(0.6) saturate(3) hue-rotate(-14deg);" style="width: 96px; height: 96px; object-fit: contain; filter: brightness(0) invert(0.92) sepia(0.18) saturate(2.2) hue-rotate(-12deg); transition: transform 0.6s ' + EASE + ', filter 0.6s;" />' +
            '<span style="font-size: 13px; font-weight: 700; letter-spacing: 5px; color: rgba(255,255,255,0.9);">LUX LIVING</span>' +
            '<span style="display: block; width: 36px; height: 1px; background: #C4985A;"></span>' +
            '<span style="font-family: \'Cormorant Garamond\', serif; font-size: 12px; font-style: italic; color: rgba(255,255,255,0.45); letter-spacing: 1px;">Where Luxury Meets Comfort</span>' +
          '</div>' +
          '<div>' +
            '<p style="font-family: \'Cormorant Garamond\', serif; font-size: 20px; line-height: 1.5; color: rgba(255,255,255,0.6); margin: 0 0 24px;">sign up for the latest<br /><strong style="color: #fff; font-weight: 500;">LuxLiving</strong> collections<br />and inspirations.</p>' +
            '<form id="news-form" style="display: flex; gap: 12px; max-width: 420px;">' +
              '<input type="email" placeholder="email*" required class="news-input" style="flex: 1; padding: 12px 0; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.15); color: #fff; font-family: \'Inter\', sans-serif; font-size: 13px; outline: none; border-radius: 0; transition: border-color 0.4s, box-shadow 0.4s;" />' +
              '<button type="submit" id="news-btn" data-hover="background: #C4985A; border-color: #C4985A; box-shadow: 0 4px 20px rgba(196,152,90,0.3);" style="padding: 10px 28px; background: rgba(255,255,255,0.1); color: #fff; font-family: \'Inter\', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; cursor: pointer; transition: all 0.3s; white-space: nowrap;">' + (state.newsDone ? 'Done ✓' : 'Subscribe') + '</button>' +
            '</form>' +
          '</div>' +
        '</div>' +
        '<div style="height: 1px; background: rgba(255,255,255,0.08); margin: 0 0 48px;"></div>' +
        '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; margin-bottom: 48px;">' +
          '<div><h4 style="font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.4); margin: 0 0 20px;">Collections</h4>' +
            '<div style="display: flex; flex-direction: column; gap: 10px;">' +
            cats.map(function (c) { return '<a href="' + catHref(c.key) + '" data-hover="color: #fff;" style="' + fl + '">' + c.name + '</a>'; }).join('') +
            '</div></div>' +
          '<div><h4 style="font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.4); margin: 0 0 20px;">LuxLiving</h4>' +
            '<div style="display: flex; flex-direction: column; gap: 10px;">' +
              '<a href="#/about" data-hover="color: #fff;" style="' + fl + '">About Us</a>' +
              '<a href="#/brands" data-hover="color: #fff;" style="' + fl + '">Brands We Work With</a>' +
              '<a href="#/craft" data-hover="color: #fff;" style="' + fl + '">Craftsmanship</a>' +
              '<a href="#/consultation" data-hover="color: #fff;" style="' + fl + '">Design Service</a>' +
              '<a href="' + IG_URL + '" target="_blank" rel="noopener noreferrer" data-hover="color: #fff;" style="' + fl + '">Instagram</a>' +
            '</div></div>' +
          '<div><h4 style="font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.4); margin: 0 0 20px;">Service</h4>' +
            '<div style="display: flex; flex-direction: column; gap: 10px;">' +
              '<a href="#/contact" data-hover="color: #fff;" style="' + fl + '">Contact Us</a>' +
              '<a href="' + MAPS + '" target="_blank" rel="noopener noreferrer" data-hover="color: #fff;" style="' + fl + '">Store Locator</a>' +
              '<a href="tel:+919034116534" data-hover="color: #fff;" style="' + fl + '">Call Us</a>' +
              '<a href="https://wa.me/' + WA + '" target="_blank" rel="noopener noreferrer" data-hover="color: #fff;" style="' + fl + '">WhatsApp</a>' +
            '</div></div>' +
          '<div><h4 style="font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.4); margin: 0 0 20px;">Visit Us</h4>' +
            '<div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.5;">' +
              '<span>Khadi Aashram,</span><span>Near Grand Trunk Rd,</span><span>Panipat, Haryana 132104</span>' +
              '<span style="margin-top: 8px; font-size: 12px; color: rgba(255,255,255,0.35);">Mon–Sat: 10:30 AM–8 PM</span>' +
            '</div></div>' +
        '</div>' +
        '<div style="height: 1px; background: rgba(255,255,255,0.08); margin: 0 0 32px;"></div>' +
        '<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">' +
          '<div style="display: flex; gap: 14px;">' +
            '<a href="' + IG_URL + '" target="_blank" rel="noopener noreferrer" aria-label="Instagram" data-hover="background: #C4985A; border-color: #C4985A; color: #fff; transform: translateY(-2px);" style="width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); transition: all 0.3s;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><circle cx="12" cy="12" r="5"></circle><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"></circle></svg></a>' +
            '<a href="https://wa.me/' + WA + '" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" data-hover="background: #25D366; border-color: #25D366; color: #fff; transform: translateY(-2px);" style="width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); transition: all 0.3s;"><svg viewBox="0 0 32 32" fill="currentColor" width="16" height="16"><path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.916 15.916 0 0016.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.316 22.612c-.39 1.1-1.932 2.014-3.17 2.28-.846.182-1.95.326-5.67-1.218-4.762-1.976-7.824-6.804-8.062-7.118-.228-.314-1.916-2.55-1.916-4.862s1.214-3.448 1.644-3.92c.39-.428.916-.628 1.222-.628.15 0 .284.008.404.014.43.018.646.042.93.718.356.846 1.222 2.982 1.328 3.2.108.22.214.516.068.828-.138.32-.258.46-.478.71-.22.25-.428.44-.648.71-.198.24-.422.494-.178.924.244.424 1.082 1.784 2.324 2.89 1.596 1.422 2.868 1.882 3.354 2.076.358.144.784.108 1.04-.166.322-.348.72-.924 1.124-1.494.288-.408.65-.46 1.04-.314.396.14 2.508 1.182 2.938 1.398.43.216.716.326.822.504.104.178.104 1.028-.286 2.128z"></path></svg></a>' +
          '</div>' +
          '<p style="font-size: 11px; color: rgba(255,255,255,0.25); letter-spacing: 0.5px; margin: 0;">© 2026 LuxLiving. All rights reserved.</p>' +
        '</div>' +
      '</div></footer>';
    qs('#news-form').addEventListener('submit', function (e) {
      e.preventDefault();
      state.newsDone = true;
      qs('#news-btn').textContent = 'Done ✓';
    });
    bindHover(root);
  }

  // ---------- SIDE MENU ----------
  var menuGroups = [
    { title: 'Living', links: [['All Living', catHref('living')], ['Sofa Sets', tabHref('living', 'Sofa Sets')], ['Triple Sitter', tabHref('living', 'Triple Sitter')], ['Two Sitter', tabHref('living', 'Two Sitter')], ['Recliner Sofas', tabHref('living', 'Recliner Sofas')]] },
    { title: 'Armchairs', links: [['All Armchairs', catHref('armchairs')], ['Swivel Chairs', tabHref('armchairs', 'Swivel Chairs')], ['Recliners', tabHref('armchairs', 'Recliners')]] },
    { title: 'Pair of Chairs', links: [['Matched Lounge Pairs', catHref('pairs')]] },
    { title: 'Bedroom', links: [['Beds & Benches', catHref('bedroom')]] },
    { title: 'Tables', links: [['Coffee & Side Tables', catHref('tables')]] },
    { title: 'Dining', links: [['Dining Tables & Sets', catHref('dining')]] },
    { title: 'Lighting', links: [['All Lighting', catHref('lighting')], ['Pendants', tabHref('lighting', 'Pendants')], ['Chandeliers', tabHref('lighting', 'Chandeliers')], ['Linear', tabHref('lighting', 'Linear')]] },
    { title: 'Wall Art', links: [['Paintings & Canvas', catHref('art')]] },
  ];

  function renderMenu() {
    var root = document.getElementById('menu-root');
    if (!state.menuOpen) { root.innerHTML = ''; return; }
    var v = route.view;
    var act = { home: v === 'home', products: v === 'products' || v === 'category' || v === 'product', brands: v === 'brands' || v === 'brand', craft: v === 'craft' };
    var big = 'display: block; font-family: \'Playfair Display\', serif; font-size: 28px; font-weight: 400; padding: 10px 0; text-decoration: none; transition: color 0.35s;';
    var soc = 'display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; border: 1px solid #D8D2C8; color: #1C1C1E; transition: all 0.35s;';
    var socHover = 'background: #1C1C1E; border-color: #1C1C1E; color: #fff; transform: translateY(-2px);';
    var h = '<div id="menu-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1998; backdrop-filter: blur(2px);"></div>' +
      '<div id="menu-panel" style="position: fixed; top: 0; left: 0; width: ' + (state.menuProducts ? 'min(790px, 94vw)' : 'min(420px, 94vw)') + '; height: 100dvh; background: #F5F1EB; z-index: 1999; display: flex; flex-direction: column; overflow: hidden; transition: width 0.55s ' + EASE + '; animation: menuIn 0.45s ' + EASE + ' both;">' +
        '<div style="display: flex; align-items: center; justify-content: space-between; padding: 24px 32px; border-bottom: 1px solid #E8E3DA;">' +
          '<div style="display: flex; align-items: center; gap: 12px;"><img src="images/image-Photoroom (8).png" alt="Lux Living" style="width: 40px; height: 40px; object-fit: contain;" /><span style="font-size: 14px; font-weight: 700; letter-spacing: 4px;">LUX LIVING</span></div>' +
          '<button id="menu-close" aria-label="Close menu" data-hover="background: #DDD7CC; transform: rotate(90deg);" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; border: none; background: none; cursor: pointer; transition: background 0.35s, transform 0.35s;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>' +
        '</div>' +
        '<div style="display: flex; flex: 1; min-height: 0; align-items: stretch;">' +
          '<div style="width: min(420px, 94vw); flex-shrink: 0; display: flex; flex-direction: column; overflow-y: auto;">' +
            '<nav style="padding: 32px 32px 24px; flex: 1; display: flex; flex-direction: column;">' +
              '<a href="#/" data-hover="color: #C4985A;" style="' + big + ' color: ' + (act.home ? '#C4985A' : '#1C1C1E') + ';">Home</a>' +
              '<button id="menu-products-btn" data-hover="color: #C4985A;" style="display: flex; align-items: center; justify-content: space-between; width: 100%; background: none; border: none; cursor: pointer; padding: 10px 0; font-family: \'Playfair Display\', serif; font-size: 28px; font-weight: 400; color: ' + (act.products ? '#C4985A' : '#1C1C1E') + '; text-align: left; transition: color 0.35s;">' +
                '<span>Products</span>' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="transform: ' + (state.menuProducts ? 'rotate(90deg)' : 'rotate(0deg)') + '; transition: transform 0.4s ' + EASE + ';"><path d="M9 6l6 6-6 6"></path></svg>' +
              '</button>' +
              '<a href="#/brands" data-hover="color: #C4985A;" style="' + big + ' color: ' + (act.brands ? '#C4985A' : '#1C1C1E') + ';">Brands</a>' +
              '<a href="#/craft" data-hover="color: #C4985A;" style="' + big + ' color: ' + (act.craft ? '#C4985A' : '#1C1C1E') + ';">Craftsmanship</a>' +
            '</nav>' +
            '<div style="padding: 24px 32px 24px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid #E8E3DA;">' +
              '<a href="#/consultation" data-hover="color: #C4985A;" style="font-size: 13px; font-weight: 500; letter-spacing: 0.5px; color: #6B6560; text-decoration: none; transition: color 0.35s;">Design Service</a>' +
              '<a href="#/contact" data-hover="color: #C4985A;" style="font-size: 13px; font-weight: 500; letter-spacing: 0.5px; color: #6B6560; text-decoration: none; transition: color 0.35s;">Contact Us</a>' +
              '<a href="' + MAPS + '" target="_blank" rel="noopener noreferrer" data-hover="color: #C4985A;" style="font-size: 13px; font-weight: 500; letter-spacing: 0.5px; color: #6B6560; text-decoration: none; transition: color 0.35s;">Store Locator</a>' +
              '<a href="#/brands" data-hover="color: #C4985A;" style="font-size: 13px; font-weight: 500; letter-spacing: 0.5px; color: #6B6560; text-decoration: none; transition: color 0.35s;">Brands We Work With</a>' +
            '</div>' +
            '<div style="padding: 24px 32px; border-top: 1px solid #E8E3DA; margin-top: auto;">' +
              '<div style="display: flex; gap: 16px; margin-bottom: 12px;">' +
                '<a href="' + IG_URL + '" target="_blank" rel="noopener noreferrer" aria-label="Instagram" data-hover="' + socHover + '" style="' + soc + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><circle cx="12" cy="12" r="5"></circle><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"></circle></svg></a>' +
                '<a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" data-hover="' + socHover + '" style="' + soc + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>' +
                '<a href="https://wa.me/' + WA + '" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" data-hover="' + socHover + '" style="' + soc + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></a>' +
              '</div>' +
              '<p style="font-size: 13px; color: #6B6560; letter-spacing: 1px; margin: 0;">+91 90341 16534</p>' +
            '</div>' +
          '</div>';
    if (state.menuProducts) {
      h += '<div style="flex: 1; min-width: 0; border-left: 1px solid #E8E3DA; padding: 36px 40px; overflow-y: auto; animation: menuIn 0.5s ' + EASE + ' both;">' +
        '<a href="#/products" data-hover="gap: 12px;" style="display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #C4985A; text-decoration: none; margin-bottom: 32px; transition: gap 0.35s;">All Collections <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></a>' +
        menuGroups.map(function (mg) {
          return '<div style="margin-bottom: 34px;">' +
            '<div style="font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #9B9590; margin-bottom: 14px;">' + mg.title + '</div>' +
            '<div style="display: flex; flex-direction: column; gap: 11px;">' +
            mg.links.map(function (l) { return '<a href="' + l[1] + '" data-hover="color: #C4985A; transform: translateX(4px);" style="font-size: 14px; color: #1C1C1E; text-decoration: none; width: fit-content; transition: color 0.3s, transform 0.3s;">' + l[0] + '</a>'; }).join('') +
            '</div></div>';
        }).join('') +
      '</div>';
    }
    h += '</div></div>';
    root.innerHTML = h;
    qs('#menu-overlay').addEventListener('click', closeMenu);
    qs('#menu-close').addEventListener('click', closeMenu);
    qs('#menu-products-btn').addEventListener('click', function () {
      state.menuProducts = !state.menuProducts;
      renderMenu();
    });
    bindHover(root);
  }
  function openMenu() { state.menuOpen = true; state.menuProducts = false; renderMenu(); }
  function closeMenu() { state.menuOpen = false; renderMenu(); }

  // ---------- NAV APPEARANCE ----------
  function updateNav() {
    var nav = document.getElementById('nav');
    var transparentRoute = route.view === 'home' || route.view === 'craft' || route.view === 'brands' || route.view === 'brand';
    var scrolled = window.scrollY > 30;
    nav.classList.toggle('scrolled', scrolled);
    nav.classList.toggle('solid', !scrolled && !transparentRoute);
  }

  // ---------- EFFECTS: reveal, stats, tilt, cursor ----------
  var io = null;
  function scanEffects() {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          if (e.target.hasAttribute('data-stats')) { io.unobserve(e.target); startStats(); return; }
          if (!e.target.__revealed) {
            e.target.__revealed = true;
            e.target.animate(
              reduced ? [{ opacity: 0 }, { opacity: 1 }]
                : [{ opacity: 0, transform: 'translateY(56px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }],
              { duration: reduced ? 200 : 1000, easing: EASE, fill: 'backwards' }
            );
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    }
    qsa('[data-reveal]').forEach(function (el) { if (!el.__observed) { el.__observed = true; io.observe(el); } });
    var st = qs('[data-stats]');
    if (st && !st.__observed && !state.statsDone) { st.__observed = true; io.observe(st); }
  }

  function startStats() {
    if (state.statsDone) return;
    state.statsDone = true;
    var els = qsa('.stat-val', app);
    var t0 = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - t0) / 2000);
      els.forEach(function (el) {
        var target = parseInt(el.getAttribute('data-target'), 10);
        var v = Math.floor(target * p);
        el.textContent = el.getAttribute('data-year') === 'true' ? String(v) : v.toLocaleString();
      });
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function setupTilt() {
    if (window.innerWidth < 1024 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cur = null;
    document.addEventListener('pointermove', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-tilt]') : null;
      if (cur && cur !== el) {
        cur.style.transition = 'transform 0.7s ' + EASE + ', box-shadow 0.7s';
        cur.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) translateZ(0)';
        cur.style.boxShadow = '';
        cur = null;
      }
      if (!el) return;
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      if (cur !== el) { el.style.willChange = 'transform'; cur = el; }
      el.style.transition = 'transform 0.15s ease-out, box-shadow 0.4s';
      el.style.transform = 'perspective(1100px) rotateX(' + (-py * 6).toFixed(2) + 'deg) rotateY(' + (px * 6).toFixed(2) + 'deg) translateZ(10px)';
      el.style.boxShadow = (px * -16).toFixed(0) + 'px ' + (py * -16 + 24).toFixed(0) + 'px 56px rgba(28,28,30,0.22)';
    }, { passive: true });
  }

  function setupCursor() {
    if (window.innerWidth < 1024) return;
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:0;left:0;width:76px;height:76px;background:#1C1C1E;border-radius:50%;pointer-events:none;z-index:9997;display:flex;align-items:center;justify-content:center;transition:background 0.4s ease,opacity 0.3s ease;will-change:transform;opacity:0;';
    var txt = document.createElement('span');
    txt.textContent = 'explore';
    txt.style.cssText = "font-family:'Inter',sans-serif;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:lowercase;color:#fff;opacity:0;transition:opacity 0.3s ease;white-space:nowrap;will-change:opacity;";
    el.appendChild(txt);
    document.body.appendChild(el);
    var DOT = 0.235, EXPLORE = 0.9;
    var pos = { x: -200, y: -200 }, target = { x: -200, y: -200 };
    var scale = DOT, targetScale = DOT, press = 1, targetPress = 1;
    (function animate() {
      pos.x += (target.x - pos.x) * 0.2;
      pos.y += (target.y - pos.y) * 0.2;
      scale += (targetScale - scale) * 0.18;
      press += (targetPress - press) * 0.28;
      el.style.transform = 'translate3d(' + pos.x + 'px,' + pos.y + 'px,0) translate(-50%,-50%) scale(' + (scale * press) + ')';
      requestAnimationFrame(animate);
    })();
    document.addEventListener('mousemove', function (e) { target.x = e.clientX; target.y = e.clientY; el.style.opacity = '1'; });
    function shrink() { targetScale = DOT; el.style.background = '#1C1C1E'; txt.style.opacity = '0'; }
    function grow() { targetScale = EXPLORE; el.style.background = 'rgba(28,28,30,0.92)'; txt.style.opacity = '1'; }
    document.addEventListener('mouseover', function (e) {
      if (!e.target.closest) return;
      var btn = e.target.closest('a,button,[role="button"]');
      var isTextBtn = btn && !btn.querySelector('img') && btn.textContent.trim().length > 0;
      if (isTextBtn) { shrink(); return; }
      if (e.target.closest('[data-cursor]')) { grow(); return; }
      shrink();
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest('[data-cursor]')) shrink();
    });
    document.addEventListener('mousedown', function () { targetPress = 0.7; });
    document.addEventListener('mouseup', function () { targetPress = 1; });
  }

  // ---------- PRELOADER ----------
  function runPreloader() {
    var pre = document.getElementById('preloader');
    var lettersBox = document.getElementById('pre-letters');
    'LUXLIVING'.split('').forEach(function (ch, i) {
      var s = document.createElement('span');
      s.textContent = ch;
      var d = (i * 0.07 + (i >= 3 ? 0.05 : 0)) + 's';
      s.style.cssText = "display: inline-block; font-family: 'Playfair Display', serif; font-size: 16px; letter-spacing: 10px; color: #1C1C1E; opacity: 0; transform: translateY(20px); transition: opacity 0.5s cubic-bezier(0.22,1,0.36,1) " + d + ", transform 0.5s cubic-bezier(0.22,1,0.36,1) " + d + "; width: " + (i === 2 ? '24px' : 'auto') + ";";
      lettersBox.appendChild(s);
    });
    setTimeout(function () {
      var lg = document.getElementById('pre-logo');
      lg.style.opacity = '1'; lg.style.transform = 'scale(1)';
    }, 200);
    setTimeout(function () {
      qsa('span', lettersBox).forEach(function (s) { s.style.opacity = '1'; s.style.transform = 'translateY(0px)'; });
      document.getElementById('pre-year').style.opacity = '1';
    }, 900);
    setTimeout(function () {
      var tg = document.getElementById('pre-tag');
      tg.style.opacity = '1'; tg.style.transform = 'translateY(0px)';
    }, 1600);
    setTimeout(function () { pre.style.clipPath = 'inset(0 0 100% 0)'; }, 3200);
    setTimeout(function () { pre.remove(); }, 4000);
  }

  // ---------- RENDER ----------
  var titles = {
    home: 'Lux Living — Where Luxury Meets Comfort',
    products: 'Collections — Lux Living',
    brands: 'Brands — Lux Living',
    craft: 'Craftsmanship — Lux Living',
  };

  function render() {
    var prev = prevRoute;
    prevRoute = route;
    clearViewTimers();
    closeModals();
    closeMenu();
    // per-view state resets (matches prototype _nav)
    state.pdpImg = 0; state.pdpPlaying = true; state.pdpZoomScale = 1; state.craftSlide = 0; state.wallSlide = 0;

    var keepScroll = prev && prev.view === 'category' && route.view === 'category' && prev.key === route.key;
    var title = titles[route.view];

    switch (route.view) {
      case 'home': app.innerHTML = tmplHome(); bindHome(); break;
      case 'products': app.innerHTML = tmplProducts(); break;
      case 'category':
        app.innerHTML = tmplCategory();
        var c = cats.find(function (x) { return x.key === route.key; }) || cats[0];
        title = c.name + ' — Lux Living';
        break;
      case 'product':
        app.innerHTML = tmplProduct(); bindProduct();
        var p = products.find(function (x) { return x.id === route.id; }) || products[0];
        title = p.name + ' — Lux Living';
        break;
      case 'brands': app.innerHTML = tmplBrands(); break;
      case 'brand':
        app.innerHTML = tmplBrand();
        var b = brands.find(function (x) { return x.id === route.id; }) || brands[0];
        title = b.name + ' — Lux Living';
        break;
      case 'craft': app.innerHTML = tmplCraft(); bindCraft(); bindWallTour(); break;
    }
    document.title = title || titles.home;
    bindHover(app);
    updateNav();

    if (route.section) {
      var target = document.getElementById(route.section);
      if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    } else if (!keepScroll) {
      window.scrollTo(0, 0);
    }
    scanEffects();
  }

  // ---------- GLOBAL WIRING ----------
  // If a card's hover image hasn't finished downloading, keep the primary image
  // visible (via .img2-loading) so the card never crossfades to blank.
  document.addEventListener('mouseover', function (e) {
    var card = e.target.closest ? e.target.closest('.lux-card') : null;
    if (!card) return;
    var img2 = card.querySelector('.lux-card-img2');
    if (!img2) return;
    if (img2.complete && img2.naturalWidth > 0) {
      card.classList.remove('img2-loading');
    } else {
      card.classList.add('img2-loading');
      img2.addEventListener('load', function () { card.classList.remove('img2-loading'); }, { once: true });
    }
  });

  document.getElementById('nav-menu-btn').addEventListener('click', openMenu);
  document.getElementById('btt').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  window.addEventListener('scroll', function () {
    updateNav();
    var btt = document.getElementById('btt');
    var show = window.scrollY > 400;
    btt.style.transform = show ? 'translateY(0)' : 'translateY(20px)';
    btt.style.opacity = show ? '1' : '0';
    btt.style.visibility = show ? 'visible' : 'hidden';
  }, { passive: true });

  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('modal-root').innerHTML) { closeModals(); return; }
    if (state.menuOpen) closeMenu();
  });

  // Same-hash link clicks don't fire hashchange — re-render manually.
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#/"]') : null;
    if (a && a.getAttribute('href') === location.hash) {
      route = parseHash();
      render();
    }
  });

  window.addEventListener('hashchange', function () {
    route = parseHash();
    render();
  });

  // WhatsApp float appears after 3s
  setTimeout(function () {
    var wa = document.getElementById('wa-float');
    wa.style.transform = 'scale(1)';
    wa.style.opacity = '1';
    wa.style.animation = 'waPulse 3s ease-in-out 2s infinite';
  }, 3000);

  // ---------- BOOT ----------
  runPreloader();
  setupTilt();
  setupCursor();
  renderFooter();
  bindHover(document.body);
  route = parseHash();
  render();
})();
