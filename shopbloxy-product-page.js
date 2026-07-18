(function () {
  var CART_KEY = "shopbloxy.cart.same-look";
  var CURRENCY_KEY = "shopbloxy.currency.same-look";
  var RATES_KEY = "shopbloxy.rates.same-look";
  var CURRENCIES = {
    USD: { symbol: "$", rate: 1 },
    GBP: { symbol: "£", rate: 0.79 },
    EUR: { symbol: "€", rate: 0.93 },
    CAD: { symbol: "C$", rate: 1.37 },
    AUD: { symbol: "A$", rate: 1.52 }
  };
  var state = {
    data: window.SHOPBLOXY_DATA || null,
    cart: readJson(CART_KEY, []),
    currency: localStorage.getItem(CURRENCY_KEY) || "USD",
    rates: readJson(RATES_KEY, null) || {},
    toastTimer: 0
  };
  function byId(id) {
    return document.getElementById(id);
  }
  function text(value) {
    return String(value == null ? "" : value);
  }
  function slug(value) {
    return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function readJson(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }
  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function rate(code) {
    return Number(state.rates[code] || CURRENCIES[code].rate || 1);
  }
  function money(value) {
    var code = state.currency;
    var meta = CURRENCIES[code] || CURRENCIES.USD;
    return meta.symbol + (Number(value || 0) * rate(code)).toFixed(2);
  }
  function fetchJson(path, fallback) {
    return fetch(path, { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : fallback; })
      .catch(function () { return fallback; });
  }
  function refreshRates() {
    fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (payload) {
        if (!payload || !payload.rates) return;
        Object.keys(CURRENCIES).forEach(function (code) {
          if (payload.rates[code]) state.rates[code] = payload.rates[code];
        });
        writeJson(RATES_KEY, state.rates);
        renderAll();
      })
      .catch(function () {});
  }
  function fallbackData() {
    return {
      currency: "USD",
      games: [
        { id: "grow-a-garden-2", name: "Grow a Garden 2", enabled: true, logo: "grow-a-garden-2.png" },
        { id: "blox-fruits", name: "Blox Fruits", enabled: true, logo: "bloxfruits.png" }
      ],
      products: {
        "grow-a-garden-2": [
          { id: "gag2-unicorn", name: "Unicorn", price: 5.99, image: "unicorn.png", type: "Pet", badge: "Instant delivery", description: "Grow a Garden 2 pet delivered quickly." },
          { id: "gag2-raccoon", name: "Raccoon", price: 7.99, image: "raccoon.png", type: "Pet", badge: "Instant delivery", description: "Grow a Garden 2 item delivery after the order." }
        ],
        "blox-fruits": [
          { id: "bf-permanent-dragon", name: "Permanent Dragon", price: 28.57, image: "permanent-dragon.png", type: "Fruit", badge: "Instant delivery", description: "Permanent Blox Fruits item delivered in-game." }
        ]
      }
    };
  }
  function allProducts() {
    var list = [];
    var products = (state.data && state.data.products) || {};
    Object.keys(products).forEach(function (gameId) {
      (products[gameId] || []).forEach(function (product) {
        list.push(Object.assign({ gameId: gameId }, product));
      });
    });
    return list;
  }
  function productById(id) {
    return allProducts().filter(function (product) {
      return text(product.id || slug(product.name)) === text(id);
    })[0] || null;
  }
  function productByName(name) {
    return allProducts().filter(function (product) {
      return text(product.name).toLowerCase() === text(name).toLowerCase();
    })[0] || null;
  }
  function gameById(id) {
    return ((state.data && state.data.games) || []).filter(function (game) {
      return game.id === id;
    })[0] || { id: id, name: id };
  }
  function placeholder(label) {
    var safe = text(label || "Image").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eafff4"/><stop offset="1" stop-color="#d9fce9"/></linearGradient><pattern id="p" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="#00df82" stroke-opacity=".14" stroke-width="2"/></pattern></defs><rect width="800" height="800" rx="42" fill="url(#g)"/><rect width="800" height="800" fill="url(#p)"/><circle cx="640" cy="160" r="170" fill="#00df82" opacity=".14"/><rect x="170" y="255" width="460" height="290" rx="32" fill="#fff" opacity=".72"/><path d="M245 468l94-110 82 88 52-60 92 82" fill="none" stroke="#00df82" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/><text x="400" y="635" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="42" font-weight="800" fill="#101711">' + safe + '</text></svg>';
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }
  function imageAttempts(src) {
    var value = text(src);
    var attempts = [];
    if (value) attempts.push(value);
    if (value && value.indexOf("/") === -1) {
      attempts.push("downloads/" + value);
      attempts.push("Downloads/" + value);
    } else if (value.indexOf("downloads/") === 0) {
      attempts.push("Downloads/" + value.slice("downloads/".length));
      attempts.push(value.slice("downloads/".length));
    }
    return attempts;
  }
  function setImage(img, src, label) {
    var attempts = imageAttempts(src);
    if (!attempts.length) attempts.push(placeholder(label));
    var index = 0;
    img.onerror = function () {
      index += 1;
      if (index < attempts.length) {
        img.src = attempts[index];
        return;
      }
      img.onerror = null;
      img.src = placeholder(label);
    };
    img.src = attempts[0];
  }
  function frameForPrice(price) {
    var amount = Math.round(Number(price || 0) * 100) / 100;
    if (amount <= 10) return "bronzeframe.png";
    if (amount < 15) return "silverframe.png";
    return "goldframe.png";
  }
  function showToast(message) {
    var toast = byId("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      toast.classList.remove("visible");
    }, 1700);
  }
  function saveCart() {
    writeJson(CART_KEY, state.cart);
    updateCartCount();
  }
  function cartItems() {
    return state.cart.map(function (line) {
      var product = productById(line.id);
      if (!product) return null;
      return Object.assign({}, product, { quantity: Number(line.quantity || 1) });
    }).filter(Boolean);
  }
  function cartTotal(items) {
    return (items || cartItems()).reduce(function (total, item) {
      return total + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0);
  }
  function addToCart(product, openCartAfter) {
    var id = product.id || slug(product.name);
    var line = state.cart.filter(function (item) { return item.id === id; })[0];
    if (line) line.quantity += 1;
    else state.cart.push({ id: id, quantity: 1 });
    saveCart();
    renderCart();
    showToast(product.name + " added to cart");
    if (openCartAfter) openCart();
  }
  function setQuantity(id, quantity) {
    var next = Math.max(0, Number(quantity || 0));
    state.cart = state.cart.filter(function (line) {
      if (line.id !== id) return true;
      line.quantity = next;
      return next > 0;
    });
    saveCart();
    renderCart();
    renderPurchase();
  }
  function updateCartCount() {
    var count = state.cart.reduce(function (sum, line) { return sum + Number(line.quantity || 0); }, 0);
    var countEl = byId("cart-count");
    if (countEl) countEl.textContent = count;
    var legacyCount = document.querySelector("#cart-toggle-btn span.absolute");
    if (legacyCount) legacyCount.textContent = count;
    document.querySelectorAll("[data-cart-count]").forEach(function (node) {
      node.textContent = count;
    });
  }
  function openCart() {
    var overlay = byId("shopbloxy-cart-overlay");
    var drawer = byId("shopbloxy-cart-drawer");
    if (overlay) overlay.classList.add("visible");
    if (drawer) drawer.classList.add("open");
  }
  function closeCart() {
    var overlay = byId("shopbloxy-cart-overlay");
    var drawer = byId("shopbloxy-cart-drawer");
    if (overlay) overlay.classList.remove("visible");
    if (drawer) drawer.classList.remove("open");
  }
  function renderShell() {
    var oldStaticDrawer = document.querySelector('body > div#root > div.fixed.top-0.right-0.h-full');
    if (oldStaticDrawer) oldStaticDrawer.remove();
    if (!byId("shopbloxy-cart-overlay")) {
      var overlay = document.createElement("div");
      overlay.id = "shopbloxy-cart-overlay";
      overlay.className = "shopbloxy-cart-overlay";
      overlay.addEventListener("click", closeCart);
      document.body.appendChild(overlay);
    }
    if (!byId("shopbloxy-cart-drawer")) {
      var drawer = document.createElement("aside");
      drawer.id = "shopbloxy-cart-drawer";
      drawer.className = "shopbloxy-cart-drawer";
      drawer.innerHTML = ''
        + '<div class="relative p-5 border-b border-line"><div class="flex items-center justify-between"><div class="flex items-center gap-3"><div class="bg-accent p-2.5 rounded-xl"><span class="text-accent-ink text-xl font-black">C</span></div><div><h2 class="font-display text-xl font-extrabold text-ink">Your Cart</h2><p class="text-xs text-ink-faint"><span data-cart-count>0</span> item(s)</p></div></div><button id="cart-close-btn" aria-label="Close cart" class="text-ink-soft hover:text-ink hover:bg-surface p-2 rounded-lg transition-colors" type="button">Close</button></div></div>'
        + '<div id="cart-lines" class="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar"></div>'
        + '<div class="border-t border-line p-4 space-y-3"><div class="flex items-center justify-between"><span class="text-ink-soft font-semibold">Subtotal</span><strong id="cart-subtotal" class="text-accent font-display text-2xl">$0.00</strong></div><a class="flex items-center justify-center min-h-[44px] rounded-full bg-accent text-accent-ink font-bold hover:bg-accent-hover" href="purchase.html?cart=1">Checkout</a><button id="cart-clear-btn" class="w-full min-h-[40px] rounded-full border border-line-strong text-ink font-bold hover:border-accent-line" type="button">Clear cart</button></div>';
      document.body.appendChild(drawer);
    }
    var toggle = byId("cart-toggle-btn");
    if (toggle) toggle.addEventListener("click", openCart);
    var close = byId("cart-close-btn");
    if (close) close.addEventListener("click", closeCart);
    var clear = byId("cart-clear-btn");
    if (clear) clear.addEventListener("click", function () {
      state.cart = [];
      saveCart();
      renderCart();
      renderPurchase();
    });
  }
  function renderCart() {
    var target = byId("cart-lines");
    if (!target) return;
    var items = cartItems();
    target.innerHTML = "";
    if (!items.length) {
      target.innerHTML = '<div class="text-center rounded-xl border border-line bg-surface p-6 text-ink-soft font-semibold">Your cart is empty.</div>';
    } else {
      items.forEach(function (item) {
        var row = document.createElement("div");
        row.className = "mb-3";
        row.innerHTML = ''
          + '<div class="relative rounded-xl p-3 transition-colors duration-200 overflow-hidden bg-surface hover:bg-surface-raised"><div class="relative flex gap-3"><div class="flex-shrink-0"><div class="w-20 h-20 aspect-square bg-bg rounded-lg relative overflow-hidden"><img alt="" class="relative z-[2] w-full h-full object-contain rounded-lg"></div></div><div class="flex-1 min-w-0"><div class="flex items-start justify-between mb-2"><div class="flex-1 min-w-0 pr-2"><h3 class="text-ink font-semibold text-sm leading-tight truncate"></h3></div><button class="remove text-ink-faint hover:text-danger p-1 hover:bg-danger/10 rounded transition-colors" type="button">Remove</button></div><div class="flex items-center justify-between"><div class="text-lg font-bold text-accent price"></div><div class="flex items-center gap-2 bg-bg border border-line rounded-lg p-1"><button class="minus text-ink hover:text-accent px-2 rounded transition-colors" type="button">-</button><span class="qty text-ink font-bold text-sm min-w-[24px] text-center"></span><button class="plus text-ink hover:text-accent px-2 rounded transition-colors" type="button">+</button></div></div><div class="flex justify-end mt-2"><span class="text-xs text-ink-faint">Subtotal: <span class="subtotal text-accent font-semibold"></span></span></div></div></div></div>';
        setImage(row.querySelector("img"), item.image, item.name);
        row.querySelector("img").alt = item.name;
        row.querySelector("h3").textContent = item.name;
        row.querySelector(".price").textContent = money(item.price);
        row.querySelector(".qty").textContent = item.quantity;
        row.querySelector(".subtotal").textContent = money(Number(item.price || 0) * item.quantity);
        row.querySelector(".minus").addEventListener("click", function () { setQuantity(item.id, item.quantity - 1); });
        row.querySelector(".plus").addEventListener("click", function () { setQuantity(item.id, item.quantity + 1); });
        row.querySelector(".remove").addEventListener("click", function () { setQuantity(item.id, 0); });
        target.appendChild(row);
      });
    }
    var subtotal = byId("cart-subtotal");
    if (subtotal) subtotal.textContent = money(cartTotal(items));
    updateCartCount();
  }
  function productCard(product, compact) {
    var card = document.createElement("div");
    card.className = "product-card group relative bg-surface rounded-2xl border border-line cursor-pointer transition-[border-color,transform,box-shadow] duration-200 hover:border-accent-line hover:shadow-card overflow-visible flex-shrink-0 w-[200px] sm:w-[260px] md:w-[280px] lg:w-[300px] flex flex-col";
    if (compact) card.className = card.className.replace("flex-shrink-0 w-[200px] sm:w-[260px] md:w-[280px] lg:w-[300px]", "min-w-0");
    card.innerHTML = ''
      + '<div class="absolute inset-0 bg-accent transition-opacity duration-300 pointer-events-none opacity-0"></div>'
      + '<div class="product-image-shell relative w-full rounded-t-xl overflow-hidden">'
      + '<div class="product-image-frame relative">'
      + '<img loading="eager" fetchpriority="high" decoding="async" class="product-frame-image" alt="">'
      + '<img loading="eager" fetchpriority="high" decoding="async" class="product-image relative z-[2]" alt="">'
      + '</div>'
      + '<button aria-label="Toggle wishlist" class="absolute top-3 right-3 grid place-items-center h-9 w-9 bg-black/45 backdrop-blur-sm rounded-full ring-1 ring-white/10 hover:bg-black/65 transition-colors z-10" type="button"><span class="text-white text-xl leading-none">&hearts;</span></button>'
      + '<div class="absolute top-2 left-2 z-30 flex flex-col items-start gap-2 p-1.5 max-w-[calc(100%-3.25rem)]">'
      + '<div class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full backdrop-blur-md bg-accent text-accent-ink"><span class="delivery-badge"></span></div>'
      + '<div class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full backdrop-blur-md bg-warning text-accent-ink"><span class="type-badge"></span></div>'
      + '</div>'
      + '</div>'
      + '<div class="relative p-3 sm:p-4 flex flex-col flex-1">'
      + '<div class="flex-grow">'
      + '<h3 class="product-title text-sm sm:text-base font-display font-bold tracking-tight leading-snug mb-2 line-clamp-2 text-ink transition-colors group-hover:text-accent"></h3>'
      + '<p class="product-desc text-xs text-ink-faint leading-snug mb-3 line-clamp-2"></p>'
      + '<div class="flex items-baseline gap-2 mb-3"><span class="product-price text-xl sm:text-2xl font-display font-extrabold leading-none tracking-tight text-accent"></span></div>'
      + '</div>'
      + '<div class="flex gap-2 mt-auto">'
      + '<button class="buy-btn flex-1 font-bold py-2 sm:py-2.5 px-2 sm:px-3 text-xs sm:text-sm rounded-xl transition-colors bg-surface-raised text-ink border border-line-strong hover:border-accent-line hover:text-accent" type="button">Buy Now</button>'
      + '<button class="add-btn flex items-center justify-center w-10 h-9 sm:w-12 sm:h-10 rounded-xl transition-colors bg-accent text-accent-ink hover:bg-accent-hover text-lg font-bold" type="button" aria-label="Add to cart">+</button>'
      + '</div>'
      + '</div>';
    setImage(card.querySelector(".product-frame-image"), frameForPrice(product.price), "Product frame");
    setImage(card.querySelector(".product-image"), product.image, product.name);
    card.querySelector(".product-image").alt = product.name;
    card.querySelector(".delivery-badge").textContent = product.badge || "Instant delivery";
    card.querySelector(".type-badge").textContent = product.type || "Item";
    card.querySelector(".product-title").textContent = product.name;
    card.querySelector(".product-desc").textContent = product.description || "Fast in-game delivery.";
    card.querySelector(".product-price").textContent = money(product.price);
    card.querySelector(".buy-btn").addEventListener("click", function () {
      window.location.href = "purchase.html?product=" + encodeURIComponent(product.id || slug(product.name));
    });
    card.querySelector(".add-btn").addEventListener("click", function () {
      addToCart(product, true);
    });
    card.addEventListener("click", function (event) {
      if (event.target.closest("button")) return;
      window.location.href = "purchase.html?product=" + encodeURIComponent(product.id || slug(product.name));
    });
    return card;
  }
  function renderProductPage() {
    var gameId = document.body.getAttribute("data-game-id");
    if (!gameId) return;
    var game = gameById(gameId);
    var products = ((state.data.products || {})[gameId] || []).slice();
    if (byId("game-name")) byId("game-name").textContent = game.name;
    if (byId("hero-title")) byId("hero-title").textContent = game.name + " Products";
    if (byId("hero-copy")) byId("hero-copy").textContent = "Choose your products, add them to cart, and get fast in-game delivery.";
    if (byId("product-heading")) byId("product-heading").textContent = game.name + " Products";
    if (byId("product-count")) byId("product-count").textContent = products.length + (products.length === 1 ? " product" : " products");
    var grid = byId("products-grid");
    if (!grid) return;
    grid.innerHTML = "";
    var hasSections = products.some(function (product) { return product.section; });
    if (!hasSections) {
      grid.className = "flex gap-3 sm:gap-5 overflow-x-auto py-4 custom-scrollbar scroll-smooth px-2 sm:px-14";
      products.forEach(function (product) {
        grid.appendChild(productCard(Object.assign({ gameId: gameId }, product)));
      });
      return;
    }
    grid.className = "space-y-10 py-4";
    var sections = [];
    products.forEach(function (product) {
      var sectionName = product.section || "Products";
      var section = sections.filter(function (entry) { return entry.name === sectionName; })[0];
      if (!section) {
        section = { name: sectionName, products: [] };
        sections.push(section);
      }
      section.products.push(product);
    });
    sections.forEach(function (section) {
      var block = document.createElement("section");
      block.innerHTML = '<h3 class="font-display font-extrabold tracking-tight text-2xl sm:text-3xl text-ink mb-2"></h3><div class="flex gap-3 sm:gap-5 overflow-x-auto py-4 custom-scrollbar scroll-smooth px-2 sm:px-14"></div>';
      block.querySelector("h3").textContent = section.name;
      var row = block.querySelector("div");
      section.products.forEach(function (product) {
        row.appendChild(productCard(Object.assign({ gameId: gameId }, product)));
      });
      grid.appendChild(block);
    });
  }
  function renderHomeProductSections() {
    var target = byId("shop-product-sections");
    if (!target || !state.data) return;
    var wrapper = target.closest("section");
    if (wrapper) wrapper.remove();
    else target.remove();
  }
  function cleanHomepage() {
    var shopProducts = byId("shop-products");
    if (shopProducts) shopProducts.remove();
    var gameCards = Array.prototype.slice.call(document.querySelectorAll("a.group.flex.flex-col"));
    gameCards.forEach(function (card) {
      var label = card.querySelector("p.text-ink");
      if (!label) return;
      var name = label.textContent.trim();
      if (name === "Blox Fruits") {
        card.href = "blox-fruit.html";
        card.removeAttribute("aria-disabled");
      }
      if (name === "Grow a Garden 2") {
        card.href = "grow-a-garden-2.html";
        card.removeAttribute("aria-disabled");
      }
      if (name === "Rivals") {
        card.href = "rivals.html";
        card.removeAttribute("aria-disabled");
      }
    });
  }
  function connectHomeButtons() {
    cleanHomepage();
    document.querySelectorAll("a[href]").forEach(function (link) {
      var href = link.getAttribute("href");
      if (href === "/") link.setAttribute("href", "index.html");
      if (href === "/grow-a-garden") link.setAttribute("href", "grow-a-garden-2.html");
      if (href === "/blox-fruits") link.setAttribute("href", "blox-fruit.html");
      if (href === "/rivals") link.setAttribute("href", "rivals.html");
      if (href === "/login" || href === "/faq" || href === "/tutorial" || href === "/proofs") link.setAttribute("href", "index.html#games");
      if (href === "/discord") link.setAttribute("href", "https://discord.gg/petmart");
      if (href && href.indexOf("/affiliate") === 0) link.setAttribute("href", "index.html#games");
      if (href === "/privacy-policy" || href === "/terms" || href === "/refund-policy" || href === "/community" || href === "/about" || href === "/how-it-works") link.setAttribute("href", "index.html#games");
    });
    cleanHomepage();
    document.addEventListener("click", function (event) {
      var gameCard = event.target.closest("a.group.flex.flex-col");
      if (gameCard) {
        var label = gameCard.querySelector("p.text-ink");
        var name = label ? label.textContent.trim() : "";
        if (name === "Blox Fruits") {
          event.preventDefault();
          window.location.href = "blox-fruit.html";
          return;
        }
        if (name === "Grow a Garden 2") {
          event.preventDefault();
          window.location.href = "grow-a-garden-2.html";
          return;
        }
        if (name === "Rivals") {
          event.preventDefault();
          window.location.href = "rivals.html";
          return;
        }
      }
      var start = event.target.closest("button");
      if (start && start.textContent.trim() === "Start shopping now") {
        event.preventDefault();
        var games = byId("games");
        if (games) games.scrollIntoView({ behavior: "smooth" });
      }
    });
  }
  function setupCurrency() {
    var button = byId("currency-toggle-btn") || document.querySelector('button[aria-label="Toggle currency selector"]');
    var symbol = byId("currency-symbol") || (button && button.querySelector("span"));
    var code = byId("currency-code") || (button && button.querySelector("span.hidden"));
    if (symbol) symbol.textContent = (CURRENCIES[state.currency] || CURRENCIES.USD).symbol;
    if (code) code.textContent = state.currency;
    if (!button || button.dataset.currencyReady) return;
    button.dataset.currencyReady = "true";
    button.addEventListener("click", function () {
      var keys = Object.keys(CURRENCIES);
      var index = keys.indexOf(state.currency);
      state.currency = keys[(index + 1) % keys.length];
      localStorage.setItem(CURRENCY_KEY, state.currency);
      renderAll();
      showToast("Currency set to " + state.currency);
    });
  }
  function purchaseItems() {
    var params = new URLSearchParams(window.location.search);
    var productId = params.get("product");
    if (productId) {
      var product = productById(productId);
      return product ? [Object.assign({}, product, { quantity: Number(params.get("qty") || 1) })] : [];
    }
    return cartItems();
  }
  function renderPurchase() {
    if (document.body.getAttribute("data-page") !== "purchase" || !state.data) return;
    var items = purchaseItems();
    var summary = byId("purchase-summary");
    if (!summary) return;
    summary.innerHTML = "";
    if (!items.length) {
      summary.innerHTML = '<div class="text-center rounded-xl border border-line bg-surface p-6 text-ink-soft font-semibold">No item selected yet.</div>';
    } else {
      items.forEach(function (item) {
        var row = document.createElement("div");
        row.className = "mb-3 rounded-xl border border-line bg-surface p-3 flex gap-3";
        row.innerHTML = '<div class="w-16 h-16 bg-bg rounded-lg overflow-hidden flex-shrink-0"><img class="w-full h-full object-contain" alt=""></div><div class="min-w-0 flex-1"><h3 class="font-bold text-ink truncate"></h3><p class="text-xs text-ink-faint"></p></div><strong class="text-accent"></strong>';
        setImage(row.querySelector("img"), item.image, item.name);
        row.querySelector("img").alt = item.name;
        row.querySelector("h3").textContent = item.name;
        row.querySelector("p").textContent = "Qty " + item.quantity + " · " + money(item.price) + " each";
        row.querySelector("strong").textContent = money(Number(item.price || 0) * Number(item.quantity || 1));
        summary.appendChild(row);
      });
    }
    var total = byId("purchase-total");
    if (total) total.textContent = money(cartTotal(items));
  }

  function setupPurchaseForm() {
    var form = byId("purchase-form");
    if (!form || form.dataset.ready) return;
    form.dataset.ready = "true";

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var username = byId("roblox-username").value.trim();
      var contact = byId("contact").value.trim();
      var deliverySpeed = byId("delivery-speed").value;
      var notes = byId("notes").value.trim();

      if (!username) return showToast("Please enter your Roblox username");
      if (!contact) return showToast("Please enter your Discord or email");

      var items = purchaseItems();
      if (!items.length) return showToast("No items in cart");

      var cart = items.map(function(item) {
        return {
          product_id: item.id || item.product_id,
          quantity: Number(item.quantity || 1)
        };
      });

      var payload = {
        username: username,
        email: contact,
        delivery_speed: deliverySpeed,
        notes: notes,
        cart: cart
      };

      var resultDiv = byId("purchase-result");
      resultDiv.innerHTML = '<div class="text-sm text-ink-soft">Connecting to payment...</div>';

      fetch('https://dropjetic.pythonanywhere.com/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': 'purchase-' + Date.now()
        },
        body: JSON.stringify(payload)
      })
      .then(function(res) {
        return res.json().then(function(data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function(result) {
        if (result.ok && result.data.checkout_url) {
          window.location.href = result.data.checkout_url;
        } else {
          throw new Error(result.data.error || "Failed to start checkout");
        }
      })
      .catch(function(err) {
        console.error(err);
        resultDiv.innerHTML = '<div class="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">' + err.message + '</div>';
        showToast("Payment error - check console");
      });
    });
  }

  function renderAll() {
    setupCurrency();
    cleanHomepage();
    renderProductPage();
    renderHomeProductSections();
    renderCart();
    renderPurchase();
  }
  function boot() {
    fetchJson("shopbloxy-products.json", state.data || fallbackData()).then(function (data) {
      state.data = data;
      renderShell();
      setupCurrency();
      connectHomeButtons();
      setupPurchaseForm();
      renderAll();
      refreshRates();
    });
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
