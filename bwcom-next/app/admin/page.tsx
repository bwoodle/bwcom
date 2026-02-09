'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  Box,
  Spinner,
  StatusIndicator,
} from '@cloudscape-design/components';
import PromptInput from '@cloudscape-design/components/prompt-input';
import ChatBubble from '@cloudscape-design/chat-components/chat-bubble';
import Avatar from '@cloudscape-design/chat-components/avatar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AdminPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load existing chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/chat');
        if (res.ok) {
          const data = await res.json();
          if (data.messages?.length > 0) {
            setMessages(data.messages);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setError(null);
    setInput('');
    setIsStreaming(true);

    // Add user message immediately
    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);

    // Add a placeholder for the assistant response
    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;

          try {
            const data = JSON.parse(payload);
            if (data.error) {
              setError(data.error);
              break;
            }
            if (data.token) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + data.token,
                  };
                }
                return updated;
              });
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to get a response. Please try again.');
      // Remove the empty assistant placeholder on error
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch('/api/chat', { method: 'DELETE' });
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error('Failed to reset session:', err);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
        <Container header={<Header variant="h1">Admin</Header>}>
          <Box textAlign="center" padding={{ vertical: 'xxl' }}>
            <Spinner size="large" />
            <Box variant="p" margin={{ top: 's' }}>
              Loading chat session...
            </Box>
          </Box>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
    <Container
      header={
        <Header
          variant="h1"
          actions={
            <Button
              onClick={handleReset}
              disabled={isStreaming}
              iconName="refresh"
            >
              New conversation
            </Button>
          }
        >
          Admin
        </Header>
      }
    >
      <SpaceBetween size="m">
        {/* Message list */}
        <div
          style={{
            maxHeight: '60vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.length === 0 && (
            <Box
              textAlign="center"
              color="text-body-secondary"
              padding={{ vertical: 'xxl' }}
            >
              Start a conversation with the assistant.
            </Box>
          )}

          {messages.map((msg, idx) => (
            <ChatBubble
              key={idx}
              type={msg.role === 'user' ? 'outgoing' : 'incoming'}
              ariaLabel={`${msg.role} message ${idx + 1}`}
              avatar={
                msg.role === 'user' ? (
                  <Avatar
                    ariaLabel="User"
                    tooltipText="You"
                    initials="U"
                    color="default"
                  />
                ) : (
                  <Avatar
                    ariaLabel="Assistant"
                    tooltipText="Assistant"
                    iconName="gen-ai"
                    color="gen-ai"
                  />
                )
              }
              showLoadingBar={
                isStreaming &&
                msg.role === 'assistant' &&
                idx === messages.length - 1 &&
                !msg.content
              }
            >
              {msg.role === 'assistant' ? (
                <div className="chat-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </ChatBubble>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <StatusIndicator type="error">{error}</StatusIndicator>
        )}

        {/* Input area */}
        <PromptInput
          value={input}
          onChange={({ detail }) => setInput(detail.value)}
          onAction={handleSend}
          placeholder="Type a message..."
          disabled={isStreaming}
          actionButtonIconName="send"
        />
      </SpaceBetween>
    </Container>
    </div>
  );
};

export default AdminPage;
