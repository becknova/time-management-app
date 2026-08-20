"use client";

// "use client" tells Next.js this file runs in the browser, not on the
// server. We need that here because the form uses useState (React memory
// that updates the screen) and reacts to clicks/typing, which only works
// client-side.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  // useState gives us a variable that, when changed, makes React re-render
  // the page. Each field on the form gets its own piece of state.
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("medium");

  // Tracks whether we're mid-save (to disable the button) and any
  // success/error message to show the user.
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Tracks who (if anyone) is currently logged in, so we can show a
  // login link or a "log out" button in the header.
  const [user, setUser] = useState(null);

  useEffect(() => {
    const supabase = createClient();

    // Check once on load whether there's already a logged-in session.
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    // Also subscribe to future changes (login/logout in this tab),
    // so the header updates without needing a page refresh.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  async function handleSubmit(e) {
    // Forms normally reload the page on submit. preventDefault stops that
    // so we can handle the submit ourselves with JavaScript instead.
    e.preventDefault();

    setSubmitting(true);
    setMessage(null);

    const supabase = createClient();

    // Ask Supabase who is currently logged in. The insert below relies on
    // this user's id, and the database's Row Level Security policies only
    // allow a user to insert rows where user_id matches their own id.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage({ type: "error", text: "You must be logged in to add a task." });
      setSubmitting(false);
      return;
    }

    // The tasks table has two date columns: `deadline` (optional) and
    // `date` (required, used for calendar-style queries). This form only
    // collects one date, so we use it for both.
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      name,
      deadline,
      date: deadline,
      priority,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Task added!" });
      // Clear the form back to its defaults after a successful save.
      setName("");
      setDeadline("");
      setPriority("medium");
    }

    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 dark:bg-black">
      <h1 className="text-4xl font-semibold text-black dark:text-zinc-50">
        Student Scheduler
      </h1>

      <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        {user ? (
          <>
            <span>Logged in as {user.email}</span>
            <button onClick={handleLogout} className="underline">
              Log out
            </button>
          </>
        ) : (
          <Link href="/login" className="underline">
            Log in to add tasks
          </Link>
        )}
        <span aria-hidden="true">&middot;</span>
        <Link href="/calendar" className="underline">
          View calendar
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Task name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="deadline" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Deadline
          </label>
          <input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="priority" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {submitting ? "Adding..." : "Add task"}
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
