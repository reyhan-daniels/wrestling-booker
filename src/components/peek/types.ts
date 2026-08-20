/** Everything the peek sheet renders is pre-formatted on the server, so the
 *  client half stays a dumb, fast renderer. */

export type PeekTarget =
  | { kind: "wrestler"; id: string }
  | { kind: "headToHead"; a: string; b: string }
  | { kind: "title"; id: string }
  | { kind: "show"; id: string };

export type PeekMatchLine = {
  segmentId: string;
  showId: string;
  showName: string;
  date: string;
  line: string;
  outcome: string | null;
  detail: string | null;
};

export type PeekPayload =
  | {
      kind: "wrestler";
      id: string;
      title: string;
      subtitle: string;
      record: string;
      matches: number;
      href: string;
      reigns: { id: string; titleId: string; label: string; detail: string }[];
      opponents: { id: string; name: string; summary: string }[];
      recent: PeekMatchLine[];
    }
  | {
      kind: "headToHead";
      title: string;
      subtitle: string;
      aId: string;
      bId: string;
      summary: string;
      titleMatches: number;
      recent: PeekMatchLine[];
    }
  | {
      kind: "title";
      id: string;
      title: string;
      subtitle: string;
      href: string;
      current: string | null;
      reigns: { id: string; number: number; holders: string; span: string; length: string }[];
    }
  | {
      kind: "show";
      id: string;
      title: string;
      subtitle: string;
      href: string;
      isFinalized: boolean;
      segments: { id: string; label: string; line: string; outcome: string | null; detail: string | null }[];
    };
