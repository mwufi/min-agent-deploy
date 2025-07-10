"""
Knowledge Management Behavior for Ara

This behavior extracts entities from conversations and maintains dossiers
about people, projects, and concepts mentioned by the user.
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Dict, List, Any, Optional

from .base import Behavior, Activity
from ..llm import utils as llm

if TYPE_CHECKING:
    from ..agent.core import A1


class KnowledgeManagementBehavior(Behavior):
    """
    Manages knowledge about entities mentioned in conversations.
    Extracts people, projects, and concepts, then maintains dossiers.
    """
    
    name = "knowledge-management"
    version = "0.1.0"
    
    def __init__(self, storage_path: Optional[Path] = None):
        super().__init__("knowledge-management")
        self.storage_path = storage_path
        self.pending_extractions = []
        
    async def initialize(self, agent: "A1") -> None:
        """Initialize the behavior with agent context."""
        await super().initialize(agent)
        
        # Use agent's storage path if not specified
        if not self.storage_path and agent.storage.base_path:
            self.storage_path = Path(agent.storage.base_path)
            
    async def on_user_message(self, message: str, agent: "A1") -> None:
        """Extract entities when user sends a message."""
        activity = await self.create_activity("extract_entities")
        
        try:
            # Extract entities from the message
            activity.log(f"Extracting entities from message: {message}")
            entities = await self._extract_entities_from_message(message, agent)
            
            if entities:
                activity.log(f"Extracted {len(entities)} entities from message")
                
                # Queue for processing (could be done async)
                self.pending_extractions.extend(entities)
                
                # Process immediately for now
                await self._process_pending_entities(agent)
                
            await self.complete_activity(activity)
        except Exception as e:
            await self.fail_activity(activity, f"Failed to extract entities: {e}")
    
    async def post_process(self, response: str, agent: "A1") -> str:
        """Also extract entities from agent responses."""
        # Extract from agent's response too
        entities = await self._extract_entities_from_message(response, agent)
        if entities:
            self.pending_extractions.extend(entities)
            await self._process_pending_entities(agent)
            
        return response
    
    async def _extract_entities_from_message(
        self, 
        message: str, 
        agent: "A1"
    ) -> List[Dict[str, Any]]:
        """Use LLM to extract entities from a message."""
        try:
            # Use the LLM utility for entity extraction
            entities = await llm.extract_entities(message)
            return entities
        except Exception as e:
            self.logger.error(f"Entity extraction failed: {e}")
            return []
    
    async def _process_pending_entities(self, agent: "A1") -> None:
        """Process extracted entities and update dossiers."""
        if not self.pending_extractions or not agent.storage.base_path:
            return
            
        storage = agent.storage
        
        activity = await self.create_activity("update_dossiers")
        
        try:
            processed = 0
            
            while self.pending_extractions:
                entity = self.pending_extractions.pop(0)
                
                try:
                    await self._update_dossier(entity, storage)
                    processed += 1
                except Exception as e:
                    activity.log(f"Failed to update dossier: {e}", level="error")
                    
            activity.log(f"Updated {processed} dossiers")
            await self.complete_activity(activity)
        except Exception as e:
            await self.fail_activity(activity, f"Failed to process entities: {e}")
    
    async def _update_dossier(
        self, 
        entity: Dict[str, Any], 
        storage
    ) -> None:
        """Update or create a dossier for an entity."""
        entity_type = entity.get("type", "unknown")
        entity_name = entity.get("name", "unnamed")
        
        # Sanitize name for filename
        safe_name = re.sub(r'[^\w\s-]', '', entity_name.lower())
        safe_name = re.sub(r'[-\s]+', '_', safe_name)
        
        # Determine path
        if entity_type == "person":
            dossier_path = f"dossiers/people/{safe_name}.yaml"
        elif entity_type == "project":
            dossier_path = f"dossiers/projects/{safe_name}.yaml"
        elif entity_type == "concept":
            dossier_path = f"dossiers/concepts/{safe_name}.yaml"
        else:
            return
            
        # Load existing dossier or create new
        try:
            existing = await storage.load_yaml(dossier_path)
        except:
            existing = {
                "name": entity_name,
                "type": entity_type,
                "created": datetime.now().isoformat(),
                "mentions": [],
                "attributes": {}
            }
        
        # Add new mention
        mention = {
            "timestamp": datetime.now().isoformat(),
            "context": entity.get("context", ""),
            "source": "conversation"
        }
        
        if "mentions" not in existing:
            existing["mentions"] = []
        existing["mentions"].append(mention)
        
        # Merge attributes
        new_attrs = entity.get("attributes", {})
        if new_attrs:
            if "attributes" not in existing:
                existing["attributes"] = {}
            existing["attributes"].update(new_attrs)
        
        # Update last_seen
        existing["last_seen"] = datetime.now().isoformat()
        
        # Save back
        await storage.save_yaml(dossier_path, existing)
        self.logger.info(f"Updated dossier: {dossier_path}")
    
    async def periodic_task(self, agent: "A1") -> None:
        """Periodic consolidation of dossiers."""
        activity = await self.create_activity("consolidate_dossiers")
        
        try:
            # Could implement:
            # - Deduplication of entities
            # - Relationship extraction between entities
            # - Summary generation for each dossier
            activity.log("Dossier consolidation not yet implemented")
            await self.complete_activity(activity)
        except Exception as e:
            await self.fail_activity(activity, f"Failed to consolidate dossiers: {e}")
    
    def prompt_block(self) -> str:
        """Provide context about knowledge management to the agent."""
        return """
## Knowledge Management

You have access to dossiers about people, projects, and concepts mentioned in conversations.
These are stored in:
- /dossiers/people/ - Information about individuals
- /dossiers/projects/ - Project details and status
- /dossiers/concepts/ - Definitions and explanations

When discussing entities you've seen before, you can reference these dossiers for context.
The Knowledge Management system automatically extracts and updates entity information.
"""