'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { LogOut, Wallet } from 'lucide-react'
import { AuthGate } from '@/components/auth-gate'
import { PageHeader } from '@/components/page-header'
import { ProfileAvatar } from '@/components/profile-avatar'
import { ImageCropInput } from '@/components/image-crop-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { FieldSurface, FormInput } from '@/components/form-controls'
import { getConfiguration } from '@/lib/api/config'
import { imageHint } from '@/lib/client-rules'
import { API_NETWORK } from '@/lib/stellar/network'
import { useLaunchpad } from '@/lib/launchpad'
import { TeamInvitations } from '@/features/launches/components/team-invitations'

export default function SettingsPage() {
  const { accountReady, address, logout } = useLaunchpad()
  if (!accountReady) return <AuthGate destination="/settings" description="Connect your Stellar wallet to manage your profile and account settings." />
  return <SettingsContent key={address} address={address} logout={logout} />
}

function SettingsContent({ address, logout }: { address?: string; logout: () => void }) {
  const { account, refreshProfile } = useLaunchpad()
  const profile = account.status === 'registered' ? account.profile : null

  useEffect(() => {
    if (account.status === 'registered') void refreshProfile()
  }, [account.status, refreshProfile])

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
    <PageHeader eyebrow={null} title="Account settings" description="Manage your public profile, team invitations, and connected wallet." />
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-5">
        {profile && <ProfileCard name={profile.name} avatarUrl={profile.avatarUrl} seed={address || profile.identityId} />}
        {profile && <SettingsCard id="team-invitations" title="Team invitations" description="Accept an invitation to appear on a launch’s team, or decline it."><TeamInvitations /></SettingsCard>}
        <SettingsCard id="security" title="Security" description="Manage your browser session.">
          <div className="flex flex-col gap-4"><p className="text-small leading-relaxed text-muted-foreground">Disconnect your current Blux session on this device.</p><Button variant="outline" className="min-h-11 w-full" onClick={logout}><LogOut data-icon="inline-start" />Log out</Button></div>
        </SettingsCard>
      </div>
      <aside aria-label="Connected wallet" className="flex min-w-0 flex-col gap-5">
        <SettingsCard id="wallets" title="Connected wallet" description="The Stellar wallet connected to this account.">
          <div className="flex min-w-0 flex-col items-start gap-4">
            <div className="flex w-full items-center gap-2"><span className="mr-auto grid size-9 shrink-0 place-items-center rounded-lg bg-secondary"><Wallet className="size-4" aria-hidden="true" /></span><Badge variant="lime">Primary</Badge><Badge variant="net">{API_NETWORK === 'public' ? 'MAINNET' : 'TESTNET'}</Badge></div>
            <p className="min-w-0 break-all font-mono text-small leading-relaxed text-muted-foreground" aria-label="Connected wallet address">{address}</p>
            <Button variant="outline" className="min-h-11 w-full" nativeButton={false} render={<Link href="/portfolio" />}>Portfolio</Button>
          </div>
        </SettingsCard>
      </aside>
    </div>
  </div>
}

function SettingsCard({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return <Card id={id}><CardHeader><CardTitle className="text-title">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>{children}</Card>
}

function ProfileCard({ name, avatarUrl, seed }: { name: string; avatarUrl: string | null; seed: string }) {
  const { updateProfile, removeAvatar } = useLaunchpad()
  const fileInput = useRef<HTMLInputElement>(null)
  const busy = useRef(false)
  // Null follows refreshed profile data until the user starts editing.
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [photoDraft, setPhotoDraft] = useState<{ file: File; url: string } | null>(null)
  const [pending, setPending] = useState<'save' | 'remove' | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const currentName = nameDraft ?? name
  const trimmedName = currentName.trim()
  const nameChanged = trimmedName !== name.trim()
  const nameError = nameDraft === null ? '' : !trimmedName ? 'Enter your name.' : trimmedName.length > 80 ? 'Name must be 80 characters or fewer.' : ''
  const changed = nameChanged || photoDraft !== null
  const uploadsEnabled = getConfiguration().features.imageUploads

  useEffect(() => () => { if (photoDraft) URL.revokeObjectURL(photoDraft.url) }, [photoDraft])

  function clearFeedback() {
    setError('')
    setMessage('')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || !changed || nameError) return
    busy.current = true
    setPending('save')
    clearFeedback()
    try {
      const result = await updateProfile({
        ...(nameChanged ? { name: trimmedName } : {}),
        ...(photoDraft ? { avatar: photoDraft.file } : {}),
      })
      if (!result.ok) { setError(result.error); return }
      setNameDraft(null)
      setPhotoDraft(null)
      setMessage('Changes saved.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not save your profile. Try again.')
    } finally {
      busy.current = false
      setPending(null)
    }
  }

  async function remove() {
    if (busy.current) return
    busy.current = true
    clearFeedback()
    setPending('remove')
    try {
      const result = await removeAvatar()
      if (!result.ok) setError(result.error)
      else setMessage('Photo removed.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not remove your photo. Try again.')
    } finally {
      busy.current = false
      setPending(null)
    }
  }

  return (
    <SettingsCard id="profile" title="Profile" description="The name and photo shown on your public profile.">
      <form onSubmit={save} noValidate className="flex min-w-0 flex-col gap-6" aria-describedby={error ? 'profile-error' : undefined}>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-4">
            {photoDraft ? <img src={photoDraft.url} alt="New profile photo preview" className="size-16 shrink-0 rounded-full object-cover" /> : <ProfileAvatar seed={seed} avatarUrl={avatarUrl} size={64} radius={32} />}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <b className="text-ui">Profile photo</b>
              <div className="flex flex-wrap items-center gap-2">
                <ImageCropInput ref={fileInput} kind="avatar" className="sr-only" aria-label="Profile photo" disabled={pending !== null || !uploadsEnabled} onError={setError} onCropped={(file) => { clearFeedback(); setPhotoDraft({ file, url: URL.createObjectURL(file) }) }} />
                {uploadsEnabled && <Button type="button" variant="outline" className="min-h-11" disabled={pending !== null} onClick={() => fileInput.current?.click()}>{avatarUrl || photoDraft ? 'Change photo' : 'Add photo'}</Button>}
                {photoDraft ? <Button type="button" variant="ghost" className="min-h-11" disabled={pending !== null} onClick={() => { setPhotoDraft(null); clearFeedback() }}>Undo photo change</Button>
                  : avatarUrl && <Button type="button" variant="ghost" className="min-h-11" disabled={pending !== null} onClick={remove}>{pending === 'remove' ? 'Removing…' : 'Remove photo'}</Button>}
              </div>
            </div>
          </div>
          <p className="text-small leading-relaxed text-muted-foreground">{imageHint('avatar')}</p>
        </div>
        <Field data-invalid={!!nameError}>
          <FieldSurface className="focus-within:border-foreground/60 has-[[aria-invalid=true]]:focus-within:border-bad/70">
            <FieldLabel htmlFor="profile-name" className="text-small text-muted-foreground">Name</FieldLabel>
            <FormInput id="profile-name" name="name" autoComplete="name" value={currentName} disabled={pending !== null} onChange={(event) => { setNameDraft(event.target.value); clearFeedback() }} aria-invalid={!!nameError} aria-describedby={nameError ? 'profile-name-error' : 'profile-name-hint'} className="font-medium" />
          </FieldSurface>
          <div className="flex items-start justify-between gap-3">
            <FieldDescription id="profile-name-hint">Shown on your public profile.</FieldDescription>
            <span className="shrink-0 text-small tabular-nums text-muted-foreground" aria-label="Name character count">{trimmedName.length}/80</span>
          </div>
          {nameError && <FieldError id="profile-name-error" role="alert">{nameError}</FieldError>}
        </Field>
        {error && <p id="profile-error" role="alert" className="text-small text-bad">{error}</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" className="text-small text-muted-foreground empty:hidden">{message || (changed ? 'You have unsaved changes.' : '')}</p>
          <div className="flex items-center justify-end gap-2 sm:ml-auto">
            {changed && <Button type="button" variant="ghost" className="min-h-11" disabled={pending !== null} onClick={() => { setNameDraft(null); setPhotoDraft(null); clearFeedback() }}>Discard changes</Button>}
            <Button type="submit" className="min-h-11 max-sm:flex-1" disabled={!changed || pending !== null || !!nameError}>{pending === 'save' ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </div>
      </form>
    </SettingsCard>
  )
}
