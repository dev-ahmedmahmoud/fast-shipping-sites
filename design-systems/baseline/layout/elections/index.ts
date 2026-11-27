// Election sections (clients with "kind": "elections"). Baseline's set is also the engine's
// fallback: a system that targets elections exports its own `electionComponents` from its
// layout/elections/index.ts and may leave any of these out. Not re-exported from
// layout/index.ts, so school sites never bundle these components or their styles.
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
import ShareKit from './ShareKit.astro';
import Vision from './Vision.astro';
import FilePlan from './FilePlan.astro';
import FinanceReading from './FinanceReading.astro';

export const electionComponents = {
  ElectionHero, Countdown, ProgramFiles, LeaderSpotlight, CandidateGrid, InterviewStrip, BallotCard,
  PageBand, CandidateHero, MediaFrame, InterviewPlayer, PhotoRow, ClipGrid, Panel, Ventures, ShareKit, Vision, FilePlan, FinanceReading,
};
