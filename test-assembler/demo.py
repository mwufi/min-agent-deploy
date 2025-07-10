#!/usr/bin/env python3
"""
Demo script for Sierra's analyze functionality

This demonstrates how to use the analyze.py script to process a directory
of notes and extract structured knowledge.
"""

import os
import subprocess
import sys

def run_demo():
    """Run a demonstration of the analyze functionality"""
    
    print("🌄 Sierra Knowledge Extraction Demo")
    print("=" * 50)
    print()
    
    # Check if we have test data
    if not os.path.exists("test_data"):
        print("❌ Error: test_data directory not found")
        print("Please ensure you have sample notes in the test_data directory")
        return
    
    # Run in dummy mode first
    print("1. Running in DUMMY mode (no LLM calls)...")
    print("-" * 40)
    
    result = subprocess.run([
        "uv", "run", "python", "analyze.py",
        "test_data",
        "--output", "demo_knowledge_dummy",
        "--dummy",
        "--max-concurrent", "10"
    ], capture_output=True, text=True)
    
    if result.returncode == 0:
        print("✅ Dummy mode completed successfully!")
        print(f"   Output saved to: demo_knowledge_dummy/")
        
        # Show what was created
        print("\n   Created directories:")
        for item in os.listdir("demo_knowledge_dummy"):
            print(f"   - {item}")
    else:
        print("❌ Dummy mode failed:")
        print(result.stderr[-500:])  # Last 500 chars of error
    
    print()
    
    # Check for API key
    if os.environ.get("OPENAI_API_KEY"):
        print("2. Running with REAL LLM calls...")
        print("-" * 40)
        print("   This will make actual API calls to OpenAI")
        print("   Processing only personal-notes subdirectory to minimize costs")
        print()
        
        confirm = input("   Continue? (y/N): ")
        if confirm.lower() == 'y':
            result = subprocess.run([
                "uv", "run", "python", "analyze.py",
                "test_data/personal-notes",
                "--output", "demo_knowledge_real",
                "--max-concurrent", "3",
                "--rate-limit", "30"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                print("\n✅ Real mode completed successfully!")
                print(f"   Output saved to: demo_knowledge_real/")
                
                # Show some sample output
                print("\n   Sample extracted entities:")
                entities_dir = "demo_knowledge_real/entities"
                if os.path.exists(entities_dir):
                    for i, entity_file in enumerate(os.listdir(entities_dir)[:3]):
                        print(f"   - {entity_file}")
                
                print("\n   Sample topics:")
                topics_dir = "demo_knowledge_real/topics"
                if os.path.exists(topics_dir):
                    for i, topic_file in enumerate(os.listdir(topics_dir)[:3]):
                        print(f"   - {topic_file}")
            else:
                print("\n❌ Real mode failed:")
                print(result.stderr[-500:])
    else:
        print("2. Skipping REAL mode (OPENAI_API_KEY not set)")
        print("   To run with real LLM calls, set your OpenAI API key:")
        print("   export OPENAI_API_KEY='your-key-here'")
    
    print()
    print("=" * 50)
    print("Demo complete! 🎉")
    print()
    print("Next steps:")
    print("- Explore the generated knowledge directories")
    print("- Try running on your own notes directory")
    print("- Customize the agent prompts in packages/ara/prompts/")

if __name__ == "__main__":
    run_demo()