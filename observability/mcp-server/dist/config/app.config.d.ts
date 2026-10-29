export interface AppConfig {
    app: {
        logLevel: string;
        cucumberResultsPath: string;
        junitResultsPath: string;
        dashboard: {
            title: string;
            outputPath: string;
            logoUrl: string;
            generateAfterAnalysis: boolean;
            autoOpen: boolean;
        };
    };
    ai: {
        baseUrl: string;
        model: string;
        timeout: number;
    };
}
export declare function loadConfig(): AppConfig;
export declare function validateConfig(config: AppConfig): void;
//# sourceMappingURL=app.config.d.ts.map