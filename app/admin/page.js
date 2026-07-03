"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SITE_NAME } from "../../lib/config";

function getStoredToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("wendao-admin-token") || "";
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [draftToken, setDraftToken] = useState("");
  const [models, setModels] = useState([]);
  const [modules, setModules] = useState([]);
  const [features, setFeatures] = useState([]);
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = getStoredToken();
    if (saved) {
      setToken(saved);
      setDraftToken(saved);
    }
  }, []);

  useEffect(() => {
    if (token) loadSettings(token);
  }, [token]);

  const modelByProvider = useMemo(() => Object.fromEntries(models.map((m) => [m.value, m.model])), [models]);

  async function loadSettings(authToken = token) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", { headers: { "x-admin-token": authToken } });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "无法读取后台配置");
        return;
      }
      setModels(data.models || []);
      setModules(data.modules || []);
      setFeatures(data.features || []);
      setSettings(data.settings);
      localStorage.setItem("wendao-admin-token", authToken);
    } catch {
      setMessage("后台暂时不可用");
    } finally {
      setLoading(false);
    }
  }

  async function login(e) {
    e.preventDefault();
    setToken(draftToken);
    await loadSettings(draftToken);
  }

  function updateModule(id, field, value) {
    setSettings((s) => ({
      ...s,
      modules: {
        ...s.modules,
        [id]: {
          ...(s.modules?.[id] || {}),
          [field]: value,
          ...(field === "provider" ? { model: modelByProvider[value] || "" } : {}),
        },
      },
    }));
  }

  function updateFeature(id, field, value) {
    setSettings((s) => ({
      ...s,
      features: {
        ...s.features,
        [id]: {
          ...(s.features?.[id] || {}),
          [field]: value,
          ...(field === "provider" ? { model: modelByProvider[value] || "" } : {}),
        },
      },
    }));
  }

  async function saveSettings() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "保存失败");
        return;
      }
      setSettings(data.settings);
      setMessage("已保存。新的对话会按这套模型配置调用。");
    } catch {
      setMessage("保存失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <div className="admin-top">
          <Link href="/hub" className="brand"><span className="brand-mark">问</span><span>{SITE_NAME}</span></Link>
          <Link className="back-link" href="/hub">← 返回训练广场</Link>
        </div>

        <div className="admin-heading">
          <span className="eyebrow">后台管理</span>
          <h1>AI 模型与学员入口配置</h1>
          <p>这里控制每个军师模块调用哪个 AI。API Key 仍然只放在服务器环境变量里，后台不会显示密钥。</p>
        </div>

        <form className="admin-login" onSubmit={login}>
          <label>
            <span>后台密码</span>
            <input value={draftToken} onChange={(e) => setDraftToken(e.target.value)} placeholder="默认本地密码 admin123" type="password" />
          </label>
          <button className="button button-primary" disabled={loading || !draftToken.trim()}>{loading ? "读取中…" : "进入后台"}</button>
        </form>

        {message && <div className="admin-message">{message}</div>}

        {settings && (
          <>
            <section className="admin-card">
              <h2>四大模块 AI 配置</h2>
              <p>你可以先让四个模块都用 DeepSeek；未来如果某关更适合 Claude，也可以单独切。</p>
              <div className="admin-grid">
                {modules.map((item) => {
                  const value = settings.modules?.[item.id] || {};
                  return (
                    <div className="admin-config-row" key={item.id}>
                      <div>
                        <strong>{item.title.replace(/^\d+ · /, "")}</strong>
                        <small>{item.desc}</small>
                      </div>
                      <select value={value.provider || "deepseek"} onChange={(e) => updateModule(item.id, "provider", e.target.value)}>
                        {models.map((m) => <option value={m.value} key={m.value}>{m.label}</option>)}
                      </select>
                      <input value={value.model || ""} onChange={(e) => updateModule(item.id, "model", e.target.value)} placeholder="模型名，留空用默认" />
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="admin-card">
              <h2>后续功能 AI 配置</h2>
              <p>比如你说的“生成战略地图”，默认建议用 Claude，适合长上下文整理和结构化输出。</p>
              <div className="admin-grid">
                {features.map((item) => {
                  const value = settings.features?.[item.id] || {};
                  return (
                    <div className="admin-config-row" key={item.id}>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.desc}</small>
                      </div>
                      <select value={value.provider || "claude"} onChange={(e) => updateFeature(item.id, "provider", e.target.value)}>
                        {models.map((m) => <option value={m.value} key={m.value}>{m.label}</option>)}
                      </select>
                      <input value={value.model || ""} onChange={(e) => updateFeature(item.id, "model", e.target.value)} placeholder="模型名，留空用默认" />
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="admin-actions">
              <button className="button button-primary" onClick={saveSettings} disabled={loading}>{loading ? "保存中…" : "保存配置"}</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
