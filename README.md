# 问道 AI — 商业实战陪练平台

一个最小可用的网站：手机号验证码注册/登录 → 模块广场 → 对话式访谈 → 后台按模块调用大模型。
技术栈：Next.js（前后端一体）。部署：GitHub + Netlify / 云服务器均可。用户前台不选择模型，由后台管理页统一配置。

---

## 一、本地先跑起来（可选，想直接上线可跳到第二步）

需要先装 Node.js（18 以上）。然后：

```bash
npm install
cp .env.example .env.local   # 然后编辑 .env.local，填 API Key 和后台密码
npm run dev
```

打开 http://localhost:3000，用手机号 + 验证码登录/注册。

本地开发默认 `WENDAO_MOCK_SMS=true`，点击“获取验证码”后页面会直接显示验证码，方便测试。正式上线时要接短信服务，不能把验证码返回给前端。

### 本地接入真实 AI API

打开 `.env.local`，按你想用的模型填写对应 API Key。四大模块具体用哪个模型，推荐在后台 `/admin` 配置。

#### 方案 A：DeepSeek（推荐先用）

```bash
DEEPSEEK_API_KEY=你的_DeepSeek_Key
```

#### 方案 B：通义千问 / Qwen

```bash
DASHSCOPE_API_KEY=你的_阿里云百炼_Key
```

#### 方案 C：OpenAI

```bash
OPENAI_API_KEY=你的_OpenAI_Key
```

#### 方案 D：Claude / Anthropic

```bash
ANTHROPIC_API_KEY=你的_Anthropic_Key
```

改完 `.env.local` 后，需要停止并重新启动本地服务：

```bash
npm run dev
```

如果某个模型没有填 API Key，系统会自动返回本地 Demo 洞察，方便你先看流程；填了 Key 后，才会真正调用对应模型。

### 后台管理

打开 http://localhost:3000/admin。

- 默认本地后台密码：`admin123`
- 上线前请在 `.env.local` 或服务器环境变量里修改 `WENDAO_ADMIN_PASSWORD`
- 后台可以给四大模块分别选择 DeepSeek / Qwen / OpenAI / Claude
- 预留了“生成战略地图”功能位，默认建议 Claude
- API Key 不会显示在后台，只从服务器环境变量读取

---

## 二、上线到 Netlify（推荐路径）

1. 把这个文件夹推到一个 GitHub 仓库。
2. 登录 netlify.com → Add new site → Import from GitHub → 选你的仓库。
3. 构建设置一般会自动识别；若没有，Build command 填 `npm run build`。
4. 部署前/后，在 **Site settings → Environment variables** 添加密钥：
   - `WENDAO_ADMIN_PASSWORD` = 你的后台强密码
   - `WENDAO_MOCK_SMS` = `false`
   - `DEEPSEEK_API_KEY` = 你的 DeepSeek 密钥
   - （可选）`DASHSCOPE_API_KEY`、`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`
   - 如果暂时不接短信服务，可先保留 `WENDAO_MOCK_SMS=true` 做内测，但不要公开给陌生用户。
5. 触发一次重新部署，完成。

> DeepSeek 密钥在 platform.deepseek.com 注册后创建，需充值少量额度。

---

## 三、日常你会改的几个地方

- **改网站名字 / 副标题**：`lib/config.js`
- **手机号验证码登录**：`app/api/send-code/route.js` 和 `app/api/login/route.js`
- **本地注册/后台数据**：`data/.runtime`（已被 `.gitignore` 忽略；正式上线建议换数据库）
- **后台切换 AI**：浏览器打开 `/admin`
- **加 / 改模块和题目**：`data/modules.js`。已按“AI 军师卡包”整理为 4 个模块。每个字段含义：
  - `intro` 引导说明（采访者须知/开场白），显示在模块顶部
  - `duration` 时长提示
  - `defaultAnalysisPrompt` 模块默认的 AI 点评要求（产品核心，重点打磨）
  - 每题 `prompt` 主问题、`followups` 追问、`scoring` 自评参考（仅壁垒模块用）
  - 某题想用专属点评逻辑，就给该题单独加 `analysisPrompt`，会覆盖模块默认值
- **加可选模型**：`lib/config.js` 的 MODELS 列表 + `app/api/chat/route.js` 的 PROVIDERS

---

## 四、给 Codex 的后续升级清单（按需）

当前版本为求最快上线做了简化，下面是常见的下一步，可让 Codex 逐项实现：

1. **接真实短信服务**：阿里云短信 / 腾讯云短信 / Twilio 等，替换 `app/api/send-code/route.js` 里的本地 mock。
2. **换数据库**：当前注册用户、验证码、后台配置存在本地 JSON；正式部署建议换 Supabase / 阿里云 RDS / MongoDB。
3. **登录态保护**：加 middleware 校验 `wd_auth` cookie，未登录跳回首页。
4. **保存用户访谈记录**：把每次对话保存到数据库，后续才能生成战略地图。
5. **生成战略地图模块**：读取四大模块对话摘要，调用 Claude 输出结构化战略地图。
6. **流式输出**：让 AI 回复像打字一样逐字出现，体验更好。

---

## 安全须知（重要）

- 大模型密钥只放在服务器环境变量里，**永远不要**写进前端代码或提交到 GitHub。
- `.env.local`、`data/.runtime` 已在 `.gitignore` 中忽略，不要手动上传。
- 正式上线前务必修改 `WENDAO_ADMIN_PASSWORD`，并关闭或替换 `WENDAO_MOCK_SMS`。
