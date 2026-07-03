import { DEFAULT_MODEL, MODELS } from "../../../lib/config";

// 服务端运行，密钥从环境变量读取，绝不暴露给浏览器。
// 在 netlify 后台 Environment variables 里配置：
//   WENDAO_AI_PROVIDER=deepseek | qwen | openai
//   WENDAO_AI_MODEL=xxx     (可选，不填则使用 lib/config.js 中的默认模型)
//   DEEPSEEK_API_KEY=xxx
//   DASHSCOPE_API_KEY=xxx   (通义千问，可选)
//   OPENAI_API_KEY=xxx      (可选)
//   ANTHROPIC_API_KEY=xxx   (Claude，可选)

export const runtime = "nodejs";

const MODEL_TIMEOUT_MS = 18000;
const MODEL_TIMEOUT = Symbol("MODEL_TIMEOUT");

// 不同厂商的接口地址。它们大多兼容 OpenAI 的请求格式，所以可以统一处理。
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

const DEMO_THEMES = [
  {
    test: /寻锋|独门绝活|非对称优势|天赋识别/,
    lens: "你描述的不是单纯的熟练，而是一种可能越使用越有能量的能力模式",
    questions: [
      "这件事做完以后，你的能量是增加了，还是只是因为做得好而获得成就感？",
      "过去五年里，还有哪两个不同场景也出现过同一种能力？",
      "如果别人要复制你的做法，他最难熬、最容易放弃的是哪一步？",
    ],
    action: "找三个跨时间、跨场景的真实案例，验证这是否是一项稳定出现的天赋。",
  },
  {
    test: /寻痴|心头好|内在动机|非理性痴迷/,
    lens: "回答里出现了一条值得追踪的内在驱动力，它似乎不完全依赖回报或外部认可",
    questions: [
      "当没人看见、也没有回报时，你还会怎样继续做这件事？",
      "如果未来十年都不能再碰它，你最先失去的会是什么？",
      "这份投入更像兴趣、责任，还是已经成为了你认同自己的一部分？",
    ],
    action: "记录下一次你进入忘记时间状态的瞬间，写下触发它的具体动作。",
  },
  {
    test: /至暗|核心情感|成长教练/,
    lens: "你正在触碰一段既保护过你、也可能影响今天选择的人生经验",
    questions: [
      "当时的你为了让自己安全，悄悄形成了哪条处世原则？",
      "这种做法曾经怎样帮助你，又在哪些新场景里开始限制你？",
      "如果不急着解决它，你最希望别人先理解你的哪一种感受？",
    ],
    action: "先把感受与判断分开写下来；如果话题带来持续痛苦，请优先照顾自己并寻求专业支持。",
  },
  {
    test: /寻心|读懂.*用户|用户研究|同理心地图/,
    lens: "这段回答正在把一个抽象的“用户”还原成处在真实情境中的具体的人",
    questions: [
      "这个人最近一次真正被问题刺痛，是在什么时间、什么地点、发生了什么？",
      "他嘴上说想要的，和夜深人静时真正害怕的，是同一件事吗？",
      "哪一个可观察的行为能够证明这不是我们的主观猜测？",
    ],
    action: "把答案改写成一个带时间、地点、人物和动作的纪录片镜头。",
  },
  {
    test: /Jobs-to-be-Done|价值分析|真实客户/,
    lens: "你给出的线索正在指向客户真正“雇佣”产品去完成的任务，而不只是产品功能",
    questions: [
      "客户决定行动前的最后一个触发事件是什么？",
      "他购买的究竟是结果、确定性、速度，还是避免某种损失？",
      "如果没有你的方案，他当时最可能继续用什么方式凑合？",
    ],
    action: "用“当……时，他想要……，以便……”把用户任务压缩成一句话。",
  },
  {
    test: /寻魂|印钞点|贵问题|价值聚焦|最贵的问题/,
    lens: "这里已经出现了一个可能值得聚焦的高价值问题，但还需要与其他需求拉开优先级",
    questions: [
      "这个问题如果继续不解决，用户在钱、时间或关系上会付出什么明确代价？",
      "用户愿意立刻付钱解决的，是表面症状还是背后的那个更贵的问题？",
      "如果只能保留一个承诺，哪一句最能让目标用户说“这就是我”？",
    ],
    action: "列出三个候选问题，只按“不解决的代价”排序，强迫自己选出第一名。",
  },
  {
    test: /精益创业|实验设计|验证方案/,
    lens: "你正在提出一个可验证的商业假设，关键是把感觉变成能够被证伪的实验",
    questions: [
      "出现什么结果时，你会诚实地承认这个假设不成立？",
      "能否把验证周期再砍掉一半，同时保留最关键的证据？",
      "你现在选择的指标，衡量的是真实行为还是礼貌性的口头反馈？",
    ],
    action: "写清一个成功阈值、一个失败阈值和一个七天内能完成的最小动作。",
  },
  {
    test: /商业模式诊断|获客|交付|盈利/,
    lens: "回答暴露了商业链路中的一个关键节点，需要判断它是局部症状还是整条链的瓶颈",
    questions: [
      "这个节点如果改善一倍，会最先带动收入、毛利还是交付效率？",
      "问题主要来自获客、交付还是盈利，它们之间的因果顺序是什么？",
      "如果创始人离开六十天，哪一步会最先停止运转？",
    ],
    action: "画出获客、交付、盈利三条链，只标一个最卡住现金或产能的节点。",
  },
  {
    test: /壁垒|战略控制点|护城河/,
    lens: "你指出的优势只有在客户感知得到、对手复制困难时，才可能真正成为壁垒",
    questions: [
      "这个优势给客户带来了什么可量化的价值，又让对手付出什么复制成本？",
      "如果竞争对手明天投入十倍资源，哪一部分依然买不到、抄不走？",
      "你给出的判断，有客户行为、续费、溢价或成本数据可以佐证吗？",
    ],
    action: "给这项优势补上一个客户证据和一个竞争对手复制成本，再重新评分。",
  },
];

const DEFAULT_DEMO_THEME = {
  lens: "你的回答里已经出现了一个值得继续澄清的判断，它可能影响接下来的战略选择",
  questions: [
    "哪一个真实发生过的瞬间，最能证明这个判断不是事后的解释？",
    "这里面哪些是事实，哪些是你的感受，还有哪些只是暂时的推测？",
    "如果必须删掉所有形容词，你会留下哪三个可观察的事实？",
  ],
  action: "补充一个具体人物、一个关键动作和一个可验证的结果。",
};

function hashText(text) {
  return Array.from(text).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function clip(text, length) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
}

function buildDemoInsight({ systemPrompt = "", question = "", answer = "" }) {
  const source = `${systemPrompt}\n${question}`;
  const theme = DEMO_THEMES.find((item) => item.test.test(source)) || DEFAULT_DEMO_THEME;
  const sentences = answer
    .split(/[。！？!?；;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const anchor = sentences.sort((a, b) => b.length - a.length)[0] || answer.trim();
  const seed = hashText(`${question}${answer}`);
  const followup = theme.questions[seed % theme.questions.length];
  const hasNumber = /\d|[一二三四五六七八九十百千万两]+\s*(个|次|年|月|天|周|点|人|元|万|%)/.test(answer);
  const hasScene = /当时|那次|最近|有一天|凌晨|早上|晚上|客户|朋友|团队|公司/.test(answer);
  const specificity = hasNumber && hasScene
    ? "你给出了时间或数量，也出现了具体人物/场景，回答已经具备可验证的抓手。"
    : hasNumber || hasScene
      ? "回答里已经有一处具体线索；如果再补上时间、人物、动作或结果中的另一项，判断会更扎实。"
      : answer.trim().length >= 90
        ? "你已经展开了想法，但目前更多是观点。试着补一个真实发生过的场景，区分事实与解释。"
        : "现在更像一个方向性的判断。它需要一个具体案例来确认，而不是靠更长的解释。";
  const focus = question.includes("如果")
    ? "这是一道反事实问题，最有价值的不是预测得准，而是看清你真正害怕失去或最想守住的东西。"
    : /为什么|原因/.test(question)
      ? "这道题需要的是因果链：发生了什么 → 你如何判断 → 最终带来什么结果。"
      : /谁|用户|客户|人/.test(question)
        ? "请尽量锁定一个真实的人，而不是用“大多数人”替代观察。"
        : "可以继续追问：这个结论是被哪一个事实触发的？";

  return `我听到的核心\n\n你在回答「${clip(question, 34)}」时，最有分量的一句是：“${clip(anchor, 76)}”\n\n${theme.lens}。\n\n回答里的证据\n\n${specificity}${focus}\n\n值得继续追问\n\n${followup}\n\n下一步建议\n\n${theme.action}`;
}

function getConfiguredModel() {
  const providerName = (process.env.WENDAO_AI_PROVIDER || DEFAULT_MODEL).trim().toLowerCase();
  const modelCfg = MODELS.find((m) => m.value === providerName) || MODELS.find((m) => m.value === DEFAULT_MODEL) || MODELS[0];
  const provider = PROVIDERS[modelCfg.value];

  return {
    providerName: modelCfg.value,
    provider,
    model: process.env.WENDAO_AI_MODEL?.trim() || modelCfg.model,
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

function buildProviderRequest({ providerName, provider, apiKey, model, systemPrompt, question, answer }) {
  if (providerName === "claude") {
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
          max_tokens: 900,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `【题目】${question}\n\n【学员回答】${answer}\n\n请按要求点评。`,
            },
          ],
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
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `【题目】${question}\n\n【学员回答】${answer}\n\n请按要求点评。`,
          },
        ],
        temperature: 0.7,
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

export async function POST(req) {
  try {
    const { systemPrompt, question, answer } = await req.json();

    if (!answer || !answer.trim()) {
      return Response.json({ error: "回答不能为空" }, { status: 400 });
    }

    const { providerName, provider, model } = getConfiguredModel();
    const apiKey = process.env[provider.keyEnv];

    if (!apiKey) {
      return Response.json({
        demo: true,
        provider: providerName,
        model,
        result: buildDemoInsight({ systemPrompt, question, answer }),
      });
    }

    const controller = new AbortController();
    let timeout;
    let resp;
    try {
      const { url, options } = buildProviderRequest({ providerName, provider, apiKey, model, systemPrompt, question, answer });
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
    return Response.json({ error: `分析服务暂时不可用：${String(e?.message || e)}` }, { status: 500 });
  }
}
