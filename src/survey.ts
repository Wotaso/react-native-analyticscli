import type { OnboardingSurveyResponseInput } from './types.js';
import {
  sanitizeProperties,
  toNumericBucket,
  toStableKey,
  toTextLengthBucket,
} from './helpers.js';

export const sanitizeSurveyResponseInput = (
  input: OnboardingSurveyResponseInput,
): Array<Record<string, unknown>> => {
  const surveyKey = toStableKey(input.surveyKey);
  const questionKey = toStableKey(input.questionKey);
  if (!surveyKey || !questionKey) {
    return [];
  }

  const baseProperties: Record<string, unknown> = {
    surveyKey,
    questionKey,
    answerType: input.answerType,
    responseProvided: true,
    ...(input.appVersion ? { appVersion: input.appVersion } : {}),
    ...(input.isNewUser !== undefined ? { isNewUser: input.isNewUser } : {}),
    ...(input.onboardingFlowId ? { onboardingFlowId: input.onboardingFlowId } : {}),
    ...(input.onboardingFlowVersion !== undefined
      ? { onboardingFlowVersion: input.onboardingFlowVersion }
      : {}),
    ...(input.stepKey ? { stepKey: input.stepKey } : {}),
    ...(input.stepIndex !== undefined ? { stepIndex: input.stepIndex } : {}),
    ...(input.stepCount !== undefined ? { stepCount: input.stepCount } : {}),
    ...(input.experimentVariant ? { experimentVariant: input.experimentVariant } : {}),
    ...(input.paywallId ? { paywallId: input.paywallId } : {}),
    ...sanitizeProperties(input.properties),
  };

  if (input.answerType === 'multiple_choice') {
    const keys = (input.responseKeys ?? [])
      .map((value) => toStableKey(value))
      .filter((value): value is string => Boolean(value))
      .slice(0, 20);

    return keys.map((responseKey) => ({
      ...baseProperties,
      responseKey,
    }));
  }

  if (input.answerType === 'single_choice') {
    const responseKey = toStableKey(input.responseKey);
    if (!responseKey) return [];
    return [
      {
        ...baseProperties,
        responseKey,
      },
    ];
  }

  if (input.answerType === 'boolean') {
    if (typeof input.responseBoolean !== 'boolean') return [];
    return [
      {
        ...baseProperties,
        responseKey: input.responseBoolean ? 'true' : 'false',
      },
    ];
  }

  if (input.answerType === 'numeric') {
    if (typeof input.responseNumber !== 'number') return [];
    return [
      {
        ...baseProperties,
        responseKey: toNumericBucket(input.responseNumber),
      },
    ];
  }

  if (input.answerType === 'text') {
    if (typeof input.responseText !== 'string') return [];
    return [
      {
        ...baseProperties,
        responseKey: `text_len:${toTextLengthBucket(input.responseText)}`,
      },
    ];
  }

  const responseKey = toStableKey(input.responseKey);
  if (!responseKey) return [];
  return [
    {
      ...baseProperties,
      responseKey,
    },
  ];
};
