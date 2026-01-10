import type { ReactNode } from "react";

type TagPillProps = {
  children: ReactNode;
  className?: string;
};

export function TagPill({ children, className }: TagPillProps) {
  const classes = className ? `tech-pill ${className}` : "tech-pill";
  return <span className={classes}>{children}</span>;
}
