declare module "react-day-picker" {
  const content: any;
  export default content;
  export = content;
}

declare module "embla-carousel-react" {
  const useEmblaCarousel: any;
  export default useEmblaCarousel;
  export { useEmblaCarousel };
}

declare module "recharts" {
  export const ResponsiveContainer: any;
  export const LineChart: any;
  export const Line: any;
  export const XAxis: any;
  export const YAxis: any;
  export const CartesianGrid: any;
  export const Tooltip: any;
  export const Legend: any;
  export const AreaChart: any;
  export const Area: any;
  export const BarChart: any;
  export const Bar: any;
  export const PieChart: any;
  export const Pie: any;
  export const Cell: any;
  const Recharts: any;
  export default Recharts;
}

declare module "vaul" {
  export const Drawer: any;
  export default Drawer;
}

declare module "react-resizable-panels" {
  export const PanelGroup: any;
  export const Panel: any;
  export const PanelResizeHandle: any;
}

declare module "input-otp" {
  import * as React from "react";

  export interface OTPInputSlotState {
    char: string;
    hasFakeCaret: boolean;
    isActive: boolean;
  }

  export interface OTPInputContextValue {
    slots: OTPInputSlotState[];
  }

  export const OTPInputContext: React.Context<OTPInputContextValue>;

  export type OTPInputProps = React.ComponentPropsWithoutRef<"div"> & {
    value?: string;
    maxLength?: number;
    onChange?: (value: string) => void;
    containerClassName?: string;
  };

  export const OTPInput: React.ForwardRefExoticComponent<
    OTPInputProps & React.RefAttributes<HTMLDivElement>
  >;
}
