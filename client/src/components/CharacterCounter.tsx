interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

export function CharacterCounter({ current, max, className = "" }: CharacterCounterProps) {
  const percentage = (current / max) * 100;
  const isWarning = percentage > 80;
  const isError = percentage >= 100;

  return (
    <div className={`flex justify-between text-xs ${className}`}>
      <span className="text-muted-foreground">Description</span>
      <span
        className={
          isError
            ? "text-destructive font-medium"
            : isWarning
            ? "text-yellow-600"
            : "text-muted-foreground"
        }
      >
        {current}/{max}
      </span>
    </div>
  );
}

