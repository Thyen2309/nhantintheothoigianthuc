import { useAuth } from "./context/AuthContext";
import AuthScreen from "./components/AuthScreen";
import ChatScreen from "./components/ChatScreen";

function App() {
  const { user } = useAuth();

  return user ? <ChatScreen /> : <AuthScreen />;
}

export default App;
