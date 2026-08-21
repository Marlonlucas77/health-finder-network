import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  value,
  size = 16,
  onChange,
  className,
}: {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(value);
        const Icon = (
          <Star
            style={{ width: size, height: size }}
            className={cn(filled ? "fill-gold text-gold" : "text-muted-foreground/40")}
          />
        );
        return onChange ? (
          <button
            key={i}
            type="button"
            aria-label={`${i} estrelas`}
            onClick={() => onChange(i)}
            className="transition-transform hover:scale-110"
          >
            {Icon}
          </button>
        ) : (
          <span key={i}>{Icon}</span>
        );
      })}
    </div>
  );
}
