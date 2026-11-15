// Arabesque's election sections (clients with "kind": "elections"). Loaded by the engine
// only for election clients, so school sites never carry this code or its styles.
import './elections.css';
import ElectionHero from './ElectionHero.astro';
import Countdown from './Countdown.astro';
import ProgramFiles from './ProgramFiles.astro';
import LeaderSpotlight from './LeaderSpotlight.astro';
import CandidateGrid from './CandidateGrid.astro';
import InterviewStrip from './InterviewStrip.astro';
import BallotCard from './BallotCard.astro';
import PageBand from './PageBand.astro';
import CandidateHero from './CandidateHero.astro';
import MediaFrame from './MediaFrame.astro';
import InterviewPlayer from './InterviewPlayer.astro';
import PhotoRow from './PhotoRow.astro';
import ClipGrid from './ClipGrid.astro';
import Panel from './Panel.astro';

export const electionComponents = {
  ElectionHero, Countdown, ProgramFiles, LeaderSpotlight, CandidateGrid, InterviewStrip, BallotCard,
  PageBand, CandidateHero, MediaFrame, InterviewPlayer, PhotoRow, ClipGrid, Panel,
};
