// Route transition (R24): each navigation remounts this wrapper, which fades
// and lifts the new page in over 250ms using only opacity and transform.
// No library, no layout animation, and reduced-motion users get no motion.
export default function HubTemplate({ children }: { children: React.ReactNode }) {
  return <div className="vh-route-in">{children}</div>;
}
