export interface Service {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export const SERVICES: Service[] = [
  {
    id: 'tiling',
    title: 'Tiling',
    description:
      'Professional floor and wall tiling for kitchens, bathrooms, and living areas. ' +
      'We deliver clean, precise finishes that stand the test of time.',
  },
  {
    id: 'interior-exterior',
    title: 'Interior/Exterior Painting',
    description:
      'Expert interior and exterior painting for homes and commercial properties. ' +
      'We use premium paints and meticulous preparation for a lasting, quality result.',
  },
  {
    id: 'decorating',
    title: 'Decorating',
    description:
      'Full decorating services including wallpapering, feature walls, and finishing touches. ' +
      'We help transform your space with carefully chosen colours and textures.',
  },
];
