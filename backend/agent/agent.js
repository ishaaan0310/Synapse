// ==========================================
// SYNAPSE AI AGENT (Google Gemini + function calling)
//
// Loop:
//   1. Send the conversation + tool list to Gemini
//   2. If Gemini asks for READ tools  -> run them, send results back, repeat
//      If Gemini asks for WRITE tools -> save them as pending actions
//                                        (user must confirm), tell Gemini
//   3. When Gemini answers with text -> done
// ==========================================

const AgentAction = require('../models/AgentAction');
const { generateContent } = require('./gemini');
const { readTools, writeTools, functionDeclarations, ymd } = require('./tools');

const MAX_STEPS = 6;            // max model calls per user message
const MAX_ACTIONS_PER_TURN = 5; // max changes proposed per message
const HISTORY_MESSAGES = 12;    // past chat messages sent for context

const buildSystemInstruction = (userName) => {
  const now = new Date();
  return `You are Synapse, the user's personal "digital twin": an AI assistant inside a student wellness app that tracks health, nutrition, academic goals and documents.

User's first name: ${userName || 'there'}
Today is ${now.toDateString()} (${ymd(now)}), local time ${now.toTimeString().slice(0, 5)}.

How to work:
- Use tools to look up the user's real data before answering questions about it. Never guess or invent data.
- For broad questions ("how am I doing", "why am I tired") start with get_overview, then dig deeper with other tools if useful, and connect patterns across modules (e.g. low sleep near deadlines).
- To change anything, call the matching write tool (log_meal, log_health_metric, create_goal, add_milestones, set_milestone_status, update_goal, set_nutrition_goals). Write tools do NOT apply immediately: the user sees a confirmation card and must click Confirm. Say you've prepared the change for them to confirm. Never claim it is already saved.
- If a write tool returns an error, fix the arguments and try again, or ask the user for the missing detail.
- When logging food without numbers, estimate calories and macros for the stated portion and mention they're estimates the user can adjust.
- For study plans, create a goal with 3-8 concrete milestones that fit before the deadline.
- To update or tick off goals/milestones, call get_academic_goals first to get the ids.
- Dates must be YYYY-MM-DD. Resolve words like "tomorrow" or "next Friday" using today's date.

Style:
- Be warm, concise and practical, like a supportive coach. Usually under 150 words.
- Plain text only. You may use **bold** and lines starting with "• " for lists. No headings, tables or other markdown.
- You are not a doctor. For worrying symptoms or readings, suggest seeing a medical professional.
- Stay focused on the user's wellbeing, studies and data in this app; general study help is fine.`;
};

// Gemini expects alternating user/model turns. Merge consecutive same-role turns.
const toContents = (history, message) => {
  const turns = [
    ...history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content })),
    { role: 'user', text: message }
  ];

  const contents = [];
  turns.forEach((t) => {
    const last = contents[contents.length - 1];
    if (last && last.role === t.role) {
      last.parts[0].text += `\n\n${t.text}`;
    } else {
      contents.push({ role: t.role, parts: [{ text: t.text }] });
    }
  });

  // The conversation must start with a user turn
  while (contents.length && contents[0].role !== 'user') contents.shift();
  return contents;
};

const textFrom = (content) =>
  (content?.parts || [])
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('')
    .trim();

/**
 * Run the agent for one user message.
 * @returns {Promise<{ text: string, actions: AgentAction[], toolsUsed: string[] }>}
 */
async function runAgent({ userId, userName, history = [], message }) {
  const systemInstruction = buildSystemInstruction(userName);
  const contents = toContents(history.slice(-HISTORY_MESSAGES), message);

  const actions = [];
  const toolsUsed = [];
  const proposedKeys = new Set();
  let activeModel; // set after the first call, then reused for this run

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const data = await generateContent({ systemInstruction, contents, functionDeclarations, model: activeModel });
    activeModel = data._model;

    const candidate = data.candidates?.[0];
    const content = candidate?.content;

    if (!content?.parts?.length) {
      const reason = candidate?.finishReason || data.promptFeedback?.blockReason || 'unknown';
      return {
        text: reason === 'SAFETY' || data.promptFeedback?.blockReason
          ? "Sorry, I can't help with that one. Ask me about your health, nutrition, studies or documents."
          : "Sorry, I couldn't come up with a response. Please try rephrasing.",
        actions,
        toolsUsed
      };
    }

    // Keep the model turn exactly as received (it may carry thought signatures)
    contents.push(content);

    const calls = content.parts.filter((p) => p.functionCall);

    if (calls.length === 0) {
      let text = textFrom(content);
      if (!text && actions.length) text = "I've prepared the changes below. Please confirm.";
      if (!text) text = "Done. Anything else?";
      return { text, actions, toolsUsed };
    }

    const responses = [];

    for (const part of calls) {
      const { name, args = {}, id } = part.functionCall;
      toolsUsed.push(name);
      let result;

      try {
        if (readTools[name]) {
          result = await readTools[name].run(userId, args);
        } else if (writeTools[name]) {
          const key = `${name}:${JSON.stringify(args)}`;

          if (proposedKeys.has(key)) {
            result = { status: 'already_proposed', note: 'This exact change is already waiting for confirmation.' };
          } else if (actions.length >= MAX_ACTIONS_PER_TURN) {
            result = { error: `At most ${MAX_ACTIONS_PER_TURN} changes can be proposed at once. Ask the user to confirm these first.` };
          } else {
            const prepared = await writeTools[name].prepare(userId, args);

            if (prepared.error) {
              result = { error: prepared.error };
            } else {
              const action = await AgentAction.create({
                user: userId,
                tool: name,
                args: prepared.args,
                summary: prepared.summary,
                details: prepared.details || []
              });
              actions.push(action);
              proposedKeys.add(key);
              result = {
                status: 'pending_user_confirmation',
                summary: prepared.summary,
                note: 'Shown to the user as a confirmation card. It is NOT saved until they click Confirm.'
              };
            }
          }
        } else {
          result = { error: `Unknown tool "${name}"` };
        }
      } catch (error) {
        console.error(`Agent tool ${name} failed:`, error);
        result = { error: `Tool failed: ${error.message}` };
      }

      responses.push({
        functionResponse: {
          ...(id ? { id } : {}),
          name,
          response: result
        }
      });
    }

    contents.push({ role: 'user', parts: responses });
  }

  return {
    text: actions.length
      ? "I've prepared the changes below. Please confirm."
      : 'That took more steps than I can handle in one go. Could you break the request into smaller parts?',
    actions,
    toolsUsed
  };
}

// ==========================================
// CONFIRM / CANCEL A PROPOSED ACTION
// ==========================================

const ACTION_TTL_MS = 24 * 60 * 60 * 1000;

async function confirmAction(userId, actionId) {
  // Atomically claim the action so double-clicks can't run it twice
  const action = await AgentAction.findOneAndUpdate(
    { _id: actionId, user: userId, status: 'pending' },
    { $set: { status: 'executing' } },
    { new: true }
  );

  if (!action) {
    const existing = await AgentAction.findOne({ _id: actionId, user: userId });
    if (!existing) return { notFound: true };
    return { action: existing, alreadyResolved: true };
  }

  if (Date.now() - new Date(action.createdAt).getTime() > ACTION_TTL_MS) {
    action.status = 'expired';
    action.resolvedAt = new Date();
    action.resultMessage = 'This suggestion expired. Ask your twin again.';
    await action.save();
    return { action };
  }

  const tool = writeTools[action.tool];

  try {
    if (!tool) throw new Error(`Unknown action "${action.tool}"`);
    action.resultMessage = await tool.execute(userId, action.args);
    action.status = 'confirmed';
  } catch (error) {
    console.error('Agent action failed:', error);
    action.resultMessage = `Couldn't apply this change: ${error.message}`;
    action.status = 'failed';
  }

  action.resolvedAt = new Date();
  await action.save();
  return { action };
}

async function cancelAction(userId, actionId) {
  const action = await AgentAction.findOneAndUpdate(
    { _id: actionId, user: userId, status: 'pending' },
    { $set: { status: 'cancelled', resolvedAt: new Date(), resultMessage: 'Cancelled' } },
    { new: true }
  );

  if (!action) {
    const existing = await AgentAction.findOne({ _id: actionId, user: userId });
    return existing ? { action: existing, alreadyResolved: true } : { notFound: true };
  }

  return { action };
}

module.exports = { runAgent, confirmAction, cancelAction, buildSystemInstruction, toContents };
