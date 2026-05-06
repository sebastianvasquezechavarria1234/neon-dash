import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, RotateCcw, Trophy, Zap, Pause, PlayCircle } from 'lucide-react'
import './App.css'

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const OBSTACLE_SPEED = 5;
const SPAWN_RATE = 100; // frames

function App() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('idle'); // idle, playing, gameOver
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('neon-dash-highscore') || '0'));
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('neon-dash-history') || '[]'));
  
  const gameRef = useRef({
    player: { x: 50, y: 200, vy: 0, size: 30, color: '#00f2ff' },
    obstacles: [],
    particles: [],
    frame: 0,
    speed: OBSTACLE_SPEED,
    shake: 0
  });

  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    if (gameState === 'gameOver') {
      const newHistory = [score, ...history.filter(s => s !== score)].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem('neon-dash-history', JSON.stringify(newHistory));
      
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('neon-dash-highscore', score.toString());
      }
    }
  }, [gameState]);

  useEffect(() => {
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (!container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      // Maintain 2:1 ratio
      if (width / 2 > height) {
        setDimensions({ width: height * 2, height: height });
      } else {
        setDimensions({ width: width, height: width / 2 });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioCtx = useRef(null);

  const playSound = (type) => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'jump') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'powerup') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  };

  const startGame = () => {
    if (!audioEnabled) {
      setAudioEnabled(true);
      if (audioCtx.current?.state === 'suspended') audioCtx.current.resume();
    }
    setScore(0);
    setGameState('playing');
    setIsPaused(false);
    gameRef.current = {
      player: { x: 80, y: 200, vy: 0, size: 30, color: '#00f2ff', shield: false },
      obstacles: [],
      powerups: [],
      particles: [],
      stars: Array.from({ length: 50 }, () => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2,
        speed: 0.5 + Math.random() * 1.5
      })),
      frame: 0,
      speed: OBSTACLE_SPEED,
      shake: 0
    };
  };

  const handleAction = () => {
    if (gameState === 'playing' && !isPaused) {
      gameRef.current.player.vy = JUMP_FORCE;
      playSound('jump');
      const pColor = gameRef.current.player.shield ? '#fff' : '#00f2ff';
      createParticles(gameRef.current.player.x, gameRef.current.player.y + 15, pColor, 8);
    } else if (gameState === 'idle' || gameState === 'gameOver') {
      startGame();
    }
  };

  const togglePause = (e) => {
    e.stopPropagation();
    if (gameState === 'playing') {
      setIsPaused(!isPaused);
    }
  };

  const createParticles = (x, y, color, count) => {
    for (let i = 0; i < count; i++) {
      gameRef.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1.0,
        color
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') handleAction();
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause(e);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPaused]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    const getDifficultyColor = (score) => {
      if (score < 10) return '#ff0055';
      if (score < 25) return '#ffaa00';
      if (score < 50) return '#a200ff';
      return '#00ff44';
    };

    const drawPlayer = (ctx, p) => {
      ctx.save();
      const stretch = Math.min(0.3, Math.abs(p.vy) * 0.02);
      const scaleX = 1 - stretch;
      const scaleY = 1 + stretch;

      ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
      ctx.rotate(p.vy * 0.05);
      ctx.scale(scaleX, scaleY);
      
      if (p.shield) {
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.globalAlpha = 0.3;
      for(let i = 1; i <= 3; i++) {
        ctx.save();
        ctx.translate(-p.vy * i * 0.5, 0);
        ctx.beginPath();
        ctx.moveTo(p.size / 2, 0);
        ctx.lineTo(-p.size / 2, -p.size / 2);
        ctx.lineTo(-p.size / 4, 0);
        ctx.lineTo(-p.size / 2, p.size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1.0;

      ctx.shadowBlur = 25;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.size / 2, 0);
      ctx.lineTo(-p.size / 2, -p.size / 2);
      ctx.lineTo(-p.size / 4, 0);
      ctx.lineTo(-p.size / 2, p.size / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(p.size / 4, 0);
      ctx.lineTo(-p.size / 4, -p.size / 4);
      ctx.lineTo(-p.size / 8, 0);
      ctx.lineTo(-p.size / 4, p.size / 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const loop = () => {
      const g = gameRef.current;
      const obsColor = getDifficultyColor(score);
      
      // Calculate dynamic speed and spawn rate
      const currentSpeed = OBSTACLE_SPEED + (score * 0.15); // Faster increase
      const currentSpawnRate = Math.max(35, Math.floor(SPAWN_RATE - score * 0.8));

      if (!isPaused) {
        g.frame++;
        g.player.vy += GRAVITY;
        g.player.y += g.player.vy;

        if (g.player.y + g.player.size > CANVAS_HEIGHT) {
          g.player.y = CANVAS_HEIGHT - g.player.size;
          g.player.vy = 0;
        }
        if (g.player.y < 0) {
          g.player.y = 0;
          g.player.vy = 0;
        }

        // Parallax Stars
        g.stars.forEach(s => {
          s.x -= s.speed + (score * 0.05); // Stars speed up too!
          if (s.x < 0) s.x = CANVAS_WIDTH;
        });

        if (g.frame % 800 === 0) {
          g.powerups.push({
            x: CANVAS_WIDTH,
            y: 100 + Math.random() * 200,
            size: 25,
            type: 'shield'
          });
        }

        if (g.frame % currentSpawnRate === 0) {
          const height = 60 + Math.random() * 120;
          const isTop = Math.random() > 0.5;
          g.obstacles.push({
            x: CANVAS_WIDTH,
            y: isTop ? 0 : CANVAS_HEIGHT - height,
            w: 45,
            h: height,
            color: obsColor
          });
        }

        g.powerups.forEach((pu, index) => {
          pu.x -= currentSpeed;
          if (
            g.player.x < pu.x + pu.size &&
            g.player.x + g.player.size > pu.x &&
            g.player.y < pu.y + pu.size &&
            g.player.y + g.player.size > pu.y
          ) {
            g.player.shield = true;
            playSound('powerup');
            g.powerups.splice(index, 1);
            createParticles(pu.x, pu.y, '#fff', 15);
          }
        });

        g.obstacles.forEach((obs, index) => {
          obs.x -= currentSpeed;
          if (
            g.player.x < obs.x + obs.w &&
            g.player.x + g.player.size > obs.x &&
            g.player.y < obs.y + obs.h &&
            g.player.y + g.player.size > obs.y
          ) {
            if (g.player.shield) {
              g.player.shield = false;
              playSound('hit');
              g.obstacles.splice(index, 1);
              g.shake = 10;
              createParticles(obs.x, obs.y, '#fff', 20);
            } else {
              setGameState('gameOver');
              playSound('hit');
              g.shake = 15;
            }
          }
          if (obs.x + obs.w < g.player.x && !obs.passed) {
            obs.passed = true;
            setScore(s => s + 1);
          }
        });


        g.obstacles = g.obstacles.filter(obs => obs.x + obs.w > 0);
        g.powerups = g.powerups.filter(pu => pu.x + pu.size > 0);

        g.particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.02;
        });
        g.particles = g.particles.filter(p => p.life > 0);

        if (g.shake > 0) g.shake *= 0.9;
      }

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      if (g.shake > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
      }

      // Draw Stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      g.stars.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill();
      });

      // Grid Color Shift
      ctx.strokeStyle = score > 25 ? 'rgba(162, 0, 255, 0.12)' : 'rgba(0, 242, 255, 0.12)';
      ctx.lineWidth = 1;
      for(let i=0; i<CANVAS_WIDTH + 100; i+=50) {
        const offset = (g.frame * (isPaused ? 0 : 2)) % 50;
        ctx.beginPath(); ctx.moveTo(i - offset, 0); ctx.lineTo(i - offset, CANVAS_HEIGHT); ctx.stroke();
      }
      for(let i=0; i<CANVAS_HEIGHT; i+=50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke();
      }

      g.powerups.forEach(pu => {
        ctx.save();
        ctx.shadowBlur = 20; ctx.shadowColor = '#fff';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath(); ctx.arc(pu.x + pu.size/2, pu.y + pu.size/2, pu.size/2, 0, Math.PI*2); ctx.fill();
        
        // Draw Shield Icon inside orb
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const cx = pu.x + pu.size/2;
        const cy = pu.y + pu.size/2;
        const s = pu.size * 0.3;
        ctx.moveTo(cx, cy - s);
        ctx.lineTo(cx + s, cy - s/2);
        ctx.lineTo(cx + s, cy + s/2);
        ctx.lineTo(cx, cy + s);
        ctx.lineTo(cx - s, cy + s/2);
        ctx.lineTo(cx - s, cy - s/2);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      });

      g.obstacles.forEach(obs => {
        ctx.save();
        ctx.shadowBlur = 20; ctx.shadowColor = obs.color;
        ctx.fillStyle = obs.color;
        ctx.beginPath();
        if (obs.y === 0) { ctx.moveTo(obs.x, 0); ctx.lineTo(obs.x + obs.w, 0); ctx.lineTo(obs.x + obs.w / 2, obs.h); }
        else { ctx.moveTo(obs.x, CANVAS_HEIGHT); ctx.lineTo(obs.x + obs.w, CANVAS_HEIGHT); ctx.lineTo(obs.x + obs.w / 2, CANVAS_HEIGHT - obs.h); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 2;
        ctx.beginPath();
        if (obs.y === 0) { ctx.moveTo(obs.x + obs.w / 2, 0); ctx.lineTo(obs.x + obs.w / 2, obs.h * 0.8); }
        else { ctx.moveTo(obs.x + obs.w / 2, CANVAS_HEIGHT); ctx.lineTo(obs.x + obs.w / 2, CANVAS_HEIGHT - obs.h * 0.8); }
        ctx.stroke();
        ctx.restore();
      });

      drawPlayer(ctx, g.player);

      ctx.strokeStyle = score > 25 ? 'rgba(162, 0, 255, 0.6)' : 'rgba(0, 242, 255, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT); ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT); ctx.stroke();

      if (g.shake > 0) ctx.restore();
      animationId = requestAnimationFrame(loop);
    };


    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, score, isPaused]);

  useEffect(() => {
    if (gameState === 'gameOver' && score > highScore) {
      setHighScore(score);
      localStorage.setItem('neon-dash-highscore', score.toString());
    }
  }, [gameState, score, highScore]);

  return (
    <div className="game-container" onClick={handleAction}>
      <header>
        <div className="header-left">
          <motion.h1 
            animate={{ textShadow: ["0 0 10px #00f2ff", "0 0 20px #00f2ff", "0 0 10px #00f2ff"] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="title-neon"
          >
            Neon Dash
          </motion.h1>
        </div>
        
        <div className="header-right">
          <div className="stats-container">
            <div className="stat-item">
              <Zap size={16} className="icon-pulse" />
              <span>Score: {score}</span>
            </div>
            <div className="stat-item">
              <Trophy size={16} />
              <span>Best: {highScore}</span>
            </div>
            {gameState === 'playing' && (
              <button className="pause-btn" onClick={togglePause}>
                {isPaused ? <PlayCircle size={20} /> : <Pause size={20} />}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="canvas-wrapper">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT}
          style={{ width: dimensions.width, height: dimensions.height }}
        />
        
        <AnimatePresence>
          {gameState === 'idle' && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="overlay"
            >
              <button className="primary-btn neon-border">
                <Play size={24} />
                Start Mission
              </button>
              <p className="controls-hint">Tap or Space to Jump</p>
            </motion.div>
          )}

          {isPaused && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="overlay"
            >
              <h2>Paused</h2>
              <button onClick={togglePause} className="primary-btn">
                <PlayCircle size={24} />
                Resume
              </button>
            </motion.div>
          )}

          {gameState === 'gameOver' && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="overlay game-over"
            >
              <h2>Critical Failure</h2>
              <p className="final-score">Score: {score}</p>
              
              {history.length > 0 && (
                <div className="history-list">
                  <p className="history-title">Recent Scores</p>
                  <div className="scores-row">
                    {history.map((s, i) => (
                      <span key={i} className="history-score">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={startGame} className="primary-btn retry-btn">
                <RotateCcw size={20} />
                Reboot System
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer>
        <p className="footer-text">Created by Sebastian Vasquez Echavarria</p>
      </footer>
    </div>
  )
}

export default App
