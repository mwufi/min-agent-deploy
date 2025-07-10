#!/usr/bin/env python3
"""Simple test of the analyze functionality"""

import sys
import os

# Add the packages directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'packages'))

# Now we can import
import asyncio
from pathlib import Path

# Import our analyze components directly
from analyze import main, ExecutionConfig

class Args:
    """Mock args object"""
    def __init__(self):
        self.input = "test_data"
        self.output = "./test_knowledge"
        self.max_concurrent = 5
        self.rate_limit = 30
        self.dummy = True
        self.verbose = True

async def test_analyze():
    """Test the analyze functionality"""
    args = Args()
    
    print("Running analyze in dummy mode...")
    try:
        await main(args)
        print("Test completed successfully!")
    except Exception as e:
        print(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_analyze())