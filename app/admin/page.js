"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SITE_NAME } from "../../lib/config";

function getStoredToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("wendao-admin-token") || "";
}

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [draftToken, setDraftToken] = useState("");
  const [models, setModels] = useState([]);
  const [modules, setModules] = useState([]);
  const [features, setFeatures] = useState([]);
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
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
      await loadUsers(authToken);
    } catch {
      setMessage("后台暂时不可用");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers(authToken = token) {
    const res = await fetch("/api/admin/users", { headers: { "x-admin-token": authToken } });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "无法读取学员列表");
      return;
    }
    setUsers(data.users || []);
    if (!modules.length && data.modules?.length) setModules(data.modules);
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

  async function saveUser(phone, patch) {
    setMessage("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ phone, patch }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "保存学员权限失败");
        return;
      }
      setUsers(data.users || []);
      setMessage("学员权限已更新。");
    } catch {
      setMessage("保存学员权限失败，请稍后重试");
    }
  }

  function toggleModule(user, moduleId) {
    const current = Array.isArray(user.moduleAccess) ? user.moduleAccess : modules.map((m) => m.id);
    const next = current.includes(moduleId)
      ? current.filter((id) => id !== moduleId)
      : [...current, moduleId];
    saveUser(user.phone, { moduleAccess: next });
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
              <div className="admin-card-title-row">
                <div>
                  <h2>学员注册与权限</h2>
                  <p>这里能看到手机号注册用户、最后登录时间，并控制账号是否可用、每个学员能访问哪些模块。</p>
                </div>
                <button className="button button-secondary" type="button" onClick={() => loadUsers()} disabled={loading}>刷新学员</button>
              </div>

              {users.length ? (
                <div className="admin-user-list">
                  {users.map((user) => (
                    <div className="admin-user-row" key={user.phone}>
                      <div className="admin-user-main">
                        <strong>{user.phone}</strong>
                        <small>注册：{formatTime(user.createdAt)} · 最后登录：{formatTime(user.lastLoginAt)}</small>
                      </div>

                      <select value={user.status || "active"} onChange={(e) => saveUser(user.phone, { status: e.target.value })}>
                        <option value="active">启用</option>
                        <option value="disabled">停用</option>
                      </select>

                      <div className="module-permissions">
                        {modules.map((item) => {
                          const checked = (user.moduleAccess || []).includes(item.id);
                          return (
                            <label key={item.id} className={checked ? "checked" : ""}>
                              <input type="checkbox" checked={checked} onChange={() => toggleModule(user, item.id)} />
                              <span>{item.title.replace(/^\d+ · /, "")}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="admin-empty">还没有学员注册。有人用手机号验证码登录后，这里会自动出现。</div>
              )}
            </section>

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
