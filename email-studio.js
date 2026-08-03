/* ============================================================
   EMAIL STUDIO — engine
   A bright, Adobe-style visual editor for advertisement emails.

   State  : { theme, blocks:[ { id, type, props } ] }
   Blocks : each type declares render(props,theme) -> email-safe
            table HTML, and inspector(props) -> property controls.
   Editing: text is contenteditable and writes straight to state;
            everything else is driven from the right inspector.
   ============================================================ */
(function () {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const uid = () => 'b' + Math.random().toString(36).slice(2, 9);
  const esc = (s = '') => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escAttr = (s = '') => esc(s).replace(/"/g, '&quot;');

  const LS_KEY = 'emailStudio.doc.v7';

  let state = null;
  let selectedId = null;
  let device = 'desktop';
  let insertIndex = null;          // where the picker will insert
  const history = [];
  let hIndex = -1;
  let suppressHistory = false;

  /* =========================================================
     PALETTES — bright, cheerful presets for the theme picker
     ========================================================= */
  const PALETTES = [
    { name: 'Gyro Blue',  accent: '#1A56DB', bg: '#e8e6dc', content: '#ffffff' },
    { name: 'Navy',       accent: '#0A2540', bg: '#eef1f6', content: '#ffffff' },
    { name: 'Precision',  accent: '#0284C7', bg: '#e7f5fe', content: '#ffffff' },
    { name: 'Teal',       accent: '#0F766E', bg: '#e9f6f4', content: '#ffffff' },
    { name: 'Steel',      accent: '#334155', bg: '#eef1f5', content: '#ffffff' },
    { name: 'Indigo',     accent: '#4338ca', bg: '#eef0fc', content: '#ffffff' },
    { name: 'Emerald',    accent: '#10b981', bg: '#e8faf3', content: '#ffffff' },
    { name: 'Graphite',   accent: '#1e293b', bg: '#f1f3f7', content: '#ffffff' },
  ];

  /* =========================================================
     SVG icons (UI only)
     ========================================================= */
  const IC = {
    up:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
    dup:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    del:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
    grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    alignL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h12M3 18h15"/></svg>',
    alignC: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M6 12h12M4 18h16"/></svg>',
    alignR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M9 12h12M6 18h15"/></svg>',
  };

  /* =========================================================
     BLOCK ICONS for the rail / picker
     ========================================================= */
  function railIcon(t) {
    const s = 'stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"';
    const m = {
      brandbar: `<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4" ${s}/><path d="M15 9h5M15 13h5M15 15h3" ${s}/></svg>`,
      partners: `<svg viewBox="0 0 24 24"><path d="M8 11l2 2 3-4M6 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z" ${s}/></svg>`,
      logo:    `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" ${s}/><path d="M4 20h16" ${s}/></svg>`,
      hero:    `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" ${s}/><path d="M3 15l4-4 4 4 3-3 4 4" ${s}/><circle cx="9" cy="9" r="1.3" ${s}/></svg>`,
      heading: `<svg viewBox="0 0 24 24"><path d="M6 4v16M18 4v16M6 12h12" ${s}/></svg>`,
      text:    `<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" ${s}/></svg>`,
      button:  `<svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="8" rx="4" ${s}/></svg>`,
      image:   `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" ${s}/><circle cx="8.5" cy="10" r="1.5" ${s}/><path d="M21 17l-5-5-6 6" ${s}/></svg>`,
      columns: `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="8" height="14" rx="1.5" ${s}/><rect x="13" y="5" width="8" height="14" rx="1.5" ${s}/></svg>`,
      divider: `<svg viewBox="0 0 24 24"><path d="M3 12h18" ${s}/></svg>`,
      spacer:  `<svg viewBox="0 0 24 24"><path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" ${s}/></svg>`,
      social:  `<svg viewBox="0 0 24 24"><circle cx="7" cy="12" r="3" ${s}/><circle cx="17" cy="6" r="3" ${s}/><circle cx="17" cy="18" r="3" ${s}/><path d="M9.5 10.5l5-3M9.5 13.5l5 3" ${s}/></svg>`,
      footer:  `<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" ${s}/><path d="M3 14h18" ${s}/></svg>`,
    };
    return m[t] || m.text;
  }

  const RAIL_ORDER = ['brandbar','heading','text','button','image','hero','columns','partners','logo','social','divider','spacer','footer'];
  const BLOCK_LABEL = {
    brandbar:'Brand bar', partners:'Partners',
    logo:'Logo', hero:'Hero', heading:'Heading', text:'Text', button:'Button',
    image:'Image', columns:'2 Columns', divider:'Divider', spacer:'Spacer',
    social:'Social', footer:'Footer',
  };

  /* =========================================================
     GYROSCOPE TECHNOLOGY — brand identity
     Real company details + partner brands so templates feel
     on-brand out of the box. Partner logos resolve from the
     workspace so they show in local preview; users can replace
     them with hosted URLs before sending.
     ========================================================= */
  const BRAND = {
    name:    'GYROSCOPE TECHNOLOGY',
    tagline: 'A passion for precision',
    office:  'GYROSCOPE TECHNOLOGY CO., LTD.',
    addr:    '555/20 On-Nuch Rd, Prawet, Bangkok 10250, Thailand',
    tel:     '+66 (02) 328 6721',
    mob:     '+66 (081) 468 2897',
    email:   'info@gyroinst.com',
    web:     'www.gyroinst.com',
    mark:    '#0A2540',
    accent:  '#1A56DB',
    // Live raster partner logos hosted on gyroinst.com for Gmail/Outlook.
    logos: [
      'https://gyroinst.com/partners/cs-instruments.png',
      'https://gyroinst.com/partners/hoentzsch.png',
      'https://gyroinst.com/partners/able-instruments.png',
    ],
  };

  // Live imagery already hosted on gyroinst.com — loads straight into inboxes,
  // no separate image hosting needed. Swap any of these in the inspector.
  const HOST = 'https://gyroinst.com';
  const LIVE_IMAGE_ALIASES = Object.freeze({
    'hero-measurement-pi500.png': '/x_flow-meter.png',
    'hero-technical-ds500.png': '/x_chart-recorder.png',
    'hero-website-airquality.jpg': '/x_compressed-air-quality.png',
    'hero-pcb-industrial.jpg': '/x_leak-detection.png',
    'cs-instruments.png': '/partners/cs-instruments.png',
    'able-instruments.png': '/partners/able-instruments.png',
    'hoentzsch.png': '/partners/hoentzsch.png',
  });
  const LIVE_ASSET_ROOTS = [
    'able instruments/',
    'applications/',
    'cs instruments/',
    'gyro/',
    'hero-products/',
    'hoentzsch/',
    'partners/',
    'sensorscientific/',
    'services/',
    'suppliers/',
  ];

  /**
   * Convert paths copied from this workspace into the matching public asset URL.
   * Existing third-party HTTPS URLs are intentionally left alone.
   */
  function liveImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw || /^(?:data:|cid:)/i.test(raw)) return raw;

    if (/^https?:\/\/(?:www\.)?gyroinst\.com(?:\/|$)/i.test(raw)) {
      try {
        const url = new URL(raw);
        url.protocol = 'https:';
        url.hostname = 'gyroinst.com';
        return url.href;
      } catch (e) {
        return raw.replace(/^http:/i, 'https:').replace(/\/\/www\.gyroinst\.com/i, '//gyroinst.com');
      }
    }
    if (/^https?:/i.test(raw)) return raw;

    const path = raw.replace(/\\/g, '/').replace(/^file:\/+/i, '/');
    const cleanPath = path.split(/[?#]/, 1)[0];
    const filename = cleanPath.split('/').pop().toLowerCase();
    if (LIVE_IMAGE_ALIASES[filename]) return HOST + LIVE_IMAGE_ALIASES[filename];

    const deployedPath = cleanPath.match(/(?:^|\/)(?:public|dist)\/(.+)$/i);
    if (deployedPath) return new URL('/' + deployedPath[1], HOST).href;

    const lowerPath = cleanPath.toLowerCase().replace(/^\/+/, '');
    const rootIndex = LIVE_ASSET_ROOTS
      .map(root => ({ root, index: lowerPath.lastIndexOf(root) }))
      .filter(match => match.index >= 0)
      .sort((a, b) => b.index - a.index)[0];
    if (rootIndex) {
      const publicPath = cleanPath.replace(/^\/+/, '').slice(rootIndex.index);
      return new URL('/' + publicPath, HOST).href;
    }

    return raw;
  }

  const IMG = {
    brandLocal: HOST + '/gyroscope-technology-logo-gti-transparent-web.png',
    brandEmail: HOST + '/gyroscope-technology-logo-gti-transparent-web.png',
    pi500:      HOST + '/x_flow-meter.png',             // flow meter category image
    ds500:      HOST + '/x_chart-recorder.png',         // chart recorder (DS 500)
    airquality: HOST + '/x_compressed-air-quality.png', // compressed-air quality
    pcb:        HOST + '/x_leak-detection.png',          // industrial / leak detection
    cs:         HOST + '/partners/cs-instruments.png',
    hoentzsch:  HOST + '/hoentzsch/261.png',             // Höntzsch flowtherm NT.2 handheld
    able:       HOST + '/partners/able-instruments.png',
  };

  // Use the complete hosted GTi lockup in both the editor and exported email.
  function brandLogo(width, forEmail) {
    const src = forEmail ? IMG.brandEmail : IMG.brandLocal;
    return `<img src="${src}" width="${width}" alt="Gyroscope Technology — A passion for precision" style="display:block;border:0;outline:none;text-decoration:none;width:100%;max-width:${width}px;height:auto">`;
  }

  /* =========================================================
     BLOCK DEFINITIONS
     Each: defaults(theme), render(props,theme,ctx), inspector(props)
     ========================================================= */
  const pad = (p) => `${p.padTop}px ${p.padX}px ${p.padBottom}px`;

  const BLOCKS = {

    /* ---------------- BRAND BAR (hosted GTi lockup + contact) ---------------- */
    brandbar: {
      defaults: (t) => ({
        name: BRAND.name, tagline: BRAND.tagline, markColor: BRAND.mark,
        showContact: true, tel: BRAND.tel, email: BRAND.email, web: BRAND.web,
        nameColor: t.heading, tagColor: t.accent, bg: '#f4f8fd',
        padTop: 24, padBottom: 20, padX: 28,
      }),
      render(p, t, ctx = {}) {
        const contact = p.showContact ? `<td width="38%" align="right" valign="middle" style="border-left:1px solid #e6edf5;padding-left:18px;font-family:${t.bodyFont};font-size:12px;line-height:1.55;color:${t.text};overflow-wrap:anywhere;word-break:normal">
            <div style="font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${p.tagColor}">CONTACT</div>
            <div style="margin-top:4px;font-weight:700;color:${p.tagColor}">${esc(p.tel)}</div>
            <div><a href="mailto:${escAttr(p.email)}" style="color:${t.text};text-decoration:none">${esc(p.email)}</a></div>
            <div><a href="https://${escAttr(p.web)}" style="color:${p.tagColor};text-decoration:none">${esc(p.web)}</a></div>
          </td>` : '';
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${p.bg};border-top:4px solid ${p.tagColor};border-bottom:1px solid #e6edf5"><tr><td style="padding:${pad(p)}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border-spacing:0"><tr>
            <td width="62%" valign="middle" style="padding-right:18px">${brandLogo(300, ctx.email)}</td>
            ${contact}
          </tr></table>
        </td></tr></table>`;
      },
      inspector: (p) => [
        colorField('Accent colour', 'tagColor'),
        segToggle('Contact block', 'showContact', p.showContact, [['true','Show'],['false','Hide']]),
        textField('Phone', 'tel'),
        textField('Email', 'email'),
        textField('Website', 'web'),
        colorField('Background', 'bg'),
        spacingFields(p),
      ].join(''),
    },

    /* ---------------- PARTNERS (logo strip) ---------------- */
    partners: {
      defaults: (t) => ({
        title: 'Authorised distributor & brand partner',
        l1: BRAND.logos[0], l2: BRAND.logos[1], l3: BRAND.logos[2], l4: '',
        height: 56, titleColor: '#7C93AE', align: 'center', bg: '#f5f8fd',
        padTop: 26, padBottom: 28, padX: 24,
      }),
      render(p, t) {
        const sources = [p.l1, p.l2, p.l3, p.l4].filter(Boolean);
        const cellWidth = sources.length ? (100 / sources.length).toFixed(2) + '%' : '100%';
        const logos = sources.map(src =>
          `<td width="${cellWidth}" align="center" valign="middle" style="padding:8px 14px"><img src="${escAttr(src)}" height="${p.height}" alt="" style="display:inline-block;border:0;max-height:${p.height}px;max-width:100%;width:auto;height:auto"></td>`
        ).join('');
        const title = p.title ? `<div data-edit="title" style="font-family:${t.bodyFont};font-size:12px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:${p.titleColor};text-align:${p.align};margin-bottom:16px">${esc(p.title)}</div>` : '';
        return row(p, `${title}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;border-collapse:collapse;border-spacing:0"><tr>${logos || '<td>&nbsp;</td>'}</tr></table>`);
      },
      inspector: (p) => [
        textField('Section title', 'title'),
        imageField('Logo 1', 'l1'),
        imageField('Logo 2', 'l2'),
        imageField('Logo 3', 'l3'),
        imageField('Logo 4', 'l4'),
        sliderField('Logo height', 'height', 20, 72, 'px'),
        colorField('Title colour', 'titleColor'),
        alignField(p.align),
        colorField('Background', 'bg'),
        spacingFields(p),
      ].join(''),
    },

    /* ---------------- LOGO / BRAND BAR ---------------- */
    logo: {
      defaults: (t) => ({
        text: 'GYROSCOPE TECHNOLOGY', useImage: true, src: IMG.brandEmail, imgW: 300,
        color: t.heading, bg: t.content, align: 'center',
        size: 22, padTop: 24, padBottom: 16, padX: 24,
      }),
      render(p, t) {
        const inner = p.useImage && p.src
          ? `<img src="${escAttr(p.src)}" width="${p.imgW}" alt="logo" style="display:inline-block;border:0;max-width:100%;height:auto">`
          : `<span data-edit="text" style="font-family:${t.font};font-weight:800;font-size:${p.size}px;letter-spacing:.06em;color:${p.color}">${esc(p.text)}</span>`;
        return row(p, `<div style="text-align:${p.align}">${inner}</div>`);
      },
      inspector: (p) => [
        segToggle('Logo type', 'useImage', p.useImage, [['false','Text'],['true','Image']]),
        p.useImage
          ? imageField('Logo image', 'src') + numField('Image width', 'imgW', 40, 320)
          : textField('Logo text', 'text') + numField('Font size', 'size', 12, 48),
        alignField(p.align),
        colorField('Text colour', 'color'),
        colorField('Background', 'bg'),
        spacingFields(p),
      ].join(''),
    },

    /* ---------------- HERO (image + overlay text + CTA) ---------------- */
    hero: {
      defaults: (t) => ({
        src: IMG.pi500,
        overlay: 42, eyebrow: 'NEW BRAND PARTNER', title: 'Precision measurement, represented locally', titleSize: 38,
        sub: 'Authorised distribution and technical support for the instruments your process depends on.',
        btnText: 'Talk to our team', btnLink: 'https://gyroinst.com/', btnBg: t.accent, btnColor: '#ffffff',
        color: '#ffffff', align: 'center', minH: 320, padTop: 56, padBottom: 56, padX: 32, bg: t.content,
      }),
      render(p, t) {
        const cta = p.btnText ? btnHtml(p) : '';
        const eyebrow = p.eyebrow ? `<div data-edit="eyebrow" style="font-family:${t.bodyFont};font-size:12px;font-weight:700;letter-spacing:.18em;color:${p.color};opacity:.9;margin-bottom:14px">${esc(p.eyebrow)}</div>` : '';
        const sub = p.sub ? `<div data-edit="sub" style="font-family:${t.bodyFont};font-size:16px;line-height:1.5;color:${p.color};opacity:.94;margin:14px auto 0;max-width:460px">${esc(p.sub)}</div>` : '';
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${p.bg}"><tr><td style="padding:0">
          <div style="position:relative;background-image:url('${escAttr(p.src)}');background-size:cover;background-position:center;min-height:${p.minH}px">
            <div style="position:absolute;inset:0;background:rgba(10,15,25,${(p.overlay/100).toFixed(2)})"></div>
            <div style="position:relative;padding:${pad(p)};text-align:${p.align}">
              ${eyebrow}
              <div data-edit="title" style="font-family:${t.font};font-weight:800;font-size:${p.titleSize}px;line-height:1.1;color:${p.color};margin:0">${esc(p.title)}</div>
              ${sub}
              ${cta ? `<div style="margin-top:26px">${cta}</div>` : ''}
            </div>
          </div>
        </td></tr></table>`;
      },
      inspector: (p) => [
        imageField('Background image', 'src'),
        sliderField('Dark overlay', 'overlay', 0, 80, '%'),
        textField('Eyebrow', 'eyebrow'),
        textField('Title', 'title') + numField('Title size', 'titleSize', 20, 64),
        areaField('Subtitle', 'sub'),
        colorField('Text colour', 'color'),
        alignField(p.align),
        '<div class="insp-sep"></div>',
        textField('Button label', 'btnText'),
        textField('Button link', 'btnLink'),
        colorField('Button colour', 'btnBg') + colorField('Button text', 'btnColor'),
        posField('btnOff'),
        '<div class="insp-sep"></div>',
        numField('Min height', 'minH', 160, 560),
        spacingFields(p),
      ].join(''),
    },

    /* ---------------- HEADING ---------------- */
    heading: {
      defaults: (t) => ({
        text: 'A headline that grabs attention', size: 30, color: t.heading,
        weight: 800, align: 'center', bg: t.content, padTop: 30, padBottom: 8, padX: 32,
      }),
      render(p, t) {
        return row(p, `<div data-edit="text" style="font-family:${t.font};font-weight:${p.weight};font-size:${p.size}px;line-height:1.2;color:${p.color};text-align:${p.align};margin:0">${esc(p.text)}</div>`);
      },
      inspector: (p) => [
        areaField('Heading text', 'text'),
        numField('Font size', 'size', 14, 56),
        selectField('Weight', 'weight', [['600','Semibold'],['700','Bold'],['800','Extra bold'],['900','Black']]),
        alignField(p.align),
        colorField('Text colour', 'color'),
        colorField('Background', 'bg'),
        spacingFields(p),
      ].join(''),
    },

    /* ---------------- TEXT ---------------- */
    text: {
      defaults: (t) => ({
        text: 'Write your message here. Tell customers what makes this offer special, keep it friendly and short, and lead them to the button below.',
        size: 16, color: t.text, align: 'center', lh: 1.6, bg: t.content,
        padTop: 8, padBottom: 24, padX: 32,
      }),
      render(p, t) {
        return row(p, `<div data-edit="text" style="font-family:${t.bodyFont};font-size:${p.size}px;line-height:${p.lh};color:${p.color};text-align:${p.align}">${esc(p.text).replace(/\n/g,'<br>')}</div>`);
      },
      inspector: (p) => [
        areaField('Body text', 'text'),
        numField('Font size', 'size', 11, 28),
        sliderField('Line height', 'lh', 1.2, 2.2, '', 0.1),
        alignField(p.align),
        colorField('Text colour', 'color'),
        colorField('Background', 'bg'),
        spacingFields(p),
      ].join(''),
    },

    /* ---------------- BUTTON ---------------- */
    button: {
      defaults: (t) => ({
        btnText: 'Get started', btnLink: '#', btnBg: t.accent, btnColor: '#ffffff',
        radius: 999, btnSize: 16, full: false, align: 'center', bg: t.content,
        padTop: 8, padBottom: 30, padX: 32,
      }),
      render(p, t) {
        return row(p, `<div style="text-align:${p.align}">${btnHtml(p, t)}</div>`);
      },
      inspector: (p) => [
        textField('Button label', 'btnText'),
        textField('Link URL', 'btnLink'),
        colorField('Button colour', 'btnBg'),
        colorField('Text colour', 'btnColor'),
        numField('Font size', 'btnSize', 11, 26),
        sliderField('Corner radius', 'radius', 0, 999, 'px'),
        segToggle('Width', 'full', p.full, [['false','Auto'],['true','Full']]),
        alignField(p.align),
        posField('btnOff'),
        colorField('Background', 'bg'),
        spacingFields(p),
      ].join(''),
    },

    /* ---------------- IMAGE ---------------- */
    image: {
      defaults: (t) => ({
        src: IMG.ds500,
        link: '', alt: 'Instrument', radius: 14, width: 100, align: 'center',
        bg: t.content, padTop: 16, padBottom: 16, padX: 32,
      }),
      render(p) {
        let img = `<img src="${escAttr(p.src)}" alt="${escAttr(p.alt)}" style="display:inline-block;border:0;width:${p.width}%;max-width:100%;height:auto;border-radius:${p.radius}px">`;
        if (p.link) img = `<a href="${escAttr(p.link)}" target="_blank" style="text-decoration:none">${img}</a>`;
        return row(p, `<div style="text-align:${p.align}">${img}</div>`);
      },
      inspector: (p) => [
        imageField('Image', 'src'),
        textField('Link (optional)', 'link'),
        textField('Alt text', 'alt'),
        sliderField('Width', 'width', 20, 100, '%'),
        sliderField('Corner radius', 'radius', 0, 40, 'px'),
        alignField(p.align),
        colorField('Background', 'bg'),
        spacingFields(p),
      ].join(''),
    },

    /* ---------------- TWO COLUMNS (image + text) ---------------- */
    columns: {
      defaults: (t) => ({
        src: IMG.airquality,
        title: 'Feature title', body: 'A short supporting paragraph that explains the benefit in a sentence or two.',
        btnText: 'Learn more', btnLink: '#', imageSide: 'left', gap: 20,
        titleColor: t.heading, bodyColor: t.text, accent: t.accent, bg: t.content,
        padTop: 20, padBottom: 20, padX: 24, radius: 12,
      }),
      render(p, t) {
        const imgCell = `<td width="46%" valign="top" style="padding:0 ${p.gap/2}px"><img src="${escAttr(p.src)}" alt="" style="display:block;border:0;width:100%;height:auto;border-radius:${p.radius}px"></td>`;
        const linkHtml = p.btnText ? `<div style="margin-top:12px"><a data-edit="btnText" data-free="linkOff" href="${escAttr(p.btnLink)}" style="${freePos(p, 'linkOff')}font-family:${t.bodyFont};font-weight:700;font-size:14px;color:${p.accent};text-decoration:none">${esc(p.btnText)} →</a></div>` : '';
        const txtCell = `<td width="54%" valign="middle" style="padding:0 ${p.gap/2}px">
            <div data-edit="title" style="font-family:${t.font};font-weight:700;font-size:20px;color:${p.titleColor};margin:0 0 8px">${esc(p.title)}</div>
            <div data-edit="body" style="font-family:${t.bodyFont};font-size:15px;line-height:1.6;color:${p.bodyColor}">${esc(p.body)}</div>
            ${linkHtml}
          </td>`;
        const cells = p.imageSide === 'left' ? imgCell + txtCell : txtCell + imgCell;
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${p.bg}"><tr><td style="padding:${pad(p)}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
        </td></tr></table>`;
      },
      inspector: (p) => [
        imageField('Image', 'src'),
        segToggle('Image side', 'imageSide', p.imageSide === 'right', [['left','Left'],['right','Right']], true),
        textField('Title', 'title'),
        areaField('Body', 'body'),
        textField('Link label', 'btnText'),
        textField('Link URL', 'btnLink'),
        colorField('Link/accent colour', 'accent'),
        posField('linkOff'),
        colorField('Background', 'bg'),
        spacingFields(p),
      ].join(''),
    },

    /* ---------------- DIVIDER ---------------- */
    divider: {
      defaults: (t) => ({ color: '#e6e2da', thickness: 1, width: 100, bg: t.content, padTop: 8, padBottom: 8, padX: 32 }),
      render(p) {
        return row(p, `<div style="border-top:${p.thickness}px solid ${p.color};width:${p.width}%;margin:0 auto"></div>`);
      },
      inspector: (p) => [
        colorField('Line colour', 'color'),
        numField('Thickness', 'thickness', 1, 8),
        sliderField('Width', 'width', 10, 100, '%'),
        colorField('Background', 'bg'),
        spacingFields(p),
      ].join(''),
    },

    /* ---------------- SPACER ---------------- */
    spacer: {
      defaults: (t) => ({ height: 32, bg: t.content }),
      render(p) {
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${p.bg}"><tr><td style="height:${p.height}px;line-height:${p.height}px;font-size:1px">&nbsp;</td></tr></table>`;
      },
      inspector: (p) => [
        sliderField('Height', 'height', 8, 120, 'px'),
        colorField('Background', 'bg'),
      ].join(''),
    },

    /* ---------------- SOCIAL ROW ---------------- */
    social: {
      defaults: (t) => ({
        items: [
          { label: 'Facebook', link: '#' },
          { label: 'Instagram', link: '#' },
          { label: 'Twitter', link: '#' },
        ],
        color: t.accent, size: 14, align: 'center', bg: t.content,
        padTop: 18, padBottom: 18, padX: 32,
      }),
      render(p, t) {
        const links = p.items.map(i =>
          `<a href="${escAttr(i.link)}" style="font-family:${t.bodyFont};font-weight:600;font-size:${p.size}px;color:${p.color};text-decoration:none;margin:0 10px">${esc(i.label)}</a>`
        ).join('<span style="color:#cfd6e0">•</span>');
        return row(p, `<div style="text-align:${p.align}">${links}</div>`);
      },
      inspector: (p) => [
        listEditor('Links', p.items),
        colorField('Link colour', 'color'),
        alignField(p.align),
        colorField('Background', 'bg'),
        spacingFields(p),
      ].join(''),
    },

    /* ---------------- FOOTER ---------------- */
    footer: {
      defaults: (t) => ({
        company: 'GYROSCOPE TECHNOLOGY CO., LTD.',
        address: '555/20 On-Nuch Rd, Prawet, Bangkok 10250, Thailand · +66 (02) 328 6721 · info@gyroinst.com',
        note: 'You are receiving this email because you are a contact of Gyroscope Technology.',
        color: '#8b93a1', align: 'center', bg: '#f7f6f2',
        padTop: 26, padBottom: 30, padX: 32,
      }),
      render(p, t) {
        return row(p, `<div style="text-align:${p.align};font-family:${t.bodyFont};font-size:12.5px;line-height:1.6;color:${p.color}">
          <div data-edit="company" style="font-weight:700;color:${p.color}">${esc(p.company)}</div>
          <div data-edit="address">${esc(p.address)}</div>
          <div data-edit="note" style="margin-top:8px">${esc(p.note)}</div>
        </div>`);
      },
      inspector: (p) => [
        textField('Company', 'company'),
        areaField('Address', 'address'),
        areaField('Note', 'note'),
        colorField('Text colour', 'color'),
        alignField(p.align),
        colorField('Background', 'bg'),
        spacingFields(p),
      ].join(''),
    },
  };

  /* ---------- shared render helpers ---------- */
  function row(p, inner) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${p.bg}"><tr><td style="padding:${pad(p)}">${inner}</td></tr></table>`;
  }
  function btnHtml(p, t) {
    const font = (t && t.bodyFont) || "'Inter',Arial,sans-serif";
    const w = p.full ? 'display:block;text-align:center;' : 'display:inline-block;';
    return `<a data-edit="btnText" data-free="btnOff" href="${escAttr(p.btnLink)}" target="_blank" style="${w}${freePos(p, 'btnOff')}font-family:${font};font-weight:700;font-size:${p.btnSize || 16}px;color:${p.btnColor};background:${p.btnBg};padding:14px 32px;border-radius:${p.radius != null ? p.radius : 999}px;text-decoration:none;box-shadow:0 8px 20px rgba(0,0,0,0.12)">${esc(p.btnText)}</a>`;
  }
  // Free x/y offset for draggable inline elements (buttons, links).
  function freePos(p, base) {
    const x = +p[base + 'X'] || 0, y = +p[base + 'Y'] || 0;
    return (x || y) ? `position:relative;left:${x}px;top:${y}px;` : '';
  }

  /* =========================================================
     INSPECTOR FIELD BUILDERS  (return HTML strings)
     ========================================================= */
  function textField(label, key) {
    return `<div class="field"><label>${label}</label>
      <input type="text" data-prop="${key}" value="${escAttr(curr(key))}"></div>`;
  }
  function areaField(label, key) {
    return `<div class="field"><label>${label}</label>
      <textarea data-prop="${key}">${esc(curr(key))}</textarea></div>`;
  }
  function numField(label, key, min, max) {
    return `<div class="field"><label>${label}</label>
      <input type="text" inputmode="numeric" data-prop="${key}" data-num="1" data-min="${min}" data-max="${max}" value="${escAttr(curr(key))}"></div>`;
  }
  function sliderField(label, key, min, max, unit = '', step = 1) {
    const v = curr(key);
    return `<div class="field"><label>${label}</label>
      <div class="slider">
        <input type="range" data-prop="${key}" data-num="1" min="${min}" max="${max}" step="${step}" value="${v}" oninput="this.nextElementSibling.textContent=this.value+'${unit}'">
        <span class="val">${v}${unit}</span>
      </div></div>`;
  }
  let _cf = 0;
  function colorField(label, key) {
    const v = curr(key) || '#ffffff';
    const id = 'c' + (++_cf);   // unique per field instance (bg/accent appear in both block + theme)
    return `<div class="field"><label>${label}</label>
      <div class="swatchrow">
        <input type="color" data-prop="${key}" data-sync="${id}" value="${toHex(v)}">
        <input type="text" id="${id}" data-prop="${key}" value="${escAttr(v)}">
      </div></div>`;
  }
  function selectField(label, key, opts) {
    const v = String(curr(key));
    return `<div class="field"><label>${label}</label>
      <select data-prop="${key}">${opts.map(([val, txt]) =>
        `<option value="${val}" ${val === v ? 'selected' : ''}>${txt}</option>`).join('')}</select></div>`;
  }
  function alignField(v) {
    return `<div class="field"><label>Alignment</label>
      <div class="seg" data-seg="align">
        <button data-val="left"   class="${v==='left'?'on':''}">${IC.alignL}</button>
        <button data-val="center" class="${v==='center'?'on':''}">${IC.alignC}</button>
        <button data-val="right"  class="${v==='right'?'on':''}">${IC.alignR}</button>
      </div></div>`;
  }
  function segToggle(label, key, isSecond, opts, isValue) {
    // opts: [[val,txt],[val,txt]]; boolean-style unless isValue
    const cur = isValue ? String(curr(key)) : (curr(key) ? String(curr(key)) : 'false');
    return `<div class="field"><label>${label}</label>
      <div class="seg" data-seg="${key}" data-bool="${isValue ? '' : '1'}">
        ${opts.map(([val, txt]) => `<button data-val="${val}" class="${cur===val?'on':''}">${txt}</button>`).join('')}
      </div></div>`;
  }
  function imageField(label, key) {
    return `<div class="field"><label>${label}</label>
      <input type="text" data-prop="${key}" placeholder="Paste image URL…" value="${escAttr(curr(key))}" style="margin-bottom:8px">
      <div class="filewrap">
        <button class="btn sm" style="width:100%;justify-content:center" onclick="this.nextElementSibling.click()">⬆ Upload image</button>
        <input type="file" accept="image/*" data-upload="${key}">
      </div></div>`;
  }
  function posField(base) {
    const x = curr(base + 'X') || 0, y = curr(base + 'Y') || 0;
    return `<div class="field"><label>Free position — drag it on the canvas</label>
        <div class="row2">
          <input type="text" inputmode="numeric" data-prop="${base}X" data-num="1" data-min="-800" data-max="800" value="${x}" title="Horizontal offset (px)">
          <input type="text" inputmode="numeric" data-prop="${base}Y" data-num="1" data-min="-800" data-max="800" value="${y}" title="Vertical offset (px)">
        </div>
        <div class="row2" style="margin-top:4px;font-size:10px;color:var(--ui-muted);text-align:center"><span>← → X</span><span>↑ ↓ Y</span></div>
        <button class="btn sm" data-reset="${base}" style="width:100%;justify-content:center;margin-top:6px">Reset to default position</button>
      </div>`;
  }
  function spacingFields(p) {
    return `<div class="insp-sep"></div>
      <div class="field"><label>Padding</label>
        <div class="row3">
          <input type="text" inputmode="numeric" data-prop="padTop" data-num="1" data-min="0" data-max="160" value="${p.padTop}" title="Top">
          <input type="text" inputmode="numeric" data-prop="padX" data-num="1" data-min="0" data-max="120" value="${p.padX}" title="Sides">
          <input type="text" inputmode="numeric" data-prop="padBottom" data-num="1" data-min="0" data-max="160" value="${p.padBottom}" title="Bottom">
        </div>
        <div class="row3" style="margin-top:4px;font-size:10px;color:var(--ui-muted);text-align:center">
          <span>top</span><span>sides</span><span>bottom</span>
        </div>
      </div>`;
  }
  function listEditor(label, items) {
    const rows = items.map((it, i) => `
      <div class="row2" style="margin-bottom:6px;grid-template-columns:1fr 1fr auto;align-items:center">
        <input type="text" data-list="label" data-i="${i}" value="${escAttr(it.label)}" placeholder="Label">
        <input type="text" data-list="link" data-i="${i}" value="${escAttr(it.link)}" placeholder="URL">
        <button class="btn sm danger" data-listdel="${i}">✕</button>
      </div>`).join('');
    return `<div class="field"><label>${label}</label>${rows}
      <button class="btn sm" data-listadd="1" style="width:100%;justify-content:center;margin-top:4px">+ Add link</button></div>`;
  }

  /* current-block prop lookup used by field builders */
  let _curBlock = null;
  function curr(key) { return _curBlock ? _curBlock.props[key] : ''; }

  function toHex(v) {
    if (!v) return '#000000';
    if (/^#([0-9a-f]{6})$/i.test(v)) return v;
    if (/^#([0-9a-f]{3})$/i.test(v)) return '#' + v.slice(1).split('').map(c => c + c).join('');
    return '#000000';
  }

  /* =========================================================
     PRESETS
     ========================================================= */
  const presets = {
    /* ---- Partner introduction: introduce the represented brands ---- */
    partner() {
      const t = defaultTheme();
      return [
        mk('brandbar', {}, t),
        mk('hero', {
          eyebrow: 'AUTHORISED BRAND PARTNER', title: 'Introducing CS Instruments, Höntzsch & ABLE', titleSize: 34,
          sub: 'Gyroscope Technology is your local partner for three trusted names in flow, gas and process measurement — with technical support at every step.',
          btnText: 'Talk to our team', btnLink: 'https://gyroinst.com/', overlay: 46,
          src: IMG.pcb,
        }, t),
        mk('heading', { text: 'Precision you trust, supported locally' }, t),
        mk('text', { text: 'We represent manufacturers who share our standard for accuracy and reliability. As an authorised distributor for CS Instruments, Höntzsch and ABLE Instruments & Controls, we bring their measurement expertise to your process — backed by hands-on engineering support from our team in Bangkok.' }, t),
        mk('partners', {}, t),
        mk('columns', {
          title: 'CS Instruments — compressed air & gas',
          body: 'Flow, dew point, pressure and consumption measurement for compressed air and industrial gases, from portable meters to fixed monitoring.',
          imageSide: 'left', btnText: 'View CS Instruments range',
          src: IMG.ds500,
        }, t),
        mk('columns', {
          title: 'Höntzsch — gas & air flow',
          body: 'Vane-wheel and vortex flow sensors for measuring gas and air velocity, including ATEX versions for hazardous areas.',
          imageSide: 'right', btnText: 'Explore Höntzsch sensors',
          src: IMG.hoentzsch,
        }, t),
        mk('button', { btnText: 'Request a consultation', btnLink: 'https://gyroinst.com/' }, t),
        mk('divider', {}, t),
        mk('footer', {}, t),
      ];
    },

    /* ---- Product / brand announcement (CS Instruments DS 500) ---- */
    product() {
      const t = defaultTheme();
      return [
        mk('brandbar', {}, t),
        mk('hero', {
          eyebrow: 'NOW AVAILABLE', title: 'CS Instruments DS 500 chart recorder', titleSize: 34,
          sub: 'Intelligent measurement, logging and analysis for compressed air and gas — ready to quote today.',
          btnText: 'Request a quotation', btnLink: 'https://gyroinst.com/', overlay: 46,
          src: IMG.airquality,
        }, t),
        mk('image', { src: IMG.ds500, width: 74, alt: 'CS Instruments DS 500 chart recorder' }, t),
        mk('heading', { text: 'Built for measurement confidence' }, t),
        mk('text', { text: 'The DS 500 is an intelligent chart recorder for compressed air and gas — measuring and logging flow, with energy analysis and leakage calculation on a clear touch display. Supplied and supported by Gyroscope Technology as an authorised CS Instruments partner.' }, t),
        mk('columns', {
          title: 'Portable option: PI 500',
          body: 'Need spot checks instead of fixed monitoring? The PI 500 portable flow meter brings the same accuracy to the field.',
          imageSide: 'right', btnText: 'Ask about the PI 500',
          src: IMG.pi500,
        }, t),
        mk('partners', {}, t),
        mk('button', { btnText: 'Get pricing & availability', btnLink: 'https://gyroinst.com/' }, t),
        mk('spacer', {}, t),
        mk('footer', {}, t),
      ];
    },

    /* ---- Company / capabilities introduction ---- */
    company() {
      const t = defaultTheme();
      return [
        mk('brandbar', {}, t),
        mk('hero', {
          eyebrow: 'A PASSION FOR PRECISION', title: 'Instrumentation, engineering & service', titleSize: 32,
          sub: 'For more than 25 years Gyroscope Technology has helped industrial teams source and support specialised measurement instruments.',
          btnText: 'Discover our services', btnLink: 'https://gyroinst.com/', overlay: 52,
          src: IMG.pcb,
        }, t),
        mk('heading', { text: 'One technical resource, connected capabilities' }, t),
        mk('text', { text: 'From selection to service, we bring together specialised products and practical engineering support — covering flow, level, gas and pressure measurement, custom sensors, and component-level PCB repair.' }, t),
        mk('columns', {
          title: 'Trusted brand partners',
          body: 'As an authorised distributor for CS Instruments, Höntzsch and ABLE Instruments & Controls, we match the right instrument to your application.',
          imageSide: 'left',
          src: IMG.airquality,
        }, t),
        mk('partners', {}, t),
        mk('button', { btnText: 'Contact our team', btnLink: 'https://gyroinst.com/' }, t),
        mk('divider', {}, t),
        mk('footer', {}, t),
      ];
    },
  };

  function defaultTheme() {
    return {
      accent: '#1A56DB', bg: '#e8e6dc', content: '#ffffff',
      text: '#33414f', heading: '#0A2540',
      font: "'Inter', Arial, sans-serif", bodyFont: "'Inter', Arial, sans-serif",
    };
  }
  function mk(type, over, theme) {
    const d = BLOCKS[type].defaults(theme || (state && state.theme) || defaultTheme());
    return { id: uid(), type, props: Object.assign(d, over || {}) };
  }

  /* =========================================================
     RENDER — build the email + editor decorations
     ========================================================= */
  function render() {
    renderEmail();
    renderInspector();
  }

  function renderEmail() {
    const email = $('#email');
    const t = state.theme;
    email.style.background = t.content;

    let html = `<div style="background:${t.bg};padding:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.bg}"><tr><td align="center" style="padding:0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;box-sizing:border-box;background:${t.content};border:1px solid #d9e1ea">
      <tr><td>`;

    html += `<div class="inserter" data-ins="0"><button title="Insert block">+</button></div>`;
    state.blocks.forEach((b, i) => {
      html += `<div class="block" data-id="${b.id}" data-selected="${b.id === selectedId}">
          <div class="block-label">${BLOCK_LABEL[b.type] || b.type}</div>
          <div class="block-tools">
            <button class="grip" draggable="true" title="Drag to move">${IC.grip}</button>
            <button data-act="up" title="Move up">${IC.up}</button>
            <button data-act="down" title="Move down">${IC.down}</button>
            <button data-act="dup" title="Duplicate">${IC.dup}</button>
            <button data-act="del" class="del" title="Delete">${IC.del}</button>
          </div>
          ${BLOCKS[b.type].render(b.props, t)}
        </div>`;
      html += `<div class="inserter" data-ins="${i + 1}"><button title="Insert block">+</button></div>`;
    });

    html += `</td></tr></table></td></tr></table></div>`;
    email.innerHTML = html;

    wireCanvas();
  }

  function wireCanvas() {
    // Select on click
    $$('#email .block').forEach(bl => {
      bl.addEventListener('mousedown', (e) => {
        if (e.target.closest('.block-tools')) return;
        select(bl.dataset.id);
      });
    });
    // Block tools
    $$('#email .block-tools button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!btn.dataset.act) return;   // grip has no action
        const id = btn.closest('.block').dataset.id;
        blockAction(id, btn.dataset.act);
      });
    });
    // Drag handle (grip) — reorder by dragging a block to a new spot
    $$('#email .block-tools .grip').forEach(g => {
      g.addEventListener('dragstart', (e) => beginMove(e, g.closest('.block').dataset.id));
      g.addEventListener('dragend', clearDrag);
    });
    // Omnidirectional free drag for buttons / links
    wireFreeDrag();
    // Inserters
    $$('#email .inserter button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        insertIndex = parseInt(btn.closest('.inserter').dataset.ins, 10);
        openPicker();
      });
    });
    // Inline editable text
    $$('#email [data-edit]').forEach(el => {
      el.setAttribute('contenteditable', 'true');
      el.addEventListener('focus', () => { const id = el.closest('.block').dataset.id; if (id !== selectedId) select(id, true); });
      el.addEventListener('input', () => { /* live; commit on blur */ });
      el.addEventListener('blur', () => {
        const block = getBlock(el.closest('.block').dataset.id);
        if (!block) return;
        const key = el.getAttribute('data-edit');
        const val = el.innerText.replace(/\u00a0/g, ' ').trim();
        if (block.props[key] !== val) {
          block.props[key] = val;
          pushHistory();
          save(true);
        }
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && el.getAttribute('data-edit') !== 'text' && el.getAttribute('data-edit') !== 'body' && el.getAttribute('data-edit') !== 'address' && el.getAttribute('data-edit') !== 'note') {
          e.preventDefault(); el.blur();
        }
      });
    });
  }

  /* =========================================================
     SELECTION + INSPECTOR
     ========================================================= */
  function select(id, keepEditing) {
    selectedId = id;
    $$('#email .block').forEach(b => b.dataset.selected = (b.dataset.id === id));
    renderInspector();
  }

  function renderInspector() {
    const insp = $('#inspector');
    const block = getBlock(selectedId);

    let html = '';
    if (block) {
      _curBlock = block;
      html += `<h3>${BLOCK_LABEL[block.type] || block.type} settings</h3>`;
      html += BLOCKS[block.type].inspector(block.props);
      html += `<div class="insp-sep"></div>`;
    }
    // Theme section always available
    html += themeInspector();
    insp.innerHTML = html;
    wireInspector();
  }

  function themeInspector() {
    _curBlock = { props: state.theme }; // reuse field builders on theme
    return `<h3>Email theme</h3>
      <div class="field"><label>Colour palette</label>
        <div class="palette" data-palette="1">
          ${PALETTES.map(p => `<button title="${p.name}" data-pal='${escAttr(JSON.stringify(p))}' style="background:linear-gradient(135deg, ${p.accent}, ${p.bg})"></button>`).join('')}
        </div>
      </div>
      ${colorField('Accent', 'accent')}
      ${colorField('Page background', 'bg')}
      ${colorField('Content background', 'content')}
      ${colorField('Body text', 'text')}
      ${colorField('Headings', 'heading')}
      ${selectField('Heading font', 'font', [["'Poppins', Arial, sans-serif","Poppins"],["'Inter', Arial, sans-serif","Inter"],["Georgia, serif","Georgia"],["'Trebuchet MS', sans-serif","Trebuchet"],["'Arial Black', sans-serif","Arial Black"]])}
      ${selectField('Body font', 'bodyFont', [["'Inter', Arial, sans-serif","Inter"],["'Poppins', Arial, sans-serif","Poppins"],["Georgia, serif","Georgia"],["Verdana, sans-serif","Verdana"],["'Trebuchet MS', sans-serif","Trebuchet"]])}`;
  }

  function wireInspector() {
    const insp = $('#inspector');

    // text / number / textarea / select inputs
    $$('[data-prop]', insp).forEach(inp => {
      const key = inp.getAttribute('data-prop');
      const isColorPick = inp.type === 'color';
      const evt = (inp.tagName === 'SELECT' || inp.type === 'range' || isColorPick) ? 'input' : 'input';
      inp.addEventListener(evt, () => {
        const target = inp.closest('.palette') ? state.theme : targetForControl(inp, key);
        let val = inp.value;
        if (inp.dataset.num) {
          val = parseFloat(val); if (isNaN(val)) return;
          if (inp.dataset.min != null) val = Math.max(val, parseFloat(inp.dataset.min));
          if (inp.dataset.max != null) val = Math.min(val, parseFloat(inp.dataset.max));
        }
        target[key] = val;
        // sync paired color text <-> picker
        if (inp.dataset.sync) { const m = document.getElementById(inp.dataset.sync); if (m) m.value = val; }
        if (inp.id && inp.id[0] === 'c') { const pick = insp.querySelector(`[data-sync="${inp.id}"]`); if (pick && /^#([0-9a-f]{3,6})$/i.test(val)) pick.value = toHex(val); }
        applyLive();
      });
      inp.addEventListener('change', () => { pushHistory(); save(true); });
    });

    // uploads
    $$('[data-upload]', insp).forEach(f => {
      f.addEventListener('change', () => {
        const file = f.files[0]; if (!file) return;
        const key = f.getAttribute('data-upload');
        const reader = new FileReader();
        reader.onload = () => {
          targetForControl(f, key)[key] = reader.result;
          applyLive(); pushHistory(); save(true);
        };
        reader.readAsDataURL(file);
      });
    });

    // segmented controls (align + toggles)
    $$('[data-seg]', insp).forEach(seg => {
      const key = seg.getAttribute('data-seg') === 'align' ? 'align' : seg.getAttribute('data-seg');
      const isBool = seg.hasAttribute('data-bool');
      seg.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => {
          seg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
          let v = b.dataset.val;
          const target = targetForControl(seg, key);
          if (isBool) v = (v === 'true');
          target[key] = v;
          applyLive(); pushHistory(); save(true);
        });
      });
    });

    // reset free-position offsets
    $$('[data-reset]', insp).forEach(btn => btn.addEventListener('click', () => {
      const b = getBlock(selectedId); if (!b) return;
      const base = btn.getAttribute('data-reset');
      b.props[base + 'X'] = 0; b.props[base + 'Y'] = 0;
      render(); pushHistory(); save(true);
    }));

    // palette swatches
    $$('[data-pal]', insp).forEach(b => {
      b.addEventListener('click', () => {
        const p = JSON.parse(b.getAttribute('data-pal'));
        state.theme.accent = p.accent;
        state.theme.bg = p.bg;
        state.theme.content = p.content;
        applyLive(); render(); pushHistory(); save(true);
        toast(p.name + ' theme applied');
      });
    });

    // list editor (social)
    $$('[data-list]', insp).forEach(inp => {
      inp.addEventListener('input', () => {
        const b = getBlock(selectedId); if (!b) return;
        b.props.items[+inp.dataset.i][inp.dataset.list] = inp.value;
        applyLive();
      });
      inp.addEventListener('change', () => { pushHistory(); save(true); });
    });
    $$('[data-listdel]', insp).forEach(btn => btn.addEventListener('click', () => {
      const b = getBlock(selectedId); b.props.items.splice(+btn.dataset.listdel, 1);
      render(); pushHistory(); save(true);
    }));
    $$('[data-listadd]', insp).forEach(btn => btn.addEventListener('click', () => {
      const b = getBlock(selectedId); b.props.items.push({ label: 'New link', link: '#' });
      render(); pushHistory(); save(true);
    }));
  }

  // Which props object does this control write to?
  function targetForControl(el, key) {
    if (el.closest('.palette')) return state.theme;
    // Theme controls come after the "Email theme" heading.
    let n = el; let inThemeSection = false;
    // Walk previous siblings up the inspector to find nearest H3.
    let node = el.closest('.field') || el;
    while (node && node.previousElementSibling) {
      node = node.previousElementSibling;
      if (node.tagName === 'H3') { inThemeSection = node.textContent === 'Email theme'; break; }
    }
    if (inThemeSection) return state.theme;
    const b = getBlock(selectedId);
    return b ? b.props : state.theme;
  }

  /* Apply changes without rebuilding the whole DOM (keeps caret / avoids flespecially for sliders). Falls back to full render for structural props. */
  let liveTimer = null;
  function applyLive() {
    // A light re-render of just the email HTML (not inspector) keeps things simple and correct.
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      // Re-render only the email canvas so inspector controls (sliders,
      // colour pickers) keep focus and stay draggable during edits.
      renderEmail();
    }, 10);
  }

  /* =========================================================
     BLOCK ACTIONS
     ========================================================= */
  function getBlock(id) { return state.blocks.find(b => b.id === id); }
  function indexOf(id) { return state.blocks.findIndex(b => b.id === id); }

  function blockAction(id, act) {
    const i = indexOf(id); if (i < 0) return;
    if (act === 'up' && i > 0) { swap(i, i - 1); }
    else if (act === 'down' && i < state.blocks.length - 1) { swap(i, i + 1); }
    else if (act === 'dup') {
      const copy = { id: uid(), type: state.blocks[i].type, props: JSON.parse(JSON.stringify(state.blocks[i].props)) };
      state.blocks.splice(i + 1, 0, copy); selectedId = copy.id;
    } else if (act === 'del') {
      state.blocks.splice(i, 1); selectedId = null;
    }
    render(); pushHistory(); save(true);
  }
  function swap(a, b) { const x = state.blocks[a]; state.blocks[a] = state.blocks[b]; state.blocks[b] = x; }

  /* =========================================================
     DRAG & DROP — reorder blocks freely, or drag new blocks
     in from the rail. Email stays a valid vertical layout, so
     "free" here means drop anywhere in the stack.
     ========================================================= */
  let drag = null;      // { kind:'move', id } | { kind:'new', type }
  let dropIndex = null;

  function beginMove(e, id) {
    drag = { kind: 'move', id };
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', 'move:' + id); } catch (_) {}
    const bl = e.currentTarget.closest('.block');
    if (bl) {
      try { e.dataTransfer.setDragImage(bl, 24, 20); } catch (_) {}
      setTimeout(() => bl.classList.add('dragging'), 0);   // defer so drag image isn't faded
    }
  }
  function beginNew(e, type) {
    drag = { kind: 'new', type };
    e.dataTransfer.effectAllowed = 'copy';
    try { e.dataTransfer.setData('text/plain', 'new:' + type); } catch (_) {}
  }

  function computeDropIndex(clientY) {
    const blocks = $$('#email .block');
    for (let i = 0; i < blocks.length; i++) {
      const r = blocks[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return blocks.length;
  }
  function setIndicator(idx) {
    dropIndex = idx;
    $$('#email .inserter').forEach(ins => ins.classList.toggle('drop-active', +ins.dataset.ins === idx));
  }
  function clearIndicator() {
    dropIndex = null;
    $$('#email .inserter').forEach(ins => ins.classList.remove('drop-active'));
  }
  function clearDrag() {
    drag = null;
    clearIndicator();
    $$('#email .block').forEach(b => b.classList.remove('dragging'));
  }

  function onEmailDragOver(e) {
    if (!drag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = drag.kind === 'new' ? 'copy' : 'move';
    setIndicator(computeDropIndex(e.clientY));
  }
  /* ---- Omnidirectional free drag for inline elements (buttons/links) ----
     Pointer-based so it's smooth in any direction and can tell a click
     (edit the label) apart from a drag (reposition). Offset is stored as
     <base>X / <base>Y on the block and applied via position:relative. */
  function wireFreeDrag() {
    $$('#email [data-free]').forEach(el => el.addEventListener('pointerdown', freePointerDown));
  }
  function freePointerDown(e) {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const base = el.getAttribute('data-free');
    const host = el.closest('.block');
    const block = host && getBlock(host.dataset.id);
    if (!block) return;

    const startX = e.clientX, startY = e.clientY;
    const origX = +block.props[base + 'X'] || 0;
    const origY = +block.props[base + 'Y'] || 0;
    let moved = false, nx = origX, ny = origY;

    const move = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 4) {
        moved = true;
        el.classList.add('free-dragging');
        const sel = window.getSelection && window.getSelection();
        if (sel) sel.removeAllRanges();
        if (el.blur) el.blur();
      }
      if (moved) {
        ev.preventDefault();
        nx = origX + dx; ny = origY + dy;
        el.style.position = 'relative';
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
      }
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      if (moved) {
        el.classList.remove('free-dragging');
        block.props[base + 'X'] = Math.round(nx);
        block.props[base + 'Y'] = Math.round(ny);
        render(); pushHistory(); save(true);
      }
    };
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  function onEmailDrop(e) {
    if (!drag) return;
    e.preventDefault();
    const target = dropIndex != null ? dropIndex : computeDropIndex(e.clientY);
    const d = drag;
    if (d.kind === 'new') {
      const b = mk(d.type, {}, state.theme);
      state.blocks.splice(target, 0, b);
      selectedId = b.id;
    } else {
      const from = indexOf(d.id);
      if (from >= 0) {
        if (target === from || target === from + 1) { clearDrag(); return; }  // dropped on itself
        let to = target;
        if (to > from) to--;               // account for the removed item
        const [item] = state.blocks.splice(from, 1);
        state.blocks.splice(to, 0, item);
        selectedId = item.id;
      }
    }
    clearDrag();
    render(); pushHistory(); save(true);
  }

  /* =========================================================
     ADD-BLOCK PICKER
     ========================================================= */
  function buildRail() {
    const rail = $('#railBlocks');
    const pick = $('#pickerBlocks');
    const html = RAIL_ORDER.map(t =>
      `<button class="blockbtn" data-add="${t}">${railIcon(t)}<span>${BLOCK_LABEL[t]}</span></button>`).join('');
    rail.innerHTML = html; pick.innerHTML = html;
    $$('[data-add]').forEach(b => {
      b.addEventListener('click', () => addBlock(b.dataset.add));
      b.setAttribute('draggable', 'true');
      b.addEventListener('dragstart', (e) => beginNew(e, b.dataset.add));
      b.addEventListener('dragend', clearDrag);
    });
  }
  function addBlock(type) {
    const b = mk(type, {}, state.theme);
    const at = (insertIndex == null) ? state.blocks.length : insertIndex;
    state.blocks.splice(at, 0, b);
    insertIndex = null; selectedId = b.id;
    closePicker(); render(); pushHistory(); save(true);
    // scroll to it
    const el = $(`#email .block[data-id="${b.id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function openPicker() { $('#pickerBackdrop').classList.add('show'); }
  function closePicker() { $('#pickerBackdrop').classList.remove('show'); insertIndex = null; }

  /* =========================================================
     HISTORY (undo / redo)
     ========================================================= */
  function pushHistory() {
    if (suppressHistory) return;
    history.splice(hIndex + 1);
    history.push(JSON.stringify(state));
    if (history.length > 60) history.shift();
    hIndex = history.length - 1;
    updateHistBtns();
  }
  function undo() { if (hIndex > 0) { hIndex--; restore(); } }
  function redo() { if (hIndex < history.length - 1) { hIndex++; restore(); } }
  function restore() {
    suppressHistory = true;
    state = JSON.parse(history[hIndex]);
    if (!getBlock(selectedId)) selectedId = null;
    render(); save(true); suppressHistory = false; updateHistBtns();
  }
  function updateHistBtns() {
    $('#undoBtn').disabled = hIndex <= 0;
    $('#redoBtn').disabled = hIndex >= history.length - 1;
  }

  /* =========================================================
     SAVE / LOAD / EXPORT
     ========================================================= */
  function save(silent) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
    if (!silent) toast('Saved');
    setStatus('Saved · ' + new Date().toLocaleTimeString());
  }
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        // Existing saved campaigns may still contain the partner SVG URLs.
        // Migrate them in-place because Gmail and Outlook require raster logos.
        const migrated = raw
          .replace(/https:\/\/gyroinst\.com\/partners\/hoentzsch\.svg/gi, 'https://gyroinst.com/partners/hoentzsch.png')
          .replace(/https:\/\/gyroinst\.com\/partners\/able-instruments\.svg/gi, 'https://gyroinst.com/partners/able-instruments.png');
        state = JSON.parse(migrated);
        let changed = migrated !== raw;
        if (state.theme && ['#fff', '#ffffff', '#eef3fb'].includes(String(state.theme.bg || '').toLowerCase())) {
          state.theme.bg = '#e8e6dc';
          changed = true;
        }
        state.blocks.forEach(block => {
          ['src', 'l1', 'l2', 'l3', 'l4'].forEach(key => {
            if (!block.props || !block.props[key]) return;
            const hosted = liveImageUrl(block.props[key]);
            if (hosted !== block.props[key]) {
              block.props[key] = hosted;
              changed = true;
            }
          });
          if (
            block.type === 'logo'
            && (
              /(?:^|\/)gti-mark\.png(?:\?|$)/i.test(block.props.src || '')
              || (!block.props.useImage && block.props.text === BRAND.name)
            )
          ) {
            block.props.useImage = true;
            block.props.src = IMG.brandEmail;
            block.props.imgW = 300;
            changed = true;
          }
          if (block.type === 'partners' && Number(block.props.height || 0) <= 34) {
            block.props.height = 56;
            changed = true;
          }
          if (block.type === 'brandbar' && ['#fff', '#ffffff'].includes(String(block.props.bg || '').toLowerCase())) {
            block.props.bg = '#f4f8fd';
            changed = true;
          }
          if (block.type === 'footer') {
            ['unsub', 'unsubLink', 'linkColor'].forEach(key => {
              if (Object.prototype.hasOwnProperty.call(block.props, key)) {
                delete block.props[key];
                changed = true;
              }
            });
          }
        });
        if (changed) localStorage.setItem(LS_KEY, JSON.stringify(state));
        return true;
      }
    } catch (e) {}
    return false;
  }
  function loadPreset(name) {
    if (!presets[name]) return;
    state = { theme: defaultTheme(), blocks: presets[name]() };
    selectedId = null; render(); pushHistory(); save(true);
    toast('Loaded ' + name + ' template');
  }

  // Make an image path absolute against a hosting base URL.
  function absUrl(p, base) {
    if (!p) return p;
    const hosted = liveImageUrl(p);
    if (/^(https?:|data:|cid:)/i.test(hosted)) return hosted;
    const withSlash = (base || HOST).replace(/\/?$/, '/');
    return withSlash + hosted.replace(/\\/g, '/').split('/').pop();
  }

  // Filenames the user must upload to their host (skips hosted + embedded).
  function referencedImages() {
    const set = new Set();
    state.blocks.forEach(b => {
      ['src', 'l1', 'l2', 'l3', 'l4'].forEach(k => {
        const v = liveImageUrl(b.props[k]);
        if (v && !/^(https?:|data:|cid:)/i.test(v)) set.add(v.split('/').pop());
      });
    });
    return [...set];
  }
  function hasEmbeddedImages() {
    return state.blocks.some(b => ['src','l1','l2','l3','l4'].some(k => /^data:/i.test(b.props[k] || '')));
  }

  function buildExportHTML(opts = {}) {
    const t = state.theme;
    const base = (opts.imageBase || '').trim();
    let body = state.blocks.map(b => BLOCKS[b.type].render(b.props, t, { email: true })).join('\n');
    // Drop editor-only hooks
    body = body.replace(/\s(?:data-edit|data-free)="[^"]*"/g, '');
    // Absolute image URLs (src="" and CSS url('') for hero backgrounds)
    body = body.replace(/src="([^"]+)"/g, (m, p) => `src="${absUrl(p, base)}"`);
    body = body.replace(/url\('([^']+)'\)/g, (m, p) => `url('${absUrl(p, base)}')`);
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>Email</title>
</head>
<body bgcolor="${t.bg}" style="margin:0;padding:0;background:${t.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${t.bg}" style="width:100%;border-collapse:collapse;border-spacing:0;background:${t.bg};">
    <tr><td align="center" bgcolor="${t.bg}" style="padding:24px 0;background:${t.bg};">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" bgcolor="#d9e1ea" style="width:100%;max-width:640px;border-collapse:separate;border-spacing:0;box-sizing:border-box;background:#d9e1ea;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:1px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${t.content}" style="width:100%;border-collapse:collapse;border-spacing:0;background:${t.content};border-radius:13px;overflow:hidden;">
            <tr><td>
${body}
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  function refreshExport() {
    const base = $('#imgBase') ? $('#imgBase').value : '';
    $('#exportOut').value = buildExportHTML({ imageBase: base });
    // Files-to-upload hint
    const files = referencedImages();
    const el = $('#exportFiles');
    if (el) {
      let msg = '';
      if (files.length) msg = '<b>Upload these files</b> to your host, then set the base URL above:<br>' + files.map(f => '• ' + esc(f)).join('<br>');
      else msg = 'No local images to host — all image URLs are already absolute.';
      if (hasEmbeddedImages()) msg += '<br><span style="color:#b45309">⚠ Some images are embedded (uploaded). Gmail blocks embedded images — host them and use a URL instead.</span>';
      el.innerHTML = msg;
    }
  }

  function openExport() {
    refreshExport();
    $('#exportBackdrop').classList.add('show');
  }
  function closeExport() { $('#exportBackdrop').classList.remove('show'); }
  function copyRenderedEmail(e) {
    const root = $('#email');
    const sel = window.getSelection();
    if (!root || !sel || sel.isCollapsed || !sel.rangeCount || !root.contains(sel.anchorNode) || !e.clipboardData) return;

    // Copy the clean exported fragment instead of the editor DOM, which contains
    // controls and the original inline SVG. The brand bar now contains the
    // hosted PNG, so Gmail can retain the logo when this is pasted.
    const doc = new DOMParser().parseFromString(buildExportHTML(), 'text/html');
    e.preventDefault();
    e.clipboardData.setData('text/html', doc.body.innerHTML);
    e.clipboardData.setData('text/plain', sel.toString());
    toast('Rendered email copied');
  }
  document.addEventListener('copy', copyRenderedEmail);

  function copyForGmail() {
    const doc = new DOMParser().parseFromString(buildExportHTML(), 'text/html');
    const html = doc.body.innerHTML;
    const text = doc.body.textContent.replace(/\s+/g, ' ').trim();

    const fallback = () => {
      const holder = document.createElement('div');
      holder.contentEditable = 'true';
      holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:640px;opacity:0;pointer-events:none';
      holder.innerHTML = html;
      document.body.appendChild(holder);
      const range = document.createRange();
      range.selectNodeContents(holder);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const copied = document.execCommand('copy');
      selection.removeAllRanges();
      holder.remove();
      if (!copied) throw new Error('Clipboard copy was rejected');
    };

    if (navigator.clipboard?.write && window.ClipboardItem) {
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      })]).then(() => toast('Copied for Gmail')).catch(() => {
        try { fallback(); toast('Copied for Gmail'); } catch (_) { toast('Copy failed — use Ctrl+C on the email'); }
      });
    } else {
      try { fallback(); toast('Copied for Gmail'); } catch (_) { toast('Copy failed — use Ctrl+C on the email'); }
    }
  }
  function copyExport() {
    const ta = $('#exportOut'); ta.select();
    navigator.clipboard.writeText(ta.value).then(() => toast('Copied to clipboard')).catch(() => { document.execCommand('copy'); toast('Copied'); });
  }
  function downloadExport() {
    const blob = new Blob([$('#exportOut').value], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'email-advertisement.html';
    a.click(); URL.revokeObjectURL(a.href); toast('Downloaded');
  }
  function preview() {
    const w = window.open('', '_blank');
    w.document.write(buildExportHTML()); w.document.close();
  }
  function refreshExportPublic() { refreshExport(); }

  /* =========================================================
     MISC UI
     ========================================================= */
  function setDevice(d) {
    device = d;
    $('#canvasWrap').className = 'canvas-wrap ' + d;
    $('#dvDesktop').classList.toggle('on', d === 'desktop');
    $('#dvMobile').classList.toggle('on', d === 'mobile');
  }
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  function setStatus(s) { $('#status').textContent = s; }

  /* =========================================================
     BOOT
     ========================================================= */
  function init() {
    buildRail();
    if (!load()) { state = { theme: defaultTheme(), blocks: presets.partner() }; }
    render();
    pushHistory();
    setStatus('Ready');

    // Deselect when clicking empty stage
    $('.stage').addEventListener('mousedown', (e) => {
      if (!e.target.closest('.block') && !e.target.closest('.inserter')) {
        selectedId = null; render();
      }
    });

    // Drag & drop drop-zone (wired once; #email persists across renders)
    const email = $('#email');
    email.addEventListener('dragover', onEmailDragOver);
    email.addEventListener('drop', onEmailDrop);
    email.addEventListener('dragleave', (e) => {
      if (drag && !email.contains(e.relatedTarget)) clearIndicator();
    });

    $('#undoBtn').addEventListener('click', undo);
    $('#redoBtn').addEventListener('click', redo);

    document.addEventListener('keydown', (e) => {
      const editing = document.activeElement && (document.activeElement.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !editing) { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) && !editing) { e.preventDefault(); redo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editing) { e.preventDefault(); blockAction(selectedId, 'del'); }
    });
  }

  // Public API used by inline onclick handlers
  window.Studio = {
    save, loadPreset, setDevice, preview,
    openExport, closeExport, copyExport, copyForGmail, downloadExport, refreshExport: refreshExportPublic,
    closePicker,
  };

  document.addEventListener('DOMContentLoaded', init);
})();
