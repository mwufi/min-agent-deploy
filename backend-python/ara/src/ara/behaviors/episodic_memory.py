"""Episodic memory behavior that periodically summarizes conversations"""

from typing import TYPE_CHECKING, List, Dict, Any
from datetime import datetime, timedelta
from .base import Behavior

if TYPE_CHECKING:
    from ..agent.core import A1


class EpisodicMemoryBehavior(Behavior):
    """Behavior that creates episodic memories by summarizing conversation chunks"""
    
    def __init__(self, summary_interval: int = 10):
        super().__init__("episodic-memory", version="0.1.0")
        self.summary_interval = summary_interval  # Summarize every N interactions
        self.interaction_count = 0
        self.pending_interactions: List[Dict[str, str]] = []
    
    async def on_user_message(self, message: str, agent: "A1") -> None:
        """Track user messages for episodic summary"""
        self.pending_interactions.append({
            "role": "user",
            "content": message,
            "timestamp": datetime.now().isoformat()
        })
        self.interaction_count += 1
        
        # Check if we should create a summary
        if self.interaction_count >= self.summary_interval:
            await self._create_episodic_summary(agent)
            self.interaction_count = 0
    
    async def post_process(self, response: str, agent: "A1") -> str:
        """Track assistant responses"""
        self.pending_interactions.append({
            "role": "assistant", 
            "content": response[:500],  # Limit length
            "timestamp": datetime.now().isoformat()
        })
        return response
    
    async def _create_episodic_summary(self, agent: "A1") -> None:
        """Create an episodic memory summary"""
        activity = await self.create_activity("create_episodic_summary")
        
        try:
            activity.log(f"Creating episodic summary of {len(self.pending_interactions)} interactions")
            
            # Build conversation text for summary
            conversation_text = ""
            for interaction in self.pending_interactions:
                role = interaction["role"].capitalize()
                content = interaction["content"]
                conversation_text += f"{role}: {content}\n\n"
            
            # Create summary prompt
            summary_prompt = f"""Summarize the following conversation segment into a concise episodic memory.
Focus on:
1. Key topics discussed
2. Important decisions or conclusions
3. User preferences or characteristics revealed
4. Emotional tone or context

Conversation:
{conversation_text[:2000]}  # Limit to 2000 chars

Provide a structured summary with these sections:
- Topics: main subjects discussed
- Key Points: important information exchanged
- User Insights: what we learned about the user
- Emotional Context: overall tone and mood
"""
            
            # Get summary from LLM
            activity.log("Calling LLM for episodic summary")
            summary = await agent.ago(summary_prompt)
            
            # Save episodic memory
            timestamp = datetime.now()
            memory_entry = {
                "timestamp": timestamp.isoformat(),
                "interaction_count": len(self.pending_interactions),
                "summary": summary,
                "time_span": {
                    "start": self.pending_interactions[0]["timestamp"],
                    "end": self.pending_interactions[-1]["timestamp"]
                }
            }
            
            # Append to episodic memories file
            memories_content = f"\n\n## Memory - {timestamp.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            memories_content += f"**Interactions:** {len(self.pending_interactions)}\n"
            memories_content += f"**Time Span:** {memory_entry['time_span']['start']} to {memory_entry['time_span']['end']}\n\n"
            memories_content += f"### Summary\n\n{summary}\n"
            memories_content += "\n---\n"
            
            # Load existing memories
            existing = await agent.storage.load_markdown("episodic", "memories")
            if existing:
                memories_content = existing + memories_content
            else:
                memories_content = "# Episodic Memories\n\n" + memories_content
            
            await agent.storage.save_markdown("episodic", "memories", memories_content)
            
            # Also save structured version
            await agent.storage.append_to_log("episodic_memories", memory_entry)
            
            # Clear pending interactions
            self.pending_interactions = []
            
            activity.log(f"Episodic memory created and saved")
            await self.complete_activity(activity, {"summary_length": len(summary)})
            
        except Exception as e:
            await self.fail_activity(activity, str(e))
    
    async def periodic_task(self, agent: "A1") -> None:
        """Periodic maintenance of episodic memories"""
        activity = await self.create_activity("episodic_maintenance")
        
        try:
            # Could implement memory consolidation, cleanup of old memories, etc.
            activity.log("Running episodic memory maintenance")
            
            # For now, just ensure we don't have too many pending interactions
            if len(self.pending_interactions) > 20:
                activity.log("Too many pending interactions, forcing summary")
                await self._create_episodic_summary(agent)
            
            await self.complete_activity(activity)
            
        except Exception as e:
            await self.fail_activity(activity, str(e))
    
    async def pre_process(self, prompt: str, agent: "A1") -> str:
        """Could inject relevant memories into context"""
        # For now, just pass through
        return prompt