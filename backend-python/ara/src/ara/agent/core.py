"""Core agent implementation with OpenRouter integration"""

import os
import json
import asyncio
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
from datetime import datetime
from contextlib import asynccontextmanager

import httpx
from pydantic import BaseModel, Field

from ..logging import get_logger, setup_logging

from ..storage.markdown import MarkdownStorage
from ..behaviors.base import Behavior, BehaviorManager
from ..behaviors.planning import PlanningBehavior
from ..monitoring.metrics import MetricsCollector
from ..ui.terminal import TerminalUI
from ..ui.live_display import LiveDisplay
from ..ui.textual_display import TextualDisplay


class ToolCall(BaseModel):
    """Represents a tool call from the model"""
    id: str
    type: str = "function"
    function: Dict[str, Any]


class Message(BaseModel):
    """Represents a conversation message"""
    role: str
    content: Optional[str] = None
    tool_calls: Optional[List[ToolCall]] = None
    tool_call_id: Optional[str] = None


class A1:
    """Main agent class with OpenRouter integration"""
    
    def __init__(
        self,
        path: Union[str, Path] = "./dev-data",
        llm: str = "anthropic/claude-3.5-sonnet",
        api_key: Optional[str] = None,
        behaviors: Optional[List[Behavior]] = None,
        enable_live_ui: bool = True,
        ui_backend: str = "textual"  # "rich" or "textual"
    ):
        self.path = Path(path)
        self.path.mkdir(parents=True, exist_ok=True)
        
        self.llm = llm
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OpenRouter API key not provided")
        
        # Initialize components
        self.storage = MarkdownStorage(self.path)
        self.metrics = MetricsCollector()
        self.ui = TerminalUI()
        self.enable_live_ui = enable_live_ui
        self.ui_backend = ui_backend
        self._live_display: Optional[Union[LiveDisplay, TextualDisplay]] = None
        
        # Setup logging with file output in agent's data directory
        setup_logging(log_dir=self.path / "logs", enable_file_logging=True)
        self.logger = get_logger(__name__, context="agent")
        
        # Initialize behavior manager
        self.behavior_manager = BehaviorManager()
        if behaviors:
            for behavior in behaviors:
                self.behavior_manager.register(behavior)
                # Initialize behavior if it has an initialize method
                if hasattr(behavior, 'initialize'):
                    asyncio.create_task(behavior.initialize(self))
        else:
            # Default behaviors
            self.behavior_manager.register(PlanningBehavior())
        
        # Conversation history
        self.messages: List[Message] = []
        
        # Available tools
        self.tools = self._initialize_tools()
        
        # Start periodic tasks
        self._periodic_task = None
        
        self.logger.info(f"Agent initialized with storage at {self.path}")
    
    def add_behavior(self, behavior: Behavior) -> None:
        """Add a behavior to the agent"""
        self.behavior_manager.register(behavior)
        if hasattr(behavior, 'initialize'):
            asyncio.create_task(behavior.initialize(self))

    def has_behavior(self, requirement: str) -> bool:
        """Check if agent has a behavior (convenience method)"""
        return self.behavior_manager.has_behavior(requirement)
    
    def get_behavior(self, name: str) -> Optional[Behavior]:
        """Get a behavior by name (convenience method)"""
        return self.behavior_manager.get_behavior(name)
    
    async def start(self) -> None:
        """Start the agent and all periodic behaviors"""
        await self.behavior_manager.start_all_periodic_tasks(self)
        
        # Start live UI if enabled
        if self.enable_live_ui and not self._live_display:
            if self.ui_backend == "textual":
                self._live_display = TextualDisplay(self)
            else:
                self._live_display = LiveDisplay(self)
            await self._live_display.start()
    
    async def stop(self) -> None:
        """Stop the agent and all periodic behaviors"""
        await self.behavior_manager.stop_all_periodic_tasks()
        
        # Stop live UI
        if self._live_display:
            await self._live_display.stop()
            self._live_display = None
    
    @asynccontextmanager
    async def session(self):
        """Context manager for agent session"""
        await self.start()
        try:
            yield self
        finally:
            await self.stop()
    
    def _initialize_tools(self) -> List[Dict[str, Any]]:
        """Initialize available tools for the agent"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "read_file",
                    "description": "Read contents of a file",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Path to the file to read"
                            }
                        },
                        "required": ["path"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "write_file",
                    "description": "Write contents to a file",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Path to the file to write"
                            },
                            "content": {
                                "type": "string",
                                "description": "Content to write to the file"
                            }
                        },
                        "required": ["path", "content"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "list_directory",
                    "description": "List contents of a directory",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Path to the directory"
                            }
                        },
                        "required": ["path"]
                    }
                }
            }
        ]
    
    async def _call_openrouter(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Make a call to OpenRouter API"""
        url = "https://openrouter.ai/api/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/ara-agent",
            "X-Title": "ARA Agent"
        }
        
        data = {
            "model": self.llm,
            "messages": messages,
            "tools": self.tools,
            "tool_choice": "auto"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data, headers=headers)
            response.raise_for_status()
            return response.json()
    
    async def _execute_tool(self, tool_call: ToolCall) -> str:
        """Execute a tool call and return the result"""
        function_name = tool_call.function["name"]
        arguments = json.loads(tool_call.function["arguments"])
        
        self.ui.log_tool_call(function_name, arguments)
        start_time = datetime.now()
        
        try:
            if function_name == "read_file":
                path = self.path / arguments["path"]
                if path.exists():
                    result = path.read_text()
                else:
                    result = f"File not found: {arguments['path']}"
            
            elif function_name == "write_file":
                path = self.path / arguments["path"]
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(arguments["content"])
                result = f"File written successfully: {arguments['path']}"
            
            elif function_name == "list_directory":
                path = self.path / arguments["path"]
                if path.exists() and path.is_dir():
                    items = [str(item.relative_to(self.path)) for item in path.iterdir()]
                    result = json.dumps(items)
                else:
                    result = f"Directory not found: {arguments['path']}"
            
            else:
                result = f"Unknown tool: {function_name}"
            
            # Record metrics
            duration = (datetime.now() - start_time).total_seconds()
            self.metrics.record_tool_call(function_name, duration, success=True)
            
            # Notify behaviors
            await self.behavior_manager.on_tool_call(function_name, arguments, result, self)
            
            return result
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            self.metrics.record_tool_call(function_name, duration, success=False, error=str(e))
            self.logger.error(f"Tool execution error: {e}")
            
            # Notify behaviors of error
            await self.behavior_manager.on_error(e, self)
            
            return f"Error: {str(e)}"
    
    async def _process_response(self, response: Dict[str, Any]) -> Optional[str]:
        """Process the OpenRouter response"""
        choice = response["choices"][0]
        message = choice["message"]
        
        # Add assistant message to history
        assistant_msg = Message(
            role="assistant",
            content=message.get("content"),
            tool_calls=[ToolCall(**tc) for tc in message.get("tool_calls", [])]
        )
        self.messages.append(assistant_msg)
        
        # Handle tool calls if present
        if assistant_msg.tool_calls:
            tool_results = []
            for tool_call in assistant_msg.tool_calls:
                result = await self._execute_tool(tool_call)
                tool_results.append({
                    "role": "tool",
                    "content": result,
                    "tool_call_id": tool_call.id
                })
            
            # Add tool results to messages
            for result in tool_results:
                self.messages.append(Message(**result))
            
            # Get another response after tool execution
            messages_dict = [msg.model_dump(exclude_none=True) for msg in self.messages]
            response = await self._call_openrouter(messages_dict)
            return await self._process_response(response)
        
        return assistant_msg.content
    
    def go(self, prompt: str) -> str:
        """Execute a task with the given prompt"""
        return asyncio.run(self.ago(prompt))
    
    async def ago(self, prompt: str) -> str:
        """Async version of go()"""
        self.ui.log_user_input(prompt)
        
        # Notify behaviors of user message
        await self.behavior_manager.on_user_message(prompt, self)
        
        # Pre-process with behaviors
        processed_prompt = await self.behavior_manager.pre_process(prompt, self)
        
        # Add user message
        self.messages.append(Message(role="user", content=processed_prompt))
        
        # Convert messages to dict format
        messages_dict = [msg.model_dump(exclude_none=True) for msg in self.messages]
        
        # Make API call
        try:
            response = await self._call_openrouter(messages_dict)
            result = await self._process_response(response)
            
            # Post-process with behaviors
            result = await self.behavior_manager.post_process(result, self)
            
            self.ui.log_assistant_response(result)
            
            # Save conversation to storage
            await self.storage.save_conversation(self.messages)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error in agent execution: {e}")
            self.ui.log_error(str(e))
            await self.behavior_manager.on_error(e, self)
            raise