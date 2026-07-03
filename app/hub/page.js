"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MODULES } from "../../data/modules";
import { SITE_NAME } from "../../lib/config";

const ICONS = ["✦", "⌁", "◉", "⬡"];
const GROUPS = [
  { label: "看见自己", range: [0, 2], accent: "violet" },
  { label: "看懂用户", range: [2, 4], accent: "cyan" },
];

function readProgress() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("wendao-progress") || "{}"); }
  catch { return {}; }
}

function completedCount(item) {
  const answerCount = Object.keys(item?.answers || {}).filter((k) => item.answers[k]?.trim()).length;
  const chatCount = (item?.messages || []).filter((m) => m.role === "user" && m.content?.trim()).length;
  return Math.max(answerCount, chatCount);
}

export default function HubPage() {
  const [progress, setProgress] = useState({});
  useEffect(() => setProgress(readProgress()), []);

  const totalTurns = useMemo(
    () => MODULES.reduce((sum, module) => sum + completedCount(progress[module.id]), 0),
    [progress]
  );
  const activeModule = MODULES.find((m) => completedCount(progress[m.id]) > 0) || MODULES[0];
  const activeIndex = MODULES.findIndex((m) => m.id === activeModule.id);
  const activeDone = completedCount(progress[activeModule.id]);
  const startedModules = MODULES.filter((m) => completedCount(progress[m.id]) > 0).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/hub" className="brand"><span className="brand-mark">问</span><span>{SITE_NAME}</span></Link>
        <nav className="side-nav">
          <Link href="/hub" className="side-link active"><span>▦</span>训练广场</Link>
          <a className="side-link" href="#progress"><span>◔</span>我的进度</a>
          <a className="side-link" href="#method"><span>◫</span>方法说明</a>
          <Link className="side-link" href="/admin"><span>⚙</span>后台管理</Link>
        </nav>
        <div className="side-quote">
          <span>今日一问</span>
          <p>什么是你做完之后，反而比开始前更有能量的事？</p>
        </div>
        <div className="side-user">
          <div className="avatar">D</div>
          <div><strong>体验学员</strong><small>已登录</small></div>
          <a href="/api/logout" aria-label="退出登录" title="退出登录">↪</a>
        </div>
      </aside>

      <main className="dashboard">
        <header className="dashboard-header">
          <div><span className="eyebrow">STRATEGY PRACTICE</span><h1>早上好，今天想探索什么？</h1></div>
          <div className="header-actions"><button className="icon-button" aria-label="通知">◌</button><div className="avatar small">D</div></div>
        </header>

        <section className="hero-card" id="progress">
          <div className="hero-content">
            <span className="hero-kicker">继续上次的思考</span>
            <h2>{activeModule.title.replace(/^\d+ · /, "")}</h2>
            <p>{activeModule.desc}</p>
            <div className="hero-progress-row">
              <div className="progress-track"><span style={{ width: `${Math.min(100, Math.max(8, activeDone * 14))}%` }} /></div>
              <small>{activeDone} 轮对话</small>
            </div>
            <Link className="button button-light" href={`/module/${activeModule.id}`}>继续对话 <span>→</span></Link>
          </div>
          <div className="hero-orbit" aria-hidden="true">
            <div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-symbol">问</div>
            <span className="spark spark-one">✦</span><span className="spark spark-two">✦</span>
          </div>
        </section>

        <section className="stats-row">
          <div><strong>{startedModules}</strong><span>已开始关卡</span></div>
          <div><strong>{totalTurns}</strong><span>累计对话轮数</span></div>
          <div><strong>{MODULES.length}</strong><span>军师拷问关卡</span></div>
          <div className="streak"><strong>3</strong><span>连续思考天数 <b>↗</b></span></div>
        </section>

        <section className="module-section" id="method">
          <div className="section-heading">
            <div><span className="eyebrow">4 场自我拷问</span><h2>从独门绝活，到一句入魂</h2></div>
            <p>建议按顺序开始，但不要急着结束。每一关都像一场访谈，AI 会根据你的回答多追几轮。</p>
          </div>

          {GROUPS.map((group) => (
            <div className="module-group" key={group.label}>
              <div className={`group-title ${group.accent}`}><span>{group.label}</span><i /></div>
              <div className="module-grid">
                {MODULES.slice(...group.range).map((m) => {
                  const index = MODULES.findIndex((item) => item.id === m.id);
                  const done = completedCount(progress[m.id]);
                  const pct = Math.min(100, Math.round(done * 14));
                  return (
                    <Link key={m.id} href={`/module/${m.id}`} className="module-card">
                      <div className={`module-icon tone-${index % 4}`}>{ICONS[index]}</div>
                      <div className="module-number">{String(index + 1).padStart(2, "0")}</div>
                      <h3>{m.title.replace(/^\d+ · /, "")}</h3>
                      <p>{m.desc}</p>
                      <div className="module-meta"><span>{m.duration?.replace("约 ", "")}</span><span>{m.questions.length} 个方向</span></div>
                      <div className="card-footer">
                        {done ? <><div className="mini-progress"><span style={{ width: `${pct}%` }} /></div><small>{done} 轮</small></> : <><span className="start-label">开始探索</span><span className="round-arrow">→</span></>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
        <footer className="dashboard-footer"><span>© 2026 问道 AI</span><span>每一个好答案，都始于一个好问题。</span></footer>
      </main>
    </div>
  );
}
