import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);
const ROOM_NAME = "general";

export function ChatProvider({ children }) {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !user) {
      setMessages([]);
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  const sendMessage = (text) => {
    socketRef.current?.emit("send_message", { room: ROOM_NAME, text });
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
