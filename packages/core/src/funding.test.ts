import { describe, expect, it } from 'vitest';
import { extractAmount, extractCompany, extractFunding, extractRound } from './funding';

const R = 84;

describe('extractFunding (real-world headlines)', () => {
  it.each([
    ['Viral AI startup Instinct has raised $350M at a $2.5B valuation', 'Instinct', 350e6, 'USD'],
    ['Wispr raises $280M at $2B valuation as it looks beyond dictation', 'Wispr', 280e6, 'USD'],
    [
      'AI chip maker SambaNova raises $1B at $11B valuation, 5 months after last mega round',
      'SambaNova',
      1e9,
      'USD',
    ],
    [
      'Airbnb-backed WeRoad raises $58M to take its group travel platform to the US',
      'WeRoad',
      58e6,
      'USD',
    ],
    ['Meridian raises $17 million to remake the agentic spreadsheet', 'Meridian', 17e6, 'USD'],
    [
      'Data Security Startup Matters.AI Nets ₹115 Cr From Tanglin Venture Partners, Others',
      'Matters.AI',
      115e7,
      'INR',
    ],
    ['Zavya Nets ₹22.6 Cr To Scale Everyday Silver Jewellery Biz', 'Zavya', 22.6e7, 'INR'],
    [
      'Spacetech startup SatSure raises $7 million from sovereign space fund',
      'SatSure',
      7e6,
      'USD',
    ],
    [
      'Bijnis rebrands as Zorit, raises Rs 27 crore to scale B2B quick commerce play',
      'Zorit',
      27e7,
      'INR',
    ],
    ['Sarvam AI raises Rs 2,500 crore in Series B led by Lightspeed', 'Sarvam AI', 2500e7, 'INR'],
    ['DeepSeek reportedly raises $15B days after US restrictions', 'DeepSeek', 15e9, 'USD'],
  ] as const)('%s', (headline, company, amount, currency) => {
    const f = extractFunding(headline, R);
    expect(f).not.toBeNull();
    expect(f!.company).toBe(company);
    expect(f!.amount).toBeCloseTo(amount, 0);
    expect(f!.currency).toBe(currency);
  });

  it.each([
    'Convective Capital raises an $85 million fund to build disaster resilience',
    'Databricks in early talks to raise funds at $225 billion valuation: WSJ',
    'Investors pull Oyo valuation down further as IPO slips to early 2027',
    'Chipmakers AMD, Arm, and Qualcomm are all investing in this buzzy self-driving tech startup',
    'Startup X plans to raise $50M next year',
    'Peak XV closes $1.3 billion fund for India',
  ])('rejects: %s', (headline) => expect(extractFunding(headline, R)).toBeNull());

  it('takes the round from the headline, else from the summary', () => {
    expect(extractFunding('Acme raises $12M Series A', R)?.round).toBe('Series A');
    expect(extractFunding('Acme raises $2M in pre-seed round', R)?.round).toBe('Pre-Seed');
    expect(
      extractFunding('Acme bags funding', R, 'The pre-Series A round was led by Blume.')?.round,
    ).toBe('Pre-Series A');
    expect(extractFunding('Acme raises $5M', R)?.round).toBe('Undisclosed');
  });
});

describe('pieces', () => {
  it('amounts and conversion', () => {
    expect(extractAmount('raises $20M', R)).toEqual({
      amount: 20e6,
      currency: 'USD',
      amountUsd: 20e6,
      amountInr: 20e6 * R,
    });
    expect(extractAmount('raises ₹50 Cr', R)?.amountInr).toBe(50e7);
    expect(extractAmount('Rs 10 crore round', R)?.amountUsd).toBe(Math.round(10e7 / R));
    expect(extractAmount('raises €12M', R)?.currency).toBe('EUR');
    expect(extractAmount('raises $1.5 billion', R)?.amount).toBe(1.5e9);
    expect(extractAmount('5 founders', R)).toBeNull();
  });
  it('rounds', () => {
    expect(extractRound('Series C extension')).toBe('Series C');
    expect(extractRound('pre-series A')).toBe('Pre-Series A');
    expect(extractRound('venture debt')).toBe('Debt');
    expect(extractRound('growth')).toBeNull();
  });
  it('company names', () => {
    expect(extractCompany('Bengaluru-based Jar raises $20M')).toBe('Jar');
    expect(extractCompany('Fintech startup Jupiter bags $10M')).toBe('Jupiter');
    expect(extractCompany('raises $5M')).toBeNull();
  });
});
