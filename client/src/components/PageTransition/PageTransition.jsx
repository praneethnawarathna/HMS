import React from 'react';
import { motion } from 'framer-motion';

/**
 * PageTransition
 * ──────────────────────────────────────────────────────────────────────────────
 * Reusable anti-gravity page wrapper for the HMS Dashboard.
 *
 * Entry  → floats UP into view   (y: 15 → 0,  opacity: 0 → 1, 250ms spring-out)
 * Exit   → lifts AWAY cleanly    (y: 0  → -10, opacity: 1 → 0, 180ms easeIn)
 *
 * AnimatePresence mode="wait" in Dashboard.jsx guarantees the outgoing page
 * finishes its exit before the incoming page starts animating — no overlap,
 * no flicker, no layout jumps.
 *
 * Individual page files need ZERO changes — Dashboard wraps <Outlet> centrally.
 */

const pageVariants = {
    initial: {
        opacity: 0,
        y: 15,
        transition: { duration: 0.18, ease: 'easeIn' },
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.25,
            ease: [0.16, 1, 0.3, 1], // spring-out: fast settle, weightless feel
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: { duration: 0.18, ease: 'easeIn' },
    },
};

const PageTransition = ({ children, className = '' }) => (
    <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ willChange: 'opacity, transform' }}
        className={`w-full${className ? ` ${className}` : ''}`}
    >
        {children}
    </motion.div>
);

export default PageTransition;

