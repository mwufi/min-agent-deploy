"""Live terminal display for monitoring behaviors and activities"""

import asyncio
from typing import TYPE_CHECKING, Optional, List
from datetime import datetime
from rich.live import Live
from rich.layout import Layout
from rich.panel import Panel
from rich.table import Table
from rich.tree import Tree
from rich.console import Group
from rich.text import Text
from rich.align import Align
from loguru import logger

if TYPE_CHECKING:
    from ..agent.core import A1
    from ..behaviors.base import Activity, ActivityStatus


class LiveDisplay:
    """Live terminal display for agent monitoring"""
    
    def __init__(self, agent: "A1"):
        self.agent = agent
        self.live: Optional[Live] = None
        self._running = False
        self._update_task: Optional[asyncio.Task] = None
        self.selected_activity_id: Optional[str] = None
        self.log_buffer: List[str] = []
        self.max_log_lines = 20
    
    async def start(self) -> None:
        """Start the live display"""
        if self._running:
            return
        
        self._running = True
        self.layout = self._create_layout()
        self.live = Live(self.layout, refresh_per_second=2, screen=True)
        self.live.start()
        
        # Start update loop
        self._update_task = asyncio.create_task(self._update_loop())
        logger.info("Started live display")
    
    async def stop(self) -> None:
        """Stop the live display"""
        if not self._running:
            return
        
        self._running = False
        
        if self._update_task:
            self._update_task.cancel()
            try:
                await self._update_task
            except asyncio.CancelledError:
                pass
        
        if self.live:
            self.live.stop()
        
        logger.info("Stopped live display")
    
    def _create_layout(self) -> Layout:
        """Create the layout structure"""
        layout = Layout()
        
        # Main split
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body"),
            Layout(name="footer", size=3)
        )
        
        # Body split
        layout["body"].split_row(
            Layout(name="sidebar", ratio=1),
            Layout(name="main", ratio=3)
        )
        
        # Main area split
        layout["main"].split_column(
            Layout(name="activity_detail", ratio=2),
            Layout(name="metrics", ratio=1)
        )
        
        return layout
    
    async def _update_loop(self) -> None:
        """Update the display periodically"""
        while self._running:
            try:
                self._update_display()
                await asyncio.sleep(0.5)
            except Exception as e:
                logger.error(f"Error updating display: {e}")
    
    def _update_display(self) -> None:
        """Update all display components"""
        # Header
        self.layout["header"].update(
            Panel(
                Align.center(
                    Text("🤖 ARA Agent Monitor", style="bold cyan"),
                    vertical="middle"
                ),
                border_style="cyan"
            )
        )
        
        # Sidebar - Behavior tree
        self.layout["sidebar"].update(self._create_behavior_tree())
        
        # Activity detail
        self.layout["activity_detail"].update(self._create_activity_detail())
        
        # Metrics
        self.layout["metrics"].update(self._create_metrics_display())
        
        # Footer
        self.layout["footer"].update(self._create_footer())
    
    def _create_behavior_tree(self) -> Panel:
        """Create the behavior and activity tree"""
        tree = Tree("📊 Behaviors & Activities")
        
        for behavior in self.agent.behavior_manager.behaviors.values():
            # Add behavior node
            behavior_text = f"{behavior.name} v{behavior.version}"
            if behavior.enabled:
                behavior_text += " ✅"
            else:
                behavior_text += " ❌"
            
            if behavior.interval:
                behavior_text += f" ⏱️ {behavior.interval}s"
            
            behavior_node = tree.add(behavior_text, style="bold green" if behavior.enabled else "dim")
            
            # Add activities
            running_activities = [a for a in behavior.activities.values() 
                                if a.status.value == "running"]
            completed_activities = [a for a in behavior.activities.values() 
                                  if a.status.value == "completed"][-5:]  # Last 5
            
            # Running activities
            if running_activities:
                running_node = behavior_node.add("🏃 Running", style="yellow")
                for activity in running_activities:
                    activity_text = f"{activity.name} ({self._format_duration(activity)})"
                    style = "bold yellow" if activity.id == self.selected_activity_id else "yellow"
                    running_node.add(activity_text, style=style)
            
            # Recent completed
            if completed_activities:
                completed_node = behavior_node.add("✅ Recent", style="green")
                for activity in completed_activities:
                    duration = activity.duration.total_seconds() if activity.duration else 0
                    activity_text = f"{activity.name} ({duration:.1f}s)"
                    style = "bold green" if activity.id == self.selected_activity_id else "green"
                    completed_node.add(activity_text, style=style)
        
        return Panel(tree, title="Behaviors", border_style="blue")
    
    def _create_activity_detail(self) -> Panel:
        """Create detailed view of selected activity"""
        if not self.selected_activity_id:
            # Show recent logs if no activity selected
            log_content = "\n".join(self.log_buffer[-self.max_log_lines:])
            return Panel(
                log_content or "No recent logs",
                title="System Logs",
                border_style="dim"
            )
        
        # Find the selected activity
        activity = None
        for behavior in self.agent.behavior_manager.behaviors.values():
            if self.selected_activity_id in behavior.activities:
                activity = behavior.activities[self.selected_activity_id]
                break
        
        if not activity:
            return Panel("Activity not found", title="Activity Detail", border_style="red")
        
        # Create activity detail display
        detail_parts = []
        
        # Status and timing
        status_color = {
            "pending": "yellow",
            "running": "cyan",
            "completed": "green",
            "failed": "red"
        }.get(activity.status.value, "white")
        
        detail_parts.append(f"[{status_color}]Status:[/{status_color}] {activity.status.value}")
        detail_parts.append(f"[cyan]Started:[/cyan] {activity.start_time.isoformat() if activity.start_time else 'N/A'}")
        
        if activity.end_time:
            detail_parts.append(f"[cyan]Ended:[/cyan] {activity.end_time.isoformat()}")
            if activity.duration:
                detail_parts.append(f"[cyan]Duration:[/cyan] {activity.duration.total_seconds():.2f}s")
        
        if activity.error:
            detail_parts.append(f"[red]Error:[/red] {activity.error}")
        
        # Logs
        if activity.logs:
            detail_parts.append("\n[bold]Activity Logs:[/bold]")
            for log in activity.logs[-10:]:  # Last 10 logs
                detail_parts.append(f"  {log}")
        
        content = "\n".join(detail_parts)
        
        return Panel(
            content,
            title=f"Activity: {activity.name}",
            border_style=status_color
        )
    
    def _create_metrics_display(self) -> Panel:
        """Create metrics display"""
        # Tool metrics
        tool_metrics = self.agent.metrics.get_tool_summary()
        
        if not tool_metrics:
            return Panel("No metrics available", title="Metrics", border_style="dim")
        
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Tool", style="cyan")
        table.add_column("Calls", justify="right")
        table.add_column("Success", justify="right")
        table.add_column("Avg Time", justify="right")
        table.add_column("P95 Time", justify="right")
        
        for tool_name, summary in tool_metrics.items():
            success_rate = (summary.success_count / summary.count * 100) if summary.count > 0 else 0
            table.add_row(
                tool_name,
                str(summary.count),
                f"{success_rate:.0f}%",
                f"{summary.avg_duration:.2f}s",
                f"{summary.p95_duration:.2f}s"
            )
        
        # Conversation metrics
        conv_summary = self.agent.metrics.get_conversation_summary()
        conv_text = ""
        if conv_summary:
            conv_text = f"\n[cyan]Conversation:[/cyan] {conv_summary.get('turns', 0)} turns, "
            conv_text += f"{conv_summary.get('total_tokens', 0)} tokens"
        
        return Panel(
            Group(table, Text(conv_text)),
            title="Metrics",
            border_style="magenta"
        )
    
    def _create_footer(self) -> Panel:
        """Create footer with instructions"""
        instructions = (
            "[bold]Keys:[/bold] "
            "[cyan]↑/↓[/cyan] Navigate | "
            "[cyan]Enter[/cyan] Select Activity | "
            "[cyan]r[/cyan] Refresh | "
            "[cyan]q[/cyan] Quit"
        )
        return Panel(
            Align.center(instructions),
            border_style="dim"
        )
    
    def _format_duration(self, activity: "Activity") -> str:
        """Format activity duration"""
        if activity.start_time and activity.status.value == "running":
            duration = (datetime.now() - activity.start_time).total_seconds()
            return f"{duration:.1f}s"
        elif activity.duration:
            return f"{activity.duration.total_seconds():.1f}s"
        return "0s"
    
    def add_log(self, message: str) -> None:
        """Add a log message to the buffer"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_buffer.append(f"[{timestamp}] {message}")
        if len(self.log_buffer) > self.max_log_lines * 2:
            self.log_buffer = self.log_buffer[-self.max_log_lines:]