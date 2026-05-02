export function CuteDoodles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10 z-0">
      <svg className="absolute top-10 left-10 w-20 h-20 text-lavender" viewBox="0 0 100 100" fill="currentColor">
        <path d="M50,20 Q60,10 70,20 T90,20" stroke="currentColor" fill="none" strokeWidth="3" />
        <circle cx="30" cy="30" r="5" />
        <circle cx="50" cy="40" r="3" />
        <circle cx="70" cy="35" r="4" />
      </svg>

      <svg className="absolute top-1/4 right-20 w-16 h-16 text-soft-pink" viewBox="0 0 100 100" fill="currentColor">
        <path d="M50,30 L60,50 L50,70 L40,50 Z" />
        <circle cx="50" cy="20" r="5" />
      </svg>

      <svg className="absolute bottom-20 left-1/4 w-24 h-24 text-light-blue" viewBox="0 0 100 100">
        <path d="M20,50 Q30,30 50,50 T80,50" stroke="currentColor" fill="none" strokeWidth="2" strokeDasharray="5,5" />
        <circle cx="20" cy="50" r="4" fill="currentColor" />
        <circle cx="50" cy="50" r="4" fill="currentColor" />
        <circle cx="80" cy="50" r="4" fill="currentColor" />
      </svg>

      <svg className="absolute bottom-1/3 right-1/4 w-20 h-20 text-soft-pink" viewBox="0 0 100 100">
        <path d="M50,30 L55,40 L65,40 L57,47 L60,57 L50,50 L40,57 L43,47 L35,40 L45,40 Z" fill="currentColor" />
      </svg>

      <svg className="absolute top-1/2 left-10 w-12 h-12 text-lavender" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="3,3" />
        <circle cx="50" cy="50" r="5" fill="currentColor" />
      </svg>
    </div>
  );
}
