"""Base behavior system for agent plugins"""

from abc import ABC, abstractmethod
from typing import Any, List, Optional, TYPE_CHECKING
from datetime import datetime
from loguru import logger

if TYPE_CHECKING:
    from ..agent.core import A1


class Behavior(ABC):
    """Base class for agent behaviors"""
    
    def __init__(self, name: str):
        self.name = name
        self.enabled = True
        self.last_run = None
    
    @abstractmethod
    async def pre_process(self, prompt: str, agent: "A1") -> str:
        """Pre-process user prompt before sending to LLM"""
        return prompt
    
    @abstractmethod
    async def post_process(self, response: str, agent: "A1") -> str:
        """Post-process LLM response before returning to user"""
        return response
    
    async def on_tool_call(self, tool_name: str, args: dict, result: Any, agent: "A1") -> None:
        """Called when a tool is executed"""
        pass
    
    async def on_error(self, error: Exception, agent: "A1") -> None:
        """Called when an error occurs"""
        pass
    
    async def periodic_task(self, agent: "A1") -> None:
        """Periodic task that runs at intervals"""
        pass


class BehaviorManager:
    """Manages all behaviors for an agent"""
    
    def __init__(self):
        self.behaviors: List[Behavior] = []
    
    def register(self, behavior: Behavior) -> None:
        """Register a new behavior"""
        self.behaviors.append(behavior)
        logger.info(f"Registered behavior: {behavior.name}")
    
    def unregister(self, behavior_name: str) -> None:
        """Unregister a behavior by name"""
        self.behaviors = [b for b in self.behaviors if b.name != behavior_name]
    
    async def pre_process(self, prompt: str, agent: "A1") -> str:
        """Run all pre-process hooks"""
        for behavior in self.behaviors:
            if behavior.enabled:
                try:
                    prompt = await behavior.pre_process(prompt, agent)
                except Exception as e:
                    logger.error(f"Error in {behavior.name} pre_process: {e}")
        return prompt
    
    async def post_process(self, response: str, agent: "A1") -> str:
        """Run all post-process hooks"""
        for behavior in self.behaviors:
            if behavior.enabled:
                try:
                    response = await behavior.post_process(response, agent)
                except Exception as e:
                    logger.error(f"Error in {behavior.name} post_process: {e}")
        return response
    
    async def on_tool_call(self, tool_name: str, args: dict, result: Any, agent: "A1") -> None:
        """Notify all behaviors of a tool call"""
        for behavior in self.behaviors:
            if behavior.enabled:
                try:
                    await behavior.on_tool_call(tool_name, args, result, agent)
                except Exception as e:
                    logger.error(f"Error in {behavior.name} on_tool_call: {e}")
    
    async def on_error(self, error: Exception, agent: "A1") -> None:
        """Notify all behaviors of an error"""
        for behavior in self.behaviors:
            if behavior.enabled:
                try:
                    await behavior.on_error(error, agent)
                except Exception as e:
                    logger.error(f"Error in {behavior.name} on_error: {e}")
    
    async def run_periodic_tasks(self, agent: "A1") -> None:
        """Run periodic tasks for all behaviors"""
        for behavior in self.behaviors:
            if behavior.enabled:
                try:
                    await behavior.periodic_task(agent)
                    behavior.last_run = datetime.now()
                except Exception as e:
                    logger.error(f"Error in {behavior.name} periodic_task: {e}")