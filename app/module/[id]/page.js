"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { findModule } from "../../../data/modules";

function openingMessage(mod) {
  const first = mod.questions[0];
  return {
    role: "assistant",
    content:
      `我们开始「${mod.title.replace(/^\d+ · /, "")}」。\n\n${mod.intro}\n\n先从第一个信号开始：${first.prompt}` +
      (first.followups?.[0] ? `\n\n如果可以，请尽量具体一点：${first.followups[0]}` : ""),
    createdAt: Date.now(),
  };
}

function getSaved(id) {
  if (typeof window === "undefined") return { messages: [] };
  try {
    const data = JSON.parse(localStorage.getItem("wendao-progress") || "{}")[id] || {};
    return { messages: Array.isArray(data.messages) ? data.messages : [] };
  } catch {
    return { messages: [] };
  }
}

export default function ModulePage() {
  const params = useParams();
  const mod = findModule(params.id);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!mod) return;
    const data = getSaved(mod.id);
    setMessages(data.messages?.length ? data.messages : [openingMessage(mod)]);
    setDraft("");
  }, [mod?.id]);

  useEffect(() => {
    if (!mod || typeof window === "undefined" || !messages.length) return;
    const all = JSON.parse(localStorage.getItem("wendao-progress") || "{}");
    all[mod.id] = { ...(all[mod.id] || {}), messages, updatedAt: Date.now() };
    localStorage.setItem("wendao-progress", JSON.stringify(all));
    setSaved(true);
    const timer = setTimeout(() => setSaved(false), 1200);
    return () => clearTimeout(timer);
  }, [messages, mod?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const userTurns = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);

  if (!mod) return <div className="empty-state"><h1>没有找到这个模块</h1><Link className="button button-primary" href="/hub">返回训练广场</Link></div>;

  async function sendMessage(e) {
    e?.preventDefault();
    const content = draft.trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: "user", content, createdAt: Date.now() }];
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 28000);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: mod.id,
          moduleTitle: mod.title,
          moduleIntro: mod.intro,
          systemPrompt: mod.defaultAnalysisPrompt,
          questions: mod.questions,
          messages: nextMessages,
        }),
      });
      const data = await res.json().catch(() => ({ error: "对话接口没有返回有效内容" }));
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          content: res.ok ? data.result : `暂时无法继续分析：${data.error}`,
          error: !res.ok,
          createdAt: Date.now(),
        },
      ]);
    } catch (err) {
      const message = err?.name === "AbortError"
        ? "这次等待超过 28 秒，已自动停止。你的回答已经保存，可以稍后再继续。"
        : "网络暂时不可用，你的回答已经自动保存。";
      setMessages((items) => [...items, { role: "assistant", content: message, error: true, createdAt: Date.now() }]);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  function resetChat() {
    if (!window.confirm("确定要重开这一关吗？当前这关的对话记录会清空。")) return;
    setMessages([openingMessage(mod)]);
    setDraft("");
  }

  return (
    <div className="practice-shell chat-shell">
      <aside className="practice-sidebar">
        <Link className="brand" href="/hub"><span className="brand-mark">问</span><span>问道 AI</span></Link>
        <Link href="/hub" className="back-link">← 返回训练广场</Link>
        <div className="practice-module-info">
          <span className="eyebrow">第 {String(Number(mod.id.slice(1))).padStart(2, "0")} 关</span>
          <h1>{mod.title.replace(/^\d+ · /, "")}</h1>
          <p>{mod.desc}</p>
        </div>
        <div className="chat-note">
          <span>已对话 {userTurns} 轮</span>
          <p>军师会根据你的回答决定继续追问，还是自然推进；不用急着跑完路线图。</p>
        </div>
        <div className="signal-guide">
          <span className="guide-label">本关访谈方向</span>
          {mod.questions.map((item, index) => (
            <div key={item.id} className={`signal-step ${index === 0 ? "active" : ""}`}>
              <i>{index + 1}</i>
              <span>{item.prompt.split("：")[0]}</span>
            </div>
          ))}
        </div>
        <button className="reset-chat" type="button" onClick={resetChat}>重新开始这一关</button>
      </aside>

      <main className="practice-main chat-main">
        <header className="practice-topbar">
          <div className="mobile-back"><Link href="/hub">← 广场</Link></div>
          <div className="autosave"><span className={saved ? "pulse" : ""}>✓</span>{saved ? "已保存" : "自动保存已开启"}</div>
          <div className="model-managed">AI 由后台配置</div>
        </header>

        <div className="chat-content">
          <div className="chat-intro-card">
            <span className="eyebrow">AI 军师对话</span>
            <h2>{mod.title.replace(/^\d+ · /, "")}</h2>
            <p>{mod.intro}</p>
            <div className="chat-intro-hint">这不是闯关答题。AI 会像真人军师一样，围绕同一个信号多追几轮，直到信息足够具体。</div>
          </div>

          <div className="message-list">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}-${message.createdAt || index}`} className={`message-row ${message.role}`}>
                <div className="message-avatar">{message.role === "assistant" ? "问" : "我"}</div>
                <div className={`message-bubble ${message.error ? "error" : ""}`}>
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-row assistant">
                <div className="message-avatar">问</div>
                <div className="message-bubble typing"><span /> <span /> <span /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form className="chat-composer" onSubmit={sendMessage}>
            <textarea
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") sendMessage(e);
              }}
              placeholder="像和军师聊天一样回答。越具体、越诚实，它挖得越准…"
            />
            <div className="composer-actions">
              <span>{draft.length} 字 · ⌘/Ctrl + Enter 发送</span>
              <button className="button button-primary" disabled={!draft.trim() || loading}>
                <span>{loading ? "军师思考中…" : "发送"}</span><span>↗</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
