"""
Simple Interviewer Agent

Implements a minimal agent loop with tool execution and stopping condition.
"""

from google import genai
import os
import logging
import re
import time

logger = logging.getLogger(__name__)


class InterviewerAgent:
    """Minimal interviewer agent with a small tool loop."""

    def __init__(self):
        self.client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))
        self.model = "gemini-2.5-flash"
        self.max_hints = 3
        self.tools = {
            "hint": self._tool_hint,
            "edge_cases": self._tool_edge_cases,
            "complexity": self._tool_complexity
        }

    def start(self, problem: str) -> str:
        logger.info(f"Starting new interview session for problem: {problem}")
        opening = (
            f"Let's work on {problem}. "
            "What is your initial approach and its complexity?"
        )
        logger.info(f"Opening message: {opening}")
        return opening

    def run(self, problem: str, messages: list, hints_used: int, max_iterations: int = 5):
        """
        Agent loop:
        - Calls the LLM
        - Executes tools if requested
        - Feeds tool results back into the loop
        - Stops on FINAL or max_iterations
        """
        logger.info(f"Starting agent run for problem: {problem}, hints_used: {hints_used}")
        tool_messages = []
        scripted_actions = [
            {"type": "tool", "name": "hint", "count": 1},
            {"type": "tool", "name": "edge_cases", "count": 1},
            {"type": "tool", "name": "complexity", "count": 1}
        ]
        for iteration in range(max_iterations):
            logger.info(f"Agent iteration {iteration + 1}/{max_iterations}")
            if iteration < len(scripted_actions):
                action = scripted_actions[iteration]
                response = f"TOOL: {action['name']}"
                logger.info(f"Scripted response: {response}")
            else:
                action = {"type": "final", "content": "Thanks! Please proceed with your solution."}
                response = "FINAL: Thanks! Please proceed with your solution."
                logger.info(f"Scripted response: {response}")
            logger.info(f"Parsed action: {action}")

            if action["type"] == "tool":
                tool_name = action["name"]
                logger.info(f"Executing tool: {tool_name}")
                time.sleep(2)
                tool_results, hints_used = self._use_tool(
                    tool_name,
                    problem,
                    hints_used,
                    action.get("count", 1)
                )
                logger.info(f"Tool result: {tool_results}")
                role = "hint" if tool_name == "hint" else "interviewer"
                for tool_result in tool_results:
                    tool_messages.append({"role": role, "text": tool_result})
                messages.append({"role": "assistant", "content": response})
                messages.append({"role": "tool", "content": "\n".join(tool_results)})
                continue

            final_text = action["content"]
            logger.info(f"Agent returning final response: {final_text}")
            messages.append({"role": "assistant", "content": final_text})
            return final_text, hints_used, tool_messages

        fallback = "Max iterations reached. Can you summarize your approach?"
        logger.warning(f"Max iterations reached for problem: {problem}")
        messages.append({"role": "assistant", "content": fallback})
        return fallback, hints_used, tool_messages

    def give_hint(self, problem: str, hints_used: int):
        logger.info(f"give_hint called directly: problem={problem}, hints_used={hints_used}")
        result = self._tool_hint(problem, hints_used)
        logger.info(f"give_hint returning: {result}")
        return result

    def _call_llm(self, problem: str, messages: list) -> str:
        prompt = self._build_prompt(problem, messages)
        logger.info(f"Calling LLM with model: {self.model}")
        logger.debug(f"Prompt: {prompt[:200]}...")  # only 200 chars
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config={'temperature': 0.2}
            )
            logger.info(f"LLM call successful")
            return response.text.strip()
        except Exception as e:
            logger.error(f"LLM call failed: {str(e)}", exc_info=True)
            raise

    def _build_prompt(self, problem: str, messages: list) -> str:
        tool_list = ", ".join(self.tools.keys())
        conversation = "\n".join(
            [f"{m['role'].upper()}: {m['content']}" for m in messages]
        )
        return f"""You are an interviewer for the problem: {problem}.

You must respond with one of the following formats:
1) TOOL: <name>   (use one of: {tool_list})
2) FINAL: <your reply>

Use TOOL when you need a hint, edge cases, or complexity prompt.
Otherwise respond with FINAL and ask a concise follow-up question.

Conversation so far:
{conversation}
"""

    def _parse_response(self, text: str) -> dict:
        if not text:
            return {"type": "final", "content": "Please continue."}
        if text.startswith("TOOL:"):
            tool_raw = text.split("TOOL:", 1)[1].strip()
            tool_name = tool_raw.split()[0].lower() if tool_raw else ""
            count_match = re.search(r"(\d+)", tool_raw)
            count = int(count_match.group(1)) if count_match else 1
            return {"type": "tool", "name": tool_name, "count": count}
        if text.startswith("FINAL:"):
            final_text = text.split("FINAL:", 1)[1].strip()
            return {"type": "final", "content": final_text}
        return {"type": "final", "content": text}

    def _use_tool(self, tool_name: str, problem: str, hints_used: int, count: int = 1):
        logger.info(f"Tool requested: {tool_name}")
        tool = self.tools.get(tool_name)
        if not tool:
            logger.warning(f"Unknown tool requested: {tool_name}")
            return ["Unknown tool requested."], hints_used
        if tool_name == "hint":
            results = []
            remaining = max(self.max_hints - hints_used, 0)
            hints_to_give = min(count, remaining)
            for _ in range(hints_to_give):
                hint_text, hints_used = tool(problem, hints_used)
                results.append(hint_text)
            if count > hints_to_give:
                results.append(
                    f"I can only give {self.max_hints} hints total. "
                    f"You have used {hints_used}/{self.max_hints}."
                )
            return results, hints_used
        logger.info(f"Executing tool function: {tool.__name__}")
        result, new_hints_used = tool(problem, hints_used)
        logger.info(f"Tool {tool_name} returned: {result}, hints_used updated from {hints_used} to {new_hints_used}")
        return [result], new_hints_used

    def _tool_hint(self, problem: str, hints_used: int):
        logger.info(f"_tool_hint called: problem={problem}, hints_used={hints_used}, max_hints={self.max_hints}")
        if hints_used >= self.max_hints:
            logger.info("No hints remaining")
            return "No hints remaining.", hints_used
        hints = [
            "Start by clarifying inputs, outputs, and constraints.",
            "Consider data structures that allow fast lookups.",
            "Walk through a small example to validate your approach."
        ]
        hint_text = hints[hints_used]
        logger.info(f"Returning hint #{hints_used + 1}: {hint_text}")
        return hint_text, hints_used + 1


    def _tool_edge_cases(self, problem: str, hints_used: int):
        logger.info(f"_tool_edge_cases called: problem={problem}")
        result = "Edge cases: empty input, single element, duplicates, negatives, large input."
        logger.info(f"Returning edge cases: {result}")
        return result, hints_used

    def _tool_complexity(self, problem: str, hints_used: int):
        logger.info(f"_tool_complexity called: problem={problem}")
        result = "State the time and space complexity of your approach."
        logger.info(f"Returning complexity prompt: {result}")
        return result, hints_used
