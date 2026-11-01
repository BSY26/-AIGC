import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bluewave-music-player.spunky-newt-6083.chatgpt.site"),
  title: "蓝潮音乐播放器",
  description: "一款兼容 MP3、FLAC 与 LRC 滚动歌词的青蓝国风本地网页音乐播放器。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title: "蓝潮音乐播放器", description: "支持本地 MP3、FLAC 播放与 LRC 滚动歌词。", type: "website", images: [{ url: "/og.png", width: 1731, height: 909, alt: "蓝潮音乐播放器" }] },
  twitter: { card: "summary_large_image", title: "蓝潮音乐播放器", description: "支持本地 MP3、FLAC 播放与 LRC 滚动歌词。", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
