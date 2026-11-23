import { describe, expect, it } from 'vitest';
import { parseSettings } from './settings';
import {
  boardSlugCandidates,
  domainCandidates,
  mentionsName,
  nameKey,
  pageNamesCompany,
  riskyName,
  scoreFunding,
  shouldAutoApprove,
  type FundingObservation,
} from './verify';

const base: FundingObservation = {
  company: 'Wispr',
  round: 'Series B',
  amount: 280e6,
  source: { ok: true, status: 200, title: 'Wispr raises $280M at $2B valuation' },
  corroborations: 0,
  knownCompany: false,
};

describe('scoreFunding', () => {
  it('approves a live, specific, single-source report at the default threshold', () => {
    const s = scoreFunding(base);
    expect(s.score).toBe(70);
    expect(s.blocked).toBe(false);
    expect(shouldAutoApprove(s, 70)).toBe(true);
  });

  it('blocks when the source cannot be re-opened, however high the score', () => {
    const s = scoreFunding({ ...base, source: null, corroborations: 2, knownCompany: true });
    expect(s.blocked).toBe(true);
    expect(shouldAutoApprove(s, 0)).toBe(false);
  });

  it('blocks when the source is gone', () => {
    const s = scoreFunding({ ...base, source: { ok: false, status: 404 } });
    expect(s.blocked).toBe(true);
    expect(s.notes[0]).toContain('404');
  });

  it('blocks when the live headline does not name the company', () => {
    const s = scoreFunding({ ...base, source: { ok: true, title: 'Top 10 startups this week' } });
    expect(s.blocked).toBe(true);
  });

  it('keeps vague reports in the queue', () => {
    const s = scoreFunding({ ...base, amount: null, round: 'Undisclosed' });
    expect(s.score).toBe(40);
    expect(shouldAutoApprove(s, 70)).toBe(false);
  });

  it('corroboration lifts an undisclosed round over the bar', () => {
    const s = scoreFunding({ ...base, round: 'Undisclosed', corroborations: 1 });
    expect(s.score).toBe(80);
  });

  it('penalises common-word names', () => {
    const s = scoreFunding({
      ...base,
      company: 'Nova',
      source: { ok: true, title: 'Nova raises $5M seed' },
    });
    expect(s.score).toBe(40);
    expect(shouldAutoApprove(s, 70)).toBe(false);
  });
});

describe('name helpers', () => {
  it('mentionsName matches whole words only', () => {
    expect(mentionsName('Serval raises $47M', 'Serval')).toBe(true);
    expect(mentionsName('Servallo raises $47M', 'Serval')).toBe(false);
    expect(mentionsName('How C++ (and Go) won', 'C++')).toBe(true);
  });
  it('riskyName', () => {
    expect(riskyName('AI')).toBe(true);
    expect(riskyName('Cloud')).toBe(true);
    expect(riskyName('Razorpay')).toBe(false);
  });
  it('nameKey strips suffixes', () => {
    expect(nameKey('Acme Labs, Inc.')).toBe('acme');
  });
  it('board slugs', () => {
    expect(boardSlugCandidates('Wispr Flow')).toEqual(['wisprflow', 'wispr-flow']);
    expect(boardSlugCandidates('Serval AI')).toEqual(['servalai', 'serval-ai', 'serval']);
    expect(boardSlugCandidates('Zepto')).toEqual(['zepto']);
  });
  it('domains', () => {
    expect(domainCandidates('Zepto')).toContain('zepto.com');
    expect(domainCandidates('Zepto')).toContain('zepto.ai');
  });
  it('pageNamesCompany', () => {
    expect(pageNamesCompany({ title: 'Zepto | 10-minute delivery' }, 'Zepto')).toBe(true);
    expect(pageNamesCompany({ title: 'Domain for sale' }, 'Zepto')).toBe(false);
    expect(pageNamesCompany({ title: 'zavya.com is for sale — Namegarage' }, 'Zavya')).toBe(false);
    expect(
      pageNamesCompany({ title: 'DreamTeam.com — Strategic Digital Asset' }, 'Dreamteam'),
    ).toBe(false);
    expect(pageNamesCompany({ title: 'Zepto', siteName: null }, 'Zepto')).toBe(true);
  });
});

describe('parseSettings', () => {
  it('defaults', () => {
    const s = parseSettings({});
    expect(s.fundingAutoApprove).toBe(true);
    expect(s.fundingAutoApproveMin).toBe(70);
    expect(s.androidApkUrl).toBeNull();
  });
  it('db value wins over env, env is the fallback, junk is ignored', () => {
    expect(
      parseSettings(
        { 'app.androidApkUrl': 'https://a.example/x.apk' },
        { androidApkUrl: 'https://b.example/y.apk' },
      ).androidApkUrl,
    ).toBe('https://a.example/x.apk');
    expect(parseSettings({}, { androidApkUrl: 'https://b.example/y.apk' }).androidApkUrl).toBe(
      'https://b.example/y.apk',
    );
    expect(parseSettings({ 'app.androidApkUrl': 'javascript:alert(1)' }).androidApkUrl).toBeNull();
    expect(parseSettings({ 'funding.autoApproveMin': '5' }).fundingAutoApproveMin).toBe(70);
    expect(parseSettings({ 'funding.autoApprove': 'false' }).fundingAutoApprove).toBe(false);
  });
});
