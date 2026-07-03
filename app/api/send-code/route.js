import { createLoginCode, isValidChinaMobile } from "../../../lib/runtimeStore";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { phone } = await req.json();

    if (!isValidChinaMobile(phone)) {
      return Response.json({ error: "请输入有效的中国大陆手机号" }, { status: 400 });
    }

    const code = await createLoginCode(phone);
    const isDev = process.env.NODE_ENV !== "production" || process.env.WENDAO_MOCK_SMS === "true";

    // 本地开发直接返回验证码，方便预览；生产环境应接入阿里云/腾讯云短信并且不要返回 code。
    return Response.json({
      ok: true,
      mock: isDev,
      code: isDev ? code : undefined,
      message: isDev ? "开发模式：验证码已生成" : "验证码已发送",
    });
  } catch (e) {
    return Response.json({ error: `发送验证码失败：${String(e?.message || e)}` }, { status: 500 });
  }
}
