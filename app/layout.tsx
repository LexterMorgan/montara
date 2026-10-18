import type { Metadata } from "next";
import "./globals.css";
import { AsciiCursorBackdrop } from "@/components/ui/ascii-cursor-backdrop";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider } from "@/components/auth-provider";
import { ExpenseProvider } from "@/components/expense-provider";
import { SyncControl } from "@/components/sync-control";

export const metadata: Metadata = {
  title: "MONTARA — See what changed in your money",
  description: "Local-first spending tracker. IDR only, Personal/Work split.",
  icons: {
    icon: "/montara-icon.png",
    apple: "/montara-icon.png",
  },
};

// Pre-paint theme: stored choice wins, else system preference. Keeps static export.
const themeScript = `(function(){try{var t=localStorage.getItem("montara.theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AsciiCursorBackdrop mode="page" />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AuthProvider>
        <ExpenseProvider>
        <header className="relative z-10 border-b border-[var(--border)]">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
            <a href="/" aria-label="Montara home" className="hidden shrink-0 items-center sm:flex">
              <img
                src="/montara-logo.png"
                alt=""
                width="116"
                height="39"
                className="brand-logo h-7 w-auto"
                aria-hidden="true"
              />
            </a>
            <nav aria-label="Main navigation" className="flex flex-wrap items-center justify-end gap-2 text-sm sm:gap-4">
              <a href="/overview" className="inline-flex min-h-11 items-center hover:underline sm:min-h-0">
                Overview
              </a>
              <a href="/transactions" className="inline-flex min-h-11 items-center hover:underline sm:min-h-0">
                Transactions
              </a>
              <SyncControl />
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main id="main" className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-6 sm:pb-10">
          {children}
        </main>
        </ExpenseProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
