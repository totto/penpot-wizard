
export interface ReadShapeColorsQueryPayload {
    shapeIds?: string[];
}

export interface ReadShapeColorsResponsePayload {
    colors: Array<{
        shapeId: string;
        shapeName: string;
        fills: Array<{ color: string; opacity: number; type: string }>;
        strokes: Array<{ color: string; opacity: number; width: number; type: string }>;
    }>;
}
