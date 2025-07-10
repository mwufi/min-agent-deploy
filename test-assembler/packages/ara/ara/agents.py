import re
from typing import List, Dict
from .markdown_directory import MarkdownFile


def extract_entities(file: MarkdownFile) -> Dict[str, List[str]]:
    """
    Simple entity extraction - finds capitalized words that might be names/places/projects
    """
    content = file.content
    
    # Simple regex for capitalized words (potential entities)
    # This is a very basic approach - in real MVP would use LLM
    entities = {
        "people": [],
        "projects": [],
        "companies": [],
        "other": []
    }
    
    # Find all capitalized words (excluding start of sentences)
    words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', content)
    
    # Very simple classification based on common patterns
    for word in words:
        if word in ["The", "This", "That", "These", "Those", "A", "An"]:
            continue
            
        # Super simple heuristics
        if "Project" in word or "Initiative" in word:
            entities["projects"].append(word)
        elif word.endswith("Inc") or word.endswith("Corp") or word.endswith("Company"):
            entities["companies"].append(word)
        elif len(word.split()) == 2:  # Two words might be a person's name
            entities["people"].append(word)
        else:
            entities["other"].append(word)
    
    # Remove duplicates
    for key in entities:
        entities[key] = list(set(entities[key]))
    
    return entities


def count_entities_summary(files: List[MarkdownFile], results: Dict[str, any]) -> Dict[str, any]:
    """
    Simple synthesis step - counts all entities across all files
    """
    all_entities = {
        "people": set(),
        "projects": set(), 
        "companies": set(),
        "other": set()
    }
    
    entity_results = results.get("extract_entities", [])
    
    for entities in entity_results:
        if entities:
            for category, items in entities.items():
                all_entities[category].update(items)
    
    summary = {
        "total_files": len(files),
        "entity_counts": {k: len(v) for k, v in all_entities.items()},
        "top_entities": {k: list(v)[:5] for k, v in all_entities.items()}
    }
    
    return summary