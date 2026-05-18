"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSendChatMessageMutation } from "@/state/api";

// ============================================================
// TYPES
// ============================================================
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatUser {
  name: string;
  email: string;
  userType?: "student" | "teacher";
  enrolledCourses?: string[];
}

interface CourseContext {
  title: string;
  currentChapter: string;
  currentLesson: string;
  progress: number;
}

interface ChatbotBubbleProps {
  user?: ChatUser | null;
  courseContext?: CourseContext | null;
}

// ============================================================
// HOOK: lịch sử chat persist qua localStorage
// ============================================================
const STORAGE_KEY = "lms_chat_history";

function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved) as ChatMessage[]);
    } catch (_) {}
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, msg].slice(-50);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { messages, addMessage, clearHistory };
}

// ============================================================
// COMPONENT
// ============================================================
const SUGGESTIONS = [
  "Làm sao để xem khóa học đã mua?",
  "Tiến độ học được tính như thế nào?",
  "Làm sao để mua khóa học?",
];

export default function ChatbotBubble({
  user = null,
  courseContext = null,
}: ChatbotBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, addMessage, clearHistory } = useChatHistory();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // RTK Query mutation — isLoading, error toast tự động qua customBaseQuery
  const [sendChatMessage, { isLoading }] = useSendChatMessageMutation();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    addMessage(userMsg);
    setInput("");

    try {
      // customBaseQuery tự unwrap result.data.data nên reply là { role, content } trực tiếp
      const reply = await sendChatMessage({
        messages: [...messages, userMsg],
        user,
        courseContext,
      }).unwrap();

      addMessage(reply);
    } catch (_) {
      // Toast error đã được customBaseQuery xử lý tự động
    }
  }, [
    input,
    isLoading,
    messages,
    user,
    courseContext,
    sendChatMessage,
    addMessage,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <style>{styles}</style>

      {/* BUBBLE BUTTON */}
      <button
        className="chat-bubble-btn"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Mở trợ lý học tập"
      >
        {isOpen ? (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {!isOpen && messages.length > 0 && (
          <span className="chat-bubble-badge" />
        )}
      </button>

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="chat-window" role="dialog" aria-label="Trợ lý học tập">
          {/* HEADER */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">AI</div>
              <div>
                <div className="chat-title">Trợ lý học tập</div>
                <div className="chat-status">
                  <span className="chat-status-dot" />
                  Luôn sẵn sàng hỗ trợ
                </div>
              </div>
            </div>
            <button
              className="chat-clear-btn"
              onClick={clearHistory}
              title="Xóa lịch sử chat"
              aria-label="Xóa lịch sử chat"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>

          {/* MESSAGES */}
          <div className="chat-messages" role="log" aria-live="polite">
            {messages.length === 0 && (
              <div className="chat-empty">
                <div className="chat-empty-icon">💬</div>
                <p>
                  Xin chào{user ? ` ${user.name}` : ""}! Mình có thể giúp gì cho
                  bạn?
                </p>
                <div className="chat-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      className="chat-suggestion-chip"
                      onClick={() => {
                        setInput(s);
                        inputRef.current?.focus();
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="chat-msg-avatar" aria-hidden>
                    AI
                  </div>
                )}
                <div className="chat-msg-bubble">
                  {msg.content.split("\n").map((line, j, arr) => (
                    <span key={j}>
                      {line}
                      {j < arr.length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {isLoading && (
              <div
                className="chat-msg chat-msg--assistant"
                aria-label="Đang trả lời..."
              >
                <div className="chat-msg-avatar" aria-hidden>
                  AI
                </div>
                <div className="chat-msg-bubble chat-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="chat-input-area">
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi... (Enter để gửi)"
              rows={1}
              disabled={isLoading}
              aria-label="Nhập câu hỏi"
            />
            <button
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              aria-label="Gửi tin nhắn"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = `
  .chat-bubble-btn {
    position: fixed;
    bottom: 28px;
    right: 28px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2563eb, #4f46e5);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(79,70,229,0.45);
    transition: transform 0.2s, box-shadow 0.2s;
    z-index: 9999;
  }
  .chat-bubble-btn:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 28px rgba(79,70,229,0.55);
  }
  .chat-bubble-badge {
    position: absolute;
    top: 6px; right: 6px;
    width: 10px; height: 10px;
    background: #22c55e;
    border-radius: 50%;
    border: 2px solid white;
  }

  .chat-window {
    position: fixed;
    bottom: 96px;
    right: 28px;
    width: 370px;
    height: 540px;
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 8px 48px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    z-index: 9998;
    overflow: hidden;
    animation: chatSlideUp 0.25s cubic-bezier(.4,0,.2,1);
  }
  @keyframes chatSlideUp {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .chat-header {
    background: linear-gradient(135deg, #2563eb, #4f46e5);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: white;
  }
  .chat-header-info { display: flex; align-items: center; gap: 10px; }
  .chat-avatar {
    width: 38px; height: 38px;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; letter-spacing: 0.5px;
  }
  .chat-title { font-weight: 700; font-size: 14px; }
  .chat-status { font-size: 11px; opacity: 0.85; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
  .chat-status-dot {
    width: 6px; height: 6px;
    background: #4ade80; border-radius: 50%;
    display: inline-block;
  }
  .chat-clear-btn {
    background: rgba(255,255,255,0.15);
    border: none; color: white; cursor: pointer;
    padding: 6px; border-radius: 8px;
    display: flex; align-items: center;
    transition: background 0.2s;
  }
  .chat-clear-btn:hover { background: rgba(255,255,255,0.25); }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #f8faff;
  }
  .chat-messages::-webkit-scrollbar { width: 4px; }
  .chat-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

  .chat-empty {
    display: flex; flex-direction: column;
    align-items: center; text-align: center;
    margin-top: 24px; gap: 8px;
    color: #64748b; font-size: 13px;
  }
  .chat-empty-icon { font-size: 36px; margin-bottom: 4px; }
  .chat-suggestions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 8px; }
  .chat-suggestion-chip {
    background: white; border: 1px solid #e2e8f0;
    border-radius: 99px; padding: 5px 12px;
    font-size: 12px; cursor: pointer; color: #4f46e5;
    transition: all 0.15s;
  }
  .chat-suggestion-chip:hover { background: #ede9fe; border-color: #c4b5fd; }

  .chat-msg { display: flex; align-items: flex-end; gap: 8px; }
  .chat-msg--user { flex-direction: row-reverse; }
  .chat-msg-avatar {
    width: 28px; height: 28px; flex-shrink: 0;
    background: linear-gradient(135deg, #2563eb, #4f46e5);
    color: white; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 700;
  }
  .chat-msg-bubble {
    max-width: 78%;
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 13.5px;
    line-height: 1.55;
  }
  .chat-msg--user .chat-msg-bubble {
    background: linear-gradient(135deg, #2563eb, #4f46e5);
    color: white;
    border-bottom-right-radius: 4px;
  }
  .chat-msg--assistant .chat-msg-bubble {
    background: white;
    color: #1e293b;
    border-bottom-left-radius: 4px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  }

  .chat-typing {
    display: flex; gap: 4px; align-items: center;
    padding: 12px 16px;
  }
  .chat-typing span {
    width: 7px; height: 7px;
    background: #94a3b8; border-radius: 50%;
    animation: chatBounce 1.2s infinite;
  }
  .chat-typing span:nth-child(2) { animation-delay: 0.2s; }
  .chat-typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes chatBounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-6px); }
  }

  .chat-input-area {
    padding: 12px;
    border-top: 1px solid #e2e8f0;
    display: flex; align-items: flex-end; gap: 8px;
    background: white;
  }
  .chat-input {
    flex: 1; border: 1.5px solid #e2e8f0;
    border-radius: 12px; padding: 9px 13px;
    font-size: 13.5px; resize: none;
    outline: none; font-family: inherit;
    line-height: 1.5; max-height: 100px;
    transition: border-color 0.2s;
    background: #f8faff;
  }
  .chat-input:focus { border-color: #6366f1; background: white; }
  .chat-send-btn {
    width: 40px; height: 40px; flex-shrink: 0;
    background: linear-gradient(135deg, #2563eb, #4f46e5);
    color: white; border: none; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s;
  }
  .chat-send-btn:hover:not(:disabled) { transform: scale(1.07); box-shadow: 0 4px 14px rgba(79,70,229,0.4); }
  .chat-send-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  @media (max-width: 430px) {
    .chat-window {
      width: calc(100vw - 24px);
      right: 12px; bottom: 84px;
      height: 70vh;
    }
    .chat-bubble-btn { bottom: 20px; right: 16px; }
  }
`;
