import { LaunchStudio } from './_components/launch-studio'

export default async function CreateLaunchPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string | string[]; mode?: string | string[] }>
}) {
  const { resume, mode } = await searchParams
  const resumeIssuer = typeof resume === 'string' && /^G[A-Z2-7]{55}$/.test(resume) ? resume : null

  return (
    <div className="w-full pb-8">
      <h1 className="sr-only">Create launch</h1>
      <LaunchStudio key={resumeIssuer ?? (mode === 'basic' ? 'basic' : 'new')} resumeIssuer={resumeIssuer} initialMode={mode === 'basic' ? 'basic' : null} />
    </div>
  )
}
