# @prodinfos/sdk-ts

TypeScript SDK for sending onboarding, paywall, purchase and survey analytics events to the Prodinfos ingest API.

## Install

```bash
npm install @prodinfos/sdk-ts
```

## Usage

```ts
import { init, ONBOARDING_EVENTS } from '@prodinfos/sdk-ts';

const analytics = init({
  apiKey: 'pi_live_...',
  projectId: '11111111-1111-4111-8111-111111111111',
  endpoint: 'https://collector.prodinfos.com',
});

analytics.trackOnboardingEvent(ONBOARDING_EVENTS.START, {
  onboardingFlowId: 'onboarding_v1',
});
```
