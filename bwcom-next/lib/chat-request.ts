import { SYSTEM_PROMPT_SECTIONS } from './prompts/system-sections';

/**
 * Builds the system prompt for the admin chat agent.
 *
 * Kept in its own file so the prompt text is easy to iterate on
 * without touching agent wiring or route code.
 */
export function buildSystemPrompt(): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });

  const sections = [
    SYSTEM_PROMPT_SECTIONS.allowance,
    SYSTEM_PROMPT_SECTIONS.media,
    SYSTEM_PROMPT_SECTIONS.races,
    SYSTEM_PROMPT_SECTIONS.trainingLog,
    SYSTEM_PROMPT_SECTIONS.guidelines,
  ];

  return `You are a helpful family-admin assistant on brentwoodle.com.
Today's date is ${today}.

${sections.join('\n\n')}`;
}
