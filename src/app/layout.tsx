import type {Metadata} from "next";
import {Geist, Geist_Mono, JetBrains_Mono} from "next/font/google";
import "./globals.css";
import {cn} from "@/lib/utils";
import {ThemeScript} from "@/components/theme/theme-script";
import {SystemI18nProvider} from "@/components/i18n/i18n-provider";

const jetbrainsMono = JetBrains_Mono({subsets: ['latin'], variable: '--font-mono'});

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Create Next App",
    description: "Video call application",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-mono", jetbrainsMono.variable)}
        >
        <body className="min-h-full flex flex-col">
        <ThemeScript/>
        <SystemI18nProvider>{children}</SystemI18nProvider>
        </body>
        </html>
    );
}
