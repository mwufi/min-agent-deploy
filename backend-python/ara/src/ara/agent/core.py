"""Core agent implementation with OpenRouter integration"""

import os
import json
import asyncio
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
from datetime import datetime

import httpx
from loguru import logger
from pydantic import BaseModel, Field

from ..storage.markdown import MarkdownStorage
from ..behaviors.base import Behavior, BehaviorManager
from ..behaviors.planning import PlanningBehavior
from ..monitoring.metrics import MetricsCollector
from ..ui.terminal import TerminalUI


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
        path: Union[str, Path] = "./data",
        llm: str = "anthropic/claude-3.5-sonnet",
        api_key: Optional[str] = None,
        behaviors: Optional[List[Behavior]] = None
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
        
        # Initialize behavior manager
        self.behavior_manager = BehaviorManager()
        if behaviors:
            for behavior in behaviors:
                self.behavior_manager.register(behavior)
        else:
            # Default behaviors
            self.behavior_manager.register(PlanningBehavior())
        
        # Conversation history
        self.messages: List[Message] = []
        
        # Available tools
        self.tools = self._initialize_tools()
        
        logger.info(f"Agent initialized with storage at {self.path}")
    
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
            
            return result
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            self.metrics.record_tool_call(function_name, duration, success=False)
            logger.error(f"Tool execution error: {e}")
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
        
        # Pre-process with behaviors
        prompt = await self.behavior_manager.pre_process(prompt, self)
        
        # Add user message
        self.messages.append(Message(role="user", content=prompt))
        
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
            logger.error(f"Error in agent execution: {e}")
            self.ui.log_error(str(e))
            raise