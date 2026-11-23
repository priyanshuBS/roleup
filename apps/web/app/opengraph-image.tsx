import { OG_SIZE, ogImage } from '@/lib/og';

export const alt = 'RoleUp: tech jobs in India and remote, straight from company career pages';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return ogImage({
    eyebrow: 'Tech jobs · India & remote',
    title: 'Straight from company career pages.',
    subtitle: 'Filter by city, salary, level and whether a remote role is open to India.',
    pills: ['Updated every 6 hours', 'No sign-up', 'No ads'],
  });
}
