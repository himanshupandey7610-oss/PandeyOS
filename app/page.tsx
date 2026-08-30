"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startWorkforce(event: FormEvent) {
    event.preventDefault();

    if (!goal.trim()) {
      return;
    }

    setLoading(true);
    setResult("");
    setError("");

    try {
      const response = await fetch("/api/ceo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goal,
        }),
      });

      const text = await response.text();

if (!text.trim()) {
  throw new Error("CEO Agent returned an empty response.");
}

let data;

try {
  data = JSON.parse(text);
} catch {
  console.error("Invalid CEO API response:", text);
  throw new Error("CEO Agent returned an invalid response.");
}

if (!response.ok) {
  throw new Error(data?.error || "CEO Agent request failed.");
}

setResult(data?.result || "CEO Agent could not generate a plan.");
      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setResult(data.result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to contact CEO Agent."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <div className="text-xl font-bold">
          PandeyOS
        </div>

        <div className="hidden gap-8 text-sm text-gray-400 md:flex">
          <span>Workforce</span>
          <span>How it works</span>
          <span>About</span>
        </div>

        <button className="rounded-full border border-white/20 px-5 py-2 text-sm">
          Open Workspace
        </button>
      </nav>

      <section className="mx-auto max-w-5xl px-6 pb-20 pt-20 text-center">
        <div className="mb-8 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-sm text-blue-400">
          Your AI workforce is ready
        </div>

        <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
          Tell PandeyOS what you want.
        </h1>

        <h2 className="mt-4 text-4xl font-bold text-gray-500 md:text-6xl">
          Let your workforce make it happen.
        </h2>

        <p className="mx-auto mt-8 max-w-2xl text-lg text-gray-400">
          PandeyOS turns your goals into coordinated work
          across a team of specialized AI agents.
        </p>

        <form
          onSubmit={startWorkforce}
          className="mx-auto mt-12 max-w-2xl"
        >
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-3">
            <textarea
              value={goal}
              onChange={(event) =>
                setGoal(event.target.value)
              }
              placeholder="Example: Build a website for my new AI startup..."
              className="min-h-40 w-full resize-none bg-transparent p-5 text-lg text-white outline-none placeholder:text-gray-600"
            />

            <div className="flex justify-end p-2">
              <button
                type="submit"
                disabled={loading || !goal.trim()}
                className="rounded-full bg-white px-7 py-3 font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading
                  ? "CEO is planning..."
                  : "Start Workforce →"}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-left text-red-300">
            {error}
          </div>
        )}

        {result && (
          <section className="mx-auto mt-12 max-w-4xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-left">
            <div className="mb-6 text-sm uppercase tracking-[0.3em] text-blue-400">
              CEO Agent
            </div>

            <h2 className="mb-6 text-3xl font-bold">
              Mission Plan
            </h2>

            <pre className="whitespace-pre-wrap font-sans text-base leading-8 text-gray-300">
              {result}
            </pre>
          </section>
        )}
      </section>
    </main>
  );
}