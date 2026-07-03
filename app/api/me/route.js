import { getUserAccess } from "../../../lib/runtimeStore";

export const runtime = "nodejs";

export async function GET(req) {
  const authId = decodeURIComponent(req.cookies.get("wd_auth")?.value || "");
  if (!authId) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  const access = await getUserAccess(authId);
  if (!access.ok) {
    return Response.json({ ok: false, error: access.error }, { status: 403 });
  }

  return Response.json({
    ok: true,
    user: {
      id: access.user?.phone || authId,
      phone: access.user?.phone || authId,
      status: access.user?.status || "active",
      moduleAccess: access.user?.moduleAccess || null,
    },
  });
}
