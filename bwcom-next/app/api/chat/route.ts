import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { agent, checkpointer } from '@/lib/agent';
import { createChatStream } from '@/lib/chat-stream';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';

function serializeMessage(msg: BaseMessage): { role: string; content: string } {
  if (msg instanceof HumanMessage || msg.type === 'human') {
    return { role: 'user', content: String(msg.content) };
  }
  if (msg instanceof AIMessage || msg.type === 'ai') {
    return { role: 'assistant', content: String(msg.content) };
  }
  return { role: msg.type, content: String(msg.content) };
}

async function getAdminEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== 'admin' || !session.user.email) {
    return null;
  }
  return session.user.email;
}

/**
 * GET /api/chat — Load existing chat history for the authenticated admin user.
 */
export async function GET() {
  const email = await getAdminEmail();
  if (!email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const state = await agent.graph.getState({
      configurable: { thread_id: email },
    });

    const messages = (state?.values?.messages as BaseMessage[] | undefined) ?? [];
    return Response.json({
      messages: messages.map(serializeMessage),
    });
  } catch {
    // No state exists yet for this thread
    return Response.json({ messages: [] });
  }
}

/**
 * POST /api/chat — Send a message and stream the assistant's response.
 * Body: { message: string }
 */
export async function POST(request: Request) {
  const email = await getAdminEmail();
  if (!email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const userMessage = body.message;

  if (!userMessage || typeof userMessage !== 'string') {
    return Response.json({ error: 'Missing message' }, { status: 400 });
  }

  const stream = createChatStream({
    userMessage,
    config: { configurable: { thread_id: email } },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * DELETE /api/chat — Reset the current admin user's chat session.
 */
export async function DELETE() {
  const email = await getAdminEmail();
  if (!email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await checkpointer.deleteThread(email);
  return Response.json({ ok: true });
}
