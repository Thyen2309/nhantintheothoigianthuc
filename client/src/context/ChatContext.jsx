import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);
  const selectedUserRef = useRef(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    if (!token || !user) {
      setUsers([]);
      setSelectedUser(null);
      setMessages([]);
      setTypingUsers({});
      setOnlineUsers([]);
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const loadUsers = async () => {
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setUsers(data);
      setSelectedUser((current) => {
        if (current && data.some((item) => item.name === current.name)) {
          return current;
        }
        return data[0] || null;
      });
    };

    loadUsers();

    const socket = io("/", {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("receive_message", (message) => {
      const currentSelectedUser = selectedUserRef.current;
      const isForCurrentConversation =
        currentSelectedUser &&
        ((message.sender === user.name && message.recipient === currentSelectedUser.name) ||
          (message.sender === currentSelectedUser.name && message.recipient === user.name));

      if (!isForCurrentConversation) {
        return;
      }

      setMessages((current) => [...current, message]);
    });

    socket.on("typing_status", ({ from, isTyping }) => {
      setTypingUsers((current) => ({
        ...current,
        [from]: isTyping,
      }));
    });

    socket.on("online_users", (names) => {
      setOnlineUsers(names.filter((name) => name !== user.name));
      loadUsers();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  useEffect(() => {
    if (!token || !selectedUser) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      const response = await fetch(`/api/messages/${encodeURIComponent(selectedUser.name)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setMessages([]);
        return;
      }

      const data = await response.json();
      setMessages(data);
    };

    loadMessages();
  }, [token, selectedUser]);

  const selectedUserName = selectedUser?.name || null;

  const sendMessage = (text) => {
    if (!selectedUserName) {
      return;
    }

    socketRef.current?.emit("send_message", {
      recipient: selectedUserName,
      text,
    });
  };

  const startTyping = () => {
    if (!selectedUserName) {
      return;
    }

    socketRef.current?.emit("typing_start", {
      recipient: selectedUserName,
    });
  };

  const stopTyping = () => {
    if (!selectedUserName) {
      return;
    }

    socketRef.current?.emit("typing_stop", {
      recipient: selectedUserName,
    });
  };

  const selectedUserTyping = useMemo(
    () => (selectedUserName ? Boolean(typingUsers[selectedUserName]) : false),
    [selectedUserName, typingUsers]
  );

  return (
    <ChatContext.Provider
      value={{
        users,
        selectedUser,
        setSelectedUser,
        messages,
        onlineUsers,
        selectedUserTyping,
        sendMessage,
        startTyping,
        stopTyping,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}