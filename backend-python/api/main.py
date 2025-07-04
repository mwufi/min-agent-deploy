import os
import json
from typing import List, Optional
from openai.types.chat.chat_completion_message_param import ChatCompletionMessageParam
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from api.utils.prompt import ClientMessage, convert_to_openai_messages
from api.utils.tools import get_current_weather
from services.agents import AgentService

load_dotenv(".env.local")

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)


class MessagesRequest(BaseModel):
    messages: List[ClientMessage]


class CreateAgentRequest(BaseModel):
    name: str
    instructions: str
    model: Optional[str] = "gpt-4o"
    temperature: Optional[float] = 0.7


class UpdateAgentRequest(BaseModel):
    name: Optional[str] = None
    instructions: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None


class WeatherRequest(BaseModel):
    latitude: float
    longitude: float
    units: Optional[str] = "celsius"


available_tools = {
    "get_current_weather": get_current_weather,
}

def do_stream(messages: List[ChatCompletionMessageParam]):
    stream = client.chat.completions.create(
        messages=messages,
        model="gpt-4o",
        stream=True,
        tools=[{
            "type": "function",
            "function": {
                "name": "get_current_weather",
                "description": "Get the current weather at a location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "latitude": {
                            "type": "number",
                            "description": "The latitude of the location",
                        },
                        "longitude": {
                            "type": "number",
                            "description": "The longitude of the location",
                        },
                    },
                    "required": ["latitude", "longitude"],
                },
            },
        }]
    )

    return stream

def stream_text(messages: List[ChatCompletionMessageParam], protocol: str = 'data'):
    draft_tool_calls = []
    draft_tool_calls_index = -1

    stream = client.chat.completions.create(
        messages=messages,
        model="gpt-4o",
        stream=True,
        tools=[{
            "type": "function",
            "function": {
                "name": "get_current_weather",
                "description": "Get the current weather at a location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "latitude": {
                            "type": "number",
                            "description": "The latitude of the location",
                        },
                        "longitude": {
                            "type": "number",
                            "description": "The longitude of the location",
                        },
                    },
                    "required": ["latitude", "longitude"],
                },
            },
        }]
    )

    for chunk in stream:
        for choice in chunk.choices:
            if choice.finish_reason == "stop":
                continue

            elif choice.finish_reason == "tool_calls":
                for tool_call in draft_tool_calls:
                    yield '9:{{"toolCallId":"{id}","toolName":"{name}","args":{args}}}\n'.format(
                        id=tool_call["id"],
                        name=tool_call["name"],
                        args=tool_call["arguments"])

                for tool_call in draft_tool_calls:
                    tool_result = available_tools[tool_call["name"]](
                        **json.loads(tool_call["arguments"]))

                    yield 'a:{{"toolCallId":"{id}","toolName":"{name}","args":{args},"result":{result}}}\n'.format(
                        id=tool_call["id"],
                        name=tool_call["name"],
                        args=tool_call["arguments"],
                        result=json.dumps(tool_result))

            elif choice.delta.tool_calls:
                for tool_call in choice.delta.tool_calls:
                    id = tool_call.id
                    name = tool_call.function.name
                    arguments = tool_call.function.arguments

                    if (id is not None):
                        draft_tool_calls_index += 1
                        draft_tool_calls.append(
                            {"id": id, "name": name, "arguments": ""})

                    else:
                        draft_tool_calls[draft_tool_calls_index]["arguments"] += arguments

            else:
                yield '0:{text}\n'.format(text=json.dumps(choice.delta.content))

        if chunk.choices == []:
            usage = chunk.usage
            prompt_tokens = usage.prompt_tokens
            completion_tokens = usage.completion_tokens

            yield 'e:{{"finishReason":"{reason}","usage":{{"promptTokens":{prompt},"completionTokens":{completion}}},"isContinued":false}}\n'.format(
                reason="tool-calls" if len(
                    draft_tool_calls) > 0 else "stop",
                prompt=prompt_tokens,
                completion=completion_tokens
            )


@app.post("/api/agents")
async def create_agent(request: CreateAgentRequest):
    """Create a new agent with name and instructions"""
    agent = AgentService.create_agent(request.name, request.instructions)
    return agent


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get agent by ID using path parameter"""
    # This would typically fetch from database
    return {"id": agent_id, "status": "active"}


@app.put("/api/agents/{agent_id}")
async def update_agent(agent_id: str, request: UpdateAgentRequest):
    """Update agent with partial data"""
    # This would typically update in database
    return {"id": agent_id, "updated": True, "data": request.model_dump(exclude_none=True)}


@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete agent by ID"""
    # This would typically delete from database
    return {"id": agent_id, "deleted": True}


@app.get("/api/agents")
async def list_agents(
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    search: Optional[str] = Query(default=None)
):
    """List agents with query parameters"""
    # This would typically query database
    return {
        "agents": [],
        "limit": limit,
        "offset": offset,
        "search": search,
        "total": 0
    }


@app.post("/api/weather")
async def get_weather_data(request: WeatherRequest):
    """Get weather data using request body"""
    result = get_current_weather(
        latitude=request.latitude,
        longitude=request.longitude
    )
    return {
        "weather": result,
        "units": request.units,
        "location": {
            "latitude": request.latitude,
            "longitude": request.longitude
        }
    }


@app.get("/api/weather")
async def get_weather_query(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    units: str = Query(default="celsius", regex="^(celsius|fahrenheit)$")
):
    """Get weather data using query parameters"""
    result = get_current_weather(latitude=lat, longitude=lon)
    return {
        "weather": result,
        "units": units,
        "location": {"latitude": lat, "longitude": lon}
    }


@app.post("/api/chat")
async def handle_chat_data(request: MessagesRequest, protocol: str = Query('data')):
    messages = request.messages
    openai_messages = convert_to_openai_messages(messages)

    response = StreamingResponse(stream_text(openai_messages, protocol))
    response.headers['x-vercel-ai-data-stream'] = 'v1'
    return response