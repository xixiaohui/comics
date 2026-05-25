"use client";

import { useState, useRef } from "react";

export default function ComicPage() {
  const [routeModel, setRouteModel] = useState("hunyuan-v3");
  const [subModel, setSubModel] = useState("hy3-preview");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful assistant."
  );
  const [userMessage, setUserMessage] = useState("");
  const [stream, setStream] = useState(true);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userMessage.trim()) return;

    setResponse("");
    setError("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `/api/hunyuan/${routeModel}/ai-generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: subModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            stream,
          }),
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${err}`);
      }

      if (stream) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6);
            if (json === "[DONE]") break;
            try {
              const parsed = JSON.parse(json);
              if (parsed.error) {
                setError(parsed.error.message);
                break;
              }
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                setResponse((prev) => prev + content);
              }
            } catch {
              // skip unparseable chunks
            }
          }
        }
      } else {
        const data = await res.json();
        if (data.error) {
          setError(data.error.message);
        } else {
          setResponse(data.choices?.[0]?.message?.content ?? JSON.stringify(data));
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.name !== "AbortError") {
        setError(error.message);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-orange-500">
        Hunyuan AI Generate Test
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-sm text-gray-400">Route Model</span>
            <input
              type="text"
              value={routeModel}
              onChange={(e) => setRouteModel(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="hunyuan-exp"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm text-gray-400">Sub Model</span>
            <select
              value={subModel}
              onChange={(e) => setSubModel(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="hy3-preview">hy3-preview</option>
              <option value="hunyuan-2.0-instruct-20251111">
                hunyuan-2.0-instruct-20251111
              </option>
            </select>
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm text-gray-400">System Prompt</span>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-gray-400">User Message</span>
          <textarea
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y"
            placeholder="Enter your message..."
          />
        </label>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={stream}
              onChange={(e) => setStream(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm text-gray-300">Stream response</span>
          </label>

          <div className="flex gap-3">
            {!loading ? (
              <button
                type="submit"
                disabled={!userMessage.trim()}
                className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                Send
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStop}
                className="px-6 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 p-4">
          <p className="text-red-400 text-sm font-medium mb-1">Error</p>
          <pre className="text-red-300 text-sm whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {(response || loading) && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="text-sm text-gray-400 font-medium mb-2">
            Response {loading && <span className="text-orange-500">...</span>}
          </p>
          <pre className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
            {response || " "}
          </pre>
        </div>
      )}
    </div>
  );
}
