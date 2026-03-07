import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeSurveyResponseInput } from '../src/survey.js';

test('sanitizeSurveyResponseInput returns empty rows for invalid survey/question keys', () => {
  assert.deepEqual(
    sanitizeSurveyResponseInput({
      surveyKey: '   ',
      questionKey: 'q1',
      answerType: 'single_choice',
      responseKey: 'yes',
    }),
    [],
  );

  assert.deepEqual(
    sanitizeSurveyResponseInput({
      surveyKey: 'survey',
      questionKey: '',
      answerType: 'single_choice',
      responseKey: 'yes',
    }),
    [],
  );
});

test('multiple_choice responses are normalized and limited', () => {
  const rows = sanitizeSurveyResponseInput({
    surveyKey: 'onboarding v4',
    questionKey: 'goals',
    answerType: 'multiple_choice',
    responseKeys: Array.from({ length: 30 }, (_, index) => `Option ${index + 1}`),
  });

  assert.equal(rows.length, 20);
  assert.equal(rows[0]?.responseKey, 'option_1');
  assert.equal(rows[19]?.responseKey, 'option_20');
});

test('boolean/numeric/text/unknown responses map to safe buckets', () => {
  const booleanRows = sanitizeSurveyResponseInput({
    surveyKey: 'survey',
    questionKey: 'q1',
    answerType: 'boolean',
    responseBoolean: false,
  });
  assert.equal(booleanRows[0]?.responseKey, 'false');

  const numericRows = sanitizeSurveyResponseInput({
    surveyKey: 'survey',
    questionKey: 'q2',
    answerType: 'numeric',
    responseNumber: -5,
  });
  assert.equal(numericRows[0]?.responseKey, 'lt_0');

  const textRows = sanitizeSurveyResponseInput({
    surveyKey: 'survey',
    questionKey: 'q3',
    answerType: 'text',
    responseText: 'a tiny note',
  });
  assert.equal(textRows[0]?.responseKey, 'text_len:11_30');

  const unknownRows = sanitizeSurveyResponseInput({
    surveyKey: 'survey',
    questionKey: 'q4',
    answerType: 'unknown',
    responseKey: 'Custom Answer',
  });
  assert.equal(unknownRows[0]?.responseKey, 'custom_answer');
});

test('sanitizeSurveyResponseInput strips PII from additional properties', () => {
  const rows = sanitizeSurveyResponseInput({
    surveyKey: 'onboarding',
    questionKey: 'source',
    answerType: 'single_choice',
    responseKey: 'organic',
    properties: {
      email: 'hidden@example.com',
      campaign: 'launch',
    },
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.responseKey, 'organic');
  assert.equal(rows[0]?.campaign, 'launch');
  assert.equal('email' in (rows[0] ?? {}), false);
});
