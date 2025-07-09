"""Base behavior system for agent plugins"""

import asyncio
from abc import ABC, abstractmethod
from typing import Any, List, Optional, TYPE_CHECKING, Dict, Callable, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import uuid
from ..logging import get_logger
from packaging import version

if TYPE_CHECKING:
    from ..agent.core import A1


class ActivityStatus(Enum):
    """Status of an activity"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Activity:
    """Represents a short-running process within a behavior"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    behavior_name: str = ""
    status: ActivityStatus = ActivityStatus.PENDING
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    result: Any = None
    error: Optional[str] = None
    logs: List[str] = field(default_factory=list)
    
    def log(self, message: str) -> None:
        """Add a log message to this activity"""
        timestamp = datetime.now().isoformat()
        self.logs.append(f"[{timestamp}] {message}")
        logger = get_logger(__name__, behavior=self.behavior_name, activity=self.name)
        logger.debug(message)
    
    @property
    def duration(self) -> Optional[timedelta]:
        """Get the duration of this activity"""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None


class Behavior(ABC):
    """Base class for agent behaviors with versioning and activities"""
    
    def __init__(self, name: str, version: str = "1.0.0"):
        self.name = name
        self.version = version
        self.enabled = True
        self.last_run = None
        self.interval: Optional[float] = None  # Seconds between periodic runs
        self.activities: Dict[str, Activity] = {}
        self._periodic_task: Optional[asyncio.Task] = None
        self.logger = get_logger(__name__, behavior=name)
    
    @property
    def full_name(self) -> str:
        """Get full name with version"""
        return f"{self.name}.version={self.version}"
    
    async def create_activity(self, name: str) -> Activity:
        """Create and track a new activity"""
        activity = Activity(
            name=name,
            behavior_name=self.name,
            status=ActivityStatus.RUNNING,
            start_time=datetime.now()
        )
        self.activities[activity.id] = activity
        activity.log(f"Started activity: {name}")
        return activity
    
    async def complete_activity(self, activity: Activity, result: Any = None) -> None:
        """Mark an activity as completed"""
        activity.status = ActivityStatus.COMPLETED
        activity.end_time = datetime.now()
        activity.result = result
        activity.log(f"Completed activity (duration: {activity.duration})")
    
    async def fail_activity(self, activity: Activity, error: str) -> None:
        """Mark an activity as failed"""
        activity.status = ActivityStatus.FAILED
        activity.end_time = datetime.now()
        activity.error = error
        activity.log(f"Failed activity: {error}")
    
    def set_interval(self, seconds: float) -> None:
        """Set the interval for periodic execution"""
        self.interval = seconds
    
    async def start_periodic_execution(self, agent: "A1") -> None:
        """Start periodic execution of this behavior"""
        if self.interval and not self._periodic_task:
            self._periodic_task = asyncio.create_task(self._periodic_loop(agent))
            self.logger.info(f"Started periodic execution for {self.name} every {self.interval}s")
    
    async def stop_periodic_execution(self) -> None:
        """Stop periodic execution"""
        if self._periodic_task:
            self._periodic_task.cancel()
            self._periodic_task = None
            self.logger.info(f"Stopped periodic execution for {self.name}")
    
    async def _periodic_loop(self, agent: "A1") -> None:
        """Internal periodic execution loop"""
        while True:
            try:
                await asyncio.sleep(self.interval)
                if self.enabled:
                    await self.periodic_task(agent)
                    self.last_run = datetime.now()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in {self.name} periodic task: {e}")
    
    @abstractmethod
    async def pre_process(self, prompt: str, agent: "A1") -> str:
        """Pre-process user prompt before sending to LLM"""
        return prompt
    
    @abstractmethod
    async def post_process(self, response: str, agent: "A1") -> str:
        """Post-process LLM response before returning to user"""
        return response
    
    async def on_tool_call(self, tool_name: str, args: dict, result: Any, agent: "A1") -> None:
        """Called when a tool is executed"""
        pass
    
    async def on_error(self, error: Exception, agent: "A1") -> None:
        """Called when an error occurs"""
        pass
    
    async def periodic_task(self, agent: "A1") -> None:
        """Periodic task that runs at intervals"""
        pass
    
    async def on_user_message(self, message: str, agent: "A1") -> None:
        """Called when user sends a message"""
        pass


class BehaviorManager:
    """Manages all behaviors for an agent with dependency checking"""
    
    def __init__(self):
        self.behaviors: Dict[str, Behavior] = {}
        self._running_activities: Set[Activity] = set()
        self.logger = get_logger(__name__, context="behavior_manager")
    
    def register(self, behavior: Behavior) -> None:
        """Register a new behavior"""
        self.behaviors[behavior.name] = behavior
        self.logger.info(f"Registered behavior: {behavior.full_name}")
    
    def unregister(self, behavior_name: str) -> None:
        """Unregister a behavior by name"""
        if behavior_name in self.behaviors:
            behavior = self.behaviors.pop(behavior_name)
            asyncio.create_task(behavior.stop_periodic_execution())
    
    def has_behavior(self, requirement: str) -> bool:
        """Check if a behavior requirement is satisfied
        
        Examples:
            has_behavior("user-modeling")
            has_behavior("user-modeling.version>=0.1.1")
        """
        if "." in requirement and "version" in requirement:
            # Parse version requirement
            parts = requirement.split(".version")
            behavior_name = parts[0]
            version_spec = parts[1]
            
            if behavior_name not in self.behaviors:
                return False
            
            behavior = self.behaviors[behavior_name]
            
            # Parse version comparison
            if ">=" in version_spec:
                required_version = version_spec.replace(">=", "")
                return version.parse(behavior.version) >= version.parse(required_version)
            elif "==" in version_spec:
                required_version = version_spec.replace("==", "")
                return version.parse(behavior.version) == version.parse(required_version)
            elif ">" in version_spec:
                required_version = version_spec.replace(">", "")
                return version.parse(behavior.version) > version.parse(required_version)
            
        else:
            # Simple name check
            return requirement in self.behaviors
        
        return False
    
    def get_behavior(self, name: str) -> Optional[Behavior]:
        """Get a behavior by name"""
        return self.behaviors.get(name)
    
    def get_all_activities(self) -> List[Activity]:
        """Get all activities from all behaviors"""
        activities = []
        for behavior in self.behaviors.values():
            activities.extend(behavior.activities.values())
        return activities
    
    def get_running_activities(self) -> List[Activity]:
        """Get currently running activities"""
        return [a for a in self.get_all_activities() if a.status == ActivityStatus.RUNNING]
    
    async def start_all_periodic_tasks(self, agent: "A1") -> None:
        """Start periodic execution for all behaviors"""
        for behavior in self.behaviors.values():
            if behavior.interval:
                await behavior.start_periodic_execution(agent)
    
    async def stop_all_periodic_tasks(self) -> None:
        """Stop all periodic tasks"""
        for behavior in self.behaviors.values():
            await behavior.stop_periodic_execution()
    
    async def pre_process(self, prompt: str, agent: "A1") -> str:
        """Run all pre-process hooks"""
        for behavior in self.behaviors.values():
            if behavior.enabled:
                try:
                    prompt = await behavior.pre_process(prompt, agent)
                except Exception as e:
                    self.logger.error(f"Error in {behavior.name} pre_process: {e}")
        return prompt
    
    async def post_process(self, response: str, agent: "A1") -> str:
        """Run all post-process hooks"""
        for behavior in self.behaviors.values():
            if behavior.enabled:
                try:
                    response = await behavior.post_process(response, agent)
                except Exception as e:
                    self.logger.error(f"Error in {behavior.name} post_process: {e}")
        return response
    
    async def on_tool_call(self, tool_name: str, args: dict, result: Any, agent: "A1") -> None:
        """Notify all behaviors of a tool call"""
        for behavior in self.behaviors.values():
            if behavior.enabled:
                try:
                    await behavior.on_tool_call(tool_name, args, result, agent)
                except Exception as e:
                    self.logger.error(f"Error in {behavior.name} on_tool_call: {e}")
    
    async def on_error(self, error: Exception, agent: "A1") -> None:
        """Notify all behaviors of an error"""
        for behavior in self.behaviors.values():
            if behavior.enabled:
                try:
                    await behavior.on_error(error, agent)
                except Exception as e:
                    self.logger.error(f"Error in {behavior.name} on_error: {e}")
    
    async def on_user_message(self, message: str, agent: "A1") -> None:
        """Notify all behaviors of a user message"""
        for behavior in self.behaviors.values():
            if behavior.enabled:
                try:
                    await behavior.on_user_message(message, agent)
                except Exception as e:
                    self.logger.error(f"Error in {behavior.name} on_user_message: {e}")