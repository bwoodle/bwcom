import { HumanMessage } from '@langchain/core/messages';
import { agent } from './agent';

/**
 * SSE event payload types sent to the client.
 *
 *   { token: string }                          — streamed LLM text chunk
 *   { toolCall: { name, args, result } }       — completed tool invocation
 *   { error: string }                          — server-side error
 *   [DONE]                                     — stream finished
 */

interface ChatStreamOptions {
  /** The raw user message string. */
  userMessage: string;
  /** LangGraph thread config (must include configurable.thread_id). */
  config: { configurable: { thread_id: string } };
}

/**
 * Build an SSE ReadableStream that streams the agent's response token-by-token
 * and emits tool-call summaries when the agent invokes tools.
 */
export function createChatStream({ userMessage, config }: ChatStreamOptions): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const eventStream = agent.streamEvents(
          { messages: [new HumanMessage(userMessage)] },
          { ...config, version: 'v2' }
        );

        // Track in-flight tool calls so we can pair start → end
        const pendingTools = new Map<string, { name: string; args: unknown }>();

        for await (const event of eventStream) {
          // --- Streamed LLM text tokens ---
          if (event.event === 'on_chat_model_stream') {
            const chunk = event.data?.chunk;
            if (chunk?.content) {
              const text =
                typeof chunk.content === 'string'
                  ? chunk.content
                  : Array.isArray(chunk.content)
                    ? chunk.content
                        .filter(
                          (c: { type: string; text?: string }) =>
                            c.type === 'text'
                        )
                        .map((c: { text: string }) => c.text)
                        .join('')
                    : '';
              if (text) {
                send(JSON.stringify({ token: text }));
              }
            }
          }

          // --- Tool invocation started ---
          if (event.event === 'on_tool_start') {
            const runId = event.run_id;
            const name = event.name ?? 'unknown_tool';
            let args = event.data?.input ?? {};
            // input may arrive as a JSON string — parse it if so
            if (typeof args === 'string') {
              try {
                args = JSON.parse(args);
              } catch {
                args = { raw: args };
              }
            }
            pendingTools.set(runId, { name, args });
          }

          // --- Tool invocation finished ---
          if (event.event === 'on_tool_end') {
            const runId = event.run_id;
            const pending = pendingTools.get(runId);
            pendingTools.delete(runId);

            const name = pending?.name ?? event.name ?? 'unknown_tool';
            const args = pending?.args ?? {};
            const result = event.data?.output?.content ?? event.data?.output ?? '';

            send(
              JSON.stringify({
                toolCall: {
                  name,
                  args,
                  result: typeof result === 'string' ? result : JSON.stringify(result),
                },
              })
            );
          }
        }

        send('[DONE]');
      } catch (err) {
        console.error('[chat-stream] stream error:', err);
        send(JSON.stringify({ error: 'Internal server error' }));
      } finally {
        controller.close();
      }
    },
  });
}
