import styles from './discover.module.css'

/** Brand geometry, not a representation of market or price data. */
export function LaunchOrbit() {
  return (
    <div className={styles.orbit} aria-hidden="true">
      <svg viewBox="0 0 480 300" fill="none" className="h-full w-full">
        <g>
          <ellipse cx="244" cy="151" rx="199" ry="78" transform="rotate(-24 244 151)" className={styles.orbitRule} />
          <ellipse cx="244" cy="151" rx="159" ry="112" transform="rotate(-24 244 151)" className={styles.orbitRule} />
          <path d="M55 235 430 65M142 263 346 40" className={styles.orbitRule} strokeDasharray="3 7" />
        </g>
        <circle cx="244" cy="151" r="91" fill="#d6ff00" />
        <g stroke="#0b0b0b" strokeOpacity="0.2">
          <ellipse cx="244" cy="151" rx="91" ry="30" />
          <ellipse cx="244" cy="151" rx="91" ry="61" />
          <ellipse cx="244" cy="151" rx="31" ry="91" />
          <ellipse cx="244" cy="151" rx="63" ry="91" />
          <path d="M153 151h182M244 60v182" />
        </g>
        <path d="M58 225C111 272 317 185 420 66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" pathLength="1" className={styles.orbitTrail} />
        <path d="m244 115 8 28 28 8-28 8-8 28-8-28-28-8 28-8Z" fill="#0b0b0b" />
        <circle cx="244" cy="151" r="5" fill="#d6ff00" />
        <circle cx="382" cy="106" r="13" fill="#ff7315" stroke="#0b0b0b" strokeWidth="3" />
        <circle cx="96" cy="202" r="5" fill="#d6ff00" stroke="#0b0b0b" />
        <path d="M399 47h24m-12-12v24" stroke="currentColor" strokeWidth="2" />
        <circle cx="129" cy="68" r="3" className={styles.orbitPoint} />
        <circle cx="354" cy="246" r="3" className={styles.orbitPoint} />
      </svg>
      <span className={styles.orbitCaption}>Ideas meet their next orbit.</span>
    </div>
  )
}
