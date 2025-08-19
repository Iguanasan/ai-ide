import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";
type ChatMessage = { id: string; role: Role; content: string; ts: number };

type FriendConfig = {
  model: string;
  baseUrl: string;
  temperature: number;
  top_p: number;
  num_ctx: number;
  num_predict: number;
  repeat_penalty: number;
  systemPrompt: string;
  stream: boolean;
  seed: number | null;
};

type Friend = {
  id: string;
  name: string;
  handle: string;
  color: string;
  initials: string;
  config: FriendConfig;
  history: ChatMessage[];
};

const VERSION = "2.0-sms";
const STORAGE_KEY = `localchat:${VERSION}`;
const DEFAULT_BASE_URL = "http://127.0.0.1:11434";

const DEFAULT_FRIENDS: Friend[] = [
  mkFriend("gemma270m", "Gemma3 270M", "gemma3:270m-it-qat", "#2563eb"),
  mkFriend("gemma4b", "Gemma3 4B", "gemma3:4b-it-qat", "#9333ea", { num_ctx: 8192 }),
  mkFriend("deepseek1p5b", "DeepSeek R1 1.5B", "deepseek-r1:1.5b", "#0d9488"),
  mkFriend("qwen4b", "Qwen3 4B", "qwen3:4b", "#ea580c", { num_ctx: 8192 }),
  mkFriend("llama3", "Llama3 8B", "llama3:latest", "#16a34a", { top_p: 0.95, num_ctx: 8192 }),
];

function mkFriend(
  id: string,
  name: string,
  handle: string,
  color: string,
  overrides?: Partial<FriendConfig>
): Friend {
  const initials = name
    .split(" ")
    .map((s) => s[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id,
    name,
    handle,
    color,
    initials,
    config: {
      model: handle,
      baseUrl: DEFAULT_BASE_URL,
      temperature: 0.7,
      top_p: 0.9,
      num_ctx: 4096,
      num_predict: 512,
      repeat_penalty: 1.1,
      systemPrompt: "",
      stream: false,
      seed: null,
      ...overrides,
    },
    history: [],
  };
}

function loadState(): { currentId: string; friends: Friend[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { currentId: DEFAULT_FRIENDS[0].id, friends: DEFAULT_FRIENDS };
    const parsed = JSON.parse(raw);
    if (!parsed.friends?.length) parsed.friends = DEFAULT_FRIENDS;
    if (!parsed.currentId) parsed.currentId = parsed.friends[0].id;
    return parsed;
  } catch {
    return { currentId: DEFAULT_FRIENDS[0].id, friends: DEFAULT_FRIENDS };
  }
}

function saveState(s: any) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

async function chatOnce(opts: {
  baseUrl: string;
  model: string;
  messages: { role: string; content: string }[];
  options: Partial<FriendConfig>;
  signal?: AbortSignal;
}): Promise<string> {
  const res = await fetch(`${opts.baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      options: {
        temperature: opts.options.temperature,
        top_p: opts.options.top_p,
        num_ctx: opts.options.num_ctx,
        num_predict: opts.options.num_predict,
        repeat_penalty: opts.options.repeat_penalty,
        seed: opts.options.seed ?? null,
      },
      stream: false,
    }),
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data?.message?.content ?? "";
}

async function* chatStream(opts: {
  baseUrl: string;
  model: string;
  messages: { role: string; content: string }[];
  options: Partial<FriendConfig>;
  signal?: AbortSignal;
}) {
  const res = await fetch(`${opts.baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      options: {
        temperature: opts.options.temperature,
        top_p: opts.options.top_p,
        num_ctx: opts.options.num_ctx,
        num_predict: opts.options.num_predict,
        repeat_penalty: opts.options.repeat_penalty,
        seed: opts.options.seed ?? null,
      },
      stream: true,
    }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        const chunk = obj?.message?.content;
        if (typeof chunk === "string" && chunk) yield chunk;
      } catch {}
    }
  }
}

function prettyTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const bubbleBase =
  "max-w-[80%] rounded-[16px] px-[var(--space-md)] py-[var(--space-sm)] text-[14px] leading-relaxed whitespace-pre-wrap break-words shadow";
const bubbleUser =
  bubbleBase +
  " bg-[var(--primary-color)] text-white rounded-br-[4px] after:content-[''] after:absolute after:bottom-0 after:right-[-6px] after:border-[8px] after:border-transparent after:border-l-[var(--primary-color)]";
const bubbleBot =
  bubbleBase +
  " bg-[var(--neutral-gray)] text-[var(--text-primary)] rounded-bl-[4px] after:content-[''] after:absolute after:bottom-0 after:left-[-6px] after:border-[8px] after:border-transparent after:border-r-[var(--neutral-gray)]";

const LocalChat = () => {
  const [state, setState] = useState(loadState());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showConfig, setShowConfig] = useState<null | { mode: "add" | "edit"; id?: string }>(null);
  const [showAddressBook, setShowAddressBook] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => saveState(state), [state]);

  const friend = useMemo(
    () => state.friends.find((f: Friend) => f.id === state.currentId) ?? state.friends[0],
    [state]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [friend?.history.length, busy]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  function selectFriend(id: string) {
    if (state.currentId === id) return;
    if (abortRef.current) abortRef.current.abort();
    setState({ ...state, currentId: id });
  }

  function append(id: string, m: ChatMessage) {
    setState((s: any) => ({
      ...s,
      friends: s.friends.map((f: Friend) => (f.id === id ? { ...f, history: [...f.history, m] } : f)),
    }));
  }

  function replaceLastAssistant(id: string, content: string) {
    setState((s: any) => ({
      ...s,
      friends: s.friends.map((f: Friend) => {
        if (f.id !== id) return f;
        for (let i = f.history.length - 1; i >= 0; i--) {
          if (f.history[i].role === "assistant") {
            const copy = f.history.slice();
            copy[i] = { ...copy[i], content };
            return { ...f, history: copy };
          }
        }
        return f;
      }),
    }));
  }

  function clearHistory(id: string) {
    setState((s: any) => ({
      ...s,
      friends: s.friends.map((f: Friend) => (f.id === id ? { ...f, history: [] } : f)),
    }));
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const currentFriendId = state.currentId;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() };
    append(currentFriendId, userMsg);
    setInput("");

    const sys = friend.config.systemPrompt?.trim() ? [{ role: "system", content: friend.config.systemPrompt }] : [];
    const past = friend.history.map((m) => ({ role: m.role, content: m.content }));
    const messages = [...sys, ...past, { role: "user", content: text }];

    const abort = new AbortController();
    abortRef.current = abort;
    setBusy(true);

    try {
      if (friend.config.stream) {
        append(currentFriendId, { id: crypto.randomUUID(), role: "assistant", content: "", ts: Date.now() });
        let acc = "";
        for await (const chunk of chatStream({
          baseUrl: friend.config.baseUrl,
          model: friend.config.model,
          messages,
          options: friend.config,
          signal: abort.signal,
        })) {
          acc += chunk;
          replaceLastAssistant(currentFriendId, acc);
        }
      } else {
        const reply = await chatOnce({
          baseUrl: friend.config.baseUrl,
          model: friend.config.model,
          messages,
          options: friend.config,
          signal: abort.signal,
        });
        append(currentFriendId, { id: crypto.randomUUID(), role: "assistant", content: reply, ts: Date.now() });
      }
    } catch (err: any) {
      append(currentFriendId, {
        id: crypto.randomUUID(),
        role: "system",
        content: `Error: ${err?.message || String(err)}`,
        ts: Date.now(),
      });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function addFriend() {
    setShowConfig({ mode: "add" });
  }

  function editFriend(id: string) {
    setShowConfig({ mode: "edit", id });
  }

  function deleteFriend(id: string) {
    setState((s: any) => {
      const next = s.friends.filter((f: Friend) => f.id !== id);
      const newCurrent = next.length ? next[0].id : "";
      return { ...s, friends: next, currentId: newCurrent };
    });
  }

  function handleSaveFriend(payload: Partial<Friend> & { config: FriendConfig }, mode: "add" | "edit") {
    if (mode === "add") {
      const id = payload.id || crypto.randomUUID();
      const name = payload.name || "New Person";
      const initials =
        payload.initials ||
        name
          .split(" ")
          .map((s: any) => s[0] || "")
          .join("")
          .slice(0, 2)
          .toUpperCase();

      const item: Friend = {
        id,
        name,
        handle: payload.handle || payload.config.model,
        color: payload.color || "#64748b",
        initials,
        config: payload.config,
        history: [],
      };
      setState((s: any) => ({ ...s, friends: [...s.friends, item], currentId: id }));
    } else {
      setState((s: any) => ({
        ...s,
        friends: s.friends.map((f: Friend) =>
          f.id === payload.id
            ? {
                ...f,
                name: payload.name || f.name,
                handle: payload.handle || f.handle,
                color: payload.color || f.color,
                initials:
                  payload.initials ||
                  (payload.name || f.name)
                    .split(" ")
                    .map((s) => s[0] || "")
                    .join("")
                    .slice(0, 2)
                    .toUpperCase(),
                config: payload.config,
              }
            : f
        ),
      }));
    }
    setShowConfig(null);
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ backgroundColor: "var(--workspace-bg)", color: "var(--text-primary)", fontFamily: "var(--font-family)" }}
    >
      <div
        className="flex items-center justify-between border-b px-[var(--space-lg)] py-[var(--space-md)]"
        style={{ backgroundColor: "var(--neutral-gray)", borderColor: "var(--border-gray)" }}
      >
        <div className="flex items-center gap-[var(--space-md)] overflow-hidden cursor-pointer" onClick={() => setShowAddressBook(true)}>
          <div
            className="h-[32px] w-[32px] rounded-full flex items-center justify-center text-white font-semibold shrink-0"
            style={{ backgroundColor: friend.color }}
          >
            {friend.initials}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold">{friend.name}</div>
            <div className="truncate text-[12px]" style={{ color: "var(--text-secondary)" }}>
              {friend.handle}
            </div>
          </div>
          <svg className="w-[16px] h-[16px] ml-[var(--space-xs)]" style={{ color: "var(--text-secondary)" }} viewBox="0 0 24 24">
            <path fill="currentColor" d="M7 10l5 5 5-5" />
          </svg>
        </div>
        <button className="btn btn-secondary" onClick={() => clearHistory(state.currentId)}>
          Clear Conversation
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-[var(--space-lg)]">
        <div className="flex flex-col gap-[var(--space-md)]">
          {friend.history.length === 0 && friend.config.systemPrompt?.trim() ? (
            <div
              className="self-center rounded-full border px-[var(--space-md)] py-[var(--space-sm)] text-[12px]"
              style={{ borderColor: "var(--border-gray)", backgroundColor: "var(--neutral-gray)", color: "var(--text-secondary)" }}
            >
              {friend.config.systemPrompt}
            </div>
          ) : null}

          {friend.history.map((m) => {
            const isUser = m.role === "user";
            const clsWrap = isUser ? "items-end" : "items-start";
            const clsBubble = isUser ? bubbleUser : m.role === "system" ? "text-[12px] text-[var(--text-secondary)]" : bubbleBot;
            return (
              <div key={m.id} className={cls("relative flex flex-col", clsWrap)}>
                <div className={cls("relative", isUser || m.role === "assistant" ? "" : "")}>
                  {m.role === "system" ? (
                    <div className="rounded-[16px] bg-[var(--neutral-gray)] px-[var(--space-md)] py-[var(--space-sm)] border" style={{ borderColor: "var(--border-gray)", color: "var(--text-primary)" }}>
                      {m.content}
                    </div>
                  ) : (
                    <div className={clsBubble}>{m.content}</div>
                  )}
                </div>
                <div className="mt-[var(--space-xs)] px-[var(--space-xs)] text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  {prettyTime(m.ts)}
                </div>
              </div>
            );
          })}

          {busy && (
            <div className="flex items-start">
              <div className={cls(bubbleBot, "animate-pulse")}>
                <span className="inline-block animate-typing">...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-[var(--space-md)]" style={{ borderColor: "var(--border-gray)" }}>
        <div className="flex items-end gap-[var(--space-sm)]">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Message ${friend.name}…`}
            className="min-h-[32px] flex-1 resize-none rounded-[4px] border p-[var(--space-md)] outline-none focus:outline-[2px] focus:outline-[var(--primary-color)]"
            style={{ backgroundColor: "var(--workspace-bg)", borderColor: "var(--border-gray)", color: "var(--text-primary)" }}
          />
          <button
            onClick={send}
            className="btn disabled:opacity-50"
            disabled={busy || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>

      {showAddressBook && (
        <AddressBookModal
          friends={state.friends}
          currentId={state.currentId}
          onClose={() => setShowAddressBook(false)}
          onSelectFriend={(id) => { selectFriend(id); setShowAddressBook(false); }}
          onAddFriend={addFriend}
          onEditFriend={editFriend}
          onDeleteFriend={deleteFriend}
        />
      )}

      {showConfig && (
        <FriendConfigModal
          mode={showConfig.mode}
          friend={state.friends.find(f => f.id === showConfig.id) || null}
          onClose={() => setShowConfig(null)}
          onDelete={showConfig.mode === "edit" ? () => deleteFriend(showConfig.id || "") : undefined}
          onSave={(payload) => handleSaveFriend(payload, showConfig.mode)}
        />
      )}
    </div>
  );
};

function AddressBookModal({
  friends,
  currentId,
  onClose,
  onSelectFriend,
  onAddFriend,
  onEditFriend,
  onDeleteFriend,
}: {
  friends: Friend[];
  currentId: string;
  onClose: () => void;
  onSelectFriend: (id: string) => void;
  onAddFriend: () => void;
  onEditFriend: (id: string) => void;
  onDeleteFriend: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-[var(--space-lg)]">
      <div className="w-full max-w-lg overflow-hidden rounded-[4px] shadow-2xl" style={{ backgroundColor: "var(--workspace-bg)" }}>
        <div className="panel-header flex items-center justify-between border-b px-[var(--space-xl)] py-[var(--space-lg)]" style={{ borderColor: "var(--border-gray)" }}>
          <h2 className="text-[16px] font-semibold">Address Book</h2>
          <button className="btn btn-secondary" onClick={onAddFriend}>Add</button>
        </div>
        <div className="p-[var(--space-lg)] max-h-[60vh] overflow-y-auto">
          {friends.map((f: Friend) => (
            <div
              key={f.id}
              className={cls(
                "flex items-center gap-[var(--space-md)] p-[var(--space-sm)] rounded-[4px] cursor-pointer",
                currentId === f.id && "bg-[var(--hover-blue)]"
              )}
              onClick={() => onSelectFriend(f.id)}
            >
              <div
                className="h-[32px] w-[32px] rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                style={{ backgroundColor: f.color }}
              >
                {f.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{f.name}</div>
                <div className="truncate text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  {f.handle}
                </div>
              </div>
              <div className="flex gap-[var(--space-xs)]" onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-secondary btn-small tooltip" data-tooltip="Edit" onClick={() => onEditFriend(f.id)}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button className="btn btn-small tooltip" data-tooltip="Delete" style={{ backgroundColor: "var(--error-red)" }} onClick={() => onDeleteFriend(f.id)}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end border-t px-[var(--space-xl)] py-[var(--space-lg)]" style={{ borderColor: "var(--border-gray)" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function FriendConfigModal({
  mode,
  friend,
  onClose,
  onSave,
  onDelete,
}: {
  mode: "add" | "edit";
  friend: Friend | null;
  onClose: () => void;
  onSave: (payload: Partial<Friend> & { config: FriendConfig }) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(friend?.name || "");
  const [handle, setHandle] = useState(friend?.handle || friend?.config.model || "");
  const [color, setColor] = useState(friend?.color || "#64748b");
  const [model, setModel] = useState(friend?.config.model || "");
  const [baseUrl, setBaseUrl] = useState(friend?.config.baseUrl || DEFAULT_BASE_URL);
  const [temperature, setTemperature] = useState(friend?.config.temperature ?? 0.7);
  const [top_p, setTopP] = useState(friend?.config.top_p ?? 0.9);
  const [num_ctx, setNumCtx] = useState(friend?.config.num_ctx ?? 4096);
  const [num_predict, setNumPredict] = useState(friend?.config.num_predict ?? 512);
  const [repeat_penalty, setRepeatPenalty] = useState(friend?.config.repeat_penalty ?? 1.1);
  const [systemPrompt, setSystemPrompt] = useState(friend?.config.systemPrompt ?? "");
  const [stream, setStream] = useState(friend?.config.stream ?? false);
  const [seed, setSeed] = useState<number | "">(friend?.config.seed ?? "");

  function submit() {
    const payload: Partial<Friend> & { config: FriendConfig } = {
      id: friend?.id,
      name: name || (model ? model : "New Person"),
      handle: handle || model,
      color,
      config: {
        model: model || handle || "",
        baseUrl,
        temperature: Number(temperature),
        top_p: Number(top_p),
        num_ctx: Number(num_ctx),
        num_predict: Number(num_predict),
        repeat_penalty: Number(repeat_penalty),
        systemPrompt,
        stream: Boolean(stream),
        seed: seed === "" ? null : Number(seed),
      },
    };
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-[var(--space-lg)]">
      <div className="w-full max-w-2xl overflow-hidden rounded-[4px] shadow-2xl" style={{ backgroundColor: "var(--workspace-bg)" }}>
        <div className="flex items-center justify-between border-b px-[var(--space-xl)] py-[var(--space-lg)]" style={{ borderColor: "var(--border-gray)" }}>
          <h2 className="text-[16px] font-semibold">
            {mode === "add" ? "Add Contact / Model" : `Edit “${friend?.name}”`}
          </h2>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="grid gap-[var(--space-md)] p-[var(--space-xl)]" style={{ backgroundColor: "var(--neutral-gray)" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-md)]">
            <label className="grid gap-[var(--space-xs)] p-[var(--space-md)] rounded-[4px] border" style={{ backgroundColor: "var(--workspace-bg)", borderColor: "var(--border-gray)" }}>
              <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>Display Name</span>
              <input
                className="rounded-[4px] border p-[var(--space-sm)] focus:outline-[2px] focus:outline-[var(--primary-color)]"
                style={{ borderColor: "var(--border-gray)", backgroundColor: "var(--workspace-bg)", color: "var(--text-primary)" }}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="grid gap-[var(--space-xs)] p-[var(--space-md)] rounded-[4px] border" style={{ backgroundColor: "var(--workspace-bg)", borderColor: "var(--border-gray)" }}>
              <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>Avatar Color</span>
              <input type="color" className="h-[32px] w-full rounded-[4px] border p-[var(--space-xs)]" style={{ borderColor: "var(--border-gray)" }} value={color} onChange={(e) => setColor(e.target.value)} />
            </label>
            <label className="grid gap-[var(--space-xs)] p-[var(--space-md)] rounded-[4px] border" style={{ backgroundColor: "var(--workspace-bg)", borderColor: "var(--border-gray)" }}>
              <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>Handle (alias)</span>
              <input
                className="rounded-[4px] border p-[var(--space-sm)] focus:outline-[2px] focus:outline-[var(--primary-color)]"
                style={{ borderColor: "var(--border-gray)", backgroundColor: "var(--workspace-bg)", color: "var(--text-primary)" }}
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-md)]">
            <label className="grid gap-[var(--space-xs)] p-[var(--space-md)] rounded-[4px] border" style={{ backgroundColor: "var(--workspace-bg)", borderColor: "var(--border-gray)" }}>
              <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>Model Identifier</span>
              <input
                className="rounded-[4px] border p-[var(--space-sm)] focus:outline-[2px] focus:outline-[var(--primary-color)]"
                style={{ borderColor: "var(--border-gray)", backgroundColor: "var(--workspace-bg)", color: "var(--text-primary)" }}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </label>
            <label className="grid gap-[var(--space-xs)] p-[var(--space-md)] rounded-[4px] border" style={{ backgroundColor: "var(--workspace-bg)", borderColor: "var(--border-gray)" }}>
              <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>Base URL (Ollama)</span>
              <input
                className="rounded-[4px] border p-[var(--space-sm)] focus:outline-[2px] focus:outline-[var(--primary-color)]"
                style={{ borderColor: "var(--border-gray)", backgroundColor: "var(--workspace-bg)", color: "var(--text-primary)" }}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--space-md)]">
            <FieldNumber label="Temperature" value={temperature} step={0.05} onChange={setTemperature} />
            <FieldNumber label="Top-p" value={top_p} step={0.05} onChange={setTopP} />
            <FieldNumber label="Context (tokens)" value={num_ctx} onChange={setNumCtx} />
            <FieldNumber label="Max Output" value={num_predict} onChange={setNumPredict} />
            <FieldNumber label="Repeat Penalty" value={repeat_penalty} step={0.01} onChange={setRepeatPenalty} />
            <label className="col-span-2 grid gap-[var(--space-xs)] p-[var(--space-md)] rounded-[4px] border" style={{ backgroundColor: "var(--workspace-bg)", borderColor: "var(--border-gray)" }}>
              <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>System Prompt</span>
              <textarea
                className="min-h-[80px] rounded-[4px] border p-[var(--space-sm)] focus:outline-[2px] focus:outline-[var(--primary-color)]"
                style={{ borderColor: "var(--border-gray)", backgroundColor: "var(--workspace-bg)", color: "var(--text-primary)" }}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </label>
            <label className="grid gap-[var(--space-xs)] p-[var(--space-md)] rounded-[4px] border" style={{ backgroundColor: "var(--workspace-bg)", borderColor: "var(--border-gray)" }}>
              <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>Stream Responses</span>
              <div className="flex items-center gap-[var(--space-sm)]">
                <input type="checkbox" checked={stream} onChange={(e) => setStream(e.target.checked)} />
                <span className="text-[12px]">Enable</span>
              </div>
            </label>
            <label className="grid gap-[var(--space-xs)] p-[var(--space-md)] rounded-[4px] border" style={{ backgroundColor: "var(--workspace-bg)", borderColor: "var(--border-gray)" }}>
              <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>Seed (blank = random)</span>
              <input
                type="number"
                className="rounded-[4px] border p-[var(--space-sm)] focus:outline-[2px] focus:outline-[var(--primary-color)]"
                style={{ borderColor: "var(--border-gray)", backgroundColor: "var(--workspace-bg)", color: "var(--text-primary)" }}
                value={seed}
                onChange={(e) => setSeed(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        <div className="flex justify-between gap-[var(--space-sm)] border-t px-[var(--space-xl)] py-[var(--space-lg)]" style={{ borderColor: "var(--border-gray)" }}>
          <div>
            {onDelete && (
              <button className="btn" style={{ backgroundColor: "var(--error-red)" }} onClick={onDelete}>
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-[var(--space-sm)]">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn" onClick={submit}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="grid gap-[var(--space-xs)] p-[var(--space-md)] rounded-[4px] border" style={{ backgroundColor: "var(--workspace-bg)", borderColor: "var(--border-gray)" }}>
      <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <input
        type="number"
        step={step ?? 1}
        className="rounded-[4px] border p-[var(--space-sm)] focus:outline-[2px] focus:outline-[var(--primary-color)]"
        style={{ borderColor: "var(--border-gray)", backgroundColor: "var(--workspace-bg)", color: "var(--text-primary)" }}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

const style = document.createElement("style");
style.innerHTML = `
@keyframes typing { 0%{opacity:.3} 50%{opacity:1} 100%{opacity:.3} }
.animate-typing { animation: typing 1.4s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
.animate-pulse { animation: pulse 2s cubic-bezier(.4,0,.6,1) infinite; }
`;
document.head.appendChild(style);

export default LocalChat;