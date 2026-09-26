import { ArrowRight, Code, GitBranch, Plus } from 'lucide-react'
import { GithubIcon } from '@/components/brand-icons'
import { DarkPanel } from '@/components/dark-panel'
import { PageHeader, SectionHeader } from '@/components/page-header'
import { ProjectMark } from '@/components/project-mark'
import { Stat } from '@/components/stat'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { campaigns, focus, missionStats } from './_data'
import { MissionList } from './_components/mission-list'

const focusIcons = [Code, GitBranch, GithubIcon]

export default function MissionsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Missions"
        title="Earn reputation"
        description="Concrete actions that strengthen a specific category. Each mission says what it adds and how it is verified."
        actions={
          <div className="flex flex-wrap gap-4 lg:flex-nowrap">
            <Stat tone="plain" label="Completed" value={missionStats.completed} />
            <Stat tone="plain" label="In progress" value={missionStats.inProgress} />
            <Stat tone="plain" label="Credentials" value={missionStats.credentials} />
          </div>
        }
      />

      <p className="text-small text-muted-foreground">Mission status and reputation values below are illustrative. Verification is not connected to a mission service.</p>

      <DarkPanel className="grid gap-8 p-7 lg:grid-cols-2 lg:gap-14 lg:p-9">
        <div className="flex flex-col justify-center gap-4">
          <span className="font-mono text-caption tracking-eyebrow text-muted-foreground uppercase">Suggested focus</span>
          <h2 className="text-[28px] font-bold leading-tight tracking-[-0.03em]">{focus.title}</h2>
          <p className="max-w-[44ch] text-body text-muted-foreground">{focus.description}</p>
          <div className="mt-1 flex max-w-md justify-between text-ui"><strong>{focus.current} now</strong><span>Target {focus.target}</span></div>
          <Progress value={focus.current} max={100} tone="lime" className="max-w-md" />
        </div>
        <div className="overflow-hidden rounded-2xl bg-white text-ink">
          {focus.steps.map((step, index) => {
            const Icon = focusIcons[index]
            return (
              <div key={step.title} className="flex items-center gap-3 border-b border-[#e5e5e5] px-5 py-4 last:border-0">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f0f0ec] [&_svg]:size-4"><Icon /></span>
                <span className="min-w-0 flex-1 text-ui font-semibold">{step.title}</span>
                <span className="hidden font-mono text-2xs text-faint sm:block">{step.award}</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </div>
            )
          })}
        </div>
      </DarkPanel>

      <MissionList />

      <section>
        <SectionHeader
          title="Project campaigns"
          description="Created by projects. Credentials they issue appear on your profile as project-issued evidence."
          action={<Button variant="outline" size="sm" disabled title="Campaign creation is not connected"><Plus data-icon="inline-start" /> Create a campaign</Button>}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.key}>
              <CardHeader className="flex flex-row items-center gap-3">
                <ProjectMark name={campaign.project} size={40} />
                <div><CardTitle>{campaign.title}</CardTitle><CardDescription>by {campaign.project}</CardDescription></div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="min-h-12 text-ui text-muted-foreground">{campaign.description}</p>
                <div className="rounded-xl bg-muted p-3"><span className="block font-mono text-3xs tracking-caps text-faint uppercase">Credential</span><b className="text-ui">{campaign.credential}</b></div>
                <div className="flex justify-between font-mono text-2xs text-muted-foreground"><span>{campaign.dates}</span><span>{campaign.joined} joined</span></div>
                <div className="flex justify-between text-small"><span>Your progress</span><span><b>{campaign.done}</b> of {campaign.total} tasks</span></div>
                <Progress value={(campaign.done / campaign.total) * 100} aria-label={`${campaign.done} of ${campaign.total} tasks`} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
