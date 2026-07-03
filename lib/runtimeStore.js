import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { DEFAULT_MODEL, MODELS } from "./config";

const DATA_DIR = path.join(process.cwd(), "data", ".runtime");
const AUTH_FILE = path.join(DATA_DIR, "auth.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

const DEFAULT_AUTH = {
  users: [],
  codes: {},
};

const DEFAULT_SETTINGS = {
  defaultProvider: DEFAULT_MODEL,
  defaultModel: "",
  modules: {
    m1: { provider: "deepseek", model: "" },
    m2: { provider: "deepseek", model: "" },
    m3: { provider: "deepseek", model: "" },
    m4: { provider: "deepseek", model: "" },
  },
  features: {
    strategy_map: { provider: "claude", model: "claude-sonnet-4-5" },
  },
};

async function ensureDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readJson(file, fallback) {
  try {
    const raw = await readFile(file, "utf8");
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await ensureDir();
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

export function isValidChinaMobile(phone = "") {
  return /^1[3-9]\d{9}$/.test(normalizePhone(phone));
}

export function normalizeProvider(provider) {
  const value = String(provider || "").trim().toLowerCase();
  return MODELS.some((m) => m.value === value) ? value : DEFAULT_MODEL;
}

export function defaultModelForProvider(provider) {
  const item = MODELS.find((m) => m.value === provider) || MODELS.find((m) => m.value === DEFAULT_MODEL) || MODELS[0];
  return item?.model || "";
}

export async function readAuthStore() {
  const data = await readJson(AUTH_FILE, DEFAULT_AUTH);
  return {
    users: Array.isArray(data.users) ? data.users : [],
    codes: data.codes && typeof data.codes === "object" ? data.codes : {},
  };
}

export async function writeAuthStore(data) {
  await writeJson(AUTH_FILE, {
    users: Array.isArray(data.users) ? data.users : [],
    codes: data.codes && typeof data.codes === "object" ? data.codes : {},
  });
}

export async function createLoginCode(phone) {
  const cleanPhone = normalizePhone(phone);
  const store = await readAuthStore();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.codes[cleanPhone] = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
    createdAt: Date.now(),
  };
  await writeAuthStore(store);
  return code;
}

export async function verifyLoginCode(phone, code) {
  const cleanPhone = normalizePhone(phone);
  const store = await readAuthStore();
  const record = store.codes[cleanPhone];
  if (!record || record.code !== String(code || "").trim()) return { ok: false, error: "验证码不正确" };
  if (Date.now() > record.expiresAt) return { ok: false, error: "验证码已过期，请重新获取" };

  delete store.codes[cleanPhone];
  if (!store.users.some((u) => u.phone === cleanPhone)) {
    store.users.push({ phone: cleanPhone, createdAt: Date.now(), lastLoginAt: Date.now() });
  } else {
    store.users = store.users.map((u) => u.phone === cleanPhone ? { ...u, lastLoginAt: Date.now() } : u);
  }
  await writeAuthStore(store);
  return { ok: true, phone: cleanPhone };
}

export async function readAdminSettings() {
  const data = await readJson(SETTINGS_FILE, DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    modules: { ...DEFAULT_SETTINGS.modules, ...(data.modules || {}) },
    features: { ...DEFAULT_SETTINGS.features, ...(data.features || {}) },
  };
}

export async function writeAdminSettings(settings) {
  const clean = {
    defaultProvider: normalizeProvider(settings.defaultProvider),
    defaultModel: String(settings.defaultModel || "").trim(),
    modules: {},
    features: {},
  };

  for (const [id, value] of Object.entries(settings.modules || {})) {
    const provider = normalizeProvider(value?.provider);
    clean.modules[id] = {
      provider,
      model: String(value?.model || "").trim(),
    };
  }

  for (const [id, value] of Object.entries(settings.features || {})) {
    const provider = normalizeProvider(value?.provider);
    clean.features[id] = {
      provider,
      model: String(value?.model || "").trim(),
    };
  }

  await writeJson(SETTINGS_FILE, clean);
  return clean;
}

export async function getModelSelection({ moduleId, featureId } = {}) {
  const settings = await readAdminSettings();
  const selected =
    (featureId && settings.features?.[featureId]) ||
    (moduleId && settings.modules?.[moduleId]) ||
    { provider: settings.defaultProvider, model: settings.defaultModel };

  const providerName = normalizeProvider(selected.provider);
  return {
    providerName,
    model: selected.model || defaultModelForProvider(providerName),
  };
}

export function isAdminAuthorized(req) {
  const expected = process.env.WENDAO_ADMIN_PASSWORD || "admin123";
  const token = req.headers.get("x-admin-token") || "";
  return token && token === expected;
}
