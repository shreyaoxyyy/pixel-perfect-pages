import { useState } from "react";
import { Button } from "@/components/ui/button";

const SYMBOLS = ["∑", "π", "∞", "√", "λ", "Ω"];

function shuffle() {
  return [...SYMBOLS, ...SYMBOLS]
    .map((s) => ({ s, k: Math.random() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.s);
}

/** Small optional game shown while the document is being written. Never blocks writing. */
export function MemoryGame() {
  const [cards, setCards] = useState(shuffle);
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const flip = (i: number) => {
    if (open.length === 2 || open.includes(i) || found.includes(i)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next as [number, number];
      setTimeout(() => {
        if (cards[a] === cards[b]) setFound((f) => [...f, a, b]);
        setOpen([]);
      }, 650);
    }
  };
  const done = found.length === cards.length;

  return (
    <div className="memory-game">
      <p className="field-note">
        {done ? `Solved in ${moves} moves!` : `Match the pairs while you wait · ${moves} moves`}
      </p>
      <div className="memory-grid">
        {cards.map((s, i) => {
          const shown = open.includes(i) || found.includes(i);
          return (
            <button
              key={i}
              type="button"
              className="memory-card"
              data-shown={shown}
              data-found={found.includes(i)}
              onClick={() => flip(i)}
              aria-label={shown ? s : "Hidden card"}
            >
              {shown ? s : ""}
            </button>
          );
        })}
      </div>
      {done && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setCards(shuffle());
            setFound([]);
            setMoves(0);
          }}
        >
          Play again
        </Button>
      )}
    </div>
  );
}
