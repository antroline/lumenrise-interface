'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Blockie } from '@/components/blockie'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { categories, profiles, type Category, type Profile } from '../_data'

function ScoreBars({ profile }: { profile: Profile }) {
  return <div className="flex h-7 items-end gap-1" aria-label={`Score ${profile.scores[0]}`}>
    {profile.scores.map((score, index) => <span key={index} className="w-2.5 rounded-sm bg-foreground first:bg-lime" style={{ height: `${score}%` }} />)}
  </div>
}

export function Leaderboard() {
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState<Category>('Overall')
  const [testQuery, setTestQuery] = useState('GCKT…9SVD')
  const [tested, setTested] = useState<Profile | null>(null)
  const categoryIndex = categories.indexOf(category)
  const ranked = [...profiles].sort((a, b) => b.scores[categoryIndex] - a.scores[categoryIndex])
  const shown = ranked.filter((profile) => `${profile.name} ${profile.address}`.toLowerCase().includes(searchTerm.trim().toLowerCase()))

  return <div className="space-y-6">
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setSearchTerm(query) }}><div className="relative flex-1"><Search aria-hidden="true" className="absolute top-4 left-4 size-4 text-faint" /><Input aria-label="Search profiles" placeholder="Search a Stellar address, .xlm name or profile" value={query} onChange={(event) => setQuery(event.target.value)} className="h-[52px] pl-11" /></div><Button variant="dark" size="lg" type="submit">Search</Button></form>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">{categories.map((item) => <Button key={item} size="sm" variant={item === category ? 'dark' : 'ghost'} onClick={() => setCategory(item)} aria-pressed={item === category}>{item}</Button>)}</div><Button size="sm" variant="outline" disabled title="Historical leaderboard data is not connected">All time</Button></div>
    <p className="font-mono text-2xs tracking-caps text-faint uppercase">All time · {shown.length} illustrative profiles</p>
    <div className="grid gap-4 md:grid-cols-3">{ranked.slice(0, 3).map((profile, index) => <Card key={profile.address} className={index === 0 ? 'border-ink bg-ink text-white' : undefined}><div className="flex items-center justify-between"><span className={`font-mono text-[36px] leading-none ${index === 0 ? 'text-lime' : ''}`}>0{index + 1}</span><Badge variant="tag-outline">Level {profile.level}</Badge></div><div className="mt-3 flex items-center gap-3"><Blockie seed={profile.address} size={40} radius={10} /><div><CardTitle>{profile.name}</CardTitle><CardDescription className={index === 0 ? 'text-white/65' : undefined}>{profile.address}</CardDescription></div></div><div className="mt-auto flex justify-between border-t border-current/15 pt-3 text-small"><span>Strongest<br /><b>{profile.strongest}</b></span><span className="text-right">Credentials<br /><b>{profile.credentials}</b></span></div></Card>)}</div>
    <Card className="overflow-hidden p-0"><div className="flex items-center justify-between border-b p-5"><div><CardTitle>Full ranking</CardTitle><CardDescription>Example public profiles, ordered by {category.toLowerCase()} score.</CardDescription></div><Badge variant="tag-outline">{shown.length} profiles</Badge></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-ui"><thead className="border-b bg-muted font-mono text-2xs tracking-caps text-muted-foreground uppercase"><tr><th className="p-4">Rank</th><th>Profile</th><th>Level</th><th>Signals</th><th>Strongest</th><th>Credentials</th><th>Change</th></tr></thead><tbody>{shown.map((profile) => <tr key={profile.address} className="border-b last:border-0"><td className="p-4 font-mono">{String(ranked.indexOf(profile) + 1).padStart(2, '0')}</td><td><div className="flex items-center gap-3"><Blockie seed={profile.address} size={34} radius={9} /><span><strong>{profile.name}</strong><span className="block font-mono text-2xs text-faint">{profile.address}</span></span></div></td><td><Badge variant="tag-outline">Level {profile.level}</Badge></td><td><ScoreBars profile={profile} /></td><td>{profile.strongest}</td><td>{profile.credentials}</td><td>{profile.change}</td></tr>)}</tbody></table></div>{shown.length === 0 && <p className="p-6 text-center text-muted-foreground">No example profiles match your search.</p>}</Card>
    <Card className="gap-5 lg:flex-row"><div className="flex-1 space-y-3"><CardTitle>Test a launch rule</CardTitle><CardDescription>Preview a sample rule against an illustrative profile. No on-chain verification occurs.</CardDescription><div className="flex gap-2"><Input aria-label="Example profile to test" value={testQuery} onChange={(event) => setTestQuery(event.target.value)} /><Button variant="dark" onClick={() => setTested(profiles.find((item) => item.address.toLowerCase() === testQuery.trim().toLowerCase() || item.name.toLowerCase() === testQuery.trim().toLowerCase()) ?? null)}>Test</Button></div></div><div className="flex-1 border-t border-divider pt-4 lg:border-t-0 lg:border-l lg:pl-6"><div className="flex justify-between"><span className="font-mono text-2xs tracking-caps text-faint uppercase">Result for {tested?.name ?? 'example profile'}</span>{tested && <Badge variant={tested.scores[1] >= 40 && tested.level >= 2 ? 'ok' : 'bad'}>{tested.scores[1] >= 40 && tested.level >= 2 ? 'Eligible' : 'Ineligible'}</Badge>}</div>{tested ? <div className="mt-3 space-y-2 text-ui"><p>Stellar activity ≥ 40 <b className="float-right">{tested.scores[1]}</b></p><p>Reputation level ≥ 2 <b className="float-right">Level {tested.level}</b></p></div> : <p className="mt-3 text-ui text-muted-foreground">Enter an example name or address from the table.</p>}</div></Card>
  </div>
}
