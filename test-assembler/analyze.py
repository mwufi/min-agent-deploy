#!/usr/bin/env python3
"""
Sierra Analyze Script - Concurrent Agent Swarm for Knowledge Extraction

This script analyzes a directory of notes using an LLM agent swarm,
outputting a condensed knowledge directory with entities, topics,
timelines, and synthesized narratives.
"""

import argparse
import asyncio
import json
import logging
import os
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
import hashlib

from packages.ara.ara.agents import (
    entity_extractor_agent, goal_detector_agent, biographer_agent,
    summarizer_agent, topic_extractor_agent, narrative_builder_agent,
    run_sync
)
from packages.ara.ara.markdown_directory import MarkdownDirectory
from packages.ara.ara.parsing import extract_json_from_string


@dataclass
class Task:
    """Represents a single LLM task to be executed"""
    id: str
    type: str
    input_data: Dict[str, Any]
    callback: Optional[Any] = None
    priority: int = 0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
    def __hash__(self):
        return hash(self.id)


@dataclass
class ExecutionConfig:
    """Configuration for the execution framework"""
    max_concurrent_calls: int = 20
    rate_limit_per_minute: int = 100
    dummy_mode: bool = False
    retry_attempts: int = 3
    retry_delay: float = 1.0


class Timeline:
    """SQLite-based timeline storage for chronological events"""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.conn = sqlite3.connect(str(db_path))
        self._initialize_db()
    
    def _initialize_db(self):
        """Create timeline table if it doesn't exist"""
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS timeline (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME NOT NULL,
                type TEXT NOT NULL,
                reference TEXT NOT NULL,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_timestamp ON timeline(timestamp)
        """)
        self.conn.commit()
    
    def add_event(self, timestamp: datetime, event_type: str, reference: str, metadata: Optional[Dict] = None):
        """Add an event to the timeline"""
        self.conn.execute(
            "INSERT INTO timeline (timestamp, type, reference, metadata) VALUES (?, ?, ?, ?)",
            (timestamp, event_type, reference, json.dumps(metadata or {}))
        )
        self.conn.commit()
    
    def get_nearby(self, timestamp: datetime, window_hours: int = 24) -> List[Dict]:
        """Get events within a time window of the given timestamp"""
        cursor = self.conn.execute("""
            SELECT timestamp, type, reference, metadata 
            FROM timeline 
            WHERE timestamp BETWEEN datetime(?, '-' || ? || ' hours') AND datetime(?, '+' || ? || ' hours')
            ORDER BY timestamp
        """, (timestamp, window_hours, timestamp, window_hours))
        
        return [
            {
                'timestamp': row[0],
                'type': row[1],
                'reference': row[2],
                'metadata': json.loads(row[3])
            }
            for row in cursor.fetchall()
        ]
    
    def close(self):
        """Close the database connection"""
        self.conn.close()


class TaskExecutor:
    """Manages concurrent execution of LLM tasks with rate limiting"""
    
    def __init__(self, config: ExecutionConfig):
        self.config = config
        self.task_queue = asyncio.Queue()
        self.results = {}
        self.semaphore = asyncio.Semaphore(config.max_concurrent_calls)
        self.rate_limiter = asyncio.Queue(maxsize=config.rate_limit_per_minute)
        self.executor = ThreadPoolExecutor(max_workers=config.max_concurrent_calls)
        
    async def add_task(self, task: Task):
        """Add a task to the execution queue"""
        await self.task_queue.put(task)
    
    async def execute_task(self, task: Task) -> Dict[str, Any]:
        """Execute a single task with rate limiting"""
        async with self.semaphore:
            # Rate limiting
            await self.rate_limiter.put(None)
            
            if self.config.dummy_mode:
                # Dummy execution - just log
                logging.info(f"[DUMMY] Executing task {task.id} of type {task.type}")
                await asyncio.sleep(0.1)  # Simulate work
                return {"dummy": True, "task_id": task.id, "type": task.type}
            
            # Real execution
            try:
                if task.type == "entity_extraction":
                    result = await asyncio.get_event_loop().run_in_executor(
                        self.executor,
                        run_sync,
                        entity_extractor_agent,
                        task.input_data['content']
                    )
                    result = extract_json_from_string(result)
                elif task.type == "goal_detection":
                    result = await asyncio.get_event_loop().run_in_executor(
                        self.executor,
                        run_sync,
                        goal_detector_agent,
                        task.input_data['content']
                    )
                    result = extract_json_from_string(result)
                elif task.type == "summarization":
                    result = await asyncio.get_event_loop().run_in_executor(
                        self.executor,
                        run_sync,
                        summarizer_agent,
                        task.input_data['content']
                    )
                    result = extract_json_from_string(result)
                elif task.type == "topic_extraction":
                    result = await asyncio.get_event_loop().run_in_executor(
                        self.executor,
                        run_sync,
                        topic_extractor_agent,
                        task.input_data['content']
                    )
                    result = extract_json_from_string(result)
                elif task.type == "synthesis":
                    result = await asyncio.get_event_loop().run_in_executor(
                        self.executor,
                        run_sync,
                        narrative_builder_agent,
                        task.input_data['prompt']
                    )
                    result = extract_json_from_string(result)
                else:
                    raise ValueError(f"Unknown task type: {task.type}")
                
                task.result = result
                return result
                
            except Exception as e:
                logging.error(f"Error executing task {task.id}: {e}")
                task.error = str(e)
                raise
    
    async def process_queue(self):
        """Process all tasks in the queue"""
        tasks = []
        while not self.task_queue.empty():
            task = await self.task_queue.get()
            tasks.append(self.execute_task(task))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results
    
    async def start_rate_limiter(self):
        """Background task to refill rate limiter tokens"""
        while True:
            await asyncio.sleep(60 / self.config.rate_limit_per_minute)
            try:
                self.rate_limiter.get_nowait()
            except asyncio.QueueEmpty:
                pass


class KnowledgeManager:
    """Manages the knowledge directory structure and deduplication"""
    
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.entities_dir = output_dir / "entities"
        self.topics_dir = output_dir / "topics"
        self.summaries_dir = output_dir / "summaries"
        self.narratives_dir = output_dir / "narratives"
        self.hypotheses_dir = output_dir / "hypotheses"
        self.goals_dir = output_dir / "goals"
        
        # Create directories
        for dir_path in [self.entities_dir, self.topics_dir, self.summaries_dir,
                         self.narratives_dir, self.hypotheses_dir, self.goals_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
        
        # Entity deduplication cache
        self.entity_cache: Dict[str, Set[str]] = defaultdict(set)
        self.topic_cache: Dict[str, Set[str]] = defaultdict(set)
    
    def _normalize_entity(self, entity: str) -> str:
        """Normalize entity name for deduplication"""
        return entity.lower().strip()
    
    def update_entity(self, entity: Dict[str, Any], source_note: str):
        """Update entity information with deduplication"""
        name = entity.get('name', '')
        normalized = self._normalize_entity(name)
        entity_type = entity.get('type', 'unknown')
        
        # Check for similar entities (simple approach - can be enhanced)
        entity_file = self.entities_dir / f"{normalized.replace(' ', '_')}.md"
        
        if entity_file.exists():
            content = entity_file.read_text()
            if source_note not in content:
                content += f"\n- [[{source_note}]]"
                entity_file.write_text(content)
        else:
            content = f"# {name}\n\nType: {entity_type}\n\n## References\n- [[{source_note}]]\n"
            entity_file.write_text(content)
        
        self.entity_cache[normalized].add(source_note)
    
    def update_topic(self, topic: str, source_note: str):
        """Update topic information"""
        normalized = topic.lower().strip().replace(' ', '_')
        topic_file = self.topics_dir / f"{normalized}.md"
        
        if topic_file.exists():
            content = topic_file.read_text()
            if source_note not in content:
                content += f"\n- [[{source_note}]]"
                topic_file.write_text(content)
        else:
            content = f"# {topic}\n\n## References\n- [[{source_note}]]\n"
            topic_file.write_text(content)
        
        self.topic_cache[normalized].add(source_note)
    
    def update_summary(self, note_path: str, summary: str, importance: float):
        """Update summary for a note"""
        # Convert path to safe filename
        safe_name = note_path.replace('/', '_').replace('\\', '_')
        summary_file = self.summaries_dir / f"{safe_name}.md"
        
        content = f"# Summary of {note_path}\n\nImportance: {importance:.2f}\n\n{summary}\n"
        summary_file.write_text(content)
    
    def write_narrative(self, narrative_id: str, content: str):
        """Write a narrative"""
        narrative_file = self.narratives_dir / f"{narrative_id}.md"
        narrative_file.write_text(content)
    
    def write_hypothesis(self, hypothesis_id: str, content: str, test_plan: str):
        """Write a hypothesis with test plan"""
        hypothesis_file = self.hypotheses_dir / f"{hypothesis_id}.md"
        full_content = f"{content}\n\n## Test Plan\n{test_plan}\n"
        hypothesis_file.write_text(full_content)
    
    def write_goals(self, goals: List[Dict[str, Any]]):
        """Write user enhancement goals"""
        goals_file = self.goals_dir / "enhancement_goals.md"
        content = "# User Enhancement Goals\n\n"
        for i, goal in enumerate(goals, 1):
            content += f"## Goal {i}: {goal.get('title', 'Untitled')}\n\n"
            content += f"{goal.get('description', '')}\n\n"
            content += f"**Impact**: {goal.get('impact', 'Unknown')}\n\n"
        goals_file.write_text(content)


async def analyze_note(note: Dict[str, Any], executor: TaskExecutor, knowledge_mgr: KnowledgeManager, timeline: Timeline) -> List[Task]:
    """Analyze a single note and schedule all necessary tasks"""
    tasks = []
    note_id = hashlib.md5(note['path'].encode()).hexdigest()[:8]
    note_name = Path(note['path']).stem
    
    # Extract timestamp from note metadata or content
    timestamp = datetime.now()  # TODO: Extract from note metadata
    
    # Schedule entity extraction
    entity_task = Task(
        id=f"entity_{note_id}",
        type="entity_extraction",
        input_data={"content": note['content'], "source": note_name},
        priority=1
    )
    tasks.append(entity_task)
    await executor.add_task(entity_task)
    
    # Schedule goal detection
    goal_task = Task(
        id=f"goal_{note_id}",
        type="goal_detection",
        input_data={"content": note['content'], "source": note_name},
        priority=1
    )
    tasks.append(goal_task)
    await executor.add_task(goal_task)
    
    # Schedule summarization
    summary_task = Task(
        id=f"summary_{note_id}",
        type="summarization",
        input_data={"content": note['content'], "source": note_name},
        priority=2
    )
    tasks.append(summary_task)
    await executor.add_task(summary_task)
    
    # Schedule topic extraction
    topic_task = Task(
        id=f"topic_{note_id}",
        type="topic_extraction",
        input_data={"content": note['content'], "source": note_name},
        priority=2
    )
    tasks.append(topic_task)
    await executor.add_task(topic_task)
    
    # Add to timeline
    timeline.add_event(timestamp, "note", note['path'], {"note_id": note_id})
    
    return tasks


async def synthesize(executor: TaskExecutor, knowledge_mgr: KnowledgeManager):
    """Run synthesis tasks to generate narratives and hypotheses"""
    # Gather knowledge summary data
    entities_summary = {}
    topics_summary = {}
    summaries_sample = []
    
    # Read entity files
    for entity_file in knowledge_mgr.entities_dir.glob("*.md"):
        entity_type = "entity"
        if entity_file.stem not in entities_summary:
            entities_summary[entity_file.stem] = []
        entities_summary[entity_file.stem].append(entity_file.read_text()[:200])
    
    # Read topic files
    for topic_file in knowledge_mgr.topics_dir.glob("*.md"):
        topic_name = topic_file.stem.replace('_', ' ')
        topics_summary[topic_name] = len(topic_file.read_text().split('\n'))
    
    # Read sample summaries
    for i, summary_file in enumerate(knowledge_mgr.summaries_dir.glob("*.md")):
        if i >= 5:  # Only sample first 5
            break
        summaries_sample.append(summary_file.read_text()[:300])
    
    # Create synthesis task
    synthesis_task = Task(
        id="synthesis_main",
        type="synthesis",
        input_data={
            "prompt": f"""
Analyze the following extracted knowledge to construct narratives and hypotheses:

Entities found: {json.dumps(entities_summary, indent=2)}
Topics identified: {json.dumps(topics_summary, indent=2)}
Note summaries sample: {json.dumps(summaries_sample, indent=2)}

Please provide narratives, hypotheses, and enhancement recommendations based on this data.
"""
        },
        priority=0
    )
    await executor.add_task(synthesis_task)
    
    # Process synthesis results
    results = await executor.process_queue()
    
    # Process synthesis output
    if synthesis_task.result and not synthesis_task.error:
        synthesis_data = synthesis_task.result
        
        # Write narratives
        if 'narratives' in synthesis_data:
            for narrative in synthesis_data['narratives']:
                knowledge_mgr.write_narrative(
                    narrative.get('id', 'unknown'),
                    f"# {narrative.get('title', 'Untitled')}\n\n{narrative.get('content', '')}\n\nConfidence: {narrative.get('confidence', 0)}"
                )
        
        # Write hypotheses
        if 'hypotheses' in synthesis_data:
            for hypothesis in synthesis_data['hypotheses']:
                knowledge_mgr.write_hypothesis(
                    hypothesis.get('id', 'unknown'),
                    f"# {hypothesis.get('statement', 'Unknown')}\n\n{hypothesis.get('reasoning', '')}",
                    hypothesis.get('test_plan', 'No test plan provided')
                )
        
        # Write enhancement goals
        if 'enhancements' in synthesis_data:
            knowledge_mgr.write_goals(synthesis_data['enhancements'])


async def main(args):
    """Main execution function"""
    # Setup logging
    logging.basicConfig(
        level=logging.INFO if not args.verbose else logging.DEBUG,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Initialize components
    config = ExecutionConfig(
        max_concurrent_calls=args.max_concurrent,
        rate_limit_per_minute=args.rate_limit,
        dummy_mode=args.dummy
    )
    
    output_dir = Path(args.output)
    timeline_db = output_dir / "timeline.db"
    
    executor = TaskExecutor(config)
    knowledge_mgr = KnowledgeManager(output_dir)
    timeline = Timeline(timeline_db)
    
    # Start rate limiter
    rate_limiter_task = asyncio.create_task(executor.start_rate_limiter())
    
    try:
        # Load notes
        logging.info(f"Loading notes from {args.input}")
        md_dir = MarkdownDirectory(args.input)
        md_dir.load()  # Load the files
        notes = [{'path': str(f.path), 'content': f.content} for f in md_dir.files]
        logging.info(f"Found {len(notes)} notes to analyze")
        
        # Phase 1: Analyze all notes
        all_tasks = []
        for note in notes:
            tasks = await analyze_note(note, executor, knowledge_mgr, timeline)
            all_tasks.extend(tasks)
        
        logging.info(f"Scheduled {len(all_tasks)} tasks for execution")
        
        # Execute all analysis tasks
        results = await executor.process_queue()
        
        # Process results and update knowledge base
        for task in all_tasks:
            if task.result and not task.error:
                if task.type == "entity_extraction" and task.result:
                    # Process different entity types
                    for entity_type in ['people', 'companies', 'projects', 'locations']:
                        if entity_type in task.result:
                            for entity_name in task.result[entity_type]:
                                knowledge_mgr.update_entity(
                                    {'name': entity_name, 'type': entity_type.rstrip('s')},
                                    task.input_data.get('source', 'unknown')
                                )
                
                elif task.type == "topic_extraction" and task.result and 'topics' in task.result:
                    for topic_data in task.result['topics']:
                        if isinstance(topic_data, dict):
                            knowledge_mgr.update_topic(
                                topic_data.get('name', 'unknown'),
                                task.input_data.get('source', 'unknown')
                            )
                        else:
                            knowledge_mgr.update_topic(topic_data, task.input_data.get('source', 'unknown'))
                
                elif task.type == "summarization" and task.result:
                    knowledge_mgr.update_summary(
                        task.input_data.get('source', 'unknown'),
                        task.result.get('summary', ''),
                        task.result.get('importance', 0.5)
                    )
        
        # Phase 2: Synthesis
        logging.info("Starting synthesis phase...")
        await synthesize(executor, knowledge_mgr)
        
        logging.info("Analysis complete!")
        
    finally:
        # Cleanup
        rate_limiter_task.cancel()
        timeline.close()
        executor.executor.shutdown(wait=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sierra Analyze - Knowledge extraction from notes")
    parser.add_argument("input", help="Input directory containing notes")
    parser.add_argument("-o", "--output", default="./knowledge", help="Output knowledge directory")
    parser.add_argument("--max-concurrent", type=int, default=20, help="Maximum concurrent LLM calls")
    parser.add_argument("--rate-limit", type=int, default=100, help="Rate limit per minute")
    parser.add_argument("--dummy", action="store_true", help="Run in dummy mode (no real LLM calls)")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose logging")
    
    args = parser.parse_args()
    
    # Run the async main function
    asyncio.run(main(args))