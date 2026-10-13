import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <div className="py-6 md:py-12">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
