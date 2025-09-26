// types/plyr.d.ts
// --- Changed: Replaced 'declare module globalThis' with 'declare global' to fix naming conflict with built-in globalThis ---

// Declare Plyr class
declare class Plyr {
  constructor(
    selector: string,
    options?: {
      controls?: string[];
      [key: string]: any;
    }
  );
  source: { type: string; sources: { src: string; type: string }[] };
  play(): void;
  pause(): void;
  // Add more methods/properties as needed
}

// Extend global Window interface
declare global {
  interface Window {
    Plyr: typeof Plyr;
    player: Plyr;
  }
}
