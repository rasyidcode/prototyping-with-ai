export type StandAura = "none" | "electric" | "flame" | "shimmer" | "darkness";

export interface JojoTransformation {
    id: string;
    originalImage: string;
    transformedImage: string;
    standName: string;
    standAura: StandAura;
    metadata: {
        sharpness: number;
        muscularity: number;
        celShading: number;
    };
    createdAt: number;
}

export interface SoundEffect {
    id: string;
    text: string;
    position: { x: number; y: number };
    color: string;
}
