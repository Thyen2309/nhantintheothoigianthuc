import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

function ChatScreen() {
  const { user, logout } = useAuth();
  const { messages, sendMessage } = useChat();
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = (event) => {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }

    sendMessage(draft);
    setDraft("");
  };

  return (
    <main className="chat-shell">
      <section className="chat-card">
        <header className="chat-header">
          <div>
            <p className="brand-mark">ChattApp</p>
            <p className="status-line">Logged in as {user.name}</p>
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
                className={isOwn ? "bubble own" : "bubble"}
              >
                <p className="bubble-sender">{message.sender}</p>
                <p className="bubble-text">{message.text}</p>
              </article>
            );
          })}
        </div>

        <form className="composer" onSubmit={handleSend}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
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
