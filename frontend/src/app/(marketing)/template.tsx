"use client";

import { motion } from "motion/react";

/** Fades the page content in on navigation. The nav lives in the layout, so it never fades. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
