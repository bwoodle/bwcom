import { ChatBedrockConverse } from '@langchain/aws';
import { createAgent } from 'langchain';
import { TTLMemorySaver } from './TTLMemorySaver';
import { allowanceTools } from './allowance-tools';
import { mediaTools } from './media-tools';
import { buildSystemPrompt } from './chat-request';

// Module-level singletons — persist across requests in the same server process
const checkpointer = new TTLMemorySaver({
  defaultTTLMs: 60 * 60 * 1000, // 1 hour
  sweepIntervalMs: 60 * 1000, // sweep every 60 seconds
  refreshOnRead: true,
});

const llm = new ChatBedrockConverse({
  model: 'us.amazon.nova-lite-v1:0',
  region: 'us-west-2',
});

const agent = createAgent({
  model: llm,
  tools: [...allowanceTools, ...mediaTools],
  systemPrompt: buildSystemPrompt(),
  checkpointer,
});

export { agent, checkpointer };
