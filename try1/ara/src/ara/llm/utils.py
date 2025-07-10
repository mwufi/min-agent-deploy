"""
Core LLM utilities for Ara

Provides common functionality for making LLM requests across the system.
"""

import json
import os
from typing import Dict, List, Any, Optional, Literal
from dataclasses import dataclass

import httpx


@dataclass
class LLMResponse:
    """Structured response from LLM"""
    content: str
    model: str
    usage: Optional[Dict[str, int]] = None
    raw_response: Optional[Dict[str, Any]] = None


class LLMClient:
    """Shared LLM client for making requests"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://openrouter.ai/api/v1",
        default_model: str = "gpt-4o"
    ):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.base_url = base_url
        self.default_model = default_model
        
        if not self.api_key:
            raise ValueError("API key required - set OPENROUTER_API_KEY or pass api_key")
    
    async def complete(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        tool_choice: Optional[str] = None,
        **kwargs
    ) -> LLMResponse:
        """Make a completion request to the LLM"""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/ara-agent",
            "X-Title": "ARA Agent"
        }
        
        data = {
            "model": model or self.default_model,
            "messages": messages,
            "temperature": temperature,
            **kwargs
        }
        
        if max_tokens:
            data["max_tokens"] = max_tokens
        
        if tools:
            data["tools"] = tools
            data["tool_choice"] = tool_choice or "auto"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                json=data,
                headers=headers,
                timeout=60.0
            )
            response.raise_for_status()
            result = response.json()
        
        # Extract content
        choice = result["choices"][0]
        content = choice["message"]["content"]
        
        return LLMResponse(
            content=content,
            model=result.get("model", model or self.default_model),
            usage=result.get("usage"),
            raw_response=result
        )
    
    async def complete_json(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Make a completion request expecting JSON response"""
        
        # Add JSON instruction if not present
        if messages and "json" not in messages[-1]["content"].lower():
            messages = messages.copy()
            messages[-1]["content"] += "\n\nRespond with valid JSON only."
        
        response = await self.complete(messages, model=model, **kwargs)
        
        # Try to extract JSON from response
        content = response.content.strip()
        
        # Try direct parsing first
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Try to find JSON in the content
            import re
            json_match = re.search(r'(\{.*\}|\[.*\])', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            else:
                raise ValueError(f"No valid JSON found in response: {content}")


# Convenience functions
_default_client: Optional[LLMClient] = None


def get_default_client() -> LLMClient:
    """Get or create the default LLM client"""
    global _default_client
    if _default_client is None:
        _default_client = LLMClient()
    return _default_client


async def complete(
    prompt: str,
    system: Optional[str] = None,
    model: Optional[str] = None,
    **kwargs
) -> str:
    """Simple completion with string prompt"""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    client = get_default_client()
    response = await client.complete(messages, model=model, **kwargs)
    return response.content


async def extract_entities(
    text: str,
    model: str = "gpt-4o-mini"
) -> List[Dict[str, Any]]:
    """Extract entities from text using LLM"""
    
    prompt = f"""
    Extract entities (people, projects, concepts) from this text.
    
    Text: {text}
    
    Return a JSON list with entities in this format:
    [
        {{
            "type": "person|project|concept",
            "name": "entity name",
            "context": "relevant context",
            "attributes": (json object, if any)
        }}
    ]
    """
    try:
        client = get_default_client()
        response = await client.complete_json(
            [{"role": "user", "content": prompt}],
            model=model,
            temperature=0.3
        )
        
        return response if isinstance(response, list) else []
    except Exception as e:
        print(f"Error in extract_entities: {e}")
        return []


async def summarize(
    text: str,
    max_length: int = 200,
    model: str = "gpt-4o-mini"
) -> str:
    """Summarize text using LLM"""
    
    prompt = f"""
    Summarize the following text in {max_length} words or less:
    
    {text}
    """
    
    return await complete(prompt, model=model, temperature=0.5)