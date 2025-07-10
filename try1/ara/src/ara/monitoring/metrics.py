"""Metrics collection for observability"""

from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from collections import defaultdict
import statistics
from loguru import logger


@dataclass
class ToolMetric:
    """Metrics for a single tool call"""
    tool_name: str
    duration: float
    success: bool
    timestamp: datetime
    args: Optional[Dict] = None
    error: Optional[str] = None


@dataclass
class MetricsSummary:
    """Summary statistics for metrics"""
    count: int = 0
    success_count: int = 0
    failure_count: int = 0
    total_duration: float = 0.0
    min_duration: float = float('inf')
    max_duration: float = 0.0
    avg_duration: float = 0.0
    p50_duration: float = 0.0
    p95_duration: float = 0.0
    p99_duration: float = 0.0


class MetricsCollector:
    """Collects and aggregates metrics for agent operations"""
    
    def __init__(self):
        self.tool_metrics: List[ToolMetric] = []
        self.conversation_metrics: List[Dict] = []
        self._tool_durations: Dict[str, List[float]] = defaultdict(list)
    
    def record_tool_call(
        self,
        tool_name: str,
        duration: float,
        success: bool,
        args: Optional[Dict] = None,
        error: Optional[str] = None
    ) -> None:
        """Record a tool call metric"""
        metric = ToolMetric(
            tool_name=tool_name,
            duration=duration,
            success=success,
            timestamp=datetime.now(),
            args=args,
            error=error
        )
        
        self.tool_metrics.append(metric)
        self._tool_durations[tool_name].append(duration)
        
        # Log if slow or failed
        if duration > 1.0:
            logger.warning(f"Slow tool call: {tool_name} took {duration:.2f}s")
        if not success:
            logger.error(f"Tool call failed: {tool_name} - {error}")
    
    def record_conversation_turn(
        self,
        prompt_tokens: int,
        completion_tokens: int,
        duration: float
    ) -> None:
        """Record metrics for a conversation turn"""
        self.conversation_metrics.append({
            "timestamp": datetime.now(),
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "duration": duration
        })
    
    def get_tool_summary(self, tool_name: Optional[str] = None) -> Dict[str, MetricsSummary]:
        """Get summary statistics for tool calls"""
        summaries = {}
        
        # Filter metrics by tool name if specified
        if tool_name:
            metrics = [m for m in self.tool_metrics if m.tool_name == tool_name]
            tool_names = [tool_name] if metrics else []
        else:
            metrics = self.tool_metrics
            tool_names = list(self._tool_durations.keys())
        
        for name in tool_names:
            tool_metrics = [m for m in metrics if m.tool_name == name]
            if not tool_metrics:
                continue
            
            durations = sorted([m.duration for m in tool_metrics])
            summary = MetricsSummary(
                count=len(tool_metrics),
                success_count=sum(1 for m in tool_metrics if m.success),
                failure_count=sum(1 for m in tool_metrics if not m.success),
                total_duration=sum(durations),
                min_duration=min(durations),
                max_duration=max(durations),
                avg_duration=statistics.mean(durations)
            )
            
            # Calculate percentiles
            if len(durations) > 1:
                summary.p50_duration = statistics.median(durations)
                summary.p95_duration = durations[int(len(durations) * 0.95)]
                summary.p99_duration = durations[int(len(durations) * 0.99)]
            
            summaries[name] = summary
        
        return summaries
    
    def get_conversation_summary(self) -> Dict:
        """Get summary of conversation metrics"""
        if not self.conversation_metrics:
            return {}
        
        total_tokens = sum(m["total_tokens"] for m in self.conversation_metrics)
        total_duration = sum(m["duration"] for m in self.conversation_metrics)
        
        return {
            "turns": len(self.conversation_metrics),
            "total_tokens": total_tokens,
            "total_duration": total_duration,
            "avg_tokens_per_turn": total_tokens / len(self.conversation_metrics),
            "avg_duration_per_turn": total_duration / len(self.conversation_metrics)
        }
    
    def clear_metrics(self) -> None:
        """Clear all collected metrics"""
        self.tool_metrics.clear()
        self.conversation_metrics.clear()
        self._tool_durations.clear()