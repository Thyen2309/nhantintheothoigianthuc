import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const formatMessageTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatActiveText = (timestamp, typingUsers, onlineUsers) => {
  if (onlineUsers.length > 0) {
    return "Dang online";
  }

  if (typingUsers.length > 0) {
    return "Dang online";
  }

  if (!timestamp) {
    return "Chua co hoat dong";
  }

  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return "Online vua xong";
  }

  if (diffMinutes < 60) {
    return `Active ${diffMinutes} phut truoc`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Active ${diffHours} gio truoc`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Active ${diffDays} ngay truoc`;
};

function ChatScreen() {
  const { user, logout } = useAuth();
  const { messages, typingUsers, onlineUsers, sendMessage, startTyping, stopTyping } = useChat();
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typingUsers]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping();
  }, [stopTyping]);

  const lastOtherActivity = useMemo(() => {
    const otherMessages = messages.filter((message) => message.sender !== user.name);
    return otherMessages.length > 0 ? otherMessages[otherMessages.length - 1].timestamp : null;
  }, [messages, user.name]);

  const activeText = formatActiveText(lastOtherActivity, typingUsers, onlineUsers);

  const handleDraftChange = (event) => {
    const nextValue = event.target.value;
    setDraft(nextValue);

    if (!nextValue.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping();
      return;
    }

    startTyping();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3200);
  };

  const handleSend = (event) => {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendMessage(draft);
    stopTyping();
    setDraft("");
  };

  const typingText =
    typingUsers.length === 1
      ? `${typingUsers[0]} dang nhap...`
      : typingUsers.length > 1
        ? `${typingUsers.join(", ")} dang nhap...`
        : "";

  return (
    <main className="chat-shell">
      <section className="chat-card">
        <header className="chat-header">
          <div>
            <p className="brand-mark">ChattApp</p>
            <p className="status-line">Logged in as {user.name}</p>
            <p className="presence-line">{activeText}</p>
          </div>
          <button className="logout-button" onClick={logout} type="button">
            Logout
          </button>
        </header>

        <div className="chat-list" ref={listRef}>
          {messages.map((message) => {
            const isOwn = message.sender === user.name;
            return (
              <article
                key={message._id || `${message.sender}-${message.timestamp}`}
                className={isOwn ? "message-row own" : "message-row other"}
              >
                <div className={isOwn ? "bubble own" : "bubble other"}>
                  <div className="bubble-topline">
                    <p className="bubble-sender">{isOwn ? "Ban" : message.sender}</p>
                    <span className="bubble-time">{formatMessageTime(message.timestamp)}</span>
                  </div>
                  <p className="bubble-text">{message.text}</p>
                </div>
              </article>
            );
          })}

          {typingText ? (
            <div className="message-row other typing-row">
              <div className="typing-bubble">
                <div className="bubble-topline">
                  <p className="bubble-sender">{typingUsers[0]}</p>
                  <span className="bubble-time">dang nhap</span>
                </div>
                <div className="typing-indicator" aria-label={typingText}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <form className="composer" onSubmit={handleSend}>
          <textarea
            value={draft}
            onChange={handleDraftChange}
            onBlur={stopTyping}
            placeholder="Type a message..."
            rows={3}
          />
          <button type="submit">Send</button>
        </form>
      </section>
    </main>
  );
}

export default ChatScreen;
