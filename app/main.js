// DealHawk's browser code: renders the checked deals, runs search, the
// category / store / discount filters and sorting, and shows one deal's
// detail on a hash route (#/deal/<id>) so any view can be linked to.
// No framework, no network: the deals arrive from data.js beside this file.
import { DEALS, META, CATEGORIES, VERDICT_LABEL } from "./data.js";

const state = {
  q: "",
  cats: new Set(),
  stores: new Set(),
  off: "all",
  sort: "discount",
};

const $ = (sel) => document.querySelector(sel);
const grid = $("#grid");
const detail = $("#detail");
const empty = $("#empty");
const count = $("#count");

const money = (n) => "$" + n.toFixed(2);
const discount = (d) => Math.round((1 - d.sale / d.usual) * 100);
const checkedText = (iso) => "checked " + iso.replace("T", " ").replace("Z", " UTC");

function verdictOf(d) {
  return VERDICT_LABEL[d.verdict] ?? d.verdict;
}

function matches(d) {
  if (state.cats.size && !state.cats.has(d.category)) return false;
  if (state.stores.size && !state.stores.has(d.store)) return false;
  if (state.off === "50+" && discount(d) < 50) return false;
  if (state.off === "20-49" && (discount(d) < 20 || discount(d) >= 50)) return false;
  if (state.off === "under20" && discount(d) >= 20) return false;
  if (state.q) {
    const hay = (d.product + " " + d.store + " " + d.category + " " + d.extra).toLowerCase();
    if (!hay.includes(state.q.toLowerCase())) return false;
  }
  return true;
}

function sorted(list) {
  const l = [...list];
  if (state.sort === "price-low") l.sort((a, b) => a.sale - b.sale);
  else if (state.sort === "price-high") l.sort((a, b) => b.sale - a.sale);
  else if (state.sort === "checked") l.sort((a, b) => (a.checked_at < b.checked_at ? 1 : -1));
  else l.sort((a, b) => discount(b) - discount(a));
  return l;
}

function cardEl(d) {
  const b = document.createElement("button");
  b.className = "card";
  b.dataset.id = d.id;
  b.innerHTML =
    '<span class="cat">' + d.category + "</span>" +
    "<h3>" + d.product + "</h3>" +
    '<div class="prices"><span class="sale">' + money(d.sale) + "</span>" +
    '<span class="usual">' + money(d.usual) + "</span>" +
    '<span class="off">' + discount(d) + "% off</span></div>" +
    '<span class="store">at ' + d.store + " · " + checkedText(d.checked_at) + "</span>" +
    '<span class="badge" data-v="' + d.verdict + '">' + verdictOf(d) + "</span>";
  b.addEventListener("click", () => {
    location.hash = "#/deal/" + d.id;
  });
  return b;
}

function renderGrid() {
  const list = sorted(DEALS.filter(matches));
  grid.replaceChildren(...list.map(cardEl));
  empty.hidden = list.length > 0;
  count.textContent =
    list.length === DEALS.length
      ? DEALS.length + " deals, every price checked " + META.checked_window
      : list.length + " of " + DEALS.length + " deals";
}

function renderDetail(id) {
  const d = DEALS.find((x) => x.id === id);
  if (!d) {
    detail.hidden = true;
    return;
  }
  detail.hidden = false;
  detail.innerHTML =
    '<div class="detail-inner">' +
    '<button class="back" id="back">← All deals</button>' +
    '<span class="badge" data-v="' + d.verdict + '">' + verdictOf(d) + "</span>" +
    "<h2>" + d.product + "</h2>" +
    '<p class="why">' + d.why + "</p>" +
    "<dl>" +
    "<dt>Store</dt><dd>" + d.store + "</dd>" +
    "<dt>Sale price</dt><dd>" + money(d.sale) + "</dd>" +
    "<dt>Usual price</dt><dd>" + money(d.usual) + " (" + discount(d) + "% off)</dd>" +
    "<dt>Price checked</dt><dd>" + checkedText(d.checked_at) + "</dd>" +
    "<dt>Buy it at</dt><dd><a href=\"" + d.link + "\" target=\"_blank\" rel=\"noopener\">" + d.link + "</a></dd>" +
    "<dt>Where read</dt><dd><a href=\"" + d.source + "\" target=\"_blank\" rel=\"noopener\">" + d.source_name + "</a></dd>" +
    "<dt>Notes</dt><dd>" + d.extra + "</dd>" +
    "</dl></div>";
  detail.querySelector("#back").addEventListener("click", () => {
    location.hash = "";
  });
}

function chip(text, on, group) {
  const c = document.createElement("button");
  c.className = "chip";
  c.textContent = text;
  c.setAttribute("aria-pressed", String(on));
  c.addEventListener("click", () => {
    const set = group === "cat" ? state.cats : state.stores;
    if (set.has(text)) set.delete(text);
    else set.add(text);
    c.setAttribute("aria-pressed", String(set.has(text)));
    renderGrid();
  });
  return c;
}

function buildFilters() {
  const cats = $("#cat-chips");
  const stores = $("#store-chips");
  cats.replaceChildren(...CATEGORIES.map((c) => chip(c, false, "cat")));
  const storeNames = [...new Set(DEALS.map((d) => d.store))].sort();
  stores.replaceChildren(...storeNames.map((s) => chip(s, false, "store")));

  const offs = $("#off-chips");
  for (const [value, label] of [
    ["all", "Any"],
    ["50+", "50%+ off"],
    ["20-49", "20–49% off"],
    ["under20", "Under 20%"],
  ]) {
    const c = document.createElement("button");
    c.className = "chip";
    c.textContent = label;
    c.setAttribute("aria-pressed", String(state.off === value));
    c.addEventListener("click", () => {
      state.off = value;
      for (const el of offs.children) {
        el.setAttribute("aria-pressed", String(el.textContent === label));
      }
      renderGrid();
    });
    offs.append(c);
  }
}

function route() {
  const m = location.hash.match(/^#\/deal\/(.+)$/);
  if (m) renderDetail(m[1]);
  else detail.hidden = true;
}

$("#q").addEventListener("input", (e) => {
  state.q = e.target.value.trim();
  renderGrid();
});
$("#sort").addEventListener("change", (e) => {
  state.sort = e.target.value;
  renderGrid();
});
addEventListener("hashchange", route);

$("#checked-window").textContent = META.checked_window;
buildFilters();
renderGrid();
route();

// URL params open any view directly, so a link or a screenshot can take one:
// ?deal=<id> opens that deal, and ?q=, ?cat=, ?store=, ?off= seed the board
// with the search and filters already applied.
const params = new URLSearchParams(location.search);
const want = params.get("deal");
const seed = {
  q: params.get("q") ?? "",
  cat: params.get("cat") ?? "",
  store: params.get("store") ?? "",
  off: params.get("off") ?? "all",
};
if (seed.q) {
  state.q = seed.q;
  $("#q").value = seed.q;
}
if (seed.cat && CATEGORIES.includes(seed.cat)) {
  state.cats.add(seed.cat);
  for (const el of $("#cat-chips").children) {
    el.setAttribute("aria-pressed", String(el.textContent === seed.cat));
  }
}
if (seed.store) {
  state.stores.add(seed.store);
  for (const el of $("#store-chips").children) {
    el.setAttribute("aria-pressed", String(el.textContent === seed.store));
  }
}
if (["50+", "20-49", "under20"].includes(seed.off)) {
  state.off = seed.off;
  const label = { "50+": "50%+ off", "20-49": "20–49% off", under20: "Under 20%" }[seed.off];
  for (const el of $("#off-chips").children) {
    el.setAttribute("aria-pressed", String(el.textContent === label));
  }
}
if (want && !location.hash) location.hash = "#/deal/" + want;
renderGrid();
route();