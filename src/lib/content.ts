// Lädt und normalisiert content/profile.yaml und intents.yaml (SPEC §3, Single Source).
// Wird ausschließlich zur Build-Zeit (Astro SSG) ausgeführt.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { IntentDef } from './intents';
import type { Envelope, NoiseLimits } from './pose';

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
  principles: unknown[];
  personal: unknown[];
  contact: { email: string };
}

const file = path.resolve(process.cwd(), 'content/profile.yaml');
const data = yaml.load(fs.readFileSync(file, 'utf8')) as Profile;

// SPEC §3: sameAs wird aus links.all generiert.
data.person.sameAs = Object.values(data.person.links.all);

export const profile: Profile = data;

const intentsFile = path.resolve(process.cwd(), 'content/intents.yaml');
const intentsData = yaml.load(fs.readFileSync(intentsFile, 'utf8')) as { intents: IntentDef[] };

export const intents: IntentDef[] = intentsData.intents;

// SPEC §6.3: Pose-Hüllen pro Archetyp (Single Source, build-zeitlich geladen).
export interface PoseEnvelopes {
  clips: string[];
  noise: NoiseLimits;
  envelopes: Record<string, Envelope>;
}

const envelopesFile = path.resolve(process.cwd(), 'content/pose-envelopes.yaml');
export const poseEnvelopes = yaml.load(
  fs.readFileSync(envelopesFile, 'utf8'),
) as PoseEnvelopes;
