"""Textual-based live terminal display for monitoring behaviors and activities"""

import asyncio
from typing import TYPE_CHECKING, Optional, List
from datetime import datetime
from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical, ScrollableContainer
from textual.widgets import Header, Footer, Static, DataTable, Tree, Log, Label
from textual.reactive import reactive
from textual.screen import Screen
from textual.binding import Binding
from ..logging import log_router, get_logger, LogMessage

if TYPE_CHECKING:
    from ..agent.core import A1
    from ..behaviors.base import Activity, ActivityStatus


class MetricsWidget(Static):
    """Widget for displaying metrics"""
    
    def __init__(self, agent: "A1", **kwargs):
        super().__init__(**kwargs)
        self.agent = agent
        self.border_title = "📊 Metrics"
    
    def on_mount(self) -> None:
        """Set up periodic updates"""
        self.set_interval(1.0, self.update_metrics)
    
    def update_metrics(self) -> None:
        """Update metrics display"""
        # Tool metrics
        tool_metrics = self.agent.metrics.get_tool_summary()
        
        if not tool_metrics:
            self.update("No metrics available")
            return
        
        output = []
        output.append("[bold]Tool Metrics:[/bold]\n")
        
        # Create table header
        output.append("Tool         | Calls | Success | Avg Time | P95 Time")
        output.append("-------------|-------|---------|----------|----------")
        
        for tool_name, summary in tool_metrics.items():
            success_rate = (summary.success_count / summary.count * 100) if summary.count > 0 else 0
            output.append(
                f"{tool_name:<12} | {summary.count:>5} | {success_rate:>6.0f}% | "
                f"{summary.avg_duration:>7.2f}s | {summary.p95_duration:>7.2f}s"
            )
        
        # Conversation metrics
        conv_summary = self.agent.metrics.get_conversation_summary()
        if conv_summary:
            output.append(f"\n[bold]Conversation:[/bold] {conv_summary.get('turns', 0)} turns, "
                         f"{conv_summary.get('total_tokens', 0)} tokens")
        
        self.update("\n".join(output))


class BehaviorTreeWidget(Tree):
    """Widget for displaying behavior tree"""
    
    selected_activity_id = reactive(None)
    selected_behavior_name = reactive(None)
    
    def __init__(self, agent: "A1", **kwargs):
        super().__init__("📊 Behaviors & Activities", **kwargs)
        self.agent = agent
        self.show_root = True
        self.guide_depth = 2
    
    def on_mount(self) -> None:
        """Set up periodic updates"""
        self.set_interval(0.5, self.update_tree)
    
    def update_tree(self) -> None:
        """Update the behavior tree"""
        self.clear()
        root = self.root
        
        for behavior in self.agent.behavior_manager.behaviors.values():
            # Add behavior node
            behavior_text = f"{behavior.name} v{behavior.version}"
            if behavior.enabled:
                behavior_text += " ✅"
            else:
                behavior_text += " ❌"
            
            if behavior.interval:
                behavior_text += f" ⏱️ {behavior.interval}s"
            
            behavior_node = root.add(behavior_text)
            behavior_node.allow_expand = True
            behavior_node.data = {"type": "behavior", "name": behavior.name}
            
            # Add activities
            running_activities = [a for a in behavior.activities.values() 
                                if a.status.value == "running"]
            completed_activities = [a for a in behavior.activities.values() 
                                  if a.status.value == "completed"][-5:]  # Last 5
            
            # Running activities
            if running_activities:
                running_node = behavior_node.add("🏃 Running")
                running_node.allow_expand = True
                for activity in running_activities:
                    activity_text = f"{activity.name} ({self._format_duration(activity)})"
                    activity_node = running_node.add(activity_text)
                    activity_node.data = {"type": "activity", "id": activity.id, "behavior": behavior.name}
                running_node.expand()
            
            # Recent completed
            if completed_activities:
                completed_node = behavior_node.add("✅ Recent")
                completed_node.allow_expand = True
                for activity in completed_activities:
                    duration = activity.duration.total_seconds() if activity.duration else 0
                    activity_text = f"{activity.name} ({duration:.1f}s)"
                    activity_node = completed_node.add(activity_text)
                    activity_node.data = {"type": "activity", "id": activity.id, "behavior": behavior.name}
                completed_node.expand()
            
            behavior_node.expand()
    
    def _format_duration(self, activity: "Activity") -> str:
        """Format activity duration"""
        if activity.start_time and activity.status.value == "running":
            duration = (datetime.now() - activity.start_time).total_seconds()
            return f"{duration:.1f}s"
        elif activity.duration:
            return f"{activity.duration.total_seconds():.1f}s"
        return "0s"
    
    def on_tree_node_selected(self, event) -> None:
        """Handle node selection"""
        # Prevent collapsing when selecting leaf nodes (nodes with no children)
        if not event.node.children:
            event.prevent_default()
        
        if event.node.data:
            data = event.node.data
            if isinstance(data, dict):
                if data["type"] == "activity":
                    self.selected_activity_id = data["id"]
                    self.selected_behavior_name = data["behavior"]
                elif data["type"] == "behavior":
                    self.selected_activity_id = None
                    self.selected_behavior_name = data["name"]
            else:
                # Legacy support
                self.selected_activity_id = data
                self.selected_behavior_name = None


class ActivityDetailWidget(ScrollableContainer):
    """Widget for displaying activity details or system logs"""
    
    def __init__(self, agent: "A1", **kwargs):
        super().__init__(**kwargs)
        self.agent = agent
        self.border_title = "Activity Detail / System Logs"
        self.log_widget = Log(highlight=True)
        self.detail_widget = Static()
        self.showing_logs = True
        self.current_filter = {"behavior": None, "activity": None, "context": None}
    
    def compose(self) -> ComposeResult:
        yield self.log_widget
        yield self.detail_widget
    
    def on_mount(self) -> None:
        """Set up periodic updates"""
        self.set_interval(0.5, self.update_display)
        self.detail_widget.display = False
    
    def show_activity(self, activity_id: Optional[str], behavior_name: Optional[str] = None) -> None:
        """Show activity detail or filtered logs"""
        if activity_id:
            # Find the activity
            activity = None
            for behavior in self.agent.behavior_manager.behaviors.values():
                if activity_id in behavior.activities:
                    activity = behavior.activities[activity_id]
                    behavior_name = behavior.name
                    break
            
            if activity:
                self.showing_logs = False
                self.log_widget.display = False
                self.detail_widget.display = True
                self.border_title = f"Activity: {activity.name}"
                self._update_activity_detail(activity)
                # Update filter for activity logs
                self.current_filter = {"behavior": behavior_name, "activity": activity.name, "context": None}
                return
        
        # Show logs with optional behavior filter
        self.showing_logs = True
        self.log_widget.display = True
        self.detail_widget.display = False
        
        if behavior_name:
            self.border_title = f"Logs: {behavior_name}"
            self.current_filter = {"behavior": behavior_name, "activity": None, "context": None}
        else:
            self.border_title = "System Logs"
            self.current_filter = {"behavior": None, "activity": None, "context": None}
        
        # Refresh logs with new filter
        self._refresh_logs()
    
    def _update_activity_detail(self, activity: "Activity") -> None:
        """Update activity detail display"""
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
            for log in activity.logs[-20:]:  # Last 20 logs
                detail_parts.append(f"  {log}")
        
        self.detail_widget.update("\n".join(detail_parts))
    
    def update_display(self) -> None:
        """Update the display based on current state"""
        tree_widget = self.app.query_one(BehaviorTreeWidget)
        
        # Check if selection changed
        activity_changed = tree_widget.selected_activity_id != getattr(self, '_last_activity_id', None)
        behavior_changed = tree_widget.selected_behavior_name != getattr(self, '_last_behavior_name', None)
        
        if activity_changed or behavior_changed:
            self._last_activity_id = tree_widget.selected_activity_id
            self._last_behavior_name = tree_widget.selected_behavior_name
            self.show_activity(tree_widget.selected_activity_id, tree_widget.selected_behavior_name)
        elif not self.showing_logs and self._last_activity_id:
            # Update activity detail if showing
            self.show_activity(self._last_activity_id, self._last_behavior_name)
    
    def add_log(self, log_msg: LogMessage) -> None:
        """Add a log message if it matches current filter"""
        if self.showing_logs:
            # Check if message matches current filter
            if self.current_filter["behavior"] and log_msg.behavior != self.current_filter["behavior"]:
                return
            if self.current_filter["activity"] and log_msg.activity != self.current_filter["activity"]:
                return
            if self.current_filter["context"] and log_msg.context != self.current_filter["context"]:
                return
            
            # Write formatted message
            self.log_widget.write_line(log_msg.formatted())
    
    def _refresh_logs(self) -> None:
        """Refresh logs based on current filter"""
        self.log_widget.clear()
        
        # Get filtered logs from buffer
        logs = log_router.get_filtered_logs(
            behavior=self.current_filter["behavior"],
            activity=self.current_filter["activity"],
            context=self.current_filter["context"],
            limit=100
        )
        
        # Display them
        for log_msg in logs:
            self.log_widget.write_line(log_msg.formatted())


class ARAMonitorApp(App):
    """Textual application for ARA monitoring"""
    
    CSS = """
    BehaviorTreeWidget {
        width: 40%;
        height: 100%;
        border: solid cyan;
        overflow-y: auto;
    }
    
    ActivityDetailWidget {
        width: 60%;
        height: 65%;
        border: solid blue;
        overflow-y: auto;
    }
    
    MetricsWidget {
        width: 60%;
        height: 35%;
        border: solid magenta;
        padding: 1;
        overflow-y: auto;
    }
    
    Log {
        overflow-y: auto;
        height: 100%;
    }
    """
    
    BINDINGS = [
        Binding("q", "quit", "Quit", priority=True),
        Binding("r", "refresh", "Refresh"),
        Binding("c", "clear_selection", "Clear Selection"),
        Binding("l", "toggle_log_level", "Toggle Log Level"),
    ]
    
    def __init__(self, agent: "A1", **kwargs):
        super().__init__(**kwargs)
        self.agent = agent
        self.title = "🤖 ARA Agent Monitor"
        self.log_level = "INFO"
    
    def compose(self) -> ComposeResult:
        """Create app layout"""
        yield Header()
        with Horizontal():
            yield BehaviorTreeWidget(self.agent)
            with Vertical():
                yield ActivityDetailWidget(self.agent, id="activity_detail")
                yield MetricsWidget(self.agent)
        yield Footer()
    
    def on_mount(self) -> None:
        """Set up the app when mounted"""
        self._setup_log_handler()
    
    def _setup_log_handler(self) -> None:
        """Set up log router handler to capture logs"""
        detail_widget = self.query_one("#activity_detail", ActivityDetailWidget)
        
        def tui_handler(log_msg: LogMessage):
            """Handle log messages from the router"""
            # Post message to main thread
            self.call_from_thread(detail_widget.add_log, log_msg)
        
        # Set the TUI handler in the log router
        log_router.set_tui_handler(tui_handler)
    
    def on_unmount(self) -> None:
        """Clean up when app is unmounted"""
        log_router.remove_tui_handler()
    
    def action_refresh(self) -> None:
        """Refresh the display"""
        self.refresh()
    
    def action_clear_selection(self) -> None:
        """Clear activity selection"""
        tree_widget = self.query_one(BehaviorTreeWidget)
        tree_widget.selected_activity_id = None
    
    def action_toggle_log_level(self) -> None:
        """Toggle between INFO and DEBUG log levels"""
        self.log_level = "DEBUG" if self.log_level == "INFO" else "INFO"
        
        # Create a synthetic log message for the UI
        from datetime import datetime
        detail_widget = self.query_one("#activity_detail", ActivityDetailWidget)
        
        # Create a mock level object with name attribute
        class MockLevel:
            def __init__(self, name):
                self.name = name
        
        log_msg = LogMessage({
            "time": datetime.now(),
            "level": MockLevel("INFO"),
            "message": f"Log level changed to {self.log_level}",
            "module": "textual_display",
            "function": "action_toggle_log_level",
            "line": 0,
            "extra": {}
        })
        detail_widget.add_log(log_msg)


class TextualDisplay:
    """Textual-based live display wrapper"""
    
    def __init__(self, agent: "A1"):
        self.agent = agent
        self.app: Optional[ARAMonitorApp] = None
        self._running = False
    
    async def start(self) -> None:
        """Start the Textual display"""
        if self._running:
            return
        
        self._running = True
        self.app = ARAMonitorApp(self.agent)
        
        # Run in background task
        asyncio.create_task(self.app.run_async())
        
        # Log using the new logging system
        logger = get_logger(__name__, context="textual_display")
        logger.info("Started Textual display")
    
    async def stop(self) -> None:
        """Stop the Textual display"""
        if not self._running:
            return
        
        self._running = False
        
        if self.app:
            await self.app.action_quit()
        
        logger = get_logger(__name__, context="textual_display")
        logger.info("Stopped Textual display")