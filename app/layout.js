import "./globals.css";
import { SITE_NAME } from "../lib/config";

export const metadata = {
  title: `${SITE_NAME}｜把模糊的直觉变成清晰的答案`,
  description: "把生意想透的 4 场 AI 军师自我拷问",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
