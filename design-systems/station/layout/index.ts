// Tanta Station: the core section components. Election sections live in ./elections/index.ts
// and are loaded only for election clients.
import Header from './Header.astro';
import Hero from './Hero.astro';
import FeatureGrid from './FeatureGrid.astro';
import Stats from './Stats.astro';
import NewsList from './NewsList.astro';
import CTA from './CTA.astro';
import Footer from './Footer.astro';
import Prose from './Prose.astro';

export { layoutTokens } from './tokens';
export const components = { Header, Hero, FeatureGrid, Stats, NewsList, CTA, Footer, Prose };
