import React from 'react';

/** Muestra respuesta del asistente en texto plano (sin markdown). */
export function ChatMessageBody({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).filter(Boolean);

  return (
    <div className="text-sm leading-relaxed space-y-3">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        const isList = lines.length > 0 && lines.every((l) => /^-\s/.test(l));

        if (isList) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1.5">
              {lines.map((line, j) => (
                <li key={j}>{line.replace(/^-\s+/, '')}</li>
              ))}
            </ul>
          );
        }

        const isTitle = lines.length === 1 && /:\s*$/.test(lines[0]) && lines[0].length < 80;
        if (isTitle) {
          return (
            <p key={i} className="font-semibold text-foreground">
              {lines[0]}
            </p>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap text-foreground">
            {block}
          </p>
        );
      })}
    </div>
  );
}
