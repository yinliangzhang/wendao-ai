// 预分配账号清单。几十人规模直接写这里，无需数据库。
// 要批量生成，可让 Codex 帮你写个脚本。改密码就改这里，重新部署即可生效。
//
// 安全提示：这个文件只在服务端（API 路由）被引用，不会打包进前端，
// 用户在浏览器里看不到密码。务必不要在任何 "use client" 组件里 import 它。

export const USERS = [
  { username: "student01", password: "force-8821" },
  { username: "student02", password: "force-3490" },
  { username: "student03", password: "force-7156" },
  { username: "demo", password: "demo" },
];

export function checkUser(username, password) {
  return USERS.some((u) => u.username === username && u.password === password);
}
