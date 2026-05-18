"use client";

import NonDashboardNavbar from "@/components/NonDashboardNavbar";
import Footer from "@/components/Footer";
import ChatbotBubble from "@/components/ChatbotBubble";
import { useUser } from "@clerk/nextjs";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn } = useUser();
  return (
    <div className="nondashboard-layout">
      <NonDashboardNavbar />
      <main className="nondashboard-layout__main">{children}</main>
      <Footer />
      {isSignedIn && user && (
        <ChatbotBubble
          user={{
            name: user.fullName ?? user.username ?? "",
            email: user.emailAddresses[0]?.emailAddress ?? "",
            userType: user.publicMetadata?.userType as "student" | "teacher",
          }}
        />
      )}
    </div>
  );
}
