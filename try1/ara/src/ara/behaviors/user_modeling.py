"""User modeling behavior that maintains user profile and preferences"""

import json
from typing import TYPE_CHECKING, Dict, Any, List
from datetime import datetime
from ..behaviors.base import Behavior, Activity

if TYPE_CHECKING:
    from ..agent.core import A1


class UserModelingBehavior(Behavior):
    """Behavior that tracks and models user personality, preferences, and context"""
    
    def __init__(self):
        super().__init__("user-modeling", version="0.1.1")
        self.user_interactions_count = 0
        self.update_threshold = 5  # Update model every N interactions
        
    async def initialize(self, agent: "A1") -> None:
        """Initialize user model structure"""
        # Ensure user_model directory exists
        user_model_path = agent.path / "user_model"
        user_model_path.mkdir(exist_ok=True)
        
        # Initialize default files if they don't exist
        default_files = {
            "personality_traits": {
                "openness": 0.5,
                "conscientiousness": 0.5,
                "extraversion": 0.5,
                "agreeableness": 0.5,
                "neuroticism": 0.5,
                "traits": [],
                "last_updated": datetime.now().isoformat()
            },
            "communication_preferences": {
                "formality_level": "neutral",
                "preferred_length": "balanced",
                "technical_depth": "moderate",
                "response_style": "conversational",
                "observed_patterns": []
            },
            "dislikes": {
                "topics": [],
                "approaches": [],
                "patterns": []
            },
            "inferred_traits": {
                "interests": [],
                "expertise_areas": [],
                "communication_style": {},
                "behavioral_patterns": []
            },
            "contextual_state": {
                "current_goal": None,
                "emotional_state": "neutral",
                "recent_topics": [],
                "session_start": datetime.now().isoformat()
            }
        }
        
        for filename, default_content in default_files.items():
            file_path = user_model_path / f"{filename}.yaml"
            if not file_path.exists():
                await agent.storage.save_yaml("user_model", filename, default_content)
    
    async def on_user_message(self, message: str, agent: "A1") -> None:
        """Analyze user message and update model"""
        self.user_interactions_count += 1
        
        # Update contextual state
        activity = await self.create_activity("update_contextual_state")
        try:
            contextual_state = await agent.storage.load_yaml("user_model", "contextual_state") or {}
            
            # Add to recent topics
            if "recent_topics" not in contextual_state:
                contextual_state["recent_topics"] = []
            contextual_state["recent_topics"].append({
                "message": message[:100],  # First 100 chars
                "timestamp": datetime.now().isoformat()
            })
            # Keep only last 10 topics
            contextual_state["recent_topics"] = contextual_state["recent_topics"][-10:]
            
            await agent.storage.save_yaml("user_model", "contextual_state", contextual_state)
            await self.complete_activity(activity, "Updated contextual state")
            
        except Exception as e:
            await self.fail_activity(activity, str(e))
        
        # Check if we should run full analysis
        if self.user_interactions_count >= self.update_threshold:
            await self.update_user_model(agent)
            self.user_interactions_count = 0
    
    async def update_user_model(self, agent: "A1") -> None:
        """Run comprehensive user model update"""
        activity = await self.create_activity("comprehensive_user_analysis")
        
        try:
            activity.log("Starting comprehensive user analysis")
            
            # Get recent conversation history
            recent_convos = await agent.storage.list_files("episodic", "conversation_*.md")
            recent_convos = sorted(recent_convos)[-5:]  # Last 5 conversations
            
            # Build analysis prompt
            conversation_text = ""
            for conv_path in recent_convos:
                content = await agent.storage.load_markdown("episodic", conv_path.stem)
                if content:
                    conversation_text += f"\n\n{content}"
            
            if not conversation_text:
                activity.log("No conversation history to analyze")
                await self.complete_activity(activity, "No data to analyze")
                return
            
            # Prepare analysis prompt
            analysis_prompt = f"""Based on the following recent conversations, analyze the user's:
1. Personality traits (Big Five model)
2. Communication preferences
3. Interests and expertise areas
4. Any patterns or preferences

Conversations:
{conversation_text[:3000]}  # Limit to 3000 chars

Provide a structured analysis in JSON format with these keys:
- personality_updates: dict of trait scores (0-1)
- new_interests: list of identified interests
- communication_patterns: dict of observed patterns
- inferred_traits: list of behavioral traits
"""
            
            # Make LLM call for analysis
            activity.log("Calling LLM for user analysis")
            analysis_response = await agent.ago(analysis_prompt)
            
            # Parse and update user model
            try:
                # Extract JSON from response (basic parsing)
                import re
                json_match = re.search(r'\{.*\}', analysis_response, re.DOTALL)
                if json_match:
                    analysis_data = json.loads(json_match.group())
                    await self._apply_analysis_updates(agent, analysis_data)
                    activity.log("Successfully updated user model")
            except Exception as e:
                activity.log(f"Failed to parse analysis: {e}")
            
            await self.complete_activity(activity, "User model updated")
            
        except Exception as e:
            await self.fail_activity(activity, str(e))
    
    async def _apply_analysis_updates(self, agent: "A1", analysis: Dict[str, Any]) -> None:
        """Apply analysis results to user model files"""
        # Update personality traits
        if "personality_updates" in analysis:
            traits = await agent.storage.load_yaml("user_model", "personality_traits") or {}
            for trait, score in analysis["personality_updates"].items():
                if trait in traits:
                    # Weighted average with existing score
                    traits[trait] = (traits[trait] * 0.7 + score * 0.3)
            traits["last_updated"] = datetime.now().isoformat()
            await agent.storage.save_yaml("user_model", "personality_traits", traits)
        
        # Update interests
        if "new_interests" in analysis:
            inferred = await agent.storage.load_yaml("user_model", "inferred_traits") or {}
            if "interests" not in inferred:
                inferred["interests"] = []
            # Add new interests, avoid duplicates
            for interest in analysis["new_interests"]:
                if interest not in inferred["interests"]:
                    inferred["interests"].append(interest)
            await agent.storage.save_yaml("user_model", "inferred_traits", inferred)
    
    async def get_user_personality_traits(self, agent: "A1") -> Dict[str, Any]:
        """Get current personality traits"""
        return await agent.storage.load_yaml("user_model", "personality_traits") or {}
    
    async def get_user_context(self, agent: "A1") -> Dict[str, Any]:
        """Get current user context"""
        return await agent.storage.load_yaml("user_model", "contextual_state") or {}
    
    async def pre_process(self, prompt: str, agent: "A1") -> str:
        """Add user context to prompts if relevant"""
        # For now, just pass through
        return prompt
    
    async def post_process(self, response: str, agent: "A1") -> str:
        """Post-process responses based on user preferences"""
        # Could adjust response style based on user preferences
        return response
    
    async def periodic_task(self, agent: "A1") -> None:
        """Periodic maintenance of user model"""
        activity = await self.create_activity("periodic_user_model_maintenance")
        
        try:
            # Clean up old contextual data
            contextual_state = await agent.storage.load_yaml("user_model", "contextual_state") or {}
            
            # Remove old topics (older than 24 hours)
            if "recent_topics" in contextual_state:
                cutoff = datetime.now().timestamp() - 86400  # 24 hours
                contextual_state["recent_topics"] = [
                    topic for topic in contextual_state["recent_topics"]
                    if datetime.fromisoformat(topic["timestamp"]).timestamp() > cutoff
                ]
            
            await agent.storage.save_yaml("user_model", "contextual_state", contextual_state)
            await self.complete_activity(activity, "Maintenance completed")
            
        except Exception as e:
            await self.fail_activity(activity, str(e))