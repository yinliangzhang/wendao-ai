"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SITE_NAME } from "../lib/config";

const Arrow = () => <span aria-hidden="true">↗</span>;

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  async function sendCode() {
    if (!phone.trim()) {
      setErr("请输入手机号");
      return;
    }
    setSending(true);
    setErr("");
    setDevCode("");
    try {
      const res = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "验证码发送失败");
        return;
      }
      if (data.code) {
        setDevCode(data.code);
        setCode(data.code);
      }
    } catch {
      setErr("暂时无法发送验证码，请稍后重试");
    } finally {
      setSending(false);
    }
  }

  async function submit(e) {
    e?.preventDefault();
    if (!phone || !code) {
      setErr("请输入手机号和验证码");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      if (res.ok) router.push("/hub");
      else setErr((await res.json()).error || "登录失败");
    } catch {
      setErr("暂时无法连接，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function useDemoPhone() {
    setPhone("13800000000");
    setCode("");
    setDevCode("");
    setErr("");
  }

  return (
    <main className="login-shell">
      <section className="login-story">
        <div className="brand brand-on-dark">
          <span className="brand-mark">问</span>
          <span>{SITE_NAME}</span>
        </div>

        <div className="story-copy">
          <span className="eyebrow eyebrow-light">创始人的战略思考场</span>
          <h1>把模糊的直觉，<br />变成清晰的答案。</h1>
          <p>4 场 AI 军师自我拷问，陪你找到独门绝活、心头好、真实用户和最值得 all-in 的贵问题。</p>
        </div>

        <div className="insight-preview">
          <div className="preview-topline">
            <span>本次洞察</span>
            <span className="live-dot">AI 已分析</span>
          </div>
          <blockquote>“你这些年一直在做的一类事，可能就是你越做越有电的那把刀。”</blockquote>
          <div className="preview-meter"><span /></div>
        </div>

        <div className="story-footer">
          <span>AI 军师卡包 · 网站版</span>
          <span>一个人，也能拥有一支军师团</span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-mobile-brand brand">
          <span className="brand-mark">问</span><span>{SITE_NAME}</span>
        </div>
        <div className="login-form-wrap">
          <div className="login-heading">
            <span className="eyebrow">手机号登录 / 注册</span>
            <h2>继续你的战略探索</h2>
            <p>首次登录会自动注册。以后用手机号和验证码进入。</p>
          </div>

          <form onSubmit={submit} className="login-form">
            <label>
              <span>手机号</span>
              <input
                autoFocus
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
              />
            </label>
            <label>
              <span>验证码</span>
              <div className="code-row">
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6 位验证码"
                />
                <button className="button button-secondary" type="button" onClick={sendCode} disabled={sending || !phone.trim()}>
                  {sending ? "发送中…" : "获取验证码"}
                </button>
              </div>
            </label>

            {devCode && <div className="dev-code">开发模式验证码：<strong>{devCode}</strong></div>}
            {err && <div className="form-error">{err}</div>}

            <button className="button button-primary button-wide" disabled={loading}>
              <span>{loading ? "正在进入…" : "进入问道"}</span><Arrow />
            </button>
          </form>

          <button className="demo-login" type="button" onClick={useDemoPhone}>
            <span className="demo-icon">⌁</span>
            <span><strong>本地测试手机号</strong><small>点击填入 13800000000，再获取验证码</small></span>
            <span>→</span>
          </button>

          <p className="privacy-note">登录即表示你同意仅将回答用于本次陪练分析</p>
        </div>
      </section>
    </main>
  );
}
