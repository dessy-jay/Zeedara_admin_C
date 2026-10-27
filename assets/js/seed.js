/* Zeedara Admin — seed dataset.
   Deterministic (seeded PRNG) so KPIs, charts and tables stay stable between reloads. */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- rng */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }
  var R = rng(20260729);
  function rand(a, b) { return a + Math.floor(R() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(R() * a.length)]; }
  function picks(a, n) {
    var c = a.slice(), o = [];
    while (o.length < n && c.length) o.push(c.splice(Math.floor(R() * c.length), 1)[0]);
    return o;
  }
  function chance(p) { return R() < p; }
  function id(prefix, n, pad) { return prefix + String(n).padStart(pad || 4, '0'); }

  /* --------------------------------------------------------- date utils */
  var TODAY = new Date(2026, 6, 29);           // 29 Jul 2026 — matches session date
  function dayShift(n) { var d = new Date(TODAY); d.setDate(d.getDate() + n); return d; }
  function iso(d) { return d.toISOString(); }
  function isoDay(d) { return d.toISOString().slice(0, 10); }

  /* ------------------------------------------------------------ options */
  var LENGTHS   = ['10"', '12"', '14"', '16"', '18"', '20"', '22"', '24"', '26"', '28"', '30"'];
  var TEXTURES  = ['Body Wave', 'Straight', 'Deep Wave', 'Kinky Curly', 'Loose Wave', 'Water Wave', 'Bone Straight', 'Afro Kinky'];
  var LACES     = ['13x6 HD Lace', '13x4 Frontal', '5x5 Closure', '4x4 Closure', '360 Lace', 'Glueless U-Part', 'Full Lace'];
  var DENSITIES = ['130%', '150%', '180%', '200%', '250%'];
  var CAPS      = ['Small (21")', 'Medium (22.5")', 'Large (23.5")'];
  var ORIGINS   = ['Brazilian', 'Peruvian', 'Malaysian', 'Indian', 'Vietnamese', 'Cambodian'];
  var COLOURS   = [
    { name: 'Natural Black 1B', hex: '#1C1917' },
    { name: 'Jet Black 1',      hex: '#0B0B0B' },
    { name: 'Dark Brown 2',     hex: '#3B2A20' },
    { name: 'Chestnut 4',       hex: '#5C3A21' },
    { name: 'Honey Blonde 27',  hex: '#B57A3C' },
    { name: 'Ash Blonde 613',   hex: '#D9C39A' },
    { name: 'Burgundy 99J',     hex: '#6B1B2B' },
    { name: 'Copper Ginger 30', hex: '#9A4B1F' },
    { name: 'Platinum 60',      hex: '#E5DDD0' },
    { name: 'Highlight P4/27',  hex: '#7A4B27' }
  ];

  /* --------------------------------------------------------- catalogue */
  var CATEGORIES = [
    { id: 'cat-wigs',      name: 'Wigs',              slug: 'wigs',              parent: null,         icon: '💇🏾‍♀️', desc: 'Ready-to-wear lace wigs and units' },
    { id: 'cat-frontal',   name: 'Frontal Wigs',      slug: 'frontal-wigs',      parent: 'cat-wigs',   icon: '✨', desc: '13x4 and 13x6 lace frontal units' },
    { id: 'cat-closure',   name: 'Closure Wigs',      slug: 'closure-wigs',      parent: 'cat-wigs',   icon: '🌟', desc: '4x4 and 5x5 closure units' },
    { id: 'cat-glueless',  name: 'Glueless Wigs',     slug: 'glueless-wigs',     parent: 'cat-wigs',   icon: '💫', desc: 'Beginner-friendly glueless units' },
    { id: 'cat-bundles',   name: 'Bundles',           slug: 'bundles',           parent: null,         icon: '🧵', desc: 'Raw and virgin hair bundles' },
    { id: 'cat-closures',  name: 'Closures & Frontals', slug: 'closures-frontals', parent: 'cat-bundles', icon: '🎀', desc: 'Standalone lace pieces' },
    { id: 'cat-skincare',  name: 'Skincare',          slug: 'skincare',          parent: null,         icon: '🧴', desc: 'Clinic-grade skincare range' },
    { id: 'cat-serums',    name: 'Serums & Actives',  slug: 'serums-actives',    parent: 'cat-skincare', icon: '💧', desc: 'Targeted treatment serums' },
    { id: 'cat-cleansers', name: 'Cleansers',         slug: 'cleansers',         parent: 'cat-skincare', icon: '🫧', desc: 'Gels, foams and balms' },
    { id: 'cat-fragrance', name: 'Fragrance',         slug: 'fragrance',         parent: null,         icon: '🌸', desc: 'Signature perfume collection' },
    { id: 'cat-tools',     name: 'Tools & Accessories', slug: 'tools-accessories', parent: null,       icon: '🪮', desc: 'Brushes, caps, glue and care' },
    { id: 'cat-makeup',    name: 'Makeup',            slug: 'makeup',            parent: null,         icon: '💄', desc: 'Complexion and colour cosmetics' }
  ];

  var COLLECTIONS = [
    { id: 'col-top',      name: 'Top Collections',    slug: 'top-collections',  desc: 'Curated hero collection on the landing page', featured: true,  position: 1, productIds: [] },
    { id: 'col-new',      name: 'New Arrivals',       slug: 'new-arrivals',     desc: 'Latest drops, refreshed weekly',              featured: true,  position: 2, productIds: [] },
    { id: 'col-best',     name: 'Best Sellers',       slug: 'best-sellers',     desc: 'Highest-selling units this quarter',          featured: true,  position: 3, productIds: [] },
    { id: 'col-bridal',   name: 'Bridal & Occasion',  slug: 'bridal-occasion',  desc: 'Premium units for weddings and events',        featured: false, position: 4, productIds: [] },
    { id: 'col-glow',     name: 'Glow Skincare Edit', slug: 'glow-edit',        desc: 'Clinic favourites for even, glowing skin',     featured: true,  position: 5, productIds: [] },
    { id: 'col-budget',   name: 'Under ₦100,000',     slug: 'under-100k',       desc: 'Quality units at an accessible price',         featured: false, position: 6, productIds: [] }
  ];

  var PRODUCT_BLUEPRINTS = [
    // wigs — frontal
    { n: 'Bare Lace 13x6 Wig Lacefrontal',      c: 'cat-frontal',  p: 145000, e: '💇🏾‍♀️', tags: ['hd lace', 'bestseller', 'pre-plucked'] },
    { n: 'Melted HD 13x6 Frontal Wig',          c: 'cat-frontal',  p: 178000, e: '✨',   tags: ['hd lace', 'premium'] },
    { n: 'Bone Straight 13x4 Frontal Wig',      c: 'cat-frontal',  p: 132000, e: '💫',   tags: ['bone straight', 'bestseller'] },
    { n: 'Deep Wave 13x4 Frontal Unit',         c: 'cat-frontal',  p: 128000, e: '🌊',   tags: ['deep wave'] },
    { n: 'Loose Wave HD Frontal Wig',           c: 'cat-frontal',  p: 139000, e: '🌀',   tags: ['loose wave'] },
    // wigs — closure
    { n: '5x5 Closure Body Wave Wig',           c: 'cat-closure',  p: 118000, e: '🌟',   tags: ['body wave'] },
    { n: '4x4 Closure Kinky Curly Wig',         c: 'cat-closure',  p: 104000, e: '🌸',   tags: ['kinky curly', 'natural'] },
    { n: 'Silk Base 5x5 Closure Wig',           c: 'cat-closure',  p: 156000, e: '🎐',   tags: ['silk base', 'premium'] },
    // wigs — glueless
    { n: 'Glueless U-Part Wig Beginner Friendly', c: 'cat-glueless', p: 96000, e: '💫',  tags: ['glueless', 'beginner'] },
    { n: 'Wear & Go Glueless Bob Wig',          c: 'cat-glueless', p: 87000,  e: '🎀',   tags: ['glueless', 'bob'] },
    { n: 'Pre-Cut Lace Glueless Wig',           c: 'cat-glueless', p: 112000, e: '🪞',   tags: ['glueless', 'pre-cut'] },
    // bundles
    { n: 'Raw Vietnamese Straight Bundle',      c: 'cat-bundles',  p: 62000,  e: '🧵',   tags: ['raw hair', 'single donor'] },
    { n: 'Brazilian Body Wave Bundle Deal 3pc', c: 'cat-bundles',  p: 168000, e: '🧶',   tags: ['bundle deal', 'bestseller'] },
    { n: 'Peruvian Deep Wave Bundle',           c: 'cat-bundles',  p: 58000,  e: '🌊',   tags: ['deep wave'] },
    { n: 'Malaysian Kinky Curly Bundle',        c: 'cat-bundles',  p: 54000,  e: '🌀',   tags: ['kinky curly'] },
    { n: 'Indian Loose Wave Bundle 4pc',        c: 'cat-bundles',  p: 194000, e: '💠',   tags: ['bundle deal'] },
    // closures & frontals
    { n: '13x6 HD Lace Frontal Piece',          c: 'cat-closures', p: 48000,  e: '🎀',   tags: ['hd lace'] },
    { n: '5x5 Transparent Lace Closure',        c: 'cat-closures', p: 36000,  e: '🩰',   tags: ['transparent lace'] },
    { n: '360 Lace Frontal Piece',              c: 'cat-closures', p: 66000,  e: '⭕',   tags: ['360 lace'] },
    // skincare
    { n: 'Zeedara Glow Vitamin C Serum 30ml',   c: 'cat-serums',   p: 28000,  e: '💧',   tags: ['vitamin c', 'brightening', 'clinic'] },
    { n: 'Even-Tone Niacinamide Serum 30ml',    c: 'cat-serums',   p: 24500,  e: '🧪',   tags: ['niacinamide', 'clinic'] },
    { n: 'Retinol Renewal Night Serum 30ml',    c: 'cat-serums',   p: 34000,  e: '🌙',   tags: ['retinol', 'clinic'] },
    { n: 'Hydra-Barrier Ceramide Moisturiser',  c: 'cat-skincare', p: 26500,  e: '🫧',   tags: ['ceramide', 'barrier'] },
    { n: 'Gentle Gel Cleanser 150ml',           c: 'cat-cleansers', p: 17500, e: '🧼',   tags: ['cleanser', 'daily'] },
    { n: 'Charcoal Detox Cleansing Balm',       c: 'cat-cleansers', p: 21000,  e: '🖤',   tags: ['cleanser', 'detox'] },
    { n: 'SPF 50 Invisible Sunscreen Fluid',    c: 'cat-skincare', p: 23000,  e: '☀️',   tags: ['spf', 'daily', 'bestseller'] },
    { n: 'Clarifying Acne Spot Treatment',      c: 'cat-skincare', p: 15500,  e: '🎯',   tags: ['acne', 'clinic'] },
    // fragrance
    { n: 'Zeedara Noir Eau de Parfum 100ml',    c: 'cat-fragrance', p: 78000, e: '🌸',   tags: ['signature', 'oriental'] },
    { n: 'Zeedara Amber Oud 50ml',              c: 'cat-fragrance', p: 92000, e: '🏺',   tags: ['oud', 'premium'] },
    { n: 'Zeedara Blossom Mist 200ml',          c: 'cat-fragrance', p: 34000, e: '🌺',   tags: ['body mist'] },
    // tools
    { n: 'Detangling Wig Brush',                c: 'cat-tools',    p: 8500,   e: '🪮',   tags: ['care'] },
    { n: 'Lace Melt Adhesive Kit',              c: 'cat-tools',    p: 14500,  e: '🧰',   tags: ['install'] },
    { n: 'Satin-Lined Wig Cap 3pc',             c: 'cat-tools',    p: 5500,   e: '🎩',   tags: ['care'] },
    { n: 'Adjustable Wig Stand & Mannequin',    c: 'cat-tools',    p: 19500,  e: '🗿',   tags: ['styling'] },
    // makeup
    { n: 'Skin Blur Serum Foundation',          c: 'cat-makeup',   p: 32000,  e: '💄',   tags: ['complexion'] },
    { n: 'Melanin Rich Concealer Palette',      c: 'cat-makeup',   p: 27500,  e: '🎨',   tags: ['complexion'] },
    { n: 'Velvet Matte Lip Set 4pc',            c: 'cat-makeup',   p: 22000,  e: '💋',   tags: ['lips'] }
  ];

  /* ---------------------------------------------------------- customers */
  var FIRST = ['Adaeze', 'Chioma', 'Zainab', 'Folake', 'Ngozi', 'Amara', 'Halima', 'Temitope', 'Blessing', 'Ifeoma',
    'Yetunde', 'Aisha', 'Chinelo', 'Damilola', 'Funmi', 'Kemi', 'Oluchi', 'Rukayat', 'Sade', 'Uchenna',
    'Nkechi', 'Bisola', 'Grace', 'Peace', 'Joy', 'Simisola', 'Hauwa', 'Ebele', 'Titilayo', 'Maryam',
    'Desmond', 'Emeka', 'Tunde', 'Kelechi', 'Ibrahim', 'Segun', 'Chidi', 'Musa'];
  var LAST = ['Okafor', 'Adeyemi', 'Bello', 'Eze', 'Nwosu', 'Balogun', 'Ibrahim', 'Okonkwo', 'Adebayo', 'Musa',
    'Chukwu', 'Lawal', 'Obi', 'Afolabi', 'Yusuf', 'Ogunleye', 'Nnamdi', 'Salami', 'Umeh', 'Danjuma',
    'Akinyemi', 'Oyelaran', 'Ferguson', 'Mensah', 'Osei', 'Boateng', 'Johnson', 'Williams'];
  var CITIES = [
    { city: 'Lagos',      state: 'Lagos',        country: 'Nigeria', cur: 'NGN' },
    { city: 'Abuja',      state: 'FCT',          country: 'Nigeria', cur: 'NGN' },
    { city: 'Port Harcourt', state: 'Rivers',    country: 'Nigeria', cur: 'NGN' },
    { city: 'Ibadan',     state: 'Oyo',          country: 'Nigeria', cur: 'NGN' },
    { city: 'Benin City', state: 'Edo',          country: 'Nigeria', cur: 'NGN' },
    { city: 'Enugu',      state: 'Enugu',        country: 'Nigeria', cur: 'NGN' },
    { city: 'Kano',       state: 'Kano',         country: 'Nigeria', cur: 'NGN' },
    { city: 'Houston',    state: 'TX',           country: 'United States', cur: 'USD' },
    { city: 'Atlanta',    state: 'GA',           country: 'United States', cur: 'USD' },
    { city: 'Maryland',   state: 'MD',           country: 'United States', cur: 'USD' },
    { city: 'Toronto',    state: 'ON',           country: 'Canada', cur: 'CAD' },
    { city: 'Calgary',    state: 'AB',           country: 'Canada', cur: 'CAD' },
    { city: 'London',     state: 'England',      country: 'United Kingdom', cur: 'USD' }
  ];
  /* Street names kept region-appropriate so addresses read believably. */
  var STREETS = {
    Nigeria: ['Adeola Odeku St', 'Awolowo Rd', 'Ikwerre Rd', 'Bishop Oluwole St', 'Aminu Kano Cres',
      'Admiralty Way', 'Ring Rd', 'Allen Ave', 'Opebi Rd', 'Ozumba Mbadiwe Ave'],
    'United States': ['Peachtree St', 'Westheimer Rd', 'Main St NW', 'Bellaire Blvd', 'Piedmont Ave'],
    Canada: ['Yonge St', 'Bloor St W', 'Macleod Trail SE', 'Dundas St E', '17th Ave SW'],
    'United Kingdom': ['Peckham High St', 'Camberwell Rd', 'Kilburn High Rd', 'Woolwich Rd']
  };

  /* ---------------------------------------------------------- build all */
  function build() {
    /* ------- products */
    var products = PRODUCT_BLUEPRINTS.map(function (b, i) {
      var isHair = ['cat-frontal', 'cat-closure', 'cat-glueless', 'cat-bundles', 'cat-closures'].indexOf(b.c) > -1;
      var compare = chance(0.55) ? Math.round(b.p * (1 + rand(15, 40) / 100) / 500) * 500 : null;
      var variants = [];
      if (isHair) {
        var vl = picks(LENGTHS.slice(2, 9), rand(3, 5)).sort(function (a, c) { return parseInt(a) - parseInt(c); });
        var vc = picks(COLOURS, rand(1, 3));
        vl.forEach(function (L) {
          vc.forEach(function (C) {
            var step = (parseInt(L) - parseInt(vl[0])) / 2;
            variants.push({
              id: 'v-' + i + '-' + L.replace(/\D/g, '') + '-' + C.name.replace(/\W/g, '').slice(0, 6),
              length: L, colour: C.name, colourHex: C.hex,
              texture: pick(TEXTURES), lace: isHair && b.c !== 'cat-bundles' ? pick(LACES) : null,
              density: isHair && b.c !== 'cat-bundles' ? pick(DENSITIES) : null,
              cap: b.c === 'cat-frontal' || b.c === 'cat-closure' || b.c === 'cat-glueless' ? pick(CAPS) : null,
              sku: 'ZD-' + String(i + 1).padStart(3, '0') + '-' + L.replace(/\D/g, '') + C.name.replace(/\W/g, '').slice(0, 3).toUpperCase(),
              price: b.p + step * rand(6000, 12000),
              stock: chance(0.12) ? 0 : rand(1, 34),
              lowAt: 5
            });
          });
        });
      } else {
        var sizes = b.c === 'cat-fragrance' ? ['50ml', '100ml'] : b.c === 'cat-makeup' ? picks(['Fair', 'Light', 'Medium', 'Tan', 'Deep', 'Rich'], 4) : ['Standard'];
        sizes.forEach(function (s, k) {
          variants.push({
            id: 'v-' + i + '-' + s.replace(/\W/g, ''),
            length: null, colour: b.c === 'cat-makeup' ? s : null, colourHex: null,
            texture: null, lace: null, density: null, cap: null,
            size: s,
            sku: 'ZD-' + String(i + 1).padStart(3, '0') + '-' + s.replace(/\W/g, '').toUpperCase().slice(0, 4),
            price: b.p + k * (b.c === 'cat-fragrance' ? 14000 : 0),
            stock: chance(0.1) ? 0 : rand(2, 78),
            lowAt: 8
          });
        });
      }
      var sold = rand(4, 260);
      return {
        id: id('P-', i + 1, 3),
        name: b.n,
        slug: b.n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        sku: 'ZD-' + String(i + 1).padStart(3, '0'),
        categoryId: b.c,
        emoji: b.e,
        price: b.p,
        compareAt: compare,
        cost: Math.round(b.p * (0.42 + R() * 0.16)),
        currency: 'NGN',
        status: chance(0.08) ? 'draft' : chance(0.05) ? 'archived' : 'active',
        origin: isHair ? pick(ORIGINS) : null,
        isHair: isHair,
        tags: b.tags,
        description: buildDesc(b, isHair),
        careNotes: isHair
          ? 'Co-wash with sulphate-free shampoo, air-dry on a stand, and seal ends with a light oil. Avoid heat above 180°C.'
          : 'Patch test before first use. Store away from direct sunlight. Introduce actives gradually — 2–3 nights weekly.',
        variants: variants,
        images: [],
        rating: Math.round((3.6 + R() * 1.4) * 10) / 10,
        reviewCount: rand(2, 96),
        soldCount: sold,
        views: sold * rand(9, 34),
        weightKg: isHair ? Math.round((0.15 + R() * 0.5) * 100) / 100 : Math.round((0.05 + R() * 0.4) * 100) / 100,
        seoTitle: b.n + ' | Zeedara',
        seoDesc: 'Shop the ' + b.n + ' at Zeedara — premium quality, worldwide delivery.',
        featured: chance(0.3),
        createdAt: iso(dayShift(-rand(20, 500))),
        updatedAt: iso(dayShift(-rand(0, 20)))
      };
    });

    function buildDesc(b, isHair) {
      if (isHair) {
        return 'Introducing the ' + b.n + ', designed for a flawless, natural look. This premium unit features a ' +
          'breathable lace base that allows for comfortable wear all day long. Hand-tied, pre-plucked with a ' +
          'natural-looking hairline and bleached knots — ready to install straight out of the box. Can be dyed, ' +
          'bleached, curled and restyled with heat protection.';
      }
      return 'The ' + b.n + ' is formulated in-clinic by the Zeedara skincare team for melanin-rich skin. ' +
        'Dermatologist-reviewed, fragrance-conscious and free from parabens and mineral oil. Suitable for daily ' +
        'use as part of a consistent routine.';
    }

    /* seed collections from products */
    COLLECTIONS[0].productIds = products.filter(function (p) { return p.featured; }).slice(0, 8).map(function (p) { return p.id; });
    COLLECTIONS[1].productIds = products.slice().sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; }).slice(0, 8).map(function (p) { return p.id; });
    COLLECTIONS[2].productIds = products.slice().sort(function (a, b) { return b.soldCount - a.soldCount; }).slice(0, 8).map(function (p) { return p.id; });
    COLLECTIONS[3].productIds = products.filter(function (p) { return p.price > 130000; }).slice(0, 6).map(function (p) { return p.id; });
    COLLECTIONS[4].productIds = products.filter(function (p) { return p.categoryId.indexOf('skincare') > -1 || p.categoryId === 'cat-serums' || p.categoryId === 'cat-cleansers'; }).map(function (p) { return p.id; });
    COLLECTIONS[5].productIds = products.filter(function (p) { return p.price < 100000; }).slice(0, 10).map(function (p) { return p.id; });

    /* ------- customers */
    var customers = [];
    for (var ci = 0; ci < 96; ci++) {
      var fn = pick(FIRST), ln = pick(LAST), loc = pick(CITIES);
      // squared distribution → the customer base has grown over time
      var joined = dayShift(-Math.floor(Math.pow(R(), 1.7) * 720) - 2);
      customers.push({
        id: id('C-', ci + 1),
        name: fn + ' ' + ln,
        email: (fn + '.' + ln).toLowerCase() + (chance(0.3) ? rand(10, 99) : '') + '@' + pick(['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com']),
        phone: loc.country === 'Nigeria'
          ? '+234 ' + rand(700, 916) + ' ' + rand(100, 999) + ' ' + rand(1000, 9999)
          : loc.country === 'Canada' ? '+1 ' + rand(204, 905) + ' ' + rand(200, 999) + ' ' + rand(1000, 9999)
            : '+1 ' + rand(202, 917) + ' ' + rand(200, 999) + ' ' + rand(1000, 9999),
        whatsapp: chance(0.7),
        currency: loc.cur,
        addresses: [{
          id: 'a1', label: 'Home', name: fn + ' ' + ln,
          line1: rand(1, 240) + ' ' + pick(STREETS[loc.country] || STREETS.Nigeria),
          line2: chance(0.3) ? 'Flat ' + rand(1, 24) : '',
          city: loc.city, state: loc.state, country: loc.country,
          postal: loc.country === 'Nigeria' ? String(rand(100001, 900001))
            : loc.country === 'Canada' ? 'M' + rand(1, 9) + 'A ' + rand(1, 9) + 'B' + rand(1, 9)
              : loc.country === 'United Kingdom' ? 'SE' + rand(1, 28) + ' ' + rand(1, 9) + 'AB'
                : String(rand(10001, 99999)),
          isDefault: true
        }],
        tags: picks(['vip', 'wholesale', 'clinic-patient', 'repeat', 'newsletter', 'custom-wig'], rand(0, 2)),
        marketingOptIn: chance(0.62),
        notes: chance(0.18) ? pick([
          'Prefers WhatsApp for order updates.',
          'Sensitive scalp — recommend glueless units only.',
          'Wholesale enquiry pending, follow up next quarter.',
          'Repeat clinic patient, on retinol protocol.'
        ]) : '',
        status: chance(0.05) ? 'blocked' : 'active',
        createdAt: iso(joined),
        lastSeenAt: iso(dayShift(-rand(0, 40)))
      });
    }

    /* ------- orders */
    var ORDER_STATUS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    var PAY_METHOD = ['Paystack Card', 'Flutterwave', 'Bank Transfer', 'PayPal', 'Stripe Card', 'Cash on Delivery'];
    var SHIP_METHOD = [
      { name: 'Lagos Same-Day', fee: 4500, days: 1 },
      { name: 'Nationwide GIG Logistics', fee: 7500, days: 3 },
      { name: 'DHL Express International', fee: 42000, days: 5 },
      { name: 'Store Pickup — Lekki', fee: 0, days: 0 },
      { name: 'Standard Courier', fee: 5500, days: 4 }
    ];
    var orders = [];
    var activeProducts = products.filter(function (p) { return p.status === 'active'; });

    /* Catalogue prices are held in NGN. Orders record money in the customer's own
       currency, so convert once here — Store.toBase() reverses this for reporting. */
    var FX = { NGN: 1, USD: 0.000625, CAD: 0.000855, GBP: 0.000492 };
    function fxRound(ngn, code) {
      var v = ngn * (FX[code] || 1);
      return code === 'NGN' ? Math.round(v / 50) * 50 : Math.round(v * 100) / 100;
    }
    /** Round an amount already in `code` to that currency's precision. */
    function curRound(v, code) {
      return code === 'NGN' ? Math.round(v) : Math.round(v * 100) / 100;
    }

    for (var oi = 0; oi < 240; oi++) {
      var cust = pick(customers);
      var cur = cust.currency;
      // squared distribution → most orders land in the recent weeks
      var placedDays = -Math.floor(Math.pow(R(), 2) * 180);
      var placed = dayShift(placedDays);
      var nItems = chance(0.5) ? 1 : rand(2, 4);
      var items = [];
      picks(activeProducts, nItems).forEach(function (p) {
        var v = pick(p.variants);
        var q = chance(0.78) ? 1 : rand(2, 3);
        var unit = fxRound(v.price, cur);
        items.push({
          productId: p.id, name: p.name, emoji: p.emoji, sku: v.sku, variantId: v.id,
          variantLabel: [v.length, v.colour, v.texture, v.size].filter(Boolean).join(' · '),
          qty: q, unitPrice: unit, total: Math.round(unit * q * 100) / 100
        });
      });
      var sub = curRound(items.reduce(function (s, it) { return s + it.total; }, 0), cur);
      /* Domestic couriers for Nigeria only — and Lagos-only options need a Lagos address. */
      var ship;
      if (cur !== 'NGN') {
        ship = SHIP_METHOD.filter(function (m) { return m.name.indexOf('DHL') > -1; })[0];
      } else {
        var isLagos = cust.addresses[0].city === 'Lagos';
        ship = pick(SHIP_METHOD.filter(function (m) {
          if (m.name.indexOf('DHL') > -1) return false;
          if (!isLagos && /Lagos|Pickup/.test(m.name)) return false;
          return true;
        }));
      }
      var shipFee = fxRound(ship.fee, cur);
      var disc = chance(0.24) ? curRound(sub * pick([0.05, 0.1, 0.15]), cur) : 0;
      var tax = curRound(sub * 0.075, cur);
      var status;
      if (placedDays > -3) status = pick(['pending', 'confirmed', 'processing']);
      else if (placedDays > -8) status = pick(['processing', 'shipped', 'shipped', 'confirmed']);
      else status = chance(0.055) ? 'cancelled' : chance(0.035) ? 'refunded' : chance(0.9) ? 'delivered' : 'shipped';

      var payMethod = pick(cur === 'NGN' ? PAY_METHOD : ['PayPal', 'Stripe Card', 'Flutterwave']);
      var tl = [{ at: iso(placed), label: 'Order placed', by: cust.name, note: 'Payment via ' + payMethod }];
      orders.push({
        id: id('ZD-', 10240 + oi, 5),
        customerId: cust.id,
        customerName: cust.name,
        customerEmail: cust.email,
        customerPhone: cust.phone,
        items: items,
        subtotal: sub, discount: disc, tax: tax, shippingFee: shipFee,
        total: curRound(sub - disc + tax + shipFee, cur),
        currency: cur,
        status: status,
        paymentStatus: status === 'refunded' ? 'refunded' : status === 'cancelled' ? 'voided'
          : status === 'pending' ? (chance(0.5) ? 'unpaid' : 'paid') : 'paid',
        paymentMethod: payMethod,
        paymentRef: (cur === 'NGN' ? 'PSK_' : 'PPL_') + Math.random().toString(36).slice(2, 12).toUpperCase(),
        shippingMethod: ship.name,
        trackingNo: ['shipped', 'delivered'].indexOf(status) > -1 ? 'ZDX' + rand(100000000, 999999999) : '',
        shippingAddress: cust.addresses[0],
        couponCode: disc ? pick(['GLOW10', 'ZEEDARA5', 'NEWGLOW15']) : '',
        note: chance(0.14) ? pick(['Please call before delivery.', 'Gift wrap requested.', 'Leave with the security post.', 'Deliver after 5pm weekdays.']) : '',
        channel: pick(['Website', 'Website', 'Website', 'Instagram DM', 'WhatsApp', 'Walk-in']),
        timeline: tl,
        placedAt: iso(placed),
        updatedAt: iso(dayShift(Math.min(0, placedDays + rand(0, 4))))
      });
    }
    orders.sort(function (a, b) { return a.placedAt < b.placedAt ? 1 : -1; });

    /* ------- custom wig requests (mirrors the Figma custom order form) */
    var CW_TYPES = ['Wig', 'Bundles', 'Closure wig', 'Frontal wig', 'Colouring', 'Styling', 'Not sure yet'];
    var CW_STAGE = ['new', 'reviewing', 'quoted', 'approved', 'in_production', 'ready', 'completed', 'declined'];
    var customRequests = [];
    for (var wi = 0; wi < 34; wi++) {
      var c2 = pick(customers);
      var d2 = -rand(0, 60);
      var stg = d2 > -3 ? pick(['new', 'new', 'reviewing']) : d2 > -12 ? pick(['reviewing', 'quoted', 'approved']) :
        d2 > -30 ? pick(['in_production', 'ready', 'quoted']) : pick(['completed', 'completed', 'declined']);
      var budgetLo = pick([80000, 120000, 150000, 200000, 300000]);
      customRequests.push({
        id: id('CW-', wi + 1),
        customerId: c2.id, name: c2.name, phone: c2.phone, email: c2.email,
        preferWhatsapp: chance(0.72),
        requestTypes: picks(CW_TYPES, rand(1, 3)),
        length: pick(LENGTHS.slice(3)),
        texture: pick(TEXTURES),
        colour: pick(COLOURS).name,
        lace: pick(LACES),
        density: pick(DENSITIES),
        cap: pick(CAPS),
        budgetMin: budgetLo, budgetMax: budgetLo + pick([50000, 80000, 120000]),
        deliveryBy: isoDay(dayShift(d2 + rand(14, 60))),
        inspirationCount: rand(0, 4),
        notes: pick([
          'I want a very natural hairline, minimal knots. Attending a wedding.',
          'Looking for something low maintenance I can wear to work daily.',
          'Please match the colour in the photo exactly — honey blonde with dark roots.',
          'Need a small cap size, my previous unit was too loose.',
          'Would like a curly unit that can be straightened occasionally.',
          'Bridal styling with side part and baby hairs.'
        ]),
        stage: stg,
        quoteAmount: ['quoted', 'approved', 'in_production', 'ready', 'completed'].indexOf(stg) > -1 ? Math.round((budgetLo + rand(10000, 90000)) / 500) * 500 : null,
        quoteNote: '',
        assignedTo: chance(0.7) ? pick(['Amaka Obi', 'Tobi Adewale', 'Ngozi Umeh']) : '',
        currency: c2.currency,
        createdAt: iso(dayShift(d2)),
        updatedAt: iso(dayShift(d2 + rand(0, 5)))
      });
    }
    customRequests.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });

    /* ------- skincare clinic */
    var SERVICES = [
      { id: 'S-1', name: 'Skin Analysis & Consultation', duration: 45, price: 15000, active: true, desc: 'Full facial mapping, concern review and a written routine plan.' },
      { id: 'S-2', name: 'Hydrafacial Deep Cleanse',     duration: 60, price: 45000, active: true, desc: 'Cleanse, extract and hydrate in one session.' },
      { id: 'S-3', name: 'Chemical Peel — Mild',          duration: 40, price: 38000, active: true, desc: 'Mandelic/lactic peel for tone and texture.' },
      { id: 'S-4', name: 'Acne Treatment Session',        duration: 50, price: 32000, active: true, desc: 'Extractions plus LED and calming mask.' },
      { id: 'S-5', name: 'Hyperpigmentation Programme',   duration: 60, price: 52000, active: true, desc: 'Targeted brightening protocol for melanin-rich skin.' },
      { id: 'S-6', name: 'Microneedling',                 duration: 75, price: 68000, active: true, desc: 'Collagen induction for scarring and texture.' },
      { id: 'S-7', name: 'Follow-up Review',              duration: 20, price: 8000,  active: true, desc: 'Progress check and routine adjustment.' },
      { id: 'S-8', name: 'Bridal Skin Prep Package',      duration: 90, price: 95000, active: false, desc: 'Six-week pre-wedding skin programme.' }
    ];
    var THERAPISTS = ['Dr. Amaka Obi', 'Nurse Halima Sule', 'Ify Nwachukwu', 'Dr. Tolu Bakare'];
    var SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    var bookings = [];
    for (var bi = 0; bi < 62; bi++) {
      var c3 = pick(customers), svc = pick(SERVICES), off = rand(-40, 24);
      var st = off < -1 ? pick(['completed', 'completed', 'completed', 'no_show', 'cancelled'])
        : off <= 0 ? pick(['confirmed', 'in_session', 'completed'])
          : pick(['confirmed', 'confirmed', 'pending']);
      bookings.push({
        id: id('BK-', bi + 1),
        customerId: c3.id, name: c3.name, email: c3.email, phone: c3.phone,
        serviceId: svc.id, serviceName: svc.name, duration: svc.duration, price: svc.price,
        date: isoDay(dayShift(off)), time: pick(SLOTS),
        therapist: pick(THERAPISTS),
        status: st,
        paid: st === 'completed' ? true : chance(0.55),
        concerns: picks(['Hyperpigmentation', 'Acne', 'Dryness', 'Oily / congested', 'Uneven tone', 'Fine lines', 'Sensitivity', 'Melasma'], rand(1, 3)),
        skinType: pick(['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive']),
        allergies: chance(0.2) ? pick(['Fragrance', 'Salicylates', 'Nuts (topical oils)']) : '',
        notes: chance(0.35) ? pick([
          'First visit — full analysis needed.',
          'Continuing 12-week brightening protocol.',
          'Reacted to retinol previously, start at 0.25%.',
          'Bridal timeline, wedding in 8 weeks.'
        ]) : '',
        followUpAt: st === 'completed' && chance(0.5) ? isoDay(dayShift(off + rand(21, 42))) : '',
        createdAt: iso(dayShift(off - rand(2, 20)))
      });
    }
    bookings.sort(function (a, b) { return a.date < b.date ? 1 : -1; });

    /* ------- quote requests (Request a Quote) */
    var quotes = [];
    for (var qi = 0; qi < 22; qi++) {
      var c4 = pick(customers), qd = -rand(0, 45);
      var qs = qd > -2 ? 'new' : qd > -10 ? pick(['new', 'in_review', 'sent']) : pick(['sent', 'won', 'lost', 'won']);
      quotes.push({
        id: id('RQ-', qi + 1),
        customerId: c4.id, name: c4.name, email: c4.email, phone: c4.phone,
        company: chance(0.45) ? pick(['Glamour Hair Studio', 'Belle Beauty Bar', 'Radiance Salon', 'Crown & Curls', 'Independent Reseller', 'Élan Beauty Lounge']) : '',
        type: pick(['Wholesale / Bulk', 'Salon Partnership', 'Corporate Gifting', 'Event / Bridal Party', 'Reseller Enquiry']),
        itemsWanted: picks(products.map(function (p) { return p.name; }), rand(1, 3)),
        quantity: pick([5, 10, 12, 20, 25, 50, 100]),
        budget: pick([500000, 1000000, 1500000, 2500000, 5000000]),
        neededBy: isoDay(dayShift(qd + rand(20, 90))),
        message: pick([
          'We run a salon in Lekki and want to stock your frontal wigs monthly. Please share wholesale pricing.',
          'Need 20 units for a bridal party in December. Can you do a package rate?',
          'Corporate gifting for 50 staff — skincare sets preferred. Send a catalogue and tiered pricing.',
          'Interested in becoming a reseller in Houston. What are your minimum order quantities?',
          'Looking for bulk bundles, mixed lengths. Do you offer freight to Toronto?'
        ]),
        status: qs,
        quotedAmount: ['sent', 'won', 'lost'].indexOf(qs) > -1 ? pick([650000, 1250000, 1800000, 3200000, 4800000]) : null,
        assignedTo: chance(0.6) ? pick(['Tobi Adewale', 'Ngozi Umeh']) : '',
        currency: c4.currency,
        createdAt: iso(dayShift(qd)),
        updatedAt: iso(dayShift(qd + rand(0, 4)))
      });
    }
    quotes.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });

    /* ------- reviews */
    var REVIEW_BODY = [
      'Absolutely in love with this unit! The lace melted perfectly and no one can tell it is a wig.',
      'Hair is soft, no shedding after two washes. Will definitely order again.',
      'Good quality but took a little longer to arrive than expected.',
      'The colour is slightly darker than pictured but still gorgeous.',
      'Best purchase I have made this year. Customer service was excellent on WhatsApp.',
      'Density is fuller than I expected — had to thin it slightly. Beautiful otherwise.',
      'My skin cleared up in three weeks using this consistently. Highly recommend.',
      'Lightweight and does not pill under makeup. Repurchasing.',
      'Decent but a bit pricey for the size. Works though.',
      'Shipping to Toronto was fast. The bundle blends well with my natural hair.',
      'Received a shorter length than ordered. Support resolved it quickly.',
      'The scent is beautiful and lasts all day. Compliments everywhere I go.'
    ];
    var reviews = [];
    for (var ri = 0; ri < 128; ri++) {
      var p3 = pick(products), c5 = pick(customers), rd = -rand(0, 200);
      var stars = chance(0.62) ? 5 : chance(0.6) ? 4 : chance(0.6) ? 3 : chance(0.5) ? 2 : 1;
      reviews.push({
        id: id('RV-', ri + 1),
        productId: p3.id, productName: p3.name, productEmoji: p3.emoji,
        customerId: c5.id, customerName: c5.name,
        rating: stars,
        title: stars >= 4 ? pick(['Exactly what I wanted', 'Beautiful unit', 'Worth every naira', 'My new favourite']) : pick(['Good, with a caveat', 'Mixed feelings', 'Not quite right']),
        body: pick(REVIEW_BODY),
        verified: chance(0.8),
        status: rd > -4 ? pick(['pending', 'pending', 'approved']) : chance(0.08) ? 'rejected' : chance(0.1) ? 'pending' : 'approved',
        reply: chance(0.28) ? 'Thank you so much for the kind words — enjoy your unit! — Team Zeedara' : '',
        helpful: rand(0, 42),
        createdAt: iso(dayShift(rd))
      });
    }
    reviews.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });

    /* ------- discounts */
    var discounts = [
      { id: 'D-1', code: 'GLOW10',      type: 'percent', value: 10,    minSpend: 50000,  usage: 184, limit: 500,  perCustomer: 1, appliesTo: 'all',        status: 'active',    startsAt: isoDay(dayShift(-60)), endsAt: isoDay(dayShift(30)),  desc: '10% off sitewide for the Glow campaign' },
      { id: 'D-2', code: 'NEWGLOW15',   type: 'percent', value: 15,    minSpend: 0,      usage: 96,  limit: 300,  perCustomer: 1, appliesTo: 'first-order', status: 'active',    startsAt: isoDay(dayShift(-90)), endsAt: isoDay(dayShift(90)),  desc: 'First-order welcome discount' },
      { id: 'D-3', code: 'ZEEDARA5',    type: 'percent', value: 5,     minSpend: 0,      usage: 412, limit: null, perCustomer: 3, appliesTo: 'all',        status: 'active',    startsAt: isoDay(dayShift(-200)), endsAt: '',                   desc: 'Evergreen newsletter code' },
      { id: 'D-4', code: 'FREESHIPNG',  type: 'shipping', value: 0,    minSpend: 150000, usage: 63,  limit: 200,  perCustomer: 2, appliesTo: 'nigeria',    status: 'active',    startsAt: isoDay(dayShift(-30)), endsAt: isoDay(dayShift(14)),  desc: 'Free nationwide shipping over ₦150k' },
      { id: 'D-5', code: 'BUNDLE25K',   type: 'fixed',   value: 25000, minSpend: 200000, usage: 28,  limit: 100,  perCustomer: 1, appliesTo: 'cat-bundles', status: 'active',   startsAt: isoDay(dayShift(-14)), endsAt: isoDay(dayShift(21)),  desc: '₦25,000 off bundle deals' },
      { id: 'D-6', code: 'BLACKFRI40',  type: 'percent', value: 40,    minSpend: 0,      usage: 731, limit: 1000, perCustomer: 2, appliesTo: 'all',        status: 'expired',   startsAt: isoDay(dayShift(-250)), endsAt: isoDay(dayShift(-240)), desc: 'Black Friday 2025 archive' },
      { id: 'D-7', code: 'CLINIC20',    type: 'percent', value: 20,    minSpend: 0,      usage: 0,   limit: 150,  perCustomer: 1, appliesTo: 'cat-skincare', status: 'scheduled', startsAt: isoDay(dayShift(7)),  endsAt: isoDay(dayShift(37)),  desc: 'Skincare clinic launch promo' }
    ];

    /* ------- CMS: hero slides, FAQ, pages, banners */
    var slides = [
      { id: 'HS-1', title: 'Luxury Hair, Effortless Confidence', subtitle: 'Hand-picked HD lace units, ready to wear out of the box.', cta: 'Shop New Arrivals', link: '/new-arrivals', emoji: '💇🏾‍♀️', align: 'left',   status: 'published', position: 1, startsAt: '', endsAt: '' },
      { id: 'HS-2', title: 'The Glow Skincare Edit',            subtitle: 'Clinic-formulated actives for melanin-rich skin.',        cta: 'Explore Skincare', link: '/skincare',     emoji: '🧴',    align: 'center', status: 'published', position: 2, startsAt: '', endsAt: '' },
      { id: 'HS-3', title: 'Built For You — Custom Wigs',        subtitle: 'Tell us your length, texture and cap size. We build it.', cta: 'Request a Custom Wig', link: '/custom-wig', emoji: '✂️',  align: 'right',  status: 'published', position: 3, startsAt: '', endsAt: '' },
      { id: 'HS-4', title: 'Bridal & Occasion Collection',       subtitle: 'Premium units for the moments that matter.',              cta: 'View Collection',  link: '/bridal',       emoji: '💍',    align: 'left',   status: 'draft',     position: 4, startsAt: isoDay(dayShift(20)), endsAt: isoDay(dayShift(70)) }
    ];
    var faqs = [
      { id: 'F-1', q: 'How long does delivery take?',                     a: 'Lagos orders arrive same-day or next-day. Nationwide delivery takes 2–4 working days via GIG Logistics. International orders ship DHL Express and arrive in 4–7 working days with tracking.', category: 'Shipping', status: 'published', position: 1, views: 4210 },
      { id: 'F-2', q: 'Can I dye or bleach my Zeedara unit?',             a: 'Yes. All our units are 100% human hair and can be dyed, bleached, curled and straightened. We recommend a professional colourist for anything lighter than #27 honey blonde.', category: 'Products', status: 'published', position: 2, views: 3180 },
      { id: 'F-3', q: 'What is your return and exchange policy?',          a: 'Unopened, uninstalled units can be returned within 7 days of delivery for an exchange or store credit. Skincare and fragrance are non-returnable once opened for hygiene reasons.', category: 'Returns', status: 'published', position: 3, views: 2940 },
      { id: 'F-4', q: 'How do I choose the right cap size?',              a: 'Measure the circumference of your head from the front hairline, around the nape and back. Under 21" is small, 21–23" is medium, and above 23" is large. Our custom-wig service builds to your exact measurement.', category: 'Products', status: 'published', position: 4, views: 2610 },
      { id: 'F-5', q: 'How long does a custom wig request take?',          a: 'We respond with a quote within 48 hours. Once approved, production takes 10–14 working days for standard units and up to 21 days for colouring or full-lace builds.', category: 'Custom Wigs', status: 'published', position: 5, views: 1980 },
      { id: 'F-6', q: 'Do I need a consultation before buying skincare?', a: 'Not required, but recommended. A 45-minute skin analysis maps your concerns and gives you a written routine, so you only buy what your skin actually needs.', category: 'Skincare', status: 'published', position: 6, views: 1520 },
      { id: 'F-7', q: 'Which payment methods do you accept?',             a: 'Paystack and Flutterwave (cards and bank transfer) for Nigeria, plus PayPal and Stripe for international orders. Cash on delivery is available within Lagos only.', category: 'Payment', status: 'published', position: 7, views: 1340 },
      { id: 'F-8', q: 'Do you offer wholesale pricing?',                  a: 'Yes, from 10 units upward. Submit a Request a Quote and our partnerships team will send tiered pricing within two working days.', category: 'Wholesale', status: 'draft', position: 8, views: 0 }
    ];
    var pages = [
      { id: 'PG-1', title: 'About Zeedara',        slug: 'about',          status: 'published', updatedAt: iso(dayShift(-18)), body: 'Zeedara is a premium hair and skincare house built for women who want quality without compromise.' },
      { id: 'PG-2', title: 'Shipping & Delivery',  slug: 'shipping',       status: 'published', updatedAt: iso(dayShift(-32)), body: 'Delivery timelines, carriers and fees by region.' },
      { id: 'PG-3', title: 'Returns & Exchanges',  slug: 'returns',        status: 'published', updatedAt: iso(dayShift(-32)), body: 'Our 7-day return window and how to start a return.' },
      { id: 'PG-4', title: 'Hair Care Guide',      slug: 'hair-care',      status: 'published', updatedAt: iso(dayShift(-9)),  body: 'How to wash, style and store your unit to make it last.' },
      { id: 'PG-5', title: 'Privacy Policy',       slug: 'privacy',        status: 'published', updatedAt: iso(dayShift(-120)), body: 'How we collect, use and protect your data.' },
      { id: 'PG-6', title: 'Terms of Service',     slug: 'terms',          status: 'published', updatedAt: iso(dayShift(-120)), body: 'The terms governing your use of Zeedara.' },
      { id: 'PG-7', title: 'Affiliate Programme',  slug: 'affiliates',     status: 'draft',     updatedAt: iso(dayShift(-4)),  body: 'Earn commission promoting Zeedara. Coming soon.' }
    ];
    var banners = [
      { id: 'BN-1', text: 'Free nationwide shipping on orders over ₦150,000 — code FREESHIPNG', link: '/shop', bg: '#BF8322', status: 'published', position: 1 },
      { id: 'BN-2', text: 'Skincare clinic now open in Lekki — book a consultation', link: '/skincare-consultation', bg: '#1D2939', status: 'published', position: 2 },
      { id: 'BN-3', text: 'New Arrivals just dropped — shop the latest HD lace units', link: '/new-arrivals', bg: '#5C3D0D', status: 'draft', position: 3 }
    ];
    var subscribers = [];
    for (var si = 0; si < 148; si++) {
      var c6 = pick(customers);
      subscribers.push({
        id: id('SUB-', si + 1),
        email: chance(0.6) ? c6.email : (pick(FIRST) + rand(1, 99) + '@' + pick(['gmail.com', 'yahoo.com'])).toLowerCase(),
        name: chance(0.6) ? c6.name : '',
        source: pick(['Footer form', 'Checkout opt-in', 'Popup', 'Instagram link', 'Clinic intake']),
        status: chance(0.09) ? 'unsubscribed' : 'subscribed',
        createdAt: iso(dayShift(-rand(1, 400)))
      });
    }

    /* ------- shipping zones */
    var zones = [
      { id: 'Z-1', name: 'Lagos Metro',        regions: ['Lagos'], rates: [
        { id: 'r1', name: 'Same-Day (order before 12pm)', fee: 4500, freeOver: 250000, eta: '1 day' },
        { id: 'r2', name: 'Next-Day Standard',            fee: 3000, freeOver: 150000, eta: '1–2 days' },
        { id: 'r3', name: 'Store Pickup — Lekki',         fee: 0,    freeOver: 0,      eta: 'Same day' }
      ], active: true },
      { id: 'Z-2', name: 'Nigeria — Nationwide', regions: ['FCT', 'Rivers', 'Oyo', 'Edo', 'Enugu', 'Kano', 'All other states'], rates: [
        { id: 'r4', name: 'GIG Logistics Standard', fee: 7500,  freeOver: 150000, eta: '2–4 days' },
        { id: 'r5', name: 'GIG Express',            fee: 12500, freeOver: 400000, eta: '1–2 days' }
      ], active: true },
      { id: 'Z-3', name: 'United States',        regions: ['All states'], rates: [
        { id: 'r6', name: 'DHL Express',      fee: 42000, freeOver: 800000, eta: '4–6 days' },
        { id: 'r7', name: 'USPS Economy',     fee: 26000, freeOver: 0,      eta: '8–14 days' }
      ], active: true },
      { id: 'Z-4', name: 'Canada',              regions: ['All provinces'], rates: [
        { id: 'r8', name: 'DHL Express',      fee: 46000, freeOver: 800000, eta: '5–7 days' }
      ], active: true },
      { id: 'Z-5', name: 'United Kingdom & EU', regions: ['UK', 'EU'], rates: [
        { id: 'r9', name: 'DHL Express',      fee: 44000, freeOver: 900000, eta: '5–8 days' }
      ], active: false }
    ];

    /* `id` mirrors `code` so Store.get/update can address currencies like any other record. */
    var currencies = [
      { id: 'NGN', code: 'NGN', symbol: '₦',  name: 'Nigerian Naira',  rate: 1,        isBase: true,  active: true,  decimals: 0, flag: '🇳🇬' },
      { id: 'USD', code: 'USD', symbol: '$',  name: 'US Dollar',       rate: 0.000625, isBase: false, active: true,  decimals: 2, flag: '🇺🇸' },
      { id: 'CAD', code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 0.000855, isBase: false, active: true,  decimals: 2, flag: '🇨🇦' },
      { id: 'GBP', code: 'GBP', symbol: '£',  name: 'British Pound',   rate: 0.000492, isBase: false, active: false, decimals: 2, flag: '🇬🇧' }
    ];

    /* ------- staff & roles */
    var roles = [
      { id: 'R-1', name: 'Owner',           desc: 'Unrestricted access to everything, including billing and data reset.', system: true,  perms: ['*'] },
      { id: 'R-2', name: 'Store Manager',   desc: 'Runs day-to-day trading: catalogue, orders, customers, promos.',       system: false, perms: ['dashboard.view','products.view','products.edit','orders.view','orders.edit','inventory.view','inventory.edit','customers.view','customers.edit','reviews.view','reviews.edit','discounts.view','discounts.edit','analytics.view','content.view','content.edit'] },
      { id: 'R-3', name: 'Fulfilment',      desc: 'Picks, packs and ships. Read-only on catalogue.',                      system: false, perms: ['dashboard.view','orders.view','orders.edit','inventory.view','inventory.edit','products.view'] },
      { id: 'R-4', name: 'Clinic Therapist',desc: 'Manages consultations and patient notes only.',                        system: false, perms: ['dashboard.view','clinic.view','clinic.edit','customers.view'] },
      { id: 'R-5', name: 'Support Agent',   desc: 'Answers customers, handles requests and reviews.',                     system: false, perms: ['dashboard.view','orders.view','customers.view','customers.edit','reviews.view','reviews.edit','custom.view','custom.edit','quotes.view','quotes.edit'] },
      { id: 'R-6', name: 'Content Editor',  desc: 'Edits the storefront: slides, FAQ, pages, banners.',                   system: false, perms: ['dashboard.view','content.view','content.edit','products.view'] }
    ];
    var staff = [
      { id: 'ST-1', name: 'Desmond Ferguson', email: 'studio@cedarsprohub.com', roleId: 'R-1', status: 'active',  lastLoginAt: iso(dayShift(0)),   twoFA: true,  createdAt: iso(dayShift(-620)) },
      { id: 'ST-2', name: 'Amaka Obi',        email: 'amaka@zeedara.com',       roleId: 'R-2', status: 'active',  lastLoginAt: iso(dayShift(0)),   twoFA: true,  createdAt: iso(dayShift(-410)) },
      { id: 'ST-3', name: 'Tobi Adewale',     email: 'tobi@zeedara.com',        roleId: 'R-5', status: 'active',  lastLoginAt: iso(dayShift(-1)),  twoFA: false, createdAt: iso(dayShift(-300)) },
      { id: 'ST-4', name: 'Ngozi Umeh',       email: 'ngozi@zeedara.com',       roleId: 'R-3', status: 'active',  lastLoginAt: iso(dayShift(0)),   twoFA: false, createdAt: iso(dayShift(-240)) },
      { id: 'ST-5', name: 'Dr. Tolu Bakare',  email: 'tolu@zeedara.com',        roleId: 'R-4', status: 'active',  lastLoginAt: iso(dayShift(-2)),  twoFA: true,  createdAt: iso(dayShift(-180)) },
      { id: 'ST-6', name: 'Ify Nwachukwu',    email: 'ify@zeedara.com',         roleId: 'R-4', status: 'active',  lastLoginAt: iso(dayShift(-4)),  twoFA: false, createdAt: iso(dayShift(-120)) },
      { id: 'ST-7', name: 'Kelechi Umeh',     email: 'kelechi@zeedara.com',     roleId: 'R-6', status: 'invited', lastLoginAt: '',                 twoFA: false, createdAt: iso(dayShift(-6)) },
      { id: 'ST-8', name: 'Halima Sule',      email: 'halima@zeedara.com',      roleId: 'R-4', status: 'disabled',lastLoginAt: iso(dayShift(-95)), twoFA: false, createdAt: iso(dayShift(-350)) }
    ];

    var activity = [];
    var ACTS = [
      ['order', 'marked order {O} as shipped'], ['order', 'refunded order {O}'],
      ['product', 'updated pricing on “{P}”'], ['product', 'created a new product “{P}”'],
      ['inventory', 'restocked {P} by 20 units'], ['customer', 'added a note to {C}'],
      ['discount', 'created discount code GLOW10'], ['content', 'published a new hero slide'],
      ['clinic', 'completed a consultation for {C}'], ['custom', 'sent a quote for request CW-0004'],
      ['review', 'approved 3 pending reviews'], ['settings', 'updated shipping rates for Nigeria — Nationwide']
    ];
    for (var ai = 0; ai < 46; ai++) {
      var act = pick(ACTS), sf = pick(staff.filter(function (s) { return s.status === 'active'; }));
      var msg = act[1].replace('{O}', pick(orders).id).replace('{P}', pick(products).name).replace('{C}', pick(customers).name);
      activity.push({
        id: id('AC-', ai + 1),
        staffId: sf.id, staffName: sf.name, area: act[0], message: msg,
        ip: rand(41, 197) + '.' + rand(0, 255) + '.' + rand(0, 255) + '.' + rand(1, 254),
        at: iso(dayShift(-rand(0, 30)))
      });
    }
    activity.sort(function (a, b) { return a.at < b.at ? 1 : -1; });

    /* ------- notifications */
    var notifications = [
      { id: 'N-1', type: 'order',   title: 'New order ' + orders[0].id,        message: orders[0].customerName + ' · ' + orders[0].items.length + ' item(s)', read: false, at: iso(dayShift(0)),  link: '#/orders' },
      { id: 'N-2', type: 'stock',   title: 'Low stock alert',                  message: '7 variants are at or below their reorder point',                     read: false, at: iso(dayShift(0)),  link: '#/inventory' },
      { id: 'N-3', type: 'custom',  title: 'New custom wig request',            message: customRequests[0].name + ' · budget ₦' + customRequests[0].budgetMin.toLocaleString(), read: false, at: iso(dayShift(0)), link: '#/custom-requests' },
      { id: 'N-4', type: 'clinic',  title: 'Consultation booked',              message: 'Skin Analysis · tomorrow 10:00 with Dr. Amaka Obi',                  read: false, at: iso(dayShift(-1)), link: '#/clinic' },
      { id: 'N-5', type: 'review',  title: '4 reviews awaiting moderation',     message: 'Oldest has been pending 3 days',                                     read: true,  at: iso(dayShift(-1)), link: '#/reviews' },
      { id: 'N-6', type: 'quote',   title: 'Wholesale quote request',           message: quotes[0].company || quotes[0].name,                                  read: true,  at: iso(dayShift(-2)), link: '#/quotes' },
      { id: 'N-7', type: 'payment', title: 'Payout settled',                    message: '₦4,820,500 settled to GTBank ••4471',                                read: true,  at: iso(dayShift(-3)), link: '#/analytics' }
    ];

    /* ------- settings */
    var settings = {
      store: {
        name: 'Zeedara', legalName: 'Zeedara Beauty Ltd',
        tagline: 'Luxury hair & clinic-grade skincare',
        email: 'hello@zeedara.com', supportEmail: 'support@zeedara.com',
        phone: '+234 803 555 0142', whatsapp: '+234 803 555 0142',
        address1: '14B Admiralty Way', address2: 'Lekki Phase 1',
        city: 'Lagos', state: 'Lagos', country: 'Nigeria', postal: '106104',
        baseCurrency: 'NGN', timezone: 'Africa/Lagos (GMT+1)', weightUnit: 'kg',
        instagram: '@zeedara', tiktok: '@zeedara', facebook: 'zeedaraofficial'
      },
      payments: {
        paystack: { enabled: true,  mode: 'live', label: 'Paystack — cards & transfer' },
        flutterwave: { enabled: true,  mode: 'live', label: 'Flutterwave' },
        paypal: { enabled: true,  mode: 'live', label: 'PayPal (international)' },
        stripe: { enabled: false, mode: 'test', label: 'Stripe' },
        bankTransfer: { enabled: true,  mode: 'live', label: 'Manual bank transfer' },
        cod: { enabled: true,  mode: 'live', label: 'Cash on delivery (Lagos only)' }
      },
      tax: { enabled: true, rate: 7.5, label: 'VAT', pricesIncludeTax: false, chargeOnShipping: false },
      checkout: { guestCheckout: true, requirePhone: true, minOrder: 0, orderNotes: true, termsRequired: true },
      notifications: {
        orderConfirmation: true, shippingUpdate: true, deliveryConfirmation: true,
        abandonedCart: true, lowStockAlert: true, reviewRequest: true,
        customRequestAck: true, clinicReminder: true, newsletterDigest: false,
        adminNewOrder: true, adminLowStock: true, adminNewRequest: true
      },
      features: { reviews: true, wishlist: true, customWig: true, clinic: true, quotes: true, multiCurrency: true, liveChat: true },
      security: { require2FA: false, sessionTimeout: 480, minPasswordLength: 8, lockoutAttempts: 5, loginAlerts: true }
    };

    return {
      version: 6,
      categories: CATEGORIES,
      collections: COLLECTIONS,
      products: products,
      customers: customers,
      orders: orders,
      customRequests: customRequests,
      services: SERVICES,
      bookings: bookings,
      therapists: THERAPISTS,
      quotes: quotes,
      reviews: reviews,
      discounts: discounts,
      slides: slides,
      faqs: faqs,
      pages: pages,
      banners: banners,
      subscribers: subscribers,
      zones: zones,
      currencies: currencies,
      roles: roles,
      staff: staff,
      activity: activity,
      notifications: notifications,
      settings: settings,
      meta: {
        today: iso(TODAY),
        options: {
          lengths: LENGTHS, textures: TEXTURES, laces: LACES,
          densities: DENSITIES, caps: CAPS, origins: ORIGINS, colours: COLOURS,
          customTypes: CW_TYPES, slots: SLOTS
        }
      }
    };
  }

  global.ZeedaraSeed = { build: build, TODAY: TODAY };
})(window);
