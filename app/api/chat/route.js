import { DEFAULT_MODEL, MODELS } from "../../../lib/config";
import { getModelSelection, getUserAccess } from "../../../lib/runtimeStore";

export const runtime = "nodejs";

const MODEL_TIMEOUT_MS = 22000;
const MODEL_TIMEOUT = Symbol("MODEL_TIMEOUT");

const PROVIDERS = {
  deepseek: {
    url: "https://api.deepseek.com/chat/completions",
    keyEnv: "DEEPSEEK_API_KEY",
  },
  qwen: {
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    keyEnv: "DASHSCOPE_API_KEY",
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    keyEnv: "OPENAI_API_KEY",
  },
  claude: {
    url: "https://api.anthropic.com/v1/messages",
    keyEnv: "ANTHROPIC_API_KEY",
  },
};

async function getConfiguredModel({ moduleId, featureId } = {}) {
  const selected = await getModelSelection({ moduleId, featureId });
  const providerName = (selected.providerName || process.env.WENDAO_AI_PROVIDER || DEFAULT_MODEL).trim().toLowerCase();
  const modelCfg = MODELS.find((m) => m.value === providerName) || MODELS.find((m) => m.value === DEFAULT_MODEL) || MODELS[0];
  const provider = PROVIDERS[modelCfg.value];

  return {
    providerName: modelCfg.value,
    provider,
    model: selected.model || process.env.WENDAO_AI_MODEL?.trim() || modelCfg.model,
  };
}

function friendlyModelError(status, text, providerName) {
  if (/Insufficient Balance|insufficient[_\s-]?balance|余额不足/i.test(text)) {
    return `${providerName === "deepseek" ? "DeepSeek" : "模型"} 账户余额不足，请先到模型平台充值后再试。`;
  }
  if (/invalid.*model|model.*not.*exist|模型.*不存在/i.test(text)) {
    return `当前模型名不可用，请检查 .env.local 里的 WENDAO_AI_MODEL。`;
  }
  if (status === 401 || status === 403) {
    return `API Key 无效或没有权限，请检查 .env.local 里的密钥是否正确。`;
  }
  if (status === 429) {
    return `模型调用太频繁或额度受限，请稍后再试。`;
  }
  return `模型接口报错：${status} ${text.slice(0, 300)}`;
}

function buildProviderRequest({ providerName, provider, apiKey, model, messages }) {
  if (providerName === "claude") {
    const [systemMessage, ...conversation] = messages;
    return {
      url: provider.url,
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 700,
          system: systemMessage?.content || "",
          messages: conversation.map((m) => ({ role: m.role, content: m.content })),
        }),
      },
    };
  }

  return {
    url: provider.url,
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.72,
      }),
    },
  };
}

function extractProviderContent(providerName, data) {
  if (providerName === "claude") {
    return data?.content
      ?.filter((item) => item?.type === "text")
      ?.map((item) => item.text)
      ?.join("\n")
      ?.trim() || "（模型未返回内容）";
  }

  return data?.choices?.[0]?.message?.content ?? "（模型未返回内容）";
}

function clipMessages(messages = []) {
  return messages
    .filter((m) => ["assistant", "user"].includes(m.role) && m.content?.trim())
    .slice(-16)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1800) }));
}

function buildDemoReply({ moduleTitle = "", questions = [], messages = [] }) {
  const userMessages = messages.filter((m) => m.role === "user");
  const latest = userMessages[userMessages.length - 1]?.content || "";
  const next = questions[Math.min(userMessages.length, questions.length - 1)];
  const stillEarly = userMessages.length < questions.length;

  if (stillEarly && next) {
    return `我先抓住你刚才这句里最有价值的线索：你不是在讲一个抽象偏好，而是在描述一个真实发生过的能量/注意力模式。\n\n为了不飘，我们继续往下挖一层。\n\n${next.prompt}${next.followups?.[0] ? `\n\n你可以顺手补一句：${next.followups[0]}` : ""}`;
  }

  return `这一关「${moduleTitle.replace(/^\d+ · /, "")}」已经有了比较完整的材料。\n\n我听到的核心是：${latest.slice(0, 80)}${latest.length > 80 ? "…" : ""}\n\n请你现在试着用一句话收束：这件事到底指向你的哪种能力、热爱、用户洞察或贵问题？我会再帮你把它压成更锋利的一句话。`;
}

export async function POST(req) {
  try {
    const { moduleId, featureId, moduleTitle, moduleIntro, systemPrompt, questions, messages } = await req.json();
    const cleanMessages = clipMessages(messages);
    const authId = decodeURIComponent(req.cookies.get("wd_auth")?.value || "");

    const access = await getUserAccess(authId, moduleId);
    if (!access.ok) {
      return Response.json({ error: access.error }, { status: 403 });
    }

    if (!cleanMessages.some((m) => m.role === "user")) {
      return Response.json({ error: "请先输入你的回答" }, { status: 400 });
    }

    const { providerName, provider, model } = await getConfiguredModel({ moduleId, featureId });
    const apiKey = process.env[provider.keyEnv];

    if (!apiKey) {
      return Response.json({
        demo: true,
        provider: providerName,
        model,
        result: buildDemoReply({ moduleTitle, questions, messages: cleanMessages }),
      });
    }

    const questionList = (questions || [])
      .map((q, index) => `${index + 1}. ${q.prompt}${q.followups?.length ? `（可追问：${q.followups.join(" / ")}）` : ""}`)
      .join("\n");

    const modelMessages = [
      {
        role: "system",
        content:
          `${systemPrompt}\n\n` +
          `你正在进行「${moduleTitle}」这一关的连续访谈。模块说明：${moduleIntro}\n\n` +
          `本关路线图：\n${questionList}\n\n` +
          `重要规则：\n` +
          `1. 这不是逐题点评，而是一场连续对话。你必须记住前文，不要让用户重复已经说过的信息。\n` +
          `2. 每次回复先用 1-2 句话回应用户刚才的回答，再决定：继续追问当前信号，或自然推进到下一个未充分覆盖的信号。\n` +
          `3. 一次只问一个主问题。不要一次列很多问题，不要写长篇报告。\n` +
          `4. 如果回答太抽象，优先追问真实人物、具体场景、原话、时间、动作、结果。\n` +
          `5. 当五个信号都基本覆盖后，帮用户提炼一句阶段性总结，并问他认不认同。\n` +
          `6. 语气像顶级商业教练：犀利、耐心、具体，不油腻，不空泛鼓励。\n` +
          `7. 回复要像聊天，不像报告：控制在 120-220 个汉字，不要使用 Markdown 标题、编号列表或 **粗体符号**。最后只留下一个清晰问题。`,
      },
      ...cleanMessages,
    ];

    const controller = new AbortController();
    let timeout;
    let resp;
    try {
      const { url, options } = buildProviderRequest({ providerName, provider, apiKey, model, messages: modelMessages });
      const request = fetch(url, {
        ...options,
        signal: controller.signal,
      });
      const timeoutPromise = new Promise((resolve) => {
        timeout = setTimeout(() => resolve(MODEL_TIMEOUT), MODEL_TIMEOUT_MS);
      });
      resp = await Promise.race([request, timeoutPromise]);
      if (resp === MODEL_TIMEOUT) {
        controller.abort();
        return Response.json(
          { error: `模型接口超过 ${Math.round(MODEL_TIMEOUT_MS / 1000)} 秒没有响应，请稍后重试。` },
          { status: 504 }
        );
      }
    } catch (e) {
      if (e?.name === "AbortError") {
        return Response.json(
          { error: `模型接口超过 ${Math.round(MODEL_TIMEOUT_MS / 1000)} 秒没有响应，请稍后重试。` },
          { status: 504 }
        );
      }
      throw e;
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    if (!resp.ok) {
      const text = await resp.text();
      return Response.json(
        { error: friendlyModelError(resp.status, text, providerName) },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const content = extractProviderContent(providerName, data);
    return Response.json({ provider: providerName, model, result: content });
  } catch (e) {
    return Response.json({ error: `对话服务暂时不可用：${String(e?.message || e)}` }, { status: 500 });
  }
}
