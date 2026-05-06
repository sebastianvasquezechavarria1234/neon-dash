import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, RotateCcw, Trophy, Zap } from 'lucide-react'
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
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('neon-dash-highscore') || '0'));
  
  // Game state refs (to avoid closure issues in the loop)
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
    if (gameState === 'playing') {
      gameRef.current.player.vy = JUMP_FORCE;
      createParticles(gameRef.current.player.x, gameRef.current.player.y + 15, '#00f2ff', 5);
    } else if (gameState !== 'playing') {
      startGame();
    }
  };

  const createParticles = (x, y, color, count) => {
    for (let i = 0; i < count; i++) {
      gameRef.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 1.0,
        color
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') handleAction();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    const loop = () => {
      const g = gameRef.current;
      g.frame++;

      // --- UPDATE ---
      // Player physics
      g.player.vy += GRAVITY;
      g.player.y += g.player.vy;

      // Floor/Ceiling collision
      if (g.player.y + g.player.size > CANVAS_HEIGHT) {
        g.player.y = CANVAS_HEIGHT - g.player.size;
        g.player.vy = 0;
      }
      if (g.player.y < 0) {
        g.player.y = 0;
        g.player.vy = 0;
      }

      // Spawn obstacles
      if (g.frame % Math.max(40, Math.floor(SPAWN_RATE - score * 0.5)) === 0) {
        const height = 40 + Math.random() * 100;
        const isTop = Math.random() > 0.5;
        g.obstacles.push({
          x: CANVAS_WIDTH,
          y: isTop ? 0 : CANVAS_HEIGHT - height,
          w: 40,
          h: height,
          color: '#ff0055'
        });
      }

      // Move obstacles & collision
      g.obstacles.forEach((obs, index) => {
        obs.x -= g.speed + (score * 0.05);
        
        // Collision detection
        if (
          g.player.x < obs.x + obs.w &&
          g.player.x + g.player.size > obs.x &&
          g.player.y < obs.y + obs.h &&
          g.player.y + g.player.size > obs.y
        ) {
          setGameState('gameOver');
          g.shake = 10;
        }

        // Score
        if (obs.x + obs.w < g.player.x && !obs.passed) {
          obs.passed = true;
          setScore(s => s + 1);
        }
      });

      // Cleanup obstacles
      g.obstacles = g.obstacles.filter(obs => obs.x + obs.w > 0);

      // Particles
      g.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
      });
      g.particles = g.particles.filter(p => p.life > 0);

      // Screen shake
      if (g.shake > 0) g.shake *= 0.9;

      // --- DRAW ---
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      if (g.shake > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
      }

      // Background lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      for(let i=0; i<CANVAS_WIDTH; i+=50) {
        ctx.moveTo(i - (g.frame % 50), 0);
        ctx.lineTo(i - (g.frame % 50), CANVAS_HEIGHT);
      }
      ctx.stroke();

      // Draw Particles
      g.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
      });
      ctx.globalAlpha = 1;

      // Draw Player
      ctx.shadowBlur = 15;
      ctx.shadowColor = g.player.color;
      ctx.fillStyle = g.player.color;
      ctx.fillRect(g.player.x, g.player.y, g.player.size, g.player.size);
      
      // Draw Obstacles
      g.obstacles.forEach(obs => {
        ctx.shadowColor = obs.color;
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      });

      if (g.shake > 0) ctx.restore();

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, score]);

  useEffect(() => {
    if (gameState === 'gameOver' && score > highScore) {
      setHighScore(score);
      localStorage.setItem('neon-dash-highscore', score.toString());
    }
  }, [gameState, score, highScore]);

  return (
    <div className="game-container" onClick={handleAction}>
      <header>
        <motion.h1 
          animate={{ textShadow: ["0 0 10px #00f2ff", "0 0 20px #00f2ff", "0 0 10px #00f2ff"] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="title-neon"
        >
          NEON DASH
        </motion.h1>
        <div className="stats-container">
          <div className="stat-item glass-card">
            <Zap size={16} className="icon-pulse" />
            <span>Score: {score}</span>
          </div>
          <div className="stat-item glass-card">
            <Trophy size={16} />
            <span>Best: {highScore}</span>
          </div>
        </div>
      </header>

      <main className="canvas-wrapper glass-card">
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
                START MISSION
              </button>
              <p className="controls-hint">Tap or Space to Jump</p>
            </motion.div>
          )}

          {gameState === 'gameOver' && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="overlay game-over"
            >
              <h2>CRITICAL FAILURE</h2>
              <p className="final-score">Score: {score}</p>
              <button onClick={startGame} className="primary-btn retry-btn">
                <RotateCcw size={20} />
                REBOOT SYSTEM
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer>
        <p className="footer-text">SURVIVE THE NEON GRID</p>
      </footer>
    </div>
  )
}

export default App
