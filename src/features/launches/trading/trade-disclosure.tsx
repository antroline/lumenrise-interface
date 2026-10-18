'use client';

import { Accordion, type AccordionProps } from '@/components/ui/accordion';

/** Trading forms use the shared accordion without a surrounding surface. */
export function TradeDisclosure(props: AccordionProps) {
  return <Accordion variant="plain" {...props} />;
}
