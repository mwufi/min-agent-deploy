"""Example anxiety behavior that runs periodically"""

from typing import TYPE_CHECKING
from datetime import datetime
from .base import Behavior

if TYPE_CHECKING:
    from ..agent.core import A1


class AnxietyBehavior(Behavior):
    """A behavior that models anxiety by periodically checking for concerning patterns"""
    
    def __init__(self, check_interval: float = 10.0):
        super().__init__("anxiety", version="0.1.0")
        self.set_interval(check_interval)  # Check every 10 seconds by default
        self.anxiety_level = 0.5  # 0-1 scale
        self.triggers = []
    
    async def periodic_task(self, agent: "A1") -> None:
        """Periodically check for anxiety triggers"""
        activity = await self.create_activity("anxiety_check")
        
        try:
            activity.log("Checking for anxiety triggers...")
            
            # Check recent topics for triggers
            context = await agent.storage.load_yaml("user_model", "contextual_state")
            if context and "recent_topics" in context:
                recent_messages = [t["message"] for t in context["recent_topics"][-5:]]
                
                # Simple trigger detection
                anxiety_keywords = ["worry", "stress", "anxious", "nervous", "fear", "panic"]
                trigger_count = sum(
                    1 for msg in recent_messages 
                    for keyword in anxiety_keywords 
                    if keyword in msg.lower()
                )
                
                if trigger_count > 0:
                    self.anxiety_level = min(1.0, self.anxiety_level + 0.1 * trigger_count)
                    activity.log(f"Found {trigger_count} anxiety triggers, level now: {self.anxiety_level:.2f}")
                else:
                    # Decay anxiety over time
                    self.anxiety_level = max(0.0, self.anxiety_level - 0.05)
                    activity.log(f"No triggers found, anxiety decaying to: {self.anxiety_level:.2f}")
            
            # Store anxiety state
            await agent.storage.save_yaml("behaviors", "anxiety_state", {
                "level": self.anxiety_level,
                "last_check": datetime.now().isoformat(),
                "triggers": self.triggers[-10:]  # Keep last 10 triggers
            })
            
            await self.complete_activity(activity, {"anxiety_level": self.anxiety_level})
            
        except Exception as e:
            await self.fail_activity(activity, str(e))
    
    async def pre_process(self, prompt: str, agent: "A1") -> str:
        """Modify prompts based on anxiety level"""
        if self.anxiety_level > 0.7:
            # Add calming context to high anxiety situations
            return f"[User seems anxious, please respond calmly and reassuringly] {prompt}"
        return prompt
    
    async def post_process(self, response: str, agent: "A1") -> str:
        """Adjust responses based on anxiety level"""
        if self.anxiety_level > 0.7:
            # Could modify response to be more calming
            # For now, just pass through
            pass
        return response
    
    async def on_user_message(self, message: str, agent: "A1") -> None:
        """React to user messages"""
        # Quick check for immediate anxiety triggers
        if any(word in message.lower() for word in ["panic", "emergency", "help"]):
            self.anxiety_level = min(1.0, self.anxiety_level + 0.3)
            activity = await self.create_activity("emergency_response")
            activity.log(f"Emergency keywords detected! Anxiety level: {self.anxiety_level}")
            await self.complete_activity(activity)