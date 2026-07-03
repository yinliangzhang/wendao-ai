import { MODULES } from "../../../../data/modules";
import { isAdminAuthorized, listUsers, updateUser } from "../../../../lib/runtimeStore";

export const runtime = "nodejs";

export async function GET(req) {
  if (!isAdminAuthorized(req)) {
    return Response.json({ error: "无权访问后台" }, { status: 401 });
  }

  return Response.json({
    modules: MODULES.map((m) => ({ id: m.id, title: m.title, desc: m.desc })),
    users: await listUsers(),
  });
}

export async function POST(req) {
  if (!isAdminAuthorized(req)) {
    return Response.json({ error: "无权访问后台" }, { status: 401 });
  }

  const { phone, patch } = await req.json();
  const result = await updateUser(phone, patch || {});
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, user: result.user, users: await listUsers() });
}
