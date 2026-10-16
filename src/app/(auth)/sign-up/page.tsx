import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Create a clerk account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-[1.9rem] font-bold leading-tight">Create a clerk account</h1>
      <p className="mb-7 mt-2 text-muted">
        New accounts work the counter. A supervisor account is set up by an administrator.
      </p>
      <Suspense>
        <AuthForm kind="sign-up" />
      </Suspense>
    </>
  );
}
