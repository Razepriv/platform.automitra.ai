interface CharacterCounterProps {
  current: number;
  max: number;
  label?: string;
  className?: string;
}

export function CharacterCounter({ current, max, label = "Description", className = "" }: CharacterCounterProps) {
  const percentage = (current / max) * 100;
  const isWarning = percentage > 80;
  const isError = percentage >= 100;

  return (
    <div className={`flex justify-between text-xs ${className}`}>
      <span className="text-muted-foreground">{label}</span>
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

