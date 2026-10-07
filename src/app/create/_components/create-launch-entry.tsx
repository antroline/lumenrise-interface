'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { type LaunchInput } from '../_launch/launch-state';
import { CreateLaunch } from './create-launch';

export function CreateLaunchEntry({
  initialResumeIssuer,
  initialInput,
  hideIdentity,
  onInputChange,
  onBeforeConnect,
}: {
  initialResumeIssuer: string | null;
  initialInput: LaunchInput;
  hideIdentity: boolean;
  onInputChange: (input: LaunchInput) => void;
  onBeforeConnect: (input: LaunchInput) => void;
}) {
  const routeResumeIssuer = useSearchParams().get('resume');
  const [routeState, setRouteState] = useState({
    resumeIssuer: routeResumeIssuer ?? initialResumeIssuer,
    session: 0,
  });

  if (routeState.resumeIssuer !== routeResumeIssuer) {
    setRouteState({
      resumeIssuer: routeResumeIssuer,
      session:
        routeState.session +
        (routeState.resumeIssuer && !routeResumeIssuer ? 1 : 0),
    });
  }

  return (
    <CreateLaunch
      key={routeState.session}
      resumeIssuer={routeResumeIssuer}
      initialInput={initialInput}
      hideIdentity={hideIdentity}
      onInputChange={onInputChange}
      onBeforeConnect={onBeforeConnect}
    />
  );
}
