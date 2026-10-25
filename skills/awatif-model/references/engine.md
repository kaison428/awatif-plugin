## Awatif Engine

// The state and analysis pipeline of an app, without any UI: change an input
// and the pipeline re-runs, then subscribers receive the new results.
//
// Positions are in meters and forces are in Kilo-Newton, everything else
// propagates from these two assumptions.
export async function createEngine(config: AppConfig = {}): Promise<Engine>

export type Engine = {
// Snapshot of the latest run
getAll(): Results;
// Called after every completed run; returns the unsubscribe function
subscribe(callback: (results: Results) => void): () => void;
// Resolves with the results of the next completed run
next(): Promise<Results>;

    // Each of these changes state, which re-runs the pipeline
    setModel(model: Model): void;
    setParams(componentName: string, params: Record<string, unknown>): void;
    setAnalysis(analysis: "linear" | "nonlinear"): void;
    // A load case or load combination by name; `null` applies every load
    setActiveLoad(name: string | null): void;

    // The live states behind the results, for anything the API does not cover
    states: {
    geometry: Geometry;
    components: Components;
    mesh: Mesh;
    display: Display;
    analysisStatus: AnalysisStatus;
    activeAnalysis: State<"linear" | "nonlinear">;
    };
    loadCaseIds: LoadCaseIds;
    templates: ComponentTemplates;

};
