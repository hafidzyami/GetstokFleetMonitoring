import "./globals.css";

import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";

export const metadata = {
  title: "GetStok Fleet Monitoring",
  description: "Getstok Fleet Monitoring Service",
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


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      </head>
      <body
        className="h-screen w-full"
      >
        <AuthProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
