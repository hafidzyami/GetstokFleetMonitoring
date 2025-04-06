import "./globals.css";

export const metadata = {
  title: "GetStok",
  description: "Driver Application called GetStok",
  manifest: "/manifest_and_icons/manifest.json",
  icons: {
    icon: ["/favicon_io/favicon.ico"],
    shortcut: ["/apple-touch-icon.png"],
    apple: ["/apple-touch-icon.png"],
  },
  applicationName: "GetStok",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GetStok",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="h-screen w-full">
        {children}
      </body>
    </html>
  );
}
