"""FastAPI server for agent chat interface."""
import asyncio
import json
import uuid
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from ara.agent.core import A1
from ara.behaviors.planning import PlanningBehavior


class ChatSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.agent = A1(api_key=None)  # Will use env var OPENROUTER_API_KEY
        self.agent.add_behavior(PlanningBehavior())
        self.messages: List[dict] = []
        self.started = False
    
    async def start(self):
        """Start the agent session."""
        if not self.started:
            await self.agent.start()
            self.started = True
    
    async def stop(self):
        """Stop the agent session."""
        if self.started:
            await self.agent.stop()
            self.started = False


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.sessions: Dict[str, ChatSession] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        
        # Create new chat session with agent
        session = ChatSession(session_id)
        await session.start()
        self.sessions[session_id] = session
        
        return session
    
    async def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        
        if session_id in self.sessions:
            session = self.sessions[session_id]
            await session.stop()
            del self.sessions[session_id]
    
    async def send_message(self, message: str, session_id: str):
        if websocket := self.active_connections.get(session_id):
            await websocket.send_text(message)
    
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        return self.sessions.get(session_id)


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown - cleanup any remaining sessions
    for session_id in list(manager.sessions.keys()):
        await manager.disconnect(session_id)


app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def get():
    return HTMLResponse("""
<!DOCTYPE html>
<html>
<head>
    <title>Agent Chat</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        #chat-container {
            background: white;
            border-radius: 10px;
            padding: 20px;
            height: 500px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        #messages {
            flex-grow: 1;
            overflow-y: auto;
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
            background-color: #fafafa;
        }
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 5px;
        }
        .user-message {
            background-color: #007bff;
            color: white;
            margin-left: 20%;
            text-align: right;
        }
        .agent-message {
            background-color: #e9ecef;
            color: #333;
            margin-right: 20%;
        }
        .system-message {
            background-color: #ffc107;
            color: #333;
            text-align: center;
            font-size: 0.9em;
            font-style: italic;
        }
        #input-container {
            display: flex;
            gap: 10px;
        }
        #messageInput {
            flex-grow: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        #sendButton {
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        #sendButton:hover {
            background-color: #0056b3;
        }
        #sendButton:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
        }
        #status {
            margin-top: 10px;
            font-size: 0.9em;
            color: #666;
        }
        .typing-indicator {
            display: none;
            padding: 10px;
            font-style: italic;
            color: #666;
        }
        .typing-indicator.show {
            display: block;
        }
    </style>
</head>
<body>
    <h1>Chat with Agent</h1>
    <div id="chat-container">
        <div id="messages"></div>
        <div class="typing-indicator" id="typingIndicator">Agent is typing...</div>
        <div id="input-container">
            <input type="text" id="messageInput" placeholder="Type your message..." />
            <button id="sendButton">Send</button>
        </div>
    </div>
    <div id="status">Connecting...</div>

    <script>
        const sessionId = generateSessionId();
        const ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const statusDiv = document.getElementById('status');
        const typingIndicator = document.getElementById('typingIndicator');
        
        function generateSessionId() {
            return 'session-' + Math.random().toString(36).substr(2, 9);
        }
        
        function addMessage(content, type = 'agent') {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}-message`;
            messageDiv.textContent = content;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        function sendMessage() {
            const message = messageInput.value.trim();
            if (message && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'user_message',
                    content: message
                }));
                addMessage(message, 'user');
                messageInput.value = '';
                sendButton.disabled = true;
                typingIndicator.classList.add('show');
            }
        }
        
        ws.onopen = function(event) {
            statusDiv.textContent = 'Connected to agent';
            addMessage('Connected to agent. You can start chatting!', 'system');
            sendButton.disabled = false;
        };
        
        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            
            if (data.type === 'agent_message') {
                addMessage(data.content, 'agent');
                typingIndicator.classList.remove('show');
                sendButton.disabled = false;
            } else if (data.type === 'error') {
                addMessage(`Error: ${data.content}`, 'system');
                typingIndicator.classList.remove('show');
                sendButton.disabled = false;
            }
        };
        
        ws.onclose = function(event) {
            statusDiv.textContent = 'Disconnected from agent';
            addMessage('Disconnected from agent', 'system');
            sendButton.disabled = true;
        };
        
        ws.onerror = function(error) {
            statusDiv.textContent = 'Connection error';
            addMessage('Connection error occurred', 'system');
        };
        
        sendButton.onclick = sendMessage;
        
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    </script>
</body>
</html>
    """)


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    session = await manager.connect(websocket, session_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "user_message":
                user_message = message_data.get("content", "")
                
                try:
                    # Get agent response
                    response = await session.agent.ago(user_message)
                    
                    # Send agent response back to client
                    await manager.send_message(
                        json.dumps({
                            "type": "agent_message",
                            "content": response
                        }),
                        session_id
                    )
                    
                except Exception as e:
                    # Send error message
                    await manager.send_message(
                        json.dumps({
                            "type": "error",
                            "content": str(e)
                        }),
                        session_id
                    )
                    
    except WebSocketDisconnect:
        await manager.disconnect(session_id)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)