import type { Metadata, Viewport } from "next";
import "./app.css";

export const metadata: Metadata = {
  title: "G&G Manpower & Professional Services | Staffing & Dispatch",
  description:
    "Industrial manpower staffing, applicant screening, and SMS workforce dispatch for Tanauan City, Batangas, and CALABARZON.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#141C2B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Public+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-[#1E4E68] selection:text-white">
        {children}
      </body>
    </html>
  );
}
