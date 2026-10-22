/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly FSS_CLIENT: string;
  readonly FSS_SAMPLE: string;
  readonly FSS_PARTS: { palette: string; type: string; layout: string; motion: string };
  readonly FSS_MODE: 'site' | 'gallery-index';
  readonly FSS_SHOW_TODO: boolean;
  readonly FSS_NOINDEX: boolean;
  readonly FSS_SHOW_DRAFTS: boolean;
  readonly FSS_HERO_VIDEO: string;
}
