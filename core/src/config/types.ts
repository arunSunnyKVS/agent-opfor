export type ProviderName = "openai" | "anthropic" | "groq" | "google" | "other";

export interface LlmConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;   // stored in prompts file — warn user to gitignore
  baseURL?: string; // only for "other"
}

export interface TargetConfig {
  name: string;
  description: string;
  type: "http-endpoint" | "local-script" | "python-function";
  // http-endpoint fields
  endpoint?: string;
  requestFormat?: "auto" | "openai" | "json";
  targetApiKey?: string;
  targetModel?: string;
  /** Path to .js or .py for type local-script (JSON stdin → JSON stdout). */
  scriptPath?: string;
  /** @deprecated Prefer type local-script with scriptPath. */
  functionSignature?: string;
}

export interface AttackEntry {
  evaluatorId: string;
  evaluatorName: string;
  severity: string;
  owasp: string;
  patternName: string;
  prompt: string;
  passCriteria: string;
  failCriteria: string;
}

export interface PromptsFile {
  generatedAt: string;
  llm: LlmConfig;
  target: TargetConfig;
  attacks: AttackEntry[];
}

// Shape of the optional config file passed to `astra setup --config`
export interface SetupConfigFile {
  llm?: {
    provider?: ProviderName;
    model?: string;
    apiKey?: string;
    baseURL?: string;
  };
  target: {
    name: string;
    description: string;
    type: "http-endpoint" | "local-script" | "python-function";
    endpoint?: string;
    requestFormat?: "auto" | "openai" | "json";
    targetApiKey?: string;
    targetModel?: string;
    scriptPath?: string;
    functionSignature?: string;
  };
  selection:
    | { mode: "suite"; suite: string }
    | { mode: "evaluators"; evaluators: string[] };
}
