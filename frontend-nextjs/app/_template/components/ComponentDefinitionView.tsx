import { Component, ComponentDefinition } from "./pipedream_connect/types";

interface ComponentDefinitionViewProps {
    selectedComponent: Component;
    componentDefinition: ComponentDefinition | undefined;
    definitionLoading: boolean;
    onClose: () => void;
}

export default function ComponentDefinitionView({
    selectedComponent,
    componentDefinition,
    definitionLoading,
    onClose
}: ComponentDefinitionViewProps) {
    return (
        <div className="border-t border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Configuration for {selectedComponent.name}
                    </h2>
                    <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
                        {selectedComponent.key}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {definitionLoading ? (
                <div className="flex items-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading configuration options...</span>
                </div>
            ) : componentDefinition ? (
                <div className="space-y-6">
                    {componentDefinition.description && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-800">{componentDefinition.description}</p>
                        </div>
                    )}

                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Parameters</h3>

                        {componentDefinition.configurable_props.length === 0 ? (
                            <p className="text-gray-500">No configuration parameters required.</p>
                        ) : (
                            <div className="space-y-4">
                                {componentDefinition.configurable_props.map((prop, index) => (
                                    <div key={prop.name} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium text-gray-900">
                                                    {prop.label || prop.name}
                                                </h4>
                                                {!prop.optional && (
                                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                                        Required
                                                    </span>
                                                )}
                                                {prop.app && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                        {prop.app} account
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
                                                {prop.type}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-500 font-mono mb-2">
                                            {prop.name}
                                        </p>

                                        {prop.description && (
                                            <p className="text-sm text-gray-600 mb-2">
                                                {prop.description}
                                            </p>
                                        )}

                                        {prop.default !== undefined && (
                                            <div className="text-sm text-gray-600">
                                                <span className="font-medium">Default:</span>{" "}
                                                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                                                    {typeof prop.default === 'object' ? JSON.stringify(prop.default) : String(prop.default)}
                                                </code>
                                            </div>
                                        )}

                                        {prop.options && (
                                            <div className="mt-2">
                                                <span className="text-sm font-medium text-gray-600">Options:</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {prop.options.map((option, optIndex) => (
                                                        <span
                                                            key={optIndex}
                                                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                                                        >
                                                            {option.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {prop.remoteOptions && (
                                            <div className="mt-2 text-sm text-blue-600">
                                                ℹ️ Options loaded dynamically from the connected service
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-gray-500 py-8">
                    Failed to load component configuration. Please try again.
                </div>
            )}
        </div>
    );
} 