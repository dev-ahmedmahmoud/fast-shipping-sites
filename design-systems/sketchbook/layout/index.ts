// Every layout exports its tokens and the section components named in the contract.
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
