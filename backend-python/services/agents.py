from pydantic import BaseModel
import uuid


class Agent(BaseModel):
    id: str
    name: str
    instructions: str


class AgentService:
    @staticmethod
    def create_agent(name: str, instructions: str):
        print(f"Creating agent {name} with instructions {instructions}")
        return Agent(id=str(uuid.uuid4()), name=name, instructions=instructions)

    @staticmethod
    def get_agent(id: str):
        print(f"Getting agent {id}")
        return Agent(id=id, name="Agent 1", instructions="You are a helpful assistant")
    
    