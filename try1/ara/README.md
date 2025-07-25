# ARA - AI Agent with Memory

A modular AI agent framework with markdown-based storage, built with Python and OpenRouter.

## Features

- **Markdown-based storage**: All agent data persisted as markdown/YAML files
- **Behavior plugin system**: Extensible architecture for custom behaviors
- **Pretty terminal UI**: Rich logging with loguru and rich
- **Observability**: Built-in metrics collection and monitoring
- **OpenRouter integration**: Support for multiple LLM providers

## Installation

```bash
# Clone the repository
git clone <your-repo>
cd ara

# Install with uv
uv pip install -e .
```

## Usage

```python
from ara import A1

# Initialize the agent
agent = A1(path='./dev-data', llm='anthropic/claude-3.5-sonnet')

# Execute tasks
agent.go("Create a file called notes.txt")
agent.go("Analyze the project structure and suggest improvements")
```

## Environment Variables

- `OPENROUTER_API_KEY`: Your OpenRouter API key

## Project Structure

```
ara/
   src/ara/
      agent/      # Core agent implementation
      behaviors/  # Behavior plugins
      storage/    # Markdown storage system
      monitoring/ # Metrics and observability
      ui/         # Terminal UI components
   data/           # Agent data storage (created at runtime)
```

## Roadmap

- [ ] Sub-agent scheduling and parallel execution
- [ ] Episodic memory behavior
- [ ] Vector search with LanceDB
- [ ] Advanced planning behaviors
- [ ] Real-time agent tree visualization