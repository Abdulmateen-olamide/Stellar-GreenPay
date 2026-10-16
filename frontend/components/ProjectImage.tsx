/**
 * components/ProjectImage.tsx
 *
 * A project cover `` that degrades gracefully (#1069). Uploaded
 * cover URLs are third-party (IPFS gateways, admin-pasted links) and can
 * 404 or be unreachable, which used to leave a broken-image icon in the
 * card. On any load error we swap in the branded leaf placeholder.
 *
 * Alt-text rules (documented here, #1588):
 * 1. If `decorative` is true → alt="" + role="presentation" (skipped by screen readers)
 * 2. Else if `alt` prop is provided → use it verbatim
 * 3. Else if `description` is provided → use description as alt text
 * 4. Else → fall back to project `name` as alt text (alt={name})
 * 5. Placeholder image (when src missing or fails) gets alt="" + role="presentation"
 *    so it is skipped rather than announced as "project-placeholder".
 *
 * Two details worth keeping in mind:
 *  - once the placeholder is showing we drop the `onError` handler, so a
 *    placeholder that itself fails can't trigger another state update
 *    and loop;
 *  - a NEW `src` clears the error flag during render (the
 *    "adjusting state when a prop changes" pattern), so an admin
 *    re-uploading a cover is picked up without a remount.
 */
import { useState } from "react";

export const PROJECT_PLACEHOLDER_SRC = "/project-placeholder.svg";

interface ProjectImageProps {
  src?: string;
  name?: string;
  description?: string;
  alt?: string;
  decorative?: boolean;
  className?: string;
}

export default function ProjectImage({
  src,
  name,
  description,
  alt,
  decorative = false,
  className,
}: ProjectImageProps) {
  const [prevSrc, setPrevSrc] = useState(src ?? "");
  const [errored, setErrored] = useState(false);

  if (prevSrc !== (src ?? "")) {
    setPrevSrc(src ?? "");
    setErrored(false);
  }

  // Resolve alt text per the documented fallback chain (#1588)
  const resolvedAlt: string =
    decorative || !src || errored
      ? ""
      : alt ?? description ?? name ?? "";

  const displaySrc = !src || errored ? PROJECT_PLACEHOLDER_SRC : src;

  return (
    <img
      src={displaySrc}
      alt={resolvedAlt}
      role={decorative || !src || errored ? "presentation" : undefined}
      className={className}
      onError={errored ? undefined : () => setErrored(true)}
    />
  );
}
