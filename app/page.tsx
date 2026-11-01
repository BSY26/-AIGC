"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

type LyricLine = { time: number; text: string };
type Track = { id: string; name: string; format: "MP3" | "FLAC"; size: string; url: string; lyrics?: LyricLine[]; lyricFileName?: string };
const formatTime = (seconds: number) => !Number.isFinite(seconds) || seconds < 0 ? "0:00" : `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
const cleanName = (filename: string) => filename.replace(/\.(mp3|flac)$/i, "").replace(/[_-]+/g, " ");
const parseLrc = (source: string) => {
  const lines: LyricLine[] = [];
  let offset = 0;
  const offsetMatch = source.match(/\[offset:([+-]?\d+)\]/i);
  if (offsetMatch) offset = Number(offsetMatch[1]) / 1000;
  source.split(/\r?\n/).forEach((row) => {
    const timestamps = [...row.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const text = row.replace(/\[[^\]]+\]/g, "").trim();
    if (!timestamps.length || !text) return;
    timestamps.forEach((match) => {
      const fraction = match[3] ? Number(`0.${match[3].padEnd(3, "0").slice(0, 3)}`) : 0;
      lines.push({ time: Math.max(0, Number(match[1]) * 60 + Number(match[2]) + fraction + offset), text });
    });
  });
  return lines.sort((a, b) => a.time - b.time);
};

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lyricInputRef = useRef<HTMLInputElement>(null);
  const lyricListRef = useRef<HTMLDivElement>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.82);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const [rate, setRate] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const current = tracks[currentIndex];
  const activeLyricIndex = useMemo(() => {
    if (!current?.lyrics?.length) return -1;
    for (let index = current.lyrics.length - 1; index >= 0; index--) {
      if (currentTime >= current.lyrics[index].time) return index;
    }
    return -1;
  }, [current?.lyrics, currentTime]);

  const addFiles = (files: FileList | File[]) => {
    const accepted = Array.from(files).filter((file) => /\.(mp3|flac)$/i.test(file.name));
    if (!accepted.length) return;
    const additions = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      name: cleanName(file.name),
      format: file.name.toLowerCase().endsWith(".flac") ? ("FLAC" as const) : ("MP3" as const),
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      url: URL.createObjectURL(file),
    }));
    setTracks((existing) => [...existing, ...additions]);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  };
  const handleLyricInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !current) return;
    const lines = parseLrc(await file.text());
    if (!lines.length) return;
    setTracks((list) => list.map((track, index) => index === currentIndex ? { ...track, lyrics: lines, lyricFileName: file.name } : track));
  };
  const playAt = (index: number) => { setCurrentIndex(index); setIsPlaying(true); };
  const nextTrack = () => {
    if (!tracks.length) return;
    if (shuffle && tracks.length > 1) {
      let next = currentIndex;
      while (next === currentIndex) next = Math.floor(Math.random() * tracks.length);
      setCurrentIndex(next);
    } else if (currentIndex < tracks.length - 1) setCurrentIndex(currentIndex + 1);
    else if (repeat === "all") setCurrentIndex(0);
    else setIsPlaying(false);
  };
  const previousTrack = () => {
    if (!tracks.length) return;
    if (currentTime > 3 && audioRef.current) { audioRef.current.currentTime = 0; return; }
    setCurrentIndex((currentIndex - 1 + tracks.length) % tracks.length);
  };
  const handleEnded = () => {
    if (repeat === "one" && audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); return; }
    nextTrack();
  };
  const removeTrack = (index: number) => {
    URL.revokeObjectURL(tracks[index].url);
    setTracks((list) => list.filter((_, i) => i !== index));
    if (index < currentIndex) setCurrentIndex((value) => value - 1);
    else if (index === currentIndex) {
      setCurrentTime(0);
      setCurrentIndex((value) => Math.min(value, Math.max(0, tracks.length - 2)));
      if (tracks.length === 1) setIsPlaying(false);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
    audio.playbackRate = rate;
  }, [volume, isMuted, rate]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.load(); setCurrentTime(0); setDuration(0);
    if (isPlaying) audio.play().catch(() => setIsPlaying(false));
  }, [current?.id]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (isPlaying) audio.play().catch(() => setIsPlaying(false)); else audio.pause();
  }, [isPlaying, current?.id]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !(event.target instanceof HTMLInputElement)) { event.preventDefault(); if (current) setIsPlaying((value) => !value); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current]);
  useEffect(() => {
    if (activeLyricIndex < 0 || !lyricListRef.current) return;
    const active = lyricListRef.current.querySelector<HTMLElement>(`[data-lyric-index="${activeLyricIndex}"]`);
    active?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeLyricIndex]);

  const repeatLabel = useMemo(() => repeat === "one" ? "单曲循环" : repeat === "all" ? "列表循环" : "循环关闭", [repeat]);

  return (
    <main className="app-shell">
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <div className="brand" aria-label="蓝潮音乐播放器"><span className="brand-mark"><i /><i /><i /></span><span>蓝潮</span><small>BLUEWAVE</small></div>
        <div className="privacy-pill"><span /> 本地播放 · 文件不会上传</div>
      </header>

      <section className="hero">
        <div className="intro">
          <p className="eyebrow">拾一段旋律 · 留一刻清欢</p>
          <h1>让每一首歌，<br /><em>静静流淌。</em></h1>
          <p className="lead">兼容 MP3 与无损 FLAC，把你的私人歌单放进这一方青蓝里。</p>
        </div>

        <div className={`now-playing ${isPlaying ? "is-playing" : ""}`}>
          <div className="cover-wrap">
            <div className="halo halo-one" /><div className="halo halo-two" />
            <div className="disc"><div className="disc-label"><span>蓝</span><small>{current?.format ?? "WAVE"}</small></div></div>
            <div className="visualizer" aria-hidden="true">
              {[13, 22, 34, 18, 42, 27, 48, 30, 19, 37, 25, 14].map((height, index) => <i key={index} style={{ "--bar-height": `${height}px`, "--delay": `${index * -0.11}s` } as React.CSSProperties} />)}
            </div>
          </div>
          <div className="track-meta"><div><span className="status-dot" /><p>{current ? "正在聆听" : "等待一首歌"}</p></div><span className="format-badge">{current?.format ?? "MP3 / FLAC"}</span></div>
          <h2 title={current?.name}>{current?.name ?? "选择你的音乐"}</h2>
          <p className="subline">{current ? `本地文件 · ${current.size}` : "从下方导入歌曲，即刻开始播放"}</p>
          <div className="progress-group">
            <input aria-label="播放进度" className="range progress" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} style={{ "--range-progress": `${duration ? (currentTime / duration) * 100 : 0}%` } as React.CSSProperties} onChange={(event) => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setCurrentTime(value); }} />
            <div className="time-row"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
          </div>
          <div className="controls">
            <button className={shuffle ? "active" : ""} onClick={() => setShuffle(!shuffle)} aria-label="随机播放" title="随机播放">⌘</button>
            <button onClick={previousTrack} aria-label="上一首" title="上一首" className="skip">Ⅰ◀</button>
            <button className="play" onClick={() => current && setIsPlaying(!isPlaying)} aria-label={isPlaying ? "暂停" : "播放"} disabled={!current}>{isPlaying ? <span className="pause-icon">Ⅱ</span> : <span className="play-icon">▶</span>}</button>
            <button onClick={nextTrack} aria-label="下一首" title="下一首" className="skip">▶Ⅰ</button>
            <button className={repeat !== "off" ? "active repeat" : "repeat"} onClick={() => setRepeat(repeat === "off" ? "all" : repeat === "all" ? "one" : "off")} aria-label={repeatLabel} title={repeatLabel}>↻{repeat === "one" && <sup>1</sup>}</button>
          </div>
          <div className="sound-row">
            <button onClick={() => setIsMuted(!isMuted)} aria-label={isMuted ? "取消静音" : "静音"}>{isMuted || volume === 0 ? "▱" : volume < 0.5 ? "◖" : "◖))"}</button>
            <input aria-label="音量" className="range volume" type="range" min="0" max="1" step="0.01" value={volume} style={{ "--range-progress": `${volume * 100}%` } as React.CSSProperties} onChange={(event) => { setVolume(Number(event.target.value)); setIsMuted(false); }} />
            <button className="rate" onClick={() => setRate(rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : rate === 1.5 ? 2 : 1)} aria-label="播放速度">{rate}×</button>
          </div>
          <audio ref={audioRef} src={current?.url} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onEnded={handleEnded} onError={() => setIsPlaying(false)} />
        </div>
      </section>

      <section className="lyrics-section">
        <div className="lyrics-head">
          <div><p className="eyebrow">逐句歌词</p><h3>随旋律而行</h3></div>
          <div className="lyric-actions">
            {current?.lyrics?.length ? <span className="lyric-file">{current.lyricFileName}</span> : null}
            <button className="add-button" disabled={!current} onClick={() => lyricInputRef.current?.click()}><span>＋</span>{current?.lyrics?.length ? "更换歌词" : "上传歌词"}</button>
            {current?.lyrics?.length ? <button className="clear-lyrics" onClick={() => setTracks((list) => list.map((track, index) => index === currentIndex ? { ...track, lyrics: undefined, lyricFileName: undefined } : track))}>移除</button> : null}
            <input ref={lyricInputRef} hidden type="file" accept=".lrc,text/plain" onChange={handleLyricInput} />
          </div>
        </div>
        <div className={`lyrics-panel ${current?.lyrics?.length ? "has-lyrics" : ""}`}>
          {current?.lyrics?.length ? (
            <div className="lyrics-scroll" ref={lyricListRef} aria-live="polite">
              <div className="lyrics-spacer" />
              {current.lyrics.map((line, index) => (
                <button
                  key={`${line.time}-${index}`}
                  data-lyric-index={index}
                  className={index === activeLyricIndex ? "active" : index < activeLyricIndex ? "passed" : ""}
                  onClick={() => { if (audioRef.current) audioRef.current.currentTime = line.time; setCurrentTime(line.time); }}
                  aria-current={index === activeLyricIndex ? "true" : undefined}
                >
                  <time>{formatTime(line.time)}</time><span>{line.text}</span>
                </button>
              ))}
              <div className="lyrics-spacer" />
            </div>
          ) : (
            <div className="lyrics-empty">
              <span className="lyric-symbol">词</span>
              <div><h4>{current ? "为这首歌配上歌词" : "先选择一首音乐"}</h4><p>{current ? "上传带时间标签的 LRC 文件，即可自动滚动高亮" : "添加并选择歌曲后，就能上传对应的 LRC 歌词"}</p></div>
              {current ? <button onClick={() => lyricInputRef.current?.click()}>选择 .LRC 文件</button> : null}
            </div>
          )}
        </div>
      </section>

      <section className="library">
        <div className="library-head">
          <div><p className="eyebrow">我的曲目</p><h3>本地播放列表 <span>{tracks.length.toString().padStart(2, "0")}</span></h3></div>
          <button className="add-button" onClick={() => inputRef.current?.click()}><span>＋</span> 添加音乐</button>
          <input ref={inputRef} hidden type="file" multiple accept=".mp3,.flac,audio/mpeg,audio/flac" onChange={handleInput} />
        </div>
        {tracks.length ? (
          <div className="track-list">{tracks.map((track, index) => (
            <div className={`track-row ${index === currentIndex ? "current" : ""}`} key={track.id}>
              <button className="track-main" onClick={() => playAt(index)} aria-label={`播放 ${track.name}`}><span className="track-number">{index === currentIndex && isPlaying ? <i className="mini-wave">▮▮▮</i> : (index + 1).toString().padStart(2, "0")}</span><span className="track-title"><b>{track.name}</b><small>{track.size}</small></span></button>
              <span className={`file-type ${track.format.toLowerCase()}`}>{track.format}</span><button className="remove" onClick={() => removeTrack(index)} aria-label={`移除 ${track.name}`} title="移除">×</button>
            </div>
          ))}</div>
        ) : (
          <div className={`dropzone ${isDragging ? "dragging" : ""}`} onDragOver={(event: DragEvent) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event: DragEvent) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && inputRef.current?.click()}>
            <div className="drop-icon"><span>♪</span></div><h4>把音乐放进来</h4><p>拖放文件到此处，或点击选择本地音乐</p><div className="support"><span>MP3</span><i />最高品质，由文件决定<i /><span>FLAC 无损</span></div>
          </div>
        )}
      </section>
      <footer><span>蓝潮 BLUEWAVE</span><p>愿旋律常伴，清欢自来。</p><small>仅在本地浏览器中播放</small></footer>
    </main>
  );
}
