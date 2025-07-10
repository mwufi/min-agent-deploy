
# Ara Architecture

Our goal for Ara is to be able to represent multi-agent AI systems (Ara's) that can manage knowledge, form hypotheses, and modify their own behavior. Ara's keep track of their state through a special markdown directory. They can have various Behaviors that allow them to act differently. For example, an Ara equipped with EpisodicMemoryBehavior will write down its conversations in a log, and periodically summarize them (compact) to form insights (through a specially prompted LLM). an Ara equipped with SkillCreationBehavior will periodically check its logs to see if there are instances of new skills that the user taught it, and if so, try to create documents in /skills that reflect these learned procedures. an Ara equipped with UserModelingBehavior will analyze user responses for interest, and perhaps modify the /user-modeling/persona.md or /user-modeling/goals.md to keep track of what it knows about the user.

Furthermore, behaviors can modify the system prompt - for example, if Ara has UserModelingBehavior, then it has a promptBlock() that returns a snippet about user modeling & where to find that information (or perhaps directly loads the contents of the file into the prompt block!). And this in turn is added to the main agent's system prompt.

## the Behavior lifecycle

You can add behaviors to agents

behavior.initialize() // set up anything you need here
on_user_message() // each behavior can independently react to user messages

pre_process(user_msg) // not sure how this is used, but we can modify the user message??
post_process() // after the main agent responds, the result is post-processed by each behavior

periodic_task() // behaviors can also set up periodic tasks. For example, memory compression, or reflection.


# dev rules
- For agent data directories, always prefix it with "dev-", so that we don't check it into git.
