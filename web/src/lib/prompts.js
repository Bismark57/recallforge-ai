// Prompt builders for the three-step generation pipeline:
// analyze -> blueprint -> generate -> verify. Every step is pinned to the
// student's own study notes (source discipline).

export const QUESTION_TYPES = [
  { id: 'recall', label: 'Recall', desc: 'Core facts and definitions' },
  { id: 'explanation', label: 'Explanation', desc: 'Explain why/how in your own words' },
  { id: 'application', label: 'Application', desc: 'Use the concept in a new situation' },
  { id: 'diagnosis', label: 'Misconception check', desc: 'Spot and repair faulty reasoning' },
  { id: 'connections', label: 'Connections', desc: 'Link concepts together' },
  { id: 'synthesis', label: 'Synthesis', desc: 'Pull the whole topic together' },
]

export const ANSWER_LENGTHS = [
  { id: 'brief', label: 'Brief', desc: '2–4 sentences' },
  { id: 'standard', label: 'Standard', desc: 'A short paragraph' },
  { id: 'detailed', label: 'Detailed', desc: 'Full explanation' },
  { id: 'worked', label: 'Worked solution', desc: 'Step-by-step, for problems' },
]

const SOURCE_RULE =
  'Use ONLY the study material provided below. Do not introduce facts, ' +
  'examples, or terminology that cannot be traced to it. If something cannot ' +
  'be answered from the material, say so instead of inventing it.'

export function analyzePrompt(sourceText) {
  return {
    system:
      'You are a precise study assistant. ' + SOURCE_RULE +
      ' Respond with JSON only.',
    user:
      `Analyze the following learning material and restructure it into clear study notes.\n\n` +
      `Return JSON with exactly these keys:\n` +
      `- "notes": a clean, well-structured markdown summary (headings, bullets) that becomes the knowledge base. Preserve all examinable facts, formulas, and definitions.\n` +
      `- "concepts": array of the 5-12 most important concepts, each a short string.\n` +
      `- "flags": array of strings noting duplicates removed, ambiguous wording, or possible errors in the source (empty array if none).\n\n` +
      `Material:\n"""\n${sourceText}\n"""`,
  }
}

export function blueprintPrompt(notes, concepts, { subject, level, count, types }) {
  return {
    system:
      'You are an exam designer. ' + SOURCE_RULE + ' Respond with JSON only.',
    user:
      `Subject: ${subject || 'general'}. Level: ${level || 'unspecified'}.\n\n` +
      `Study notes:\n"""\n${notes}\n"""\n\n` +
      `Key concepts: ${concepts.join('; ')}\n\n` +
      `Design an exam blueprint of exactly ${count} questions using ONLY these ` +
      `question types: ${types.join(', ')}.\n` +
      `Spread questions across the key concepts; include at least one question ` +
      `per concept where the count allows.\n\n` +
      `Return JSON: { "plan": [ { "type": "<one of the allowed types>", ` +
      `"concept": "<concept>", "angle": "<one-line description of what this question probes>" } ] }`,
  }
}

export function questionsPrompt(notes, planItems, answerLength) {
  const lengthGuide = {
    brief: '2-4 sentences',
    standard: 'one solid paragraph',
    detailed: 'a thorough explanation with structure',
    worked: 'a step-by-step worked solution',
  }[answerLength]
  return {
    system:
      'You are an expert tutor writing exam questions and model answers. ' +
      SOURCE_RULE + ' Respond with JSON only.',
    user:
      `Study notes:\n"""\n${notes}\n"""\n\n` +
      `Write model answers at "${answerLength}" length (${lengthGuide}). ` +
      `Each answer must read like a strong student's response — direct, ` +
      `accurate, and complete enough to learn from.\n\n` +
      `Generate these questions:\n` +
      planItems
        .map((p, i) => `${i + 1}. [${p.type}] on "${p.concept}": ${p.angle}`)
        .join('\n') +
      `\n\nReturn JSON: { "questions": [ { "type": "...", "concept": "...", ` +
      `"prompt": "<the question>", "hint": "<a nudge that does not give away the answer>", ` +
      `"modelAnswer": "<the answer>" } ] }`,
  }
}

export function verifyPrompt(notes, questions) {
  return {
    system:
      'You are a strict fact-checker. ' + SOURCE_RULE + ' Respond with JSON only.',
    user:
      `Study notes (ground truth):\n"""\n${notes}\n"""\n\n` +
      `Check each question and model answer below against the notes. ` +
      `Flag anything unsupported, inaccurate, or leaking the answer into the hint.\n\n` +
      questions
        .map(
          (q, i) =>
            `Q${i + 1} [${q.type}] ${q.prompt}\nHint: ${q.hint}\nAnswer: ${q.modelAnswer}`,
        )
        .join('\n\n') +
      `\n\nReturn JSON: { "results": [ { "index": <0-based>, "ok": true/false, ` +
      `"issue": "<short description or empty>", "fixedAnswer": "<corrected answer, or empty if ok>" } ] }`,
  }
}
