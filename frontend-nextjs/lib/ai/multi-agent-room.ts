

export interface Tool {
    name: string;
    description: string;
    parameters: any;
}

export interface Agent {
    name: string;
    instructions: string;
    tools: Tool[];
}

export interface Event {
    type: string;
    timestamp: string;
    data: any;
}

export interface EventLog {
    pushEvent(event: Event): void;
    subscribe(eventType: string, callback: (event: Event) => void): void;
}

export class LocalEventLog implements EventLog {
    private events: Event[] = [];
    private subscriptions: Map<string, ((event: Event) => void)[]> = new Map();

    pushEvent(event: Event): void {
        this.events.push(event);
        this.subscriptions.forEach((callbacks, eventType) => {
            if (eventType === event.type) {
                callbacks.forEach(callback => callback(event));
            }
        });
    }

    subscribe(eventType: string, callback: (event: Event) => void): void {
        if (!this.subscriptions.has(eventType)) {
            this.subscriptions.set(eventType, []);
        }
        this.subscriptions.get(eventType)?.push(callback);
    }
}

export class MultiAgentRoom {
    private agents: Agent[] = [];
    private eventLog: EventLog = new LocalEventLog();

    constructor() {
        this.agents = [];
    }

    addAgent(agent: Agent) {
        this.agents.push(agent);
        this.eventLog.subscribe("message", (event) => {
            // show the agent got the message
            console.log(`[${event.timestamp}] ${event.data.sender} -> ${event.data.message}`);
        });
    }

    onMessage(message: string, sender: string) {
        this.eventLog.pushEvent({
            type: "message",
            timestamp: new Date().toISOString(),
            data: {
                sender,
                message
            }
        });

        // TODO: Implement message handling
    }
}


// Example usage and testing
if (require.main === module) {
    // Create a multi-agent room
    const room = new MultiAgentRoom();

    // Add some example agents
    const emailAgent: Agent = {
        name: "Email Assistant",
        instructions: "I help with email composition and management",
        tools: [
            {
                name: "composeEmail",
                description: "Compose and send emails",
                parameters: {
                    to: "string",
                    subject: "string",
                    body: "string"
                }
            },
            {
                name: "searchEmails",
                description: "Search through email history",
                parameters: {
                    query: "string",
                    limit: "number"
                }
            }
        ]
    };

    const taskAgent: Agent = {
        name: "Task Manager",
        instructions: "I help organize and manage tasks",
        tools: [
            {
                name: "createTask",
                description: "Create a new task",
                parameters: {
                    title: "string",
                    description: "string",
                    priority: "string"
                }
            },
            {
                name: "listTasks",
                description: "List all tasks",
                parameters: {
                    status: "string"
                }
            }
        ]
    };

    // Add agents to the room
    room.addAgent(emailAgent);
    room.addAgent(taskAgent);

    room.onMessage("Hello, how are you?", "user");
}

