"""Markdown-based storage system for agent data"""

import yaml
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
import aiofiles
from loguru import logger


class MarkdownStorage:
    """Handles markdown-based storage for agent memory and data"""
    
    def __init__(self, base_path: Path):
        self.base_path = base_path
        self._ensure_structure()
    
    def _ensure_structure(self):
        """Ensure the storage directory structure exists"""
        directories = [
            "user_model",
            "goals",
            "action_log",
            "dossiers/people",
            "dossiers/projects", 
            "dossiers/concepts",
            "episodic",
            "embeddings"
        ]
        
        for dir_name in directories:
            (self.base_path / dir_name).mkdir(parents=True, exist_ok=True)
    
    async def save_conversation(self, messages: List[Any]) -> None:
        """Save conversation to episodic memory"""
        timestamp = datetime.now().isoformat()
        filename = f"conversation_{timestamp.replace(':', '-')}.md"
        path = self.base_path / "episodic" / filename
        
        content = f"# Conversation - {timestamp}\n\n"
        
        for msg in messages:
            msg_dict = msg.model_dump(exclude_none=True) if hasattr(msg, 'model_dump') else msg
            role = msg_dict.get("role", "unknown")
            content_text = msg_dict.get("content", "")
            
            if role == "user":
                content += f"## User\n{content_text}\n\n"
            elif role == "assistant":
                content += f"## Assistant\n{content_text}\n\n"
                if msg_dict.get("tool_calls"):
                    content += "### Tool Calls\n```json\n"
                    content += json.dumps(msg_dict["tool_calls"], indent=2)
                    content += "\n```\n\n"
            elif role == "tool":
                content += f"### Tool Result\n```\n{content_text}\n```\n\n"
        
        async with aiofiles.open(path, 'w') as f:
            await f.write(content)
        
        logger.debug(f"Saved conversation to {path}")
    
    async def save_yaml(self, category: str, name: str, data: Dict[str, Any]) -> None:
        """Save data as YAML file"""
        path = self.base_path / category / f"{name}.yaml"
        path.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiofiles.open(path, 'w') as f:
            await f.write(yaml.dump(data, default_flow_style=False))
        
        logger.debug(f"Saved YAML to {path}")
    
    async def load_yaml(self, category: str, name: str) -> Optional[Dict[str, Any]]:
        """Load data from YAML file"""
        path = self.base_path / category / f"{name}.yaml"
        
        if not path.exists():
            return None
        
        async with aiofiles.open(path, 'r') as f:
            content = await f.read()
            return yaml.safe_load(content)
    
    async def save_markdown(self, category: str, name: str, content: str) -> None:
        """Save content as markdown file"""
        path = self.base_path / category / f"{name}.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiofiles.open(path, 'w') as f:
            await f.write(content)
        
        logger.debug(f"Saved markdown to {path}")
    
    async def load_markdown(self, category: str, name: str) -> Optional[str]:
        """Load content from markdown file"""
        path = self.base_path / category / f"{name}.md"
        
        if not path.exists():
            return None
        
        async with aiofiles.open(path, 'r') as f:
            return await f.read()
    
    async def list_files(self, category: str, pattern: str = "*") -> List[Path]:
        """List files in a category matching pattern"""
        path = self.base_path / category
        if not path.exists():
            return []
        
        return list(path.glob(pattern))
    
    async def append_to_log(self, log_name: str, entry: Dict[str, Any]) -> None:
        """Append an entry to a log file"""
        path = self.base_path / "logs" / f"{log_name}.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiofiles.open(path, 'a') as f:
            await f.write(json.dumps(entry) + '\n')
    
    async def read_log(self, log_name: str) -> List[Dict[str, Any]]:
        """Read entries from a log file"""
        path = self.base_path / "logs" / f"{log_name}.jsonl"
        
        if not path.exists():
            return []
        
        entries = []
        async with aiofiles.open(path, 'r') as f:
            async for line in f:
                if line.strip():
                    entries.append(json.loads(line))
        
        return entries