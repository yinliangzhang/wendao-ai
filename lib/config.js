// 站点配置——改这里就能改名字、改默认模型
export const SITE_NAME = "问道 AI";
export const SITE_SUBTITLE = "AI 军师自我拷问";

// 后台可用模型列表。value 用于 API 路由识别，label 仅用于后台说明。
// 前台用户不选择模型；站长通过 .env.local / 服务器环境变量里的 WENDAO_AI_PROVIDER 控制。
export const MODELS = [
  { value: "deepseek", label: "DeepSeek", model: "deepseek-v4-flash" },
  { value: "qwen", label: "通义千问", model: "qwen-plus" },
  { value: "openai", label: "OpenAI", model: "gpt-4o-mini" },
  { value: "claude", label: "Claude", model: "claude-sonnet-4-5" },
];

export const DEFAULT_MODEL = "deepseek";
