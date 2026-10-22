import { notFound, redirect } from 'next/navigation';
import { isLaunchSlug } from '@/lib/launch-slug';

export default async function ParticipatePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  if (!isLaunchSlug(slug)) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  redirect(`/launches/${slug}${query.size ? `?${query}` : ''}`);
}
