import { formatDistanceToNow } from 'date-fns';

export interface Tool {
    name: string;
    description: string;
    parameters: any;
}

export interface Agent {
    name: string;
    instructions: string;
    tools: Tool[];
    data?: any;
}

// the social cue system is a system that operates on the agent's data 
// to determine if the agent should respond to the event
// TODO: it'd be nice if it could read the room as well! (ie, room participants, data, etc)
export class SocialCueSystem {
    init(agent: Agent, room: MultiAgentRoom) {
        agent.data.socialCueSystem = {
            lastResponse: null,
            lastResponseSender: null,
            lastResponseTime: null,
            currentParticipants: room.getAgents().map(agent => agent.name),
            shouldRespond: false,
        }
    }

    update(agent: Agent, event: Event) {
        if (event.type === "message") {
            agent.data.socialCueSystem.lastResponse = event.data.message;
            agent.data.socialCueSystem.lastResponseSender = event.data.sender;
            agent.data.socialCueSystem.lastResponseTime = event.timestamp;

            // someone sent a message!
            if (event.data.sender === agent.name) {
                return;
            }

            // someone else's message
            // this corresponds to "always respond"
            agent.data.socialCueSystem.shouldRespond = true;
        }
    }
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

export interface Message {
    sender: string;
    message: string;
}

export class MultiAgentRoom {
    private agents: Agent[] = [];
    private currentConversation: Message[] = [];
    private eventLog: EventLog = new LocalEventLog();
    private socialCueSystem: SocialCueSystem = new SocialCueSystem();

    constructor() {
        this.agents = [];
    }

    getAgents() {
        return this.agents;
    }

    getCurrentConversation() {
        return this.currentConversation;
    }

    addAgent(agent: Agent) {
        if (agent.data === undefined) {
            agent.data = {};
        }

        this.socialCueSystem.init(agent, this);
        this.agents.push(agent);
        console.log(`[${agent.name}] added to the room`);

        this.eventLog.subscribe("message", (event) => {
            // show the agent got the message with formatted timestamp
            const timeAgo = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true });
            console.log(`[${agent.name} received] ${event.data.sender}: ${event.data.message} | ${timeAgo}`);

            // should agent respond?
            this.socialCueSystem.update(agent, event);

            if (agent.data.socialCueSystem.shouldRespond) {
                console.log(`[${agent.name}] responding`);
            }
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

