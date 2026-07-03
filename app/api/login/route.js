import { checkUser } from "../../../lib/users";
import { isValidChinaMobile, verifyLoginCode } from "../../../lib/runtimeStore";

export const runtime = "nodejs";

export async function POST(req) {
  const { username, password, phone, code } = await req.json();

  let authId = "";
  if (phone || code) {
    if (!isValidChinaMobile(phone)) {
      return Response.json({ ok: false, error: "请输入有效的手机号" }, { status: 400 });
    }
    const verified = await verifyLoginCode(phone, code);
    if (!verified.ok) {
      return Response.json({ ok: false, error: verified.error }, { status: 401 });
    }
    authId = verified.phone;
  } else if (checkUser(username, password)) {
    authId = username;
  }

  if (authId) {
    // 简单登录态：设一个 httpOnly cookie。
    // 几十人规模够用；要更安全可让 Codex 换成 JWT 或 next-auth。
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `wd_auth=${encodeURIComponent(authId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
    );
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers,
    });
  }

  return Response.json({ ok: false, error: "验证码或账号信息错误" }, { status: 401 });
}
