
export interface ReadLibraryContextQueryPayload {
    // No args needed to read current context
}

export interface ReadLibraryContextResponsePayload {
    localLibrary: {
        name: string;
        colorsCount: number;
        typographiesCount: number;
        componentsCount: number;
    };
    connectedLibraries: Array<{
        id: string;
        name: string;
        colorsCount: number;
        typographiesCount: number;
        componentsCount: number;
    }>;
}
