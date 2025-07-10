#!/usr/bin/env python3
"""Test script for the analyze.py functionality"""

import subprocess
import sys
import os

def test_dummy_mode():
    """Test analyze.py in dummy mode"""
    print("Testing analyze.py in dummy mode...")
    
    # Run in dummy mode first using uv
    result = subprocess.run([
        "uv", "run", "python", "analyze.py",
        "test_data",
        "--output", "test_knowledge",
        "--dummy",
        "--verbose"
    ], capture_output=True, text=True)
    
    print("STDOUT:")
    print(result.stdout)
    print("\nSTDERR:")
    print(result.stderr)
    
    return result.returncode == 0

def test_real_mode():
    """Test analyze.py with real LLM calls (requires API key)"""
    print("\nTesting analyze.py with real LLM calls...")
    
    # Check if API key is set
    if not os.environ.get("OPENAI_API_KEY"):
        print("Skipping real mode test - OPENAI_API_KEY not set")
        return True
    
    # Run with a small subset using uv
    result = subprocess.run([
        "uv", "run", "python", "analyze.py", 
        "test_data/personal-notes",
        "--output", "real_knowledge",
        "--max-concurrent", "2",
        "--rate-limit", "20",
        "-v"
    ], capture_output=True, text=True)
    
    print("STDOUT:")
    print(result.stdout[:1000])  # First 1000 chars
    print("\nSTDERR:")
    print(result.stderr[:1000])
    
    return result.returncode == 0

if __name__ == "__main__":
    # First test dummy mode
    if test_dummy_mode():
        print("\n✓ Dummy mode test passed!")
    else:
        print("\n✗ Dummy mode test failed!")
        sys.exit(1)
    
    # Then test real mode if API key available
    if test_real_mode():
        print("\n✓ Real mode test passed!")
    else:
        print("\n✗ Real mode test failed!")
        sys.exit(1)
    
    print("\nAll tests passed!")