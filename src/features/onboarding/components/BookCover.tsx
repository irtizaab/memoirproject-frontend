import styles from "../onboarding.module.css";

type BookCoverProps = {
  name: string;
  born: string;
  bornSet: boolean;
  through: string;
};

/**
 * The cover always reads "— Forever": the finished book is not bounded by
 * the second date, only the timeline and memoir page are.
 */
export function BookCover({ name, born, bornSet, through }: BookCoverProps) {
  const living = through === "present";
  const dedication = living ? "The life of" : "In loving memory of";
  const years = bornSet ? `${born} — Forever` : "";

  return (
    <div className={styles.cover}>
      <div className={styles["cover-mark"]} />
      <div className={styles["cover-ded"]}>{dedication}</div>
      <div className={styles["cover-name"]}>{name || "—"}</div>
      {years && <div className={styles["cover-years"]}>{years}</div>}
      <div className={styles["cover-rule"]} />
      <div className={styles["cover-by"]}>
        As remembered by everyone who knew them
      </div>
    </div>
  );
}
