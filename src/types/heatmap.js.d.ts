declare module "heatmap.js" {
  export interface HeatmapDataPoint {
    x: number;
    y: number;
    value?: number;
  }

  export interface HeatmapData {
    max: number;
    min?: number;
    data: HeatmapDataPoint[];
  }

  export interface HeatmapConfiguration {
    container: HTMLElement;
    radius?: number;
    maxOpacity?: number;
    minOpacity?: number;
    blur?: number;
    gradient?: Record<string, string>;
    backgroundColor?: string;
  }

  export interface HeatmapInstance {
    setData(data: HeatmapData): void;
    repaint(): void;
    getDataURL(): string;
    configure(config: Partial<HeatmapConfiguration>): void;
  }

  const h337: {
    create(config: HeatmapConfiguration): HeatmapInstance;
  };

  export default h337;
}
