"""Planning behavior for agent task decomposition"""

from typing import TYPE_CHECKING, Any
from .base import Behavior

if TYPE_CHECKING:
    from ..agent.core import A1


class PlanningBehavior(Behavior):
    """Default planning behavior that helps agents break down tasks"""
    
    def __init__(self):
        super().__init__("planning")
        self.planning_prompt = """
You are an AI assistant with access to tools for file operations.
When given a complex task, break it down into steps if needed.
Be concise and focus on completing the user's request efficiently.
"""
    
    async def pre_process(self, prompt: str, agent: "A1") -> str:
        """Add planning context to prompts"""
        # For complex prompts, we could add planning instructions
        # For now, just pass through
        self.logger.info(f"Pre-processing prompt: {prompt}")
        return prompt
    
    async def post_process(self, response: str, agent: "A1") -> str:
        """Post-process responses"""
        # Could extract and save plans here
        return response
    
    async def on_tool_call(self, tool_name: str, args: dict, result: Any, agent: "A1") -> None:
        """Track tool usage for planning"""
        # Could log tool usage patterns for better planning
        pass