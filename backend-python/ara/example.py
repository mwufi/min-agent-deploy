"""Example usage of ARA agent"""

import os
from ara import A1

# Make sure to set your OpenRouter API key
# export OPENROUTER_API_KEY=your-key-here

def main():
    # Initialize the agent
    agent = A1(
        path='./dev-data',
        llm='anthropic/claude-3.5-sonnet'  # or any model from OpenRouter
    )
    
    # Example 1: Simple task
    print("Example 1: Simple file operation")
    response = agent.go("Create a file called hello.txt with the content 'Hello from ARA!'")
    print(f"Response: {response}\n")
    
    # Example 2: Reading and analyzing
    print("Example 2: File exploration")
    response = agent.go("List all files in the current directory and tell me what you find")
    print(f"Response: {response}\n")
    
    # Example 3: Complex task
    print("Example 3: Complex planning task")
    response = agent.go(
        "Create a project structure for a web scraper. "
        "Include folders for scrapers, data, and tests. "
        "Also create a README.md explaining the structure."
    )
    print(f"Response: {response}\n")


if __name__ == "__main__":
    main()