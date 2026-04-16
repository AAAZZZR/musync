import { ReactNode } from "react";

type DataListPanelProps = {
  children: ReactNode;
  countLabel: string;
  title: string;
};

export function DataListPanel({ children, countLabel, title }: DataListPanelProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/55 p-6 shadow-glow backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="text-sm text-slate-400">{countLabel}</span>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}
