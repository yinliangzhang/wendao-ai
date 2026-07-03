export const runtime = "nodejs";

export async function GET() {
  const headers = new Headers();
  headers.append("Set-Cookie", "wd_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  headers.append("Location", "/");
  return new Response(null, { status: 302, headers });
}

export async function POST() {
  const headers = new Headers();
  headers.append("Set-Cookie", "wd_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
