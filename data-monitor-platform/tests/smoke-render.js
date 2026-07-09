const fs = require("fs");
const path = require("path");
const vm = require("vm");

const baseDir = path.resolve(__dirname, "..");

class ClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach((name) => this.values.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }

  toggle(name, force) {
    if (force === undefined) {
      if (this.values.has(name)) this.values.delete(name);
      else this.values.add(name);
      return this.values.has(name);
    }
    if (force) this.values.add(name);
    else this.values.delete(name);
    return force;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class ElementStub {
  constructor(id) {
    this.id = id;
    this.innerHTML = "";
    this.textContent = "";
    this.value = "";
    this.disabled = false;
    this.hidden = false;
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this.fields = {};
    this.elements = this.fields;
    this.classList = new ClassList();
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  setAttribute(name, value) {
    this[name] = String(value);
  }

  reset() {
    Object.values(this.fields).forEach((field) => {
      field.value = "";
    });
  }
}

function makeForm(id, names) {
  const form = new ElementStub(id);
  names.forEach((name) => {
    form.fields[name] = new ElementStub(id + "-" + name);
  });
  form.elements = form.fields;
  return form;
}

const ids = [
  "centerSelect",
  "fetchMetrics",
  "qualityMetrics",
  "fetchTableBody",
  "qualityTableBody",
  "toast",
  "drawerMask",
  "detailDrawer",
  "drawerTitle",
  "drawerSubtitle",
  "drawerBody",
  "drawerCloseBtn",
  "drawerLogBtn",
  "drawerBizBtn",
  "drawerRecheckBtn",
];

const elements = Object.fromEntries(ids.map((id) => [id, new ElementStub(id)]));
elements.fetchFilters = makeForm("fetchFilters", [
  "runStart",
  "runEnd",
  "warningDate",
  "warningBatch",
  "businessModule",
  "dataName",
  "priority",
  "status",
  "exceptionType",
]);
elements.qualityFilters = makeForm("qualityFilters", [
  "runStart",
  "runEnd",
  "checkStart",
  "checkEnd",
  "businessModule",
  "dataName",
  "priority",
  "status",
  "exceptionType",
]);

const optionSelects = [
  "modules",
  "priorities",
  "fetchStatuses",
  "fetchTypes",
  "modules",
  "priorities",
  "qualityStatuses",
  "qualityTypes",
].map((kind, index) => {
  const select = new ElementStub("select-" + index);
  select.dataset.options = kind;
  return select;
});

const tabs = ["fetch", "quality"].map((kind) => {
  const tab = new ElementStub("tab-" + kind);
  tab.dataset.tab = kind;
  if (kind === "fetch") tab.classList.add("active");
  return tab;
});

const panels = ["fetchPanel", "qualityPanel"].map((id) => {
  const panel = new ElementStub(id);
  if (id === "fetchPanel") panel.classList.add("active");
  return panel;
});

const resetButtons = ["fetch", "quality"].map((kind) => {
  const button = new ElementStub("reset-" + kind);
  button.dataset.reset = kind;
  return button;
});

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  URL,
  JSON,
  Array,
  Math,
  Number,
  String,
  Boolean,
  Object,
  Set,
  Date,
};

sandbox.window = sandbox;
sandbox.location = { origin: "http://127.0.0.1:8124" };
sandbox.open = function noop() {};
sandbox.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
};
sandbox.fetch = async function fetchStub() {
  throw new Error("api unavailable in smoke test");
};
sandbox.FormData = class FormDataStub {
  constructor(form) {
    this.items = Object.entries(form.fields || {}).map(([key, field]) => [key, field.value || ""]);
  }

  entries() {
    return this.items[Symbol.iterator]();
  }
};
sandbox.document = {
  getElementById(id) {
    return elements[id] || new ElementStub(id);
  },
  querySelectorAll(selector) {
    if (selector === "select[data-options]") return optionSelects;
    if (selector === ".tab") return tabs;
    if (selector === ".tab-panel") return panels;
    if (selector === "[data-reset]") return resetButtons;
    return [];
  },
  addEventListener() {},
};

function runScript(file) {
  const source = fs.readFileSync(path.join(baseDir, file), "utf8");
  vm.runInNewContext(source, sandbox, { filename: file });
}

async function main() {
  runScript("config.js");
  runScript("data/seed-monitor-data.js");
  runScript("app.js");
  await new Promise((resolve) => setTimeout(resolve, 30));

  const html = fs.readFileSync(path.join(baseDir, "index.html"), "utf8");
  const checks = {
    noApiBaseControl: !html.includes("API Base"),
    noDataModeControl: !html.includes("数据模式"),
    noStatusBand: !html.includes("status-band"),
    noNoticePanel: !html.includes("notice-panel"),
    fetchRows: elements.fetchTableBody.innerHTML.length,
    qualityRows: elements.qualityTableBody.innerHTML.length,
    fetchMetrics: elements.fetchMetrics.innerHTML.length,
    qualityMetrics: elements.qualityMetrics.innerHTML.length,
    fetchHasDescription: elements.fetchTableBody.innerHTML.includes("异常"),
    ignoreStateReady: elements.fetchTableBody.innerHTML.includes("忽略"),
    drawerActions: html.includes("日志入口") && html.includes("业务页面入口") && html.includes("重新校验"),
  };

  const failed = Object.entries(checks).filter(([key, value]) => {
    if (typeof value === "boolean") return !value;
    return Number(value) <= 0;
  });

  if (failed.length) {
    console.error(JSON.stringify({ ok: false, checks, failed }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
