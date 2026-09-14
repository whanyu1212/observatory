import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Pause, Play, RotateCcw } from 'lucide-react';
import replay from '@/data/gem-replay.json';
import '@/styles/gem-replay.css';

const colors = ['#29b6f6', '#0288d1', '#26c6da', '#66bb6a', '#9ccc65', '#ef5350', '#ff7043', '#ffca28', '#ab47bc', '#ec407a'];
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const lastFrame = replay.seconds.length - 1;

export function GemReplay({ mapImage, motionEnabled }: { mapImage: string; motionEnabled: boolean }) {
  const [frame, setFrame] = useState(180);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const root = useRef<HTMLElement>(null);
  const id = useId();
  useEffect(() => { if (!motionEnabled) setPlaying(false); }, [motionEnabled]);
  useEffect(() => {
    if (!playing || !motionEnabled || frame >= lastFrame) return;
    const timer = window.setTimeout(() => setFrame(value => value + 1), replay.interval * 1000 / 12);
    return () => window.clearTimeout(timer);
  }, [playing, motionEnabled, frame]);
  useEffect(() => { if (frame === lastFrame) setPlaying(false); }, [frame]);
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) setPlaying(false); });
    if (root.current) observer.observe(root.current);
    document.addEventListener('visibilitychange', pause);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', pause); };
  }, []);
  const time = replay.seconds[frame];

  return <section ref={root} className="gem-replay" aria-labelledby={`${id}-title`}>
    <div className="gem-replay-heading"><div><p>RECORDED MATCH / {replay.matchId}</p><h3 id={`${id}-title`}>{replay.title}</h3></div><span className="gem-replay-clock" aria-hidden="true">{clock(time)}</span></div>
    <div className="gem-replay-map">
      <svg viewBox="0 0 1000 1000" role="img" aria-label={`Recorded hero positions at ${clock(time)}. ${selected === null ? 'All ten heroes' : replay.players.find(player => player.id === selected)?.hero} highlighted. Trails show the previous minute.`}>
        <image href={mapImage} width="1000" height="1000" preserveAspectRatio="none" />
        <rect width="1000" height="1000" fill="#040b16" opacity=".25" />
        {replay.players.map(player => {
          const current = player.positions[frame];
          if (!current) return null;
          const active = selected === null || selected === player.id;
          const trail = player.positions.slice(Math.max(0, frame - 12), frame + 1);
          let connected = false;
          const path = trail.map(point => {
            if (!point) { connected = false; return ''; }
            const command = `${connected ? 'L' : 'M'} ${point[0]} ${point[1]}`;
            connected = true;
            return command;
          }).join(' ');
          return <g key={player.id} opacity={active ? 1 : .15}>
            <path d={path} stroke="#06101c" strokeWidth="9" fill="none" strokeLinejoin="round" />
            <path d={path} stroke={colors[player.id]} strokeWidth="5" fill="none" strokeLinejoin="round" />
            <circle cx={current[0]} cy={current[1]} r={selected === player.id ? 23 : 19} fill={colors[player.id]} stroke="white" strokeWidth="2" />
            <text x={current[0]} y={current[1]} dy=".35em" textAnchor="middle" fontSize="24" fontWeight="700" fill="#031019">{player.id + 1}</text>
          </g>;
        })}
      </svg>
      <span className="gem-replay-map-label">{selected === null ? '10 HEROES · FOLLOW A TRAIL' : replay.players.find(player => player.id === selected)?.hero}</span>
    </div>
    <div className="gem-replay-transport">
      <button type="button" disabled={!motionEnabled} title={!motionEnabled ? 'Motion is paused. Use the timeline to explore.' : undefined} aria-label={playing ? 'Pause replay' : 'Play recorded positions at twelve times speed'} onClick={() => { if (frame === lastFrame) setFrame(0); setPlaying(value => !value); }}>{playing ? <Pause size={17} /> : <Play size={17} />}<span>{playing ? 'Pause' : 'Play'} · 12×</span></button>
      <button type="button" aria-label="Rewind replay to match start" onClick={() => { setPlaying(false); setFrame(0); }}><RotateCcw size={17} /></button>
      <label htmlFor={`${id}-time`}>Match time <output>{clock(time)}</output></label>
      <input id={`${id}-time`} type="range" min="0" max={lastFrame} step="1" value={frame} aria-valuetext={`${Math.floor(time / 60)} minutes ${time % 60} seconds`} onChange={event => { setPlaying(false); setFrame(Number(event.target.value)); }} />
    </div>
    <div className="gem-replay-legend" role="group" aria-label="Highlight a hero">
      <button type="button" aria-pressed={selected === null} onClick={() => setSelected(null)}>All heroes</button>
      {replay.players.map(player => <button key={player.id} type="button" aria-pressed={selected === player.id} onClick={() => setSelected(value => value === player.id ? null : player.id)}><span style={{ color: colors[player.id] }}>{String(player.id + 1).padStart(2, '0')}</span>{player.hero}<small>{player.team}</small></button>)}
    </div>
    <p className="gem-replay-source">Real positions parsed by Gem, sampled every 5 seconds. Lines connect samples from the previous minute. <a href={replay.source} target="_blank" rel="noreferrer">Source data <ArrowUpRight size={13} /></a></p>
  </section>;
}
