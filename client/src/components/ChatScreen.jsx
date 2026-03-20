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

const formatSidebarTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

function ChatScreen() {
  const { user, logout } = useAuth();
  const {
    users,
    selectedUser,
    setSelectedUser,
    messages,
    onlineUsers,
    selectedUserTyping,
    deleteConversation,
    deleteMessage,
    sendMessage,
    startTyping,
    stopTyping,
  } = useChat();
  const [draft, setDraft] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [deletingConversation, setDeletingConversation] = useState(false);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, selectedUserTyping]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping();
  }, [stopTyping]);

  const activeText = useMemo(() => {
    if (!selectedUser) {
      return "Chọn một người để bắt đầu trò chuyện";
    }

    if (onlineUsers.includes(selectedUser.name)) {
      return "Đang online";
    }

    const lastMessage = [...messages].reverse().find((message) => message.sender === selectedUser.name);
    if (!lastMessage) {
      return "Chưa có cuộc trò chuyện";
    }

    return `Hoạt động lúc ${formatMessageTime(lastMessage.timestamp)}`;
  }, [messages, onlineUsers, selectedUser]);

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
    if (!draft.trim() || !selectedUser) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setDeleteError("");
    sendMessage(draft);
    stopTyping();
    setDraft("");
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend(event);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      setDeleteError("");
      setDeletingId(messageId);
      await deleteMessage(messageId);
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeletingId("");
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedUser) {
      return;
    }

    try {
      setDeleteError("");
      setDeletingConversation(true);
      await deleteConversation();
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeletingConversation(false);
    }
  };

  return (
    <main className="chat-shell">
      <section className="chat-card private-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <p className="brand-mark small">ChattApp</p>
            <p className="sidebar-user">Bạn là {user.name}</p>
          </div>

          <div className="user-list">
            {users.length === 0 ? <p className="empty-note">Chưa có người dùng khác đăng nhập.</p> : null}

            {users.map((item) => {
              const isActive = selectedUser?.name === item.name;
              const isOnline = onlineUsers.includes(item.name);
              const preview = isOnline ? "Đang hoạt động" : "Nhắn riêng với người này";
              const lastMessage = [...messages].reverse().find(
                (message) => message.sender === item.name || message.recipient === item.name
              );

              return (
                <button
                  key={item._id || item.name}
                  type="button"
                  className={isActive ? "user-item active" : "user-item"}
                  onClick={() => setSelectedUser(item)}
                >
                  <div className="user-avatar">{item.name.slice(0, 1).toUpperCase()}</div>
                  <div className="user-meta">
                    <div className="user-topline">
                      <span className="user-name">{item.name}</span>
                      <span className="user-time">{lastMessage ? formatSidebarTime(lastMessage.timestamp) : ""}</span>
                    </div>
                    <div className="user-subline">
                      <span className={isOnline ? "online-dot visible" : "online-dot"}></span>
                      <span>{preview}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="conversation-panel">
          <header className="chat-header conversation-header">
            <div>
              <p className="conversation-title">{selectedUser ? selectedUser.name : "Chưa chọn người nhận"}</p>
              <p className="presence-line">{activeText}</p>
            </div>
            <div className="header-actions">
              <button
                className="danger-button"
                onClick={handleDeleteConversation}
                type="button"
                disabled={!selectedUser || deletingConversation}
              >
                {deletingConversation ? "Đang xóa đoạn chat..." : "Xóa đoạn chat"}
              </button>
              <button className="logout-button" onClick={logout} type="button">
                Đăng xuất
              </button>
            </div>
          </header>

          <div className="chat-list" ref={listRef}>
            {!selectedUser ? <p className="empty-note centered">Hãy chọn một người ở bên trái để bắt đầu nhắn riêng.</p> : null}

            {selectedUser &&
              messages.map((message) => {
                const isOwn = message.sender === user.name;
                return (
                  <article
                    key={message._id || `${message.sender}-${message.timestamp}`}
                    className={isOwn ? "message-row own" : "message-row other"}
                  >
                    <div className={isOwn ? "bubble own" : "bubble other"}>
                      <div className="bubble-topline">
                        <p className="bubble-sender">{isOwn ? "Bạn" : message.sender}</p>
                        <div className="bubble-actions">
                          <span className="bubble-time">{formatMessageTime(message.timestamp)}</span>
                          {isOwn ? (
                            <button
                              type="button"
                              className="delete-message-button"
                              onClick={() => handleDeleteMessage(message._id)}
                              disabled={deletingId === message._id}
                            >
                              {deletingId === message._id ? "Đang xóa..." : "Xóa"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <p className="bubble-text">{message.text}</p>
                    </div>
                  </article>
                );
              })}

            {selectedUser && selectedUserTyping ? (
              <div className="message-row other typing-row">
                <div className="typing-bubble">
                  <div className="bubble-topline">
                    <p className="bubble-sender">{selectedUser.name}</p>
                    <span className="bubble-time">đang nhập</span>
                  </div>
                  <div className="typing-indicator" aria-label={`${selectedUser.name} đang nhập...`}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {deleteError ? <p className="error-text">{deleteError}</p> : null}

          <form className="composer" onSubmit={handleSend}>
            <textarea
              value={draft}
              onChange={handleDraftChange}
              onKeyDown={handleComposerKeyDown}
              onBlur={stopTyping}
              placeholder={selectedUser ? `Nhắn riêng cho ${selectedUser.name}...` : "Chọn người nhận trước..."}
              rows={3}
              disabled={!selectedUser}
            />
            <button type="submit" disabled={!selectedUser}>
              Gửi
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

export default ChatScreen;