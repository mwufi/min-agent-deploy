
# Sierra: Project Overview
We're building an AI biographer that's able to take into account various sources of information, and produce insights & inferences about the user.

For an MVP of Sierra, the ingestion process should be designed as a flexible, multi-stage pipeline where specialized LLM agents handle the complex interpretation, minimizing rigid code.

Here’s a simple, flexible software design for that initial ingestion process.

Sierra MVP: The Initial Ingestion Pipeline
The design philosophy is a "managed swarm" of LLM agents. Instead of a single, complex program, we use a pipeline where different AI agents are responsible for specific stages of processing. This makes the system highly adaptable—you can add or refine agents just by changing their core prompts.

The process flows through four main stages:

Secure Triage & Pre-processing: Getting data into a uniform format.

Parallel Agent Analysis: Extracting insights from the raw data.

Knowledge Graph Assembly: Structuring the insights into your desired format.

Synthesis & User Onboarding: Presenting the initial understanding to the user.

Here is a visual representation of the workflow:

[User Data Sources] -> Triage -> [Agent Swarm] -> Assembler -> [Knowledge Graph] -> Biographer -> [User]
(Notes, History, etc)            (Parallel LLM Calls)                      (/entities, /goals)
Stage 1: Secure Triage & Pre-processing
This stage is about preparing the diverse data sources for the LLM agents. The goal is to turn everything into small, consistent "Data Units."

Connectors: A user-facing interface allows secure, permission-based connections to sources like Google Drive, local note folders (Obsidian, etc.), and browser history files.

The Triage Agent: This isn't one agent, but a set of simple rules and models.

Text (Notes, History): Text is chunked into smaller, coherent segments. For example, a 50-page document becomes multiple Data Units, each with metadata about its source.

Images: A Vision-to-Text Agent (powered by a multimodal GPT-5) processes each image. Its sole job is to generate a rich, detailed caption. It describes objects, people, text in the image, and the overall mood or event. The resulting text becomes the content of the Data Unit.

Output: Each piece of content (a note, a day's Browse history, an image description) is packaged into a standardized JSON object:

JSON

{
  "data_id": "unique_id_123",
  "source": "google_drive",
  "type": "note",
  "timestamp": "2025-07-10T09:30:00Z",
  "content": "Meeting notes about the Q3 marketing strategy. Key takeaway: focus on the 'Sierra' project and user-centric design..."
}
Stage 2: Parallel Agent Analysis (The "Swarm")
This is the core of the LLM-native design. Each "Data Unit" from Stage 1 is sent in parallel to a swarm of specialized agents. Each agent has a specific job, defined by its prompt.

The Entity Extractor:

Prompt Focus: "From the following text, identify and extract all named entities (people, companies, projects, locations, books, etc.). Categorize each one. Output as a JSON list."

Output Destination: /entities

The Goal & Project Detector:

Prompt Focus: "Analyze this text for user goals, stated intentions, or ongoing projects. Look for forward-looking language or descriptions of effort. Summarize the goal or project. Output as a JSON object."

Output Destination: /user-modeling/goals

The Preference & Mood Analyst:

Prompt Focus: "Examine this text for expressions of preference, opinions, and sentiment. Identify likes, dislikes, and the emotional tone (e.g., stressed, excited, curious). Output as a JSON object."

Output Destination: /user-modeling/preferences-and-mood-notes

This parallel approach is incredibly efficient and flexible. To add a new category to the knowledge graph, you just design and deploy a new agent to the swarm.

Stage 3: The Knowledge Graph Assembler
The outputs from the agent swarm are a stream of unstructured insights. The Assembler's job is to intelligently build the final, structured Knowledge Graph.

The Assembler Agent: This is a more powerful, stateful LLM agent.

Entity Resolution: It receives outputs like {"entity": "Jen", "type": "person"} and {"entity": "Jennifer", "type": "person"}. Its job is to recognize these are likely the same entity and merge them in the graph. It creates a single node for "Jennifer" and links both source notes to it.

Knowledge Consolidation: It takes all the agent outputs and formally writes them into the structured knowledge graph, ensuring there are no duplicates and that relationships are correctly linked. For example, it connects an entity from /entities to a project in /user-modeling/goals.

Stage 4: Synthesis & User Onboarding
The ingestion process isn't complete until Sierra presents its initial findings to the user. This builds trust and kicks off the crucial feedback loop.

The Biographer Agent: This final agent reads the newly created knowledge graph.

Prompt Focus: "You are Sierra. You have just processed your user's initial data. Review their knowledge graph and compose a brief, welcoming message. Summarize 2-3 of the most prominent themes, projects, or interests you've identified. Frame your understanding as a starting point and ask for their feedback or corrections."

Example Output:

"Hi, I'm Sierra. I've finished setting up my initial understanding based on the notes and history you provided.
It looks like you're deeply involved in a project called 'Odyssey', spend a lot of time researching urban planning and sustainable architecture, and have a strong interest in Japanese minimalist design.
Is that a fair starting point? I'm ready to learn more from you."

# Coding Styles & Tips
- Always start simple. Rely on LLMs as much as possible (they can do anything from entity resolution to sumarizing multiple documents)