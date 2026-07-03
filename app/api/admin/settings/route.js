import { MODELS } from "../../../../lib/config";
import { MODULES } from "../../../../data/modules";
import { isAdminAuthorized, readAdminSettings, writeAdminSettings } from "../../../../lib/runtimeStore";

export const runtime = "nodejs";

export async function GET(req) {
  if (!isAdminAuthorized(req)) {
    return Response.json({ error: "后台密码不正确" }, { status: 401 });
  }
  const settings = await readAdminSettings();
  return Response.json({
    ok: true,
    models: MODELS,
    modules: MODULES.map((m) => ({ id: m.id, title: m.title, desc: m.desc })),
    features: [{ id: "strategy_map", title: "战略地图生成", desc: "后续用于把对话结果整理成战略地图" }],
    settings,
  });
}

export async function POST(req) {
  if (!isAdminAuthorized(req)) {
    return Response.json({ error: "后台密码不正确" }, { status: 401 });
  }
  const body = await req.json();
  const settings = await writeAdminSettings(body.settings || body);
  return Response.json({ ok: true, settings });
}
