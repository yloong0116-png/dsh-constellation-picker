/**
 * The only type contract of this project. Docs reference this file; keep it real.
 */

/** A reasoning depth advertised by a model. */
export interface ReasoningEffort {
  id: string;
  name: string;
}

/** One selectable model, already joined with its vendor branding. */
export interface ModelChoice {
  provider: string;
  providerName: string;
  vendor: Vendor;
  model: string;
  name: string;
  reasoning?: {
    efforts?: ReasoningEffort[];
    defaultEffort?: string;
  };
  /** `reasoning` | `flagship` | `lite` */
  tier: string;
  badges: string[];
}

export interface Vendor {
  label: string;
  icon: string;
  color: string;
  soft: string;
  ink: string;
}

/** One vendor column; `ghost` columns are placeholders for unconnected vendors. */
export interface ProviderColumn {
  id: string;
  vendor: Vendor;
  models: ModelChoice[];
  ghost?: boolean;
}

/** Raw directory state as published by DSH. */
export interface CatalogState {
  status: string;
  error?: string | null;
  groups: Array<{ id: string; name?: string; models?: any[] }>;
  current: { provider: string; model: string; reasoningEffort?: string } | null;
}

/** What the controller hands to any UI. */
export interface PickerState extends CatalogState {
  choices: ModelChoice[];
  providers: ProviderColumn[];
}

/** Framework-agnostic controller: implement a UI against this. */
export interface PickerController {
  getSnapshot(): PickerState;
  subscribe(listener: () => void): () => void;
  load(): void;
  filter(query: string): ModelChoice[];
  select(choice: ModelChoice, effortId?: string): Promise<{ ok: boolean; error?: any }>;
}

/** Props the DSH slot injects into the React UI. */
export interface PickerProps {
  available: boolean;
  directory: { subscribe(fn: () => void): () => void; getSnapshot(): CatalogState };
  load(): void;
  select(selection: { provider: string; model: string; reasoningEffort?: string }): Promise<{ ok: boolean; error?: any }>;
  locked?: boolean;
}
