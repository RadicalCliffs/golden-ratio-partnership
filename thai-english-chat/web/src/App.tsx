import { useEffect, useState } from "react";
import { ChatView } from "./components/ChatView";
import { JoinScreen } from "./components/JoinScreen";
import { loadSession, useChat } from "./lib/useChat";

export default function App() {
  const chat = useChat();
  const [stubMode, setStubMode] = useState(false);
  const [initial] = useState(() => loadSession());

  // Tell people up front when the server has no API key, rather than letting
  // them wonder why every message arrives with a [th->en] marker on it.
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json() as Promise<{ stub?: boolean }>)
      .then((body) => setStubMode(Boolean(body.stub)))
      .catch(() => setStubMode(false));
  }, []);

  if (chat.status === "idle" || !chat.me) {
    return <JoinScreen initial={initial} errorCode={chat.errorCode} onJoin={chat.join} />;
  }

  return (
    <ChatView
      roomId={chat.roomId}
      me={chat.me}
      other={chat.other}
      status={chat.status}
      messages={chat.messages}
      glossary={chat.glossary}
      typingMemberId={chat.typingMemberId}
      errorCode={chat.errorCode}
      stubMode={stubMode}
      onSend={chat.send}
      onTyping={chat.setTyping}
      onGlossary={chat.setGlossary}
      onLeave={chat.leave}
    />
  );
}
