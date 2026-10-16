import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <h1 className="text-[1.9rem] font-bold leading-tight">Sign in to the counter</h1>
      <p className="mb-7 mt-2 text-muted">Use the account your supervisor set up for you.</p>
      <Suspense>
        <AuthForm kind="sign-in" />
      </Suspense>
    </>
  );
}
