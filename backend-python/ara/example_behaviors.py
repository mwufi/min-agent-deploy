"""Example demonstrating behaviors, activities, and live monitoring"""

import asyncio
import os
from ara import A1
from ara.behaviors.user_modeling import UserModelingBehavior

# Make sure to set your OpenRouter API key
# export OPENROUTER_API_KEY=your-key-here


async def main():
    # Create UserModelingBehavior and set it to run periodically
    user_modeling = UserModelingBehavior()
    user_modeling.set_interval(30)  # Run every 30 seconds
    
    # Initialize agent with behaviors
    agent = A1(
        path='./dev-behavior-demo-data',
        llm='anthropic/claude-3.5-sonnet',
        behaviors=[user_modeling],
        enable_live_ui=True,  # Enable live monitoring UI
        ui_backend='textual'  # Use new Textual UI with better keystroke handling
    )
    
    # Initialize the user modeling behavior
    await user_modeling.initialize(agent)
    
    # Use context manager to handle start/stop
    async with agent.session():
        print("\n🤖 ARA Agent with User Modeling Behavior")
        print("=" * 50)
        
        # Check if we have the behavior
        if agent.has_behavior("user-modeling.version>=0.1.1"):
            print("✅ User modeling behavior v0.1.1+ is available!")
            
            # Get current personality traits
            traits = await user_modeling.get_user_personality_traits(agent)
            print(f"\nCurrent personality traits: {traits}")
        
        # Simulate some conversations
        prompts = [
            "Hello! I'm really excited about machine learning and AI. Can you help me understand transformers?",
            "I prefer detailed technical explanations with code examples when possible.",
            "I don't like it when responses are too simplified or dumbed down.",
            "What are the key architectural differences between GPT and BERT?",
            "I'm working on a research project about attention mechanisms. Any insights?"
        ]
        
        print("\n📝 Starting conversations...")
        print("(Check the live UI to see behaviors and activities in action!)")
        print()
        
        for i, prompt in enumerate(prompts):
            print(f"\n[Turn {i+1}]")
            response = await agent.ago(prompt)
            
            # Short delay to see the UI updates
            await asyncio.sleep(2)
        
        # Manually trigger user model update
        print("\n🔄 Triggering user model analysis...")
        await user_modeling.update_user_model(agent)
        
        # Show updated traits
        updated_traits = await user_modeling.get_user_personality_traits(agent)
        print(f"\nUpdated personality traits: {updated_traits}")
        
        # Get user context
        context = await user_modeling.get_user_context(agent)
        print(f"\nUser context: {context}")
        
        # Show some metrics
        print("\n📊 Agent Metrics:")
        tool_metrics = agent.metrics.get_tool_summary()
        for tool, summary in tool_metrics.items():
            print(f"  {tool}: {summary.count} calls, avg {summary.avg_duration:.2f}s")
        
        print("\n✨ Check the ./dev-behavior-demo-data/user_model/ directory to see the stored user model!")
        
        # Keep the UI running for a bit to explore
        print("\n⏸️  Keeping UI open for 30 seconds... (Press Ctrl+C to exit)")
        await asyncio.sleep(30)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Goodbye!")