// Lädt und normalisiert content/profile.yaml (SPEC §3, Single Source).
// Wird ausschließlich zur Build-Zeit (Astro SSG) ausgeführt.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export type Localized = string | { de?: string; en?: string };

export interface Skill {
  id: string;
  label: Localized;
}

export interface Project {
  id: string;
  title: string;
  oneliner?: Localized;
  repo?: string;
  description?: Localized;
  tier: number;
}

export interface Profile {
  person: {
    name: string;
    role: Localized;
    tagline?: Localized;
    location: string;
    links: { primary: string[]; all: Record<string, string> };
    sameAs: string[];
  };
  skills: Skill[];
  projects: Project[];
  timeline: unknown[];
  talks: unknown[];
  contact: { email: string };
}

const file = path.resolve(process.cwd(), 'content/profile.yaml');
const data = yaml.load(fs.readFileSync(file, 'utf8')) as Profile;

// SPEC §3: sameAs wird aus links.all generiert.
data.person.sameAs = Object.values(data.person.links.all);

export const profile: Profile = data;
