'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CircleAlert, ImagePlus, UserRound, X } from 'lucide-react'
import { AuthGate } from '@/components/auth-gate'
import { LogoHorizontal } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { PROFILE_IMAGE_MIN_DIMENSION, PROFILE_IMAGE_TYPES, validateProfileImage } from '@/lib/image'
import { useLaunchpad } from '@/lib/launchpad'
import { consumeAuthReturnTo } from '@/lib/auth-return'

const DEFAULT_DESTINATION = '/'

export default function RegisterPage() {
  const router = useRouter()
  const { isSignedIn, account, retryStatusCheck } = useLaunchpad()
  const redirectStarted = useRef(false)

  // A user who is already registered never sees the form: they continue to
  // their saved destination (or the default) straight away.
  useEffect(() => {
    if (account.status !== 'registered') return
    if (redirectStarted.current) return
    redirectStarted.current = true
    router.replace(consumeAuthReturnTo())
  }, [account.status, router])

  const redirecting = account.status === 'registered'

  return (
    <div className="min-h-screen bg-page">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b px-5 py-6 sm:px-8">
        <LogoHorizontal height={24} />
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-16">
        {!isSignedIn ? (
          <AuthGate destination={DEFAULT_DESTINATION} description="Connect your account with Blux to set up your LumenRise profile." />
        ) : account.status === 'unregistered' ? (
          <RegistrationForm />
        ) : account.status === 'error' ? (
          <Empty className="min-h-[60vh] border">
            <EmptyHeader className="max-w-md">
              <EmptyMedia variant="icon">
                <CircleAlert />
              </EmptyMedia>
              <EmptyTitle>We couldn&apos;t confirm your account</EmptyTitle>
              <EmptyDescription>{account.message}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="gap-4">
              <Button size="lg" onClick={retryStatusCheck}>Try again</Button>
            </EmptyContent>
          </Empty>
        ) : (
          <StatusPanel
            title={redirecting ? 'You are all set' : 'Checking your account'}
            description={redirecting ? 'Taking you to the app…' : 'Hold on while we confirm your registration.'}
          />
        )}
      </main>
    </div>
  )
}

function StatusPanel({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="min-h-[60vh] border">
      <EmptyHeader className="max-w-md">
        <EmptyMedia variant="icon">
          <Spinner />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function RegistrationForm() {
  const { register } = useLaunchpad()
  const [name, setName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [nameError, setNameError] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const previewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  function pickAvatar(file: File | undefined) {
    if (!file) return
    setAvatarError('')
    setFormError('')
    void validateProfileImage(file).then((error) => {
      if (error) {
        setAvatarError(error)
        return
      }
      const url = URL.createObjectURL(file)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = url
      setAvatarFile(file)
      setPreviewUrl(url)
    })
  }

  function clearAvatar() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setAvatarFile(null)
    setPreviewUrl(null)
    setAvatarError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Enter your name.')
      return
    }
    if (trimmed.length > 80) {
      setNameError('Name must be 80 characters or fewer.')
      return
    }
    setNameError('')
    setFormError('')
    setSubmitting(true)
    const result = await register({ name: trimmed, avatar: avatarFile })
    setSubmitting(false)
    if (result.ok) {
      return
    }
    // On failure the entered name and chosen photo stay in place.
    setFormError(result.error)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14">
      <aside className="flex flex-col gap-6 lg:pt-6">
        <div className="grid size-14 place-items-center rounded-2xl bg-lime text-ink">
          <UserRound className="size-7" />
        </div>
        <h2 className="text-display font-bold tracking-[-0.04em]">Finish setting up your account.</h2>
        <p className="text-body text-muted-foreground">
          Your sign-in is complete. Add the name shown on your public profile — a photo is optional and can be changed later.
        </p>
      </aside>
      <section className="min-w-0">
        <form onSubmit={(event) => void submit(event)} noValidate>
          <Card className="gap-6">
            <FieldGroup className="gap-7">
              <div className="grid grid-cols-[80px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-5">
                <Field className="w-20 sm:w-28">
                  <label
                    htmlFor="register-avatar"
                    className="group relative grid size-20 cursor-pointer place-items-center overflow-hidden rounded-xl bg-surface transition-colors hover:bg-secondary focus-within:ring-3 focus-within:ring-lime/55 sm:size-28 dark:bg-muted"
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="Profile photo preview" className="size-full object-cover" />
                    ) : (
                      <ImagePlus className="size-7 text-muted-foreground transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none sm:size-8" aria-hidden="true" />
                    )}
                    <span className="sr-only">{previewUrl ? 'Change profile photo' : 'Upload profile photo'}</span>
                    <input
                      id="register-avatar"
                      type="file"
                      accept={PROFILE_IMAGE_TYPES.join(',')}
                      className="sr-only"
                      aria-label="Profile photo"
                      aria-invalid={!!avatarError}
                      aria-describedby={avatarError ? 'register-avatar-error' : 'register-avatar-hint'}
                      onChange={(event) => {
                        pickAvatar(event.target.files?.[0])
                        event.target.value = ''
                      }}
                    />
                  </label>
                  <FieldError id="register-avatar-error" className="mt-1.5 text-small">
                    {avatarError || null}
                  </FieldError>
                  {previewUrl ? (
                    <Button type="button" variant="outline" size="sm" className="mt-2 w-full" onClick={clearAvatar} disabled={submitting}>
                      <X data-icon="inline-start" /> Remove
                    </Button>
                  ) : null}
                </Field>
                <Field className="min-w-0" data-invalid={!!nameError}>
                  <FieldLabel htmlFor="register-name" className="min-w-0 text-small text-foreground">
                    Display name *
                  </FieldLabel>
                  <Input
                    id="register-name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      if (nameError) setNameError('')
                    }}
                    maxLength={80}
                    placeholder="Your name"
                    required
                    autoComplete="name"
                    aria-invalid={!!nameError}
                    aria-describedby={nameError ? 'register-name-error' : 'register-name-hint'}
                    className="h-14 min-w-0 rounded-none border-0 border-b border-border bg-transparent px-0 text-[25px] font-semibold tracking-[-0.025em] focus-visible:border-foreground focus-visible:ring-0 aria-invalid:border-border aria-invalid:ring-0 sm:text-[32px]"
                  />
                  <FieldError id="register-name-error" className="mt-1.5 text-small">
                    {nameError || null}
                  </FieldError>
                </Field>
                <FieldDescription id="register-avatar-hint" className="col-span-full text-small text-muted-foreground sm:col-start-2">
                  Optional. PNG, JPG or WebP, at least {PROFILE_IMAGE_MIN_DIMENSION}×{PROFILE_IMAGE_MIN_DIMENSION} pixels, up to 5 MB.
                </FieldDescription>
              </div>
            </FieldGroup>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col items-start justify-between gap-4 border-t pt-5 sm:flex-row sm:items-center">
              <p className="text-small text-muted-foreground">This creates your LumenRise profile.</p>
              <Button size="lg" type="submit" loading={submitting}>
                {submitting ? 'Creating your account…' : 'Create account'}
                {!submitting && <ArrowRight data-icon="inline-end" />}
              </Button>
            </div>
          </Card>
        </form>
      </section>
    </div>
  )
}
