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
  
  const gameRef = useRef({
    player: { x: 50, y: 200, vy: 0, size: 30, color: '#00f2ff' },
    obstacles: [],
    particles: [],
    frame: 0,
    speed: OBSTACLE_SPEED,
    shake: 0
  });

  const startGame = () => {
    setScore(0);
    setGameState('playing');
    setIsPaused(false);
    gameRef.current = {
      player: { x: 80, y: 200, vy: 0, size: 30, color: '#00f2ff' },
      obstacles: [],
      particles: [],
      frame: 0,
      speed: OBSTACLE_SPEED,
      shake: 0
    };
  };

  const handleAction = () => {
    if (gameState === 'playing' && !isPaused) {
      gameRef.current.player.vy = JUMP_FORCE;
      createParticles(gameRef.current.player.x, gameRef.current.player.y + 15, '#00f2ff', 8);
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

    const drawPlayer = (ctx, p) => {
      ctx.save();
      
      // Calculate squash and stretch based on velocity
      // Stretching when moving fast (jumping/falling), squashing when hitting floor
      const stretch = Math.min(0.3, Math.abs(p.vy) * 0.02);
      const scaleX = 1 - stretch;
      const scaleY = 1 + stretch;

      ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
      ctx.rotate(p.vy * 0.05);
      ctx.scale(scaleX, scaleY);
      
      // Motion Trail (Ghosting effect)
      ctx.globalAlpha = 0.3;
      for(let i = 1; i <= 3; i++) {
        ctx.save();
        ctx.translate(-p.vy * i * 0.5, 0); // Trail follows velocity
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

      // Glow
      ctx.shadowBlur = 20 + Math.abs(p.vy);
      ctx.shadowColor = p.color;
      
      // Main Body
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.size / 2, 0);
      ctx.lineTo(-p.size / 2, -p.size / 2);
      ctx.lineTo(-p.size / 4, 0);
      ctx.lineTo(-p.size / 2, p.size / 2);
      ctx.closePath();
      ctx.fill();

      // Inner Core
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


    const drawObstacle = (ctx, obs) => {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = obs.color;
      ctx.fillStyle = obs.color;
      
      // Draw as a crystal spike
      ctx.beginPath();
      if (obs.y === 0) { // Top obstacle
        ctx.moveTo(obs.x, 0);
        ctx.lineTo(obs.x + obs.w, 0);
        ctx.lineTo(obs.x + obs.w / 2, obs.h);
      } else { // Bottom obstacle
        ctx.moveTo(obs.x, CANVAS_HEIGHT);
        ctx.lineTo(obs.x + obs.w, CANVAS_HEIGHT);
        ctx.lineTo(obs.x + obs.w / 2, CANVAS_HEIGHT - obs.h);
      }
      ctx.closePath();
      ctx.fill();

      // Inner detail line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (obs.y === 0) {
        ctx.moveTo(obs.x + obs.w / 2, 0);
        ctx.lineTo(obs.x + obs.w / 2, obs.h * 0.8);
      } else {
        ctx.moveTo(obs.x + obs.w / 2, CANVAS_HEIGHT);
        ctx.lineTo(obs.x + obs.w / 2, CANVAS_HEIGHT - obs.h * 0.8);
      }
      ctx.stroke();
      
      ctx.restore();
    };

    const loop = () => {
      const g = gameRef.current;

      if (!isPaused) {
        g.frame++;

        // --- UPDATE ---
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

        if (g.frame % Math.max(40, Math.floor(SPAWN_RATE - score * 0.5)) === 0) {
          const height = 60 + Math.random() * 120;
          const isTop = Math.random() > 0.5;
          g.obstacles.push({
            x: CANVAS_WIDTH,
            y: isTop ? 0 : CANVAS_HEIGHT - height,
            w: 45,
            h: height,
            color: '#ff0055'
          });
        }

        g.obstacles.forEach((obs) => {
          obs.x -= g.speed + (score * 0.05);
          
          // Collision detection (Approximated for triangle)
          if (
            g.player.x < obs.x + obs.w &&
            g.player.x + g.player.size > obs.x &&
            g.player.y < obs.y + obs.h &&
            g.player.y + g.player.size > obs.y
          ) {
            setGameState('gameOver');
            g.shake = 15;
          }

          if (obs.x + obs.w < g.player.x && !obs.passed) {
            obs.passed = true;
            setScore(s => s + 1);
          }
        });

        g.obstacles = g.obstacles.filter(obs => obs.x + obs.w > 0);

        g.particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.02;
        });
        g.particles = g.particles.filter(p => p.life > 0);

        if (g.shake > 0) g.shake *= 0.9;
      }

      // --- DRAW ---
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      if (g.shake > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
      }

      // Enhanced Grid
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.08)';
      ctx.lineWidth = 1;
      for(let i=0; i<CANVAS_WIDTH + 100; i+=50) {
        const offset = (g.frame * (isPaused ? 0 : 2)) % 50;
        ctx.beginPath();
        ctx.moveTo(i - offset, 0);
        ctx.lineTo(i - offset, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for(let i=0; i<CANVAS_HEIGHT; i+=50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS_WIDTH, i);
        ctx.stroke();
      }

      // Draw Particles
      g.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
      });
      ctx.globalAlpha = 1;

      // Draw Obstacles
      g.obstacles.forEach(obs => drawObstacle(ctx, obs));

      // Draw Player
      drawPlayer(ctx, g.player);

      // Draw Floor Border
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.stroke();

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
