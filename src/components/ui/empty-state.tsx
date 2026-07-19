import Link from "next/link";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void };
};

const defaultIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

export function EmptyState({ icon = defaultIcon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="mb-4">{icon}</div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      {action && (
        action.href ? (
          <Link href={action.href} className="mt-5 inline-block">
            <Button>{action.label}</Button>
          </Link>
        ) : (
          <Button onClick={action.onClick} className="mt-5">{action.label}</Button>
        )
      )}
    </div>
  );
}
