export interface App {
    id: string;
    name_slug: string;
    name: string;
    auth_type: string;
    description?: string;
    img_src?: string;
    categories?: string[];
    featured_weight?: number;
    connect?: {
        proxy_enabled: boolean;
        allowed_domains?: string[];
        base_proxy_target_url?: string;
    };
}

export interface Component {
    name: string;
    version: string;
    key: string;
    description?: string;
    type?: string;
}

// Configurable properties for a component (like "github-fetch-repo-commits")
export interface ConfigurableProp {
    name: string;
    type: "app" | "string" | "integer" | "boolean" | "array" | "object";
    label?: string;
    description?: string;
    optional?: boolean;
    default?: any;
    app?: string;
    remoteOptions?: boolean;
    options?: Array<{ label: string; value: any }>;
    secret?: boolean;
}

export interface ComponentDefinition {
    name: string;
    version: string;
    key: string;
    description?: string;
    type?: string;
    configurable_props: ConfigurableProp[];
}

export interface Account {
    id: string;
    name: string;
    external_id: string;
    healthy: boolean;
    dead: boolean | null;
    app: {
        id: string;
        name_slug: string;
        name: string;
        auth_type: string;
        description: string;
        img_src: string;
        categories: string[];
    };
    created_at: string;
    updated_at: string;
}