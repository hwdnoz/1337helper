// Preset modifiers - these are ADDED to the base prompt from admin
// Base prompt is loaded from /api/prompts/leetcode_solve
export const PROMPT_MODIFIERS = {
  'default': '',

  'no-comments': `

CRITICAL REQUIREMENT: Do not include ANY comments in the code. No docstrings, no # comments, no explanations whatsoever. Just pure executable code only.`,

  'minimal-comments': `

Include only a brief one-line docstring for the main function. No other comments.`,

  'concise': `

Focus on the most concise solution possible - brevity and efficiency.`,

  'detailed': `

Include comprehensive docstrings and inline comments explaining the logic.

Also provide example test cases in the code.`,

  'optimal': `

Focus on the MOST OPTIMAL solution:
- Best possible time complexity
- Best possible space complexity
- Clean, efficient code`
}
