import { Suspense } from "react";
import { LoginCard } from "./login-card";

export default function LoginPage() {
  return (
    <div className="starfield min-h-screen flex items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
