// Default prompt template for LeetCode problem solving
export const DEFAULT_LEETCODE_PROMPT = `Fetch the LeetCode problem #{PROBLEM_NUMBER} and provide a complete Python solution.

Please structure your response as follows:
1. Problem title and description
2. A complete, working Python solution
3. Time and space complexity analysis

Return ONLY the Python code for the solution, properly formatted and ready to run. Include the problem description as a docstring at the top of the solution function.`

// Preset prompt templates
export const PROMPT_PRESETS = {
  'no-comments': `Fetch the LeetCode problem #{PROBLEM_NUMBER} and provide a complete Python solution.

Please structure your response as follows:
1. Problem title and description
2. A complete, working Python solution
3. Time and space complexity analysis

Return ONLY the Python code for the solution, properly formatted and ready to run.

CRITICAL REQUIREMENT: Do not include ANY comments in the code. No docstrings, no # comments, no explanations whatsoever. Just pure executable code only.`,

  'minimal-comments': `Fetch the LeetCode problem #{PROBLEM_NUMBER} and provide a complete Python solution.

Please structure your response as follows:
1. Problem title and description
2. A complete, working Python solution with minimal comments
3. Time and space complexity analysis

Return ONLY the Python code for the solution, properly formatted and ready to run. Include only a brief one-line docstring for the main function. No other comments.`,

  'concise': `Fetch LeetCode problem #{PROBLEM_NUMBER} and provide the most concise Python solution possible.

Return ONLY the Python code - no explanations, no verbose comments. Focus on brevity and efficiency.`,

  'detailed': `Fetch the LeetCode problem #{PROBLEM_NUMBER} and provide a complete, well-documented Python solution.

Please structure your response as follows:
1. Problem title and description
2. A complete, working Python solution with detailed comments explaining the approach
3. Time and space complexity analysis
4. Example test cases

Return ONLY the Python code for the solution, properly formatted and ready to run. Include comprehensive docstrings and inline comments explaining the logic.`,

  'optimal': `Fetch the LeetCode problem #{PROBLEM_NUMBER} and provide the MOST OPTIMAL Python solution.

Focus on:
- Best possible time complexity
- Best possible space complexity
- Clean, efficient code

Return ONLY the Python code for the solution. Include the problem description as a docstring and note the time/space complexity.`
}
