"use client";

// Client component again, for the same reason as the homepage: this page
// needs useState and event handlers, which only run in the browser.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // "mode" toggles the same form between signing in to an existing account
  // and creating a new one, since a fresh Supabase project has no users yet.
  const [mode, setMode] = useState("sign-in");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const { error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setSubmitting(false);
      return;
    }

    if (mode === "sign-up") {
      // Depending on your Supabase project's auth settings, sign-up may
      // require confirming an email before a session exists yet.
      setMessage({
        type: "success",
        text: "Account created. Check your email to confirm, then sign in.",
      });
      setSubmitting(false);
      return;
    }

    // Signed in successfully. router.push sends us to the homepage, and
    // router.refresh() makes Next.js re-check things like the logged-in
    // state rather than showing a stale cached view.
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 dark:bg-black">
      <h1 className="text-4xl font-semibold text-black dark:text-zinc-50">
        {mode === "sign-in" ? "Log in" : "Sign up"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {submitting ? "Please wait..." : mode === "sign-in" ? "Log in" : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setMessage(null);
          }}
          className="text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          {mode === "sign-in"
            ? "Need an account? Sign up"
            : "Already have an account? Log in"}
        </button>

        {message && (
          <p
            className={
              message.type === "error"
                ? "text-sm text-red-600"
                : "text-sm text-green-600"
            }
          >
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
}
