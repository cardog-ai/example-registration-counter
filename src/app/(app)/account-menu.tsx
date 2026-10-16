"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function AccountMenu({ name, role }: { name: string; role: "clerk" | "supervisor" }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-4 text-[0.9rem]">
      <span className="hidden flex-col items-end leading-tight text-band-text sm:flex">
        <span className="font-bold">{name}</span>
        <span className="text-[0.78rem] text-band-muted">{role === "supervisor" ? "Supervisor" : "Counter clerk"}</span>
      </span>
      <button
        type="button"
        className="h-10 rounded-[6px] border-2 border-band-muted px-3 font-bold text-band-text hover:border-band-text"
        onClick={async () => {
          await signOut();
          router.push("/sign-in");
          router.refresh();
        }}
      >
        Sign out
      </button>
    </div>
  );
}
