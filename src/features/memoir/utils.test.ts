/**
 * The reader's text arithmetic.
 *
 * `segment()` gets the most attention here because it is the only place in the
 * feature where being *nearly* right is worse than being absent: it decides
 * which words light up when a reader asks who said this. Highlighting the
 * wrong clause in a memoir that can never be corrected is a lie about a dead
 * person, told in oxblood.
 */

import { describe, expect, it } from "vitest";

import type { BlockSource, CommentThread } from "@/features/memoir/schemas";
import {
  chapterSpan,
  credit,
  duration,
  relationshipLabel,
  roman,
  segment,
  toldBy,
} from "@/features/memoir/utils";

const TEXT = "The Chickering was not a good instrument. It stayed in tune.";
//            0                                        40^ 42          58^

function source(overrides: Partial<BlockSource> = {}): BlockSource {
  return {
    id: "source-1",
    memory_id: "memory-1",
    participant_id: "participant-1",
    name: "Margaret Reyes",
    relationship: "sibling",
    medium: "voice",
    year: 1994,
    duration_ms: 47_000,
    start_offset: null,
    end_offset: null,
    diverges: false,
    ...overrides,
  };
}

function thread(overrides: Partial<CommentThread> = {}): CommentThread {
  return {
    id: "thread-1",
    chapter_id: "chapter-1",
    block_id: "block-1",
    start_offset: null,
    end_offset: null,
    resolved_at: null,
    comments: [],
    ...overrides,
  };
}

describe("segment", () => {
  it("leaves an unattributed paragraph as one run", () => {
    expect(segment(TEXT, [], [])).toEqual([
      { text: TEXT, sources: [], threads: [] },
    ]);
  });

  it("ignores a source that covers the whole block", () => {
    // It has no particular words to light, so the margin credit stands alone
    // and the prose is left unmarked.
    expect(segment(TEXT, [source()], [])).toHaveLength(1);
  });

  it("splits around an attributed clause", () => {
    const runs = segment(
      TEXT,
      [source({ id: "s1", start_offset: 42, end_offset: 59 })],
      [],
    );

    expect(runs.map((run) => run.text)).toEqual([
      "The Chickering was not a good instrument. ",
      "It stayed in tune",
      ".",
    ]);
    expect(runs[1].sources).toEqual(["s1"]);
    expect(runs[0].sources).toEqual([]);
  });

  it("keeps overlapping anchors distinct", () => {
    // A comment on half of a sentence one person supplied. Nesting spans would
    // have to pick a winner; a boundary sweep does not.
    const runs = segment(
      TEXT,
      [source({ id: "s1", start_offset: 0, end_offset: 40 })],
      [thread({ id: "t1", start_offset: 20, end_offset: 50 })],
    );

    expect(runs.map((run) => [run.sources, run.threads])).toEqual([
      [["s1"], []],
      [["s1"], ["t1"]],
      [[], ["t1"]],
      [[], []],
    ]);
  });

  it("drops an anchor that points past the end of the text", () => {
    // The backend refuses to store one, so this means the text and its anchors
    // have drifted. Highlighting the wrong words would be worse than none.
    const runs = segment(
      TEXT,
      [source({ id: "s1", start_offset: 5, end_offset: 9000 })],
      [],
    );

    expect(runs).toHaveLength(1);
    expect(runs[0].sources).toEqual([]);
  });

  it("handles two clauses that touch without leaving a gap", () => {
    const runs = segment(
      "abcdef",
      [
        source({ id: "s1", start_offset: 0, end_offset: 3 }),
        source({ id: "s2", start_offset: 3, end_offset: 6 }),
      ],
      [],
    );

    expect(runs.map((run) => run.text)).toEqual(["abc", "def"]);
    expect(runs.map((run) => run.sources)).toEqual([["s1"], ["s2"]]);
  });
});

describe("credit", () => {
  it("reads as one line, in the order the eye wants it", () => {
    expect(credit(source())).toBe("Voice · 1994 · 0:47");
  });

  it("says what it knows and nothing more", () => {
    expect(
      credit(source({ medium: "text", year: null, duration_ms: null })),
    ).toBe("Written");
  });
});

describe("duration", () => {
  it("pads the seconds, the way a recording's length is always written", () => {
    expect(duration(47_000)).toBe("0:47");
    expect(duration(242_000)).toBe("4:02");
  });

  it("has nothing to say about a photograph", () => {
    expect(duration(null)).toBeNull();
    expect(duration(0)).toBeNull();
  });
});

describe("roman", () => {
  it("numbers chapters the way a book does", () => {
    expect([1, 4, 8, 14].map(roman)).toEqual(["I", "IV", "VIII", "XIV"]);
  });
});

describe("toldBy", () => {
  it("names one person plainly", () => {
    expect(toldBy(["Margaret Reyes"])).toBe("Margaret Reyes");
  });

  it("joins a short list with an and", () => {
    expect(toldBy(["Margaret Reyes", "Thomas Marsh"])).toBe(
      "Margaret Reyes and Thomas Marsh",
    );
  });

  it("spells the remainder out, as the copy voice does in prose", () => {
    expect(toldBy(["A", "B", "C", "D", "E", "F", "G"])).toBe(
      "A, B, C and four others",
    );
  });

  it("has nothing to say about a chapter with no sources yet", () => {
    expect(toldBy([])).toBeNull();
  });
});

describe("relationshipLabel", () => {
  it("writes the enum out in English", () => {
    expect(relationshipLabel("spouse_partner")).toBe("Partner");
    expect(relationshipLabel("grandchild")).toBe("Grandchild");
  });

  it("says nothing when nobody said how they were related", () => {
    // `other` is the default a contributor gets when they were never asked.
    // Printing it under a name in a memoir reads as a category they were put
    // in, so the name stands alone instead.
    expect(relationshipLabel("other")).toBeNull();
  });
});

describe("chapterSpan", () => {
  const reading = {
    born_year: 1928,
    through_year: 2028,
  } as Parameters<typeof chapterSpan>[1];

  it("places a chapter along the life it belongs to", () => {
    const span = chapterSpan(
      {
        id: "c",
        ordinal: 0,
        title: "One",
        from_year: 1948,
        through_year: 1958,
      },
      reading,
    );
    expect(span).toEqual({ left: 20, width: 10 });
  });

  it("refuses to guess when the years are unknown", () => {
    expect(
      chapterSpan(
        {
          id: "c",
          ordinal: 0,
          title: "One",
          from_year: null,
          through_year: null,
        },
        reading,
      ),
    ).toBeNull();
  });
});
