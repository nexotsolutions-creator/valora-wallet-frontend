import { Fragment, type ReactNode } from "react";

// Parser mínimo de las respuestas del bot: **negrita** y líneas de lista
// ("- " o "1. ", "2. "...) agrupadas en <ul>/<ol>. Todo lo demás, texto plano.
// Sin dependencias nuevas y sin dangerouslySetInnerHTML — el contenido nunca
// sale de un string plano a HTML real, solo a nodos React.
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;
const UL_ITEM_PATTERN = /^-\s+(.*)/;
const OL_ITEM_PATTERN = /^\d+\.\s+(.*)/;

type LineKind = "ul" | "ol" | "text";

function classifyLine(line: string): LineKind {
  if (UL_ITEM_PATTERN.test(line)) return "ul";
  if (OL_ITEM_PATTERN.test(line)) return "ol";
  return "text";
}

function lineContent(line: string, kind: LineKind): string {
  if (kind === "ul") return line.match(UL_ITEM_PATTERN)![1];
  if (kind === "ol") return line.match(OL_ITEM_PATTERN)![1];
  return line;
}

function renderInline(line: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let boldIndex = 0;
  BOLD_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = BOLD_PATTERN.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    parts.push(<strong key={`${keyPrefix}-b${boldIndex}`}>{match[1]}</strong>);
    lastIndex = BOLD_PATTERN.lastIndex;
    boldIndex += 1;
  }
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }
  return parts;
}

export function renderChatText(text: string): ReactNode {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const kind = classifyLine(lines[index]);
    const groupLines: string[] = [];
    while (index < lines.length && classifyLine(lines[index]) === kind) {
      groupLines.push(lineContent(lines[index], kind));
      index += 1;
    }

    const blockKey = `block-${blocks.length}`;

    if (kind === "ul") {
      blocks.push(
        <ul key={blockKey}>
          {groupLines.map((line, i) => (
            <li key={`${blockKey}-${i}`}>{renderInline(line, `${blockKey}-${i}`)}</li>
          ))}
        </ul>,
      );
    } else if (kind === "ol") {
      blocks.push(
        <ol key={blockKey}>
          {groupLines.map((line, i) => (
            <li key={`${blockKey}-${i}`}>{renderInline(line, `${blockKey}-${i}`)}</li>
          ))}
        </ol>,
      );
    } else {
      blocks.push(
        <p key={blockKey}>
          {groupLines.map((line, i) => (
            <Fragment key={`${blockKey}-${i}`}>
              {i > 0 && <br />}
              {renderInline(line, `${blockKey}-${i}`)}
            </Fragment>
          ))}
        </p>,
      );
    }
  }

  return <>{blocks}</>;
}
