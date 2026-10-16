/**
 * Adaptado de "staggered-faq-section" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Título a la izquierda y acordeón a la derecha; la respuesta aparece palabra por palabra con desenfoque.
 * Cambios: acordeón del proyecto (Radix), `BlurredStagger` propio con `motion` (el original dependía de un
 * componente no incluido en el repositorio), tokens de Conect.ia y sin next/link.
 */
import * as React from 'react';
import { motion } from 'motion/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { cn } from '../ui/utils';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqSectionProps {
  title: string;
  subtitle: string;
  /** Línea de ayuda bajo el subtítulo (puede contener un enlace). */
  support?: React.ReactNode;
  items: FaqItem[];
  className?: string;
}

/** Revela el texto palabra por palabra con un desenfoque que se enfoca. */
function BlurredStagger({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      {text.split(' ').map((palabra, i) => (
        <motion.span
          key={`${palabra}-${i}`}
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ delay: Math.min(i * 0.018, 0.6), duration: 0.35, ease: 'easeOut' }}
          className="mr-[0.25em] inline-block"
        >
          {palabra}
        </motion.span>
      ))}
    </p>
  );
}

export function FaqSection({ title, subtitle, support, items, className }: FaqSectionProps) {
  return (
    <div className={cn('grid gap-8 md:grid-cols-5 md:gap-12', className)}>
      <div className="md:col-span-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
        <p className="mt-3 text-balance text-base text-muted-foreground">{subtitle}</p>
        {support && <div className="mt-6 hidden text-sm text-muted-foreground md:block">{support}</div>}
      </div>

      <div className="md:col-span-3">
        <Accordion type="single" collapsible>
          {items.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="border-b border-border">
              <AccordionTrigger className="min-h-12 cursor-pointer text-left text-base font-medium hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent>
                <BlurredStagger text={item.answer} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {support && <div className="text-sm text-muted-foreground md:hidden">{support}</div>}
    </div>
  );
}
