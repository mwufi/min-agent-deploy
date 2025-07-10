import json
from pathlib import Path
from agents import Agent, Runner
from typing import List, Dict, Any
import asyncio
from .markdown_directory import MarkdownFile
from .parsing import extract_json_from_string


def load_prompt(prompt_file: str) -> str:
    # Try to find the prompt file in multiple locations
    search_paths = [
        Path(prompt_file),  # Exact path
        Path("prompts") / prompt_file,  # In prompts dir
        Path("packages/ara/prompts") / prompt_file,  # In package
        Path(__file__).parent.parent / "prompts" / prompt_file,  # Relative to this file
    ]
    
    for path in search_paths:
        if path.exists():
            return path.read_text(encoding='utf-8')
            
    raise FileNotFoundError(f"Could not find prompt file: {prompt_file}")


def run_sync(agent: Agent, message: str, **kwargs) -> str:
    """Run an agent synchronously and return the final output"""
    async def _run():
        result = await Runner.run(agent, message, **kwargs)
        return result.final_output
    
    try:
        # Check if we're already in an event loop (like in Jupyter)
        asyncio.get_running_loop()
        # If we are, apply nest_asyncio to allow nested event loops
        import nest_asyncio
        nest_asyncio.apply()
    except RuntimeError:
        # No event loop running, which is fine
        pass
        
    return asyncio.run(_run())


def extract_entities_llm(file: MarkdownFile) -> str:
    """Extract entities using LLM"""
    entity_extractor = Agent(
        name="entity-extractor",
        instructions=load_prompt("extractors/entity-extractor.md"),
        model="gpt-4o-mini",
    )
    return run_sync(entity_extractor, file.content)


def detect_goals_llm(file: MarkdownFile) -> str:
    """Detect goals using LLM"""
    goal_detector = Agent(
        name="goal-detector",
        instructions=load_prompt("extractors/goal-detector.md"),
        model="gpt-4o-mini",
    )
    return run_sync(goal_detector, file.content)


def summarize_note_llm(file: MarkdownFile) -> str:
    """Summarize a note using LLM"""
    summarizer = Agent(
        name="summarizer",
        instructions=load_prompt("extractors/summarizer.md"),
        model="gpt-4o-mini",
    )
    return run_sync(summarizer, file.content)


def extract_topics_llm(file: MarkdownFile) -> str:
    """Extract topics using LLM"""
    topic_extractor = Agent(
        name="topic-extractor",
        instructions=load_prompt("extractors/topic-extractor.md"),
        model="gpt-4o-mini",
    )
    return run_sync(topic_extractor, file.content)


def synthesize_narratives_llm(knowledge_data: Dict[str, Any]) -> str:
    """Synthesize narratives and hypotheses using deep research agent"""
    narrative_builder = Agent(
        name="narrative-builder",
        instructions=load_prompt("synthesizers/narrative-builder.md"),
        model="gpt-4o",  # Using more capable model for synthesis
    )
    
    # Convert knowledge data to a structured prompt
    prompt = f"""
Analyze the following extracted knowledge to construct narratives and hypotheses:

Entities found: {json.dumps(knowledge_data.get('entities_summary', {}), indent=2)}
Topics identified: {json.dumps(knowledge_data.get('topics_summary', {}), indent=2)}
Note summaries: {json.dumps(knowledge_data.get('summaries_sample', []), indent=2)}

Please provide narratives, hypotheses, and enhancement recommendations based on this data.
"""
    
    return run_sync(narrative_builder, prompt)


def create_biographer_summary(files: List[MarkdownFile], results: Dict[str, Any]) -> str:
    """Create a biographer-style summary of the ingested data"""
    
    # Gather all the extracted data
    all_entities = {"people": set(), "companies": set(), "projects": set()}
    all_goals = []
    all_projects = []
    
    # Aggregate entities
    entity_results = results.get("extract_entities_llm", [])
    for entities in entity_results:
        entities = extract_json_from_string(entities)
        if entities:
            for key in ["people", "companies", "projects"]:
                if key in entities:
                    all_entities[key].update(entities[key])
    
    # Aggregate goals
    goal_results = results.get("detect_goals_llm", [])
    for goal_data in goal_results:
        goal_data = extract_json_from_string(goal_data)
        if goal_data:
            all_goals.extend(goal_data.get("goals", []))
            all_projects.extend(goal_data.get("projects", []))
    
    # Create summary prompt
    summary_data = {
        "files_processed": len(files),
        "people": list(all_entities["people"])[:5],
        "companies": list(all_entities["companies"])[:3],
        "projects": list(all_entities["projects"])[:3],
        "goals": all_goals[:3],
        "project_details": all_projects[:3]
    }
    
    biographer_prompt = f"""
Based on the initial data processing, here's what I've learned:

Files processed: {summary_data['files_processed']}
Key people: {', '.join(summary_data['people']) if summary_data['people'] else 'None identified'}
Organizations: {', '.join(summary_data['companies']) if summary_data['companies'] else 'None identified'}
Projects mentioned: {', '.join(summary_data['projects']) if summary_data['projects'] else 'None identified'}

Please provide a brief, welcoming summary (2-3 sentences) that:
1. Highlights 2-3 main themes or interests you've identified
2. Asks for feedback or confirmation
3. Talks from the persona of Sierra, the AI assistant

Base it on this data: {json.dumps(summary_data, indent=2)}
"""
    
    biographer = Agent(
        name="biographer",
        instructions=biographer_prompt,
        model="gpt-4o-mini",
    )
    
    return run_sync(biographer, biographer_prompt)


# Create agent instances for easy import
entity_extractor_agent = Agent(
    name="entity-extractor",
    instructions=load_prompt("extractors/entity-extractor.md"),
    model="gpt-4o-mini",
)

goal_detector_agent = Agent(
    name="goal-detector", 
    instructions=load_prompt("extractors/goal-detector.md"),
    model="gpt-4o-mini",
)

summarizer_agent = Agent(
    name="summarizer",
    instructions=load_prompt("extractors/summarizer.md"),
    model="gpt-4o-mini",
)

topic_extractor_agent = Agent(
    name="topic-extractor",
    instructions=load_prompt("extractors/topic-extractor.md"),
    model="gpt-4o-mini",
)

narrative_builder_agent = Agent(
    name="narrative-builder",
    instructions=load_prompt("synthesizers/narrative-builder.md"),
    model="gpt-4o",
)

biographer_agent = Agent(
    name="biographer",
    instructions="You are Sierra, an AI assistant helping to understand user data.",
    model="gpt-4o-mini",
)