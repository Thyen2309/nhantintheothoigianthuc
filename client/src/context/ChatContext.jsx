import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);
const ROOM_NAME = "general";

export function ChatProvider({ children }) {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !user) {
      setMessages([]);
      setTypingUsers([]);
      setOnlineUsers([]);
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const fetchMessages = async () => {
      const response = await fetch("/api/messages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    };

    fetchMessages();

    const socket = io("/", {
      auth: { token },
    });

    socketRef.current = socket;
    socket.emit("join_room", ROOM_NAME);

    socket.on("receive_message", (message) => {
      setMessages((current) => [...current, message]);
    });

    socket.on("typing_users", (names) => {
      setTypingUsers(names.filter((name) => name !== user.name));
    });

    socket.on("online_users", (names) => {
      setOnlineUsers(names.filter((name) => name !== user.name));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  const sendMessage = (text) => {
    socketRef.current?.emit("send_message", { room: ROOM_NAME, text });
  };

  const startTyping = () => {
    socketRef.current?.emit("typing_start", { room: ROOM_NAME });
  };

  const stopTyping = () => {
    socketRef.current?.emit("typing_stop", { room: ROOM_NAME });
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        typingUsers,
        onlineUsers,
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
