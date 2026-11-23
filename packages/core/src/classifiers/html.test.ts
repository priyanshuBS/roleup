import { describe, expect, it } from 'vitest';
import { decodeEntities, htmlToText } from './html';

describe('htmlToText', () => {
  it('converts lists and paragraphs', () => {
    expect(
      htmlToText('<p>About us</p><ul><li>Build APIs</li><li>Ship &amp; iterate</li></ul>'),
    ).toBe('About us\n\n• Build APIs\n• Ship & iterate');
  });
  it('handles entity-escaped HTML (Greenhouse)', () => {
    expect(htmlToText('&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;&lt;br/&gt;Team')).toBe(
      'Hello & welcome\n\nTeam',
    );
  });
  it('drops scripts, styles and attributes', () => {
    expect(htmlToText('<style>p{}</style><p onclick="x()">Hi<script>alert(1)</script></p>')).toBe(
      'Hi',
    );
  });
  it('decodes numeric entities and nbsp', () => {
    expect(decodeEntities('&#8377;10&nbsp;LPA &#x2014; ok')).toBe('₹10 LPA — ok');
  });
  it('truncates long text', () => {
    expect(htmlToText(`<p>${'a'.repeat(50)}</p>`, 10)).toBe('aaaaaaaaaa…');
  });
});
