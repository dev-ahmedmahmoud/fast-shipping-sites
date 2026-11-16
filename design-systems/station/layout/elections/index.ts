// Tanta Station's election sections (clients with "kind": "elections"). All fifteen are the
// station's own; none falls back to baseline. Not re-exported from layout/index.ts, so school
// sites never bundle these components or their styles.
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
import Ventures from './Ventures.astro';

export const electionComponents = {
  ElectionHero, Countdown, ProgramFiles, LeaderSpotlight, CandidateGrid, InterviewStrip, BallotCard,
  PageBand, CandidateHero, MediaFrame, InterviewPlayer, PhotoRow, ClipGrid, Panel, Ventures,
};
