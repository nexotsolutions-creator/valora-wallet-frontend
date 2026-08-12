import type { ReactNode } from "react";
import styles from "./AuthBrandCopy.module.css";

interface AuthBrandCopyProps {
  headline: string;
  subtext: string;
  children: ReactNode;
}

export function AuthBrandCopy({ headline, subtext, children }: AuthBrandCopyProps) {
  return (
    <div className={styles.brandCopy}>
      <h2 className={styles.brandHeadline}>{headline}</h2>
      <p className={styles.brandSubtext}>{subtext}</p>
      {children}
    </div>
  );
}
