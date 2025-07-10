# Sierra Knowledge Extraction System

A concurrent LLM agent swarm for extracting structured knowledge from personal notes.

## Overview

Sierra uses multiple specialized LLM agents working in parallel to:
- Extract entities (people, companies, projects, locations)
- Identify goals and ongoing projects
- Summarize notes with importance scoring
- Extract topics and themes
- Generate narratives and testable hypotheses about the user
- Suggest ways to enhance the user's life

## Quick Start

```bash
# Run the demo
python3 demo.py

# Or run directly with dummy mode (no LLM calls)
uv run python analyze.py test_data --dummy

# Run with real LLM calls (requires OPENAI_API_KEY)
export OPENAI_API_KEY='your-key-here'
uv run python analyze.py test_data --output my_knowledge
```

## Architecture

The system follows a multi-stage pipeline:

1. **Load & Parse**: Read markdown files from input directory
2. **Parallel Analysis**: For each note, run concurrent agents:
   - Entity Extractor
   - Goal Detector  
   - Summarizer
   - Topic Extractor
3. **Knowledge Assembly**: Deduplicate and organize extracted data
4. **Deep Synthesis**: Use a powerful agent to:
   - Construct narratives about the user
   - Generate testable hypotheses
   - Suggest enhancement opportunities

## Output Structure

```
knowledge/
├── entities/          # Extracted people, companies, projects
├── topics/           # Identified topics and themes
├── summaries/        # Note summaries with importance scores
├── narratives/       # Generated narratives about the user
├── hypotheses/       # Testable hypotheses with test plans
├── goals/           # Enhancement recommendations
└── timeline.db      # SQLite database of temporal events
```

## Configuration

### Command Line Options

- `--output`: Output directory (default: ./knowledge)
- `--max-concurrent`: Max concurrent LLM calls (default: 20)
- `--rate-limit`: Rate limit per minute (default: 100)
- `--dummy`: Run without real LLM calls (for testing)
- `--verbose`: Enable debug logging

### Customizing Agents

Agent prompts are in `packages/ara/prompts/`:
- `extractors/`: Analysis agents (entities, goals, topics, summaries)
- `synthesizers/`: Synthesis agents (narrative builder)

## Example Usage

```bash
# Analyze a large notes directory with rate limiting
uv run python analyze.py ~/Documents/ObsidianVault \
    --output ~/sierra-knowledge \
    --max-concurrent 10 \
    --rate-limit 60

# Test on a small subset first
uv run python analyze.py ~/Documents/ObsidianVault/Daily \
    --output test-output \
    --dummy
```

## Implementation Details

### Concurrent Execution Framework

The system uses:
- `asyncio` for concurrent task management
- Semaphore-based rate limiting
- ThreadPoolExecutor for CPU-bound LLM calls
- Automatic retry with exponential backoff

### Task Scheduling

For 1000 notes, the system generates ~4000 tasks:
- 4 analysis tasks per note
- 1 synthesis task at the end

Tasks are executed concurrently with configurable limits.

### Deduplication

- Entities are normalized and merged (e.g., "Jen" and "Jennifer")
- Topics are consolidated across notes
- Each entity/topic file links back to source notes

## Development

```bash
# Install dependencies
uv pip install -e packages/ara

# Run tests
python3 test_analyze.py

# Run in dummy mode for development
uv run python analyze.py test_data --dummy -v
```

## Future Enhancements

- [ ] Extract timestamps from note metadata
- [ ] Add more sophisticated entity resolution
- [ ] Support for images and other media
- [ ] Integration with vector databases
- [ ] Real-time processing of new notes
- [ ] Web UI for exploring knowledge graph

## Credits

Built as part of the Sierra AI biographer project.