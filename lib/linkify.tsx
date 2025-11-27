import React from 'react';

/**
 * Regular expression to match URLs in text
 * Matches http://, https://, and www. prefixed URLs
 */
const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

/**
 * Converts a text string to React elements with clickable links
 * URLs are detected and rendered as anchor tags that open in new windows
 *
 * @param text - The text to process
 * @param className - Optional className for the link elements
 * @returns React elements with links rendered as anchor tags
 */
export function linkifyText(
  text: string,
  className: string = 'text-blue-600 dark:text-blue-400 hover:underline'
): React.ReactNode {
  if (!text) return text;

  const parts = text.split(URL_REGEX);

  return parts.map((part, index) => {
    if (URL_REGEX.test(part)) {
      // Reset lastIndex since we're using 'g' flag
      URL_REGEX.lastIndex = 0;

      // Ensure URL has protocol
      const href = part.startsWith('http') ? part : `https://${part}`;

      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

/**
 * React component wrapper for linkifyText
 */
interface LinkifyTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
}

export function LinkifyText({
  text,
  className,
  linkClassName = 'text-blue-600 dark:text-blue-400 hover:underline break-all'
}: LinkifyTextProps): React.ReactElement {
  return (
    <span className={className}>
      {linkifyText(text, linkClassName)}
    </span>
  );
}

export default LinkifyText;
