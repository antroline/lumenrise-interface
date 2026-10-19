import { notFound, redirect } from 'next/navigation';
import { StrKey } from '@stellar/stellar-sdk';

export default async function ParticipatePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  if (!StrKey.isValidContract(slug)) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  redirect(`/launch/${slug}${query.size ? `?${query}` : ''}`);
}
