"""Centralized logging configuration for ARA"""

import sys
from pathlib import Path
from typing import Optional, Dict, List, Any, Callable
from datetime import datetime
from loguru import logger
import threading


class LogMessage:
    """Represents a structured log message"""
    def __init__(self, record: Dict[str, Any]):
        self.time = record["time"]
        self.level = record["level"].name
        self.message = record["message"]
        self.module = record["module"]
        self.function = record["function"]
        self.line = record["line"]
        
        # Extract context from extra fields
        self.behavior = record["extra"].get("behavior", None)
        self.activity = record["extra"].get("activity", None)
        self.context = record["extra"].get("context", "system")
        
    def formatted(self) -> str:
        """Get formatted message"""
        timestamp = self.time.strftime("%H:%M:%S")
        prefix = ""
        if self.behavior:
            prefix = f"[{self.behavior}]"
            if self.activity:
                prefix += f"[{self.activity}]"
        elif self.context != "system":
            prefix = f"[{self.context}]"
            
        return f"[{timestamp}] {prefix} {self.message}"


class LogRouter:
    """Routes logs to multiple destinations with filtering"""
    
    def __init__(self):
        self.tui_handler: Optional[Callable] = None
        self.log_buffer: List[LogMessage] = []
        self.max_buffer_size = 1000
        self._lock = threading.Lock()
        
    def set_tui_handler(self, handler: Callable) -> None:
        """Set the TUI log handler"""
        self.tui_handler = handler
        
    def remove_tui_handler(self) -> None:
        """Remove the TUI log handler"""
        self.tui_handler = None
        
    def add_message(self, record: Dict[str, Any]) -> None:
        """Add a log message to the buffer and route it"""
        msg = LogMessage(record)
        
        with self._lock:
            # Add to buffer
            self.log_buffer.append(msg)
            if len(self.log_buffer) > self.max_buffer_size:
                self.log_buffer.pop(0)
            
            # Route to TUI if available
            if self.tui_handler:
                try:
                    self.tui_handler(msg)
                except Exception:
                    pass  # Don't let TUI errors break logging
    
    def get_filtered_logs(self, behavior: Optional[str] = None, 
                         activity: Optional[str] = None,
                         context: Optional[str] = None,
                         limit: int = 100) -> List[LogMessage]:
        """Get filtered logs from the buffer"""
        with self._lock:
            filtered = []
            for msg in reversed(self.log_buffer):
                # Apply filters
                if behavior and msg.behavior != behavior:
                    continue
                if activity and msg.activity != activity:
                    continue
                if context and msg.context != context:
                    continue
                    
                filtered.append(msg)
                if len(filtered) >= limit:
                    break
                    
            return list(reversed(filtered))


# Global log router instance
log_router = LogRouter()


def setup_logging(log_dir: Optional[Path] = None, enable_file_logging: bool = True):
    """Configure logging for ARA
    
    Args:
        log_dir: Directory for log files (default: ./logs)
        enable_file_logging: Whether to enable file logging
    """
    # Remove any existing handlers
    logger.remove()
    
    # Create log directory if needed
    if enable_file_logging:
        if log_dir is None:
            log_dir = Path("./logs")
        log_dir.mkdir(parents=True, exist_ok=True)
    
    # Custom format for structured logging
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )
    
    def router_sink(message):
        """Sink that routes to our log router"""
        log_router.add_message(message.record)
    
    # Add router sink (always enabled)
    logger.add(
        router_sink,
        level="DEBUG",
        enqueue=True  # Thread-safe
    )
    
    # Add file logging if enabled
    if enable_file_logging:
        # Main log file
        logger.add(
            log_dir / "ara_{time:YYYY-MM-DD}.log",
            rotation="1 day",
            retention="30 days",
            level="DEBUG",
            format=log_format,
            enqueue=True
        )
        
        # Error log file
        logger.add(
            log_dir / "ara_errors_{time:YYYY-MM-DD}.log",
            rotation="1 day",
            retention="30 days",
            level="ERROR",
            format=log_format,
            enqueue=True
        )
    
    # Add console output ONLY if not in TUI mode
    # This prevents stdout interference with Textual
    if not log_router.tui_handler:
        logger.add(
            sys.stderr,  # Use stderr to avoid stdout interference
            level="INFO",
            format=log_format,
            colorize=True
        )


def get_logger(name: Optional[str] = None, 
               behavior: Optional[str] = None,
               activity: Optional[str] = None,
               context: Optional[str] = None):
    """Get a logger with optional context
    
    Args:
        name: Logger name (usually __name__)
        behavior: Behavior name for filtering
        activity: Activity name for filtering
        context: General context for filtering
        
    Returns:
        A configured logger instance
    """
    # Bind extra context to the logger
    extra = {}
    if behavior:
        extra["behavior"] = behavior
    if activity:
        extra["activity"] = activity
    if context:
        extra["context"] = context
    
    if extra:
        return logger.bind(**extra)
    return logger


# Setup default logging on import
setup_logging(enable_file_logging=False)