import { describe, expect, it } from 'vitest';
import { classifyLocation, matchCity, type LocationInput } from './location';

const loc = (locationRaw: string, extra: Partial<LocationInput> = {}) =>
  classifyLocation({ locationRaw, ...extra });

describe('matchCity', () => {
  it.each([
    ['Bangalore, Karnataka', 'bengaluru'],
    ['Bengaluru', 'bengaluru'],
    ['Gurugram, Haryana, India', 'delhi-ncr'],
    ['Noida', 'delhi-ncr'],
    ['New Delhi', 'delhi-ncr'],
    ['Hyderabad, Telangana', 'hyderabad'],
    ['Mumbai (Hybrid)', 'mumbai'],
    ['Pune, IN', 'pune'],
    ['Chennai', 'chennai'],
    ['Trivandrum', 'thiruvananthapuram'],
  ])('%s → %s', (raw, slug) => expect(matchCity(raw)?.slug).toBe(slug));

  it('does not match substrings', () => {
    expect(matchCity('Puneet Office')).toBeNull();
    expect(matchCity('San Francisco, CA')).toBeNull();
  });
});

describe('classifyLocation', () => {
  it('onsite in India', () => {
    expect(loc('Bengaluru')).toMatchObject({
      citySlug: 'bengaluru',
      country: 'IN',
      remoteType: 'onsite',
      indiaEligible: true,
    });
  });
  it('hybrid via text or source hint', () => {
    expect(loc('Hybrid - Pune').remoteType).toBe('hybrid');
    expect(loc('Mumbai', { workplaceHint: 'hybrid' }).remoteType).toBe('hybrid');
  });
  it('onsite outside India is not India eligible', () => {
    expect(loc('Hybrid - New York, NY')).toMatchObject({
      remoteType: 'hybrid',
      indiaEligible: false,
    });
    expect(loc('San Francisco, CA').indiaEligible).toBe(false);
  });
  it.each([
    ['Remote - India', 'remote_india'],
    ['Remote (India)', 'remote_india'],
    ['India - Remote', 'remote_india'],
    ['Remote, Bengaluru', 'remote_india'],
    ['Remote - APAC', 'remote_india'],
    ['Remote, Asia', 'remote_india'],
    ['Anywhere', 'remote_global'],
    ['Remote - Worldwide', 'remote_global'],
    ['Remote (Global)', 'remote_global'],
    ['Remote - US', 'remote_restricted'],
    ['Remote, USA', 'remote_restricted'],
    ['Remote, AMER', 'remote_restricted'],
    ['Remote - EMEA', 'remote_restricted'],
    ['Remote, United Kingdom', 'remote_restricted'],
    ['Remote - Canada', 'remote_restricted'],
    ['US Remote', 'remote_restricted'],
    ['Remote in the US', 'remote_restricted'],
    ['Remote, Singapore', 'remote_restricted'],
    ['San Francisco, CA; Remote - India', 'remote_india'],
  ] as const)('%s → %s', (raw, expected) => expect(loc(raw).remoteType).toBe(expected));

  it('uses the source workplace hint for remote', () => {
    expect(loc('India', { workplaceHint: 'remote' }).remoteType).toBe('remote_india');
    expect(loc('', { workplaceHint: 'remote', countryHint: 'IN' }).remoteType).toBe('remote_india');
  });

  it('resolves a bare "Remote" from description, then company context', () => {
    expect(
      loc('Remote', { description: 'You must be located in the United States.' }).remoteType,
    ).toBe('remote_restricted');
    expect(
      loc('Remote', { description: 'This role is remote and open to candidates based in India.' })
        .remoteType,
    ).toBe('remote_india');
    expect(loc('Remote', { description: 'Work from anywhere in the world.' }).remoteType).toBe(
      'remote_global',
    );
    expect(loc('Remote', { companyHqCountry: 'IN' }).remoteType).toBe('remote_india');
    expect(loc('Remote', { companyRemoteFirst: true }).remoteType).toBe('remote_global');
    expect(loc('Remote').remoteType).toBe('remote_restricted');
  });
});
