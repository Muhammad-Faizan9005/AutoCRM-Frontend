import { useSpring, useTransform, motion } from 'framer-motion';
import { useEffect } from 'react';

export function CountUp({ value, formatFn }) {
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => {
    const rounded = Math.round(v);
    if (formatFn) return formatFn(rounded);
    return rounded.toLocaleString();
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}
