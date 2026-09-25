import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { ABOUT_SECTIONS } from "./aboutSections";

/** One request per page load, shared by the header, footer and About page. */
let awardsCheck: Promise<boolean> | null = null;
function hasAwards(): Promise<boolean> {
  awardsCheck ??= api.settings.public.about
    .query()
    .then((about) => about.awards.length > 0)
    .catch(() => true); // can't tell → keep the section rather than hide real content
  return awardsCheck;
}

/**
 * The About sections to offer. "Awards & Recognition" appears only once real awards exist
 * (added in the back office's Manage About) — an empty or made-up awards list shouldn't be
 * linked from every page.
 */
export function useAboutSections() {
  const [showAwards, setShowAwards] = useState(true);
  useEffect(() => {
    let alive = true;
    hasAwards().then((yes) => alive && setShowAwards(yes));
    return () => {
      alive = false;
    };
  }, []);
  return showAwards ? ABOUT_SECTIONS : ABOUT_SECTIONS.filter((s) => s.id !== 'awards');
}
