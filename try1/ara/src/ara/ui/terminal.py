"""Terminal UI for pretty logging with rich"""

from datetime import datetime
from typing import Dict, Any, Optional
from rich.console import Console
from rich.syntax import Syntax
from rich.panel import Panel
from rich.table import Table
from rich.live import Live
from rich.layout import Layout
from rich.tree import Tree
from loguru import logger
import json

from .live_display import LiveDisplay


class TerminalUI:
    """Pretty terminal UI for agent operations"""
    
    def __init__(self):
        self.console = Console()
        self.agent_tree = Tree("🤖 Agent")
        self.current_operation = None
    
    def log_user_input(self, prompt: str) -> None:
        """Log user input prettily"""
        self.console.print(
            Panel(
                prompt,
                title="[bold blue]User Input[/bold blue]",
                border_style="blue",
                padding=(1, 2)
            )
        )
    
    def log_assistant_response(self, response: str) -> None:
        """Log assistant response prettily"""
        self.console.print(
            Panel(
                response,
                title="[bold green]Assistant Response[/bold green]",
                border_style="green",
                padding=(1, 2)
            )
        )
    
    def log_tool_call(self, tool_name: str, args: Dict[str, Any]) -> None:
        """Log a tool call with arguments"""
        args_str = json.dumps(args, indent=2)
        
        self.console.print(
            Panel(
                f"[yellow]Tool:[/yellow] {tool_name}\n"
                f"[yellow]Arguments:[/yellow]\n{args_str}",
                title="[bold yellow]Tool Call[/bold yellow]",
                border_style="yellow"
            )
        )
    
    def log_tool_result(self, result: str, duration: float) -> None:
        """Log tool execution result"""
        self.console.print(
            f"[dim]Result ({duration:.2f}s):[/dim] {result[:100]}..."
            if len(result) > 100 else f"[dim]Result ({duration:.2f}s):[/dim] {result}"
        )
    
    def log_error(self, error: str) -> None:
        """Log an error message"""
        self.console.print(
            Panel(
                f"[bold red]Error:[/bold red] {error}",
                border_style="red",
                padding=(1, 2)
            )
        )
    
    def show_metrics_table(self, metrics: Dict[str, Any]) -> None:
        """Display metrics in a table format"""
        table = Table(title="Tool Metrics")
        
        table.add_column("Tool", style="cyan")
        table.add_column("Calls", justify="right")
        table.add_column("Success Rate", justify="right", style="green")
        table.add_column("Avg Duration", justify="right")
        table.add_column("P95 Duration", justify="right")
        
        for tool_name, summary in metrics.items():
            success_rate = (summary.success_count / summary.count * 100) if summary.count > 0 else 0
            table.add_row(
                tool_name,
                str(summary.count),
                f"{success_rate:.1f}%",
                f"{summary.avg_duration:.3f}s",
                f"{summary.p95_duration:.3f}s"
            )
        
        self.console.print(table)
    
    def update_agent_tree(self, agent_id: str, status: str, parent_id: Optional[str] = None) -> None:
        """Update the agent tree display"""
        # This would be used for sub-agent visualization
        # For now, just log the update
        logger.info(f"Agent {agent_id} status: {status}")
    
    def start_live_display(self) -> Live:
        """Start a live display for real-time updates"""
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body"),
            Layout(name="footer", size=3)
        )
        
        layout["header"].update(
            Panel("[bold]ARA Agent System[/bold]", style="blue")
        )
        
        return Live(layout, console=self.console, refresh_per_second=4)