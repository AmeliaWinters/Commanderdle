import { lazy, Suspense, type ReactNode } from "react";
import { usePathMatch, useProfileUuid } from "../lib/routeHooks";
import {
  isPrivacyPath,
  isAboutPath,
  isHowToPlayPath,
  isFaqPath,
  isTermsPath,
  isContactPath,
  isChangelogPath,
  isAccountPath,
  isLeaderboardPath,
  isHigherLowerPath,
  isPriceIsRightPath,
  isGridPath,
  isGamesPath,
  isBinderPath,
  isArchiveBrowsePath,
} from "../lib/router";

// Each standalone page ships in its own lazy chunk, fetched only when its route matches.
const PrivacyPolicy = lazy(() => import("./PrivacyPolicy"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const HowToPlayPage = lazy(() => import("./pages/HowToPlayPage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const ChangelogPage = lazy(() => import("./pages/ChangelogPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const LeaderboardPage = lazy(() => import("./leaderboard/LeaderboardPage"));
const ProfilePage = lazy(() => import("./profile/ProfilePage"));
const HigherLowerMode = lazy(() => import("./higher-lower/HigherLowerMode"));
const PriceIsRightMode = lazy(
  () => import("./guess-the-cost/PriceIsRightMode"),
);
const GridMode = lazy(() => import("./grid/GridMode"));
const GamesHub = lazy(() => import("./games/GamesHub"));
const BinderPage = lazy(() => import("./binder/BinderPage"));
const Archive = lazy(() => import("./Archive"));

/**
 * Resolves the current URL to a standalone page (privacy, account, a sub-game, …),
 * or `null` when the URL is the daily game itself. Every path matcher runs on every
 * call so the hook order stays constant across client-side navigation, then the first
 * matching route wins.
 */
export function useStandalonePage(): ReactNode | null {
  const isPrivacy = usePathMatch(isPrivacyPath);
  const isAbout = usePathMatch(isAboutPath);
  const isHowToPlay = usePathMatch(isHowToPlayPath);
  const isFaq = usePathMatch(isFaqPath);
  const isTerms = usePathMatch(isTermsPath);
  const isContact = usePathMatch(isContactPath);
  const isChangelog = usePathMatch(isChangelogPath);
  const isAccount = usePathMatch(isAccountPath);
  const isLeaderboard = usePathMatch(isLeaderboardPath);
  const profileUuid = useProfileUuid();
  const isHigherLower = usePathMatch(isHigherLowerPath);
  const isPriceIsRight = usePathMatch(isPriceIsRightPath);
  const isGrid = usePathMatch(isGridPath);
  const isGamesHub = usePathMatch(isGamesPath);
  const isBinder = usePathMatch(isBinderPath);
  const isArchiveBrowse = usePathMatch(isArchiveBrowsePath);

  const pages: ReadonlyArray<readonly [boolean, ReactNode]> = [
    [isPrivacy, <PrivacyPolicy />],
    [isAbout, <AboutPage />],
    [isHowToPlay, <HowToPlayPage />],
    [isFaq, <FaqPage />],
    [isTerms, <TermsPage />],
    [isContact, <ContactPage />],
    [isChangelog, <ChangelogPage />],
    [isAccount, <AccountPage />],
    [isLeaderboard, <LeaderboardPage />],
    [
      profileUuid != null,
      profileUuid ? <ProfilePage uuid={profileUuid} /> : null,
    ],
    [isHigherLower, <HigherLowerMode />],
    [isPriceIsRight, <PriceIsRightMode />],
    [isGrid, <GridMode />],
    [isGamesHub, <GamesHub />],
    [isBinder, <BinderPage />],
    [isArchiveBrowse, <Archive />],
  ];
  const active = pages.find(([matched]) => matched);
  return active ? <Suspense fallback={null}>{active[1]}</Suspense> : null;
}
