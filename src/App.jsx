import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, RotateCcw, Trophy, Zap, Pause, PlayCircle, ShoppingCart, Coins, ShieldCheck, Sparkles, Home, User, Save } from 'lucide-react'
import RainbowCrystal from './RainbowCrystal'
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
    player: { x: 50, y: 200, vy: 0, size: 30, color: '#888888' },
    obstacles: [],
    coins: [],
    particles: [],
    frame: 0,
    speed: OBSTACLE_SPEED,
    shake: 0
  });

  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem('neon-dash-coins') || '0'));
  const [unlockedSkins, setUnlockedSkins] = useState(() => JSON.parse(localStorage.getItem('neon-dash-unlocked') || '["#888888"]'));
  const [shopOpen, setShopOpen] = useState(false);
  const [upgrades, setUpgrades] = useState(() => JSON.parse(localStorage.getItem('neon-dash-upgrades') || '{"autoShield": false}'));
  const [playerShape, setPlayerShape] = useState(() => localStorage.getItem('neon-dash-shape') || 'arrow');
  const [shopTab, setShopTab] = useState('skins'); // skins, chassis, upgrades

  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('neon-dash-playername') || 'PILOT_01');
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (gameState === 'idle') {
      // Initialize demo state
      gameRef.current = {
        player: { 
          x: 80, y: 200, vy: 0, size: 30, 
          color: playerSkin, shape: playerShape,
          shield: false, jumps: 0, trail: [] 
        },
        obstacles: [], powerups: [], coins: [], particles: [], zones: [],
        buildings: Array.from({ length: 15 }, (_, i) => ({
          x: i * 150, y: 150 + Math.random() * 150, w: 100 + Math.random() * 80,
          speed: 0.2 + Math.random() * 0.3, color: `rgba(40, 20, 60, 0.3)`
        })),
        stars: Array.from({ length: 50 }, () => ({
          x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT,
          size: Math.random() * 2, speed: 0.5 + Math.random() * 1.5
        })),
        frame: 0, speed: OBSTACLE_SPEED, shake: 0, flash: null
      };
    }

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

  const speak = (text) => {
    if (!audioEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 0.5;
    utterance.volume = 0.4;
    window.speechSynthesis.speak(utterance);
  };

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

  const [playerSkin, setPlayerSkin] = useState(() => localStorage.getItem('neon-dash-skin') || '#888888');

  const skins = [
    { name: 'Base', color: '#888888', price: 0, rarity: 'Common' },
    { name: 'Recruit', color: '#00ff44', price: 100, rarity: 'Uncommon' },
    { name: 'Pilot', color: '#0088ff', price: 250, rarity: 'Rare' },
    { name: 'Veteran', color: '#a200ff', price: 600, rarity: 'Epic' },
    { name: 'Elite', color: '#ffaa00', price: 1200, rarity: 'Legendary' },
    { name: 'Legend', color: '#ff0055', price: 2500, rarity: 'Mythic' },
    { name: 'Shadow', color: '#111111', price: 5000, rarity: 'Ultimate' },
    { name: 'God', color: 'rainbow', price: 10000, rarity: 'Divine' }
  ];

  const buySkin = (skin) => {
    if (coins >= skin.price && !unlockedSkins.includes(skin.color)) {
      const newCoins = coins - skin.price;
      const newUnlocked = [...unlockedSkins, skin.color];
      setCoins(newCoins);
      setUnlockedSkins(newUnlocked);
      localStorage.setItem('neon-dash-coins', newCoins.toString());
      localStorage.setItem('neon-dash-unlocked', JSON.stringify(newUnlocked));
      setPlayerSkin(skin.color);
      localStorage.setItem('neon-dash-skin', skin.color);
      speak(`New system unlocked: ${skin.name}`);
      playSound('powerup');
    }
  };

  const buyUpgrade = (type, price) => {
    if (coins >= price && !upgrades[type]) {
      const newCoins = coins - price;
      const newUpgrades = { ...upgrades, [type]: true };
      setCoins(newCoins);
      setUpgrades(newUpgrades);
      localStorage.setItem('neon-dash-coins', newCoins.toString());
      localStorage.setItem('neon-dash-upgrades', JSON.stringify(newUpgrades));
      speak("System upgrade integrated.");
      playSound('powerup');
    }
  };

  const startGame = () => {
    if (!audioEnabled) {
      setAudioEnabled(true);
      if (audioCtx.current?.state === 'suspended') audioCtx.current.resume();
    }
    speak("System active. Good luck pilot.");
    setScore(0);
    setGameState('playing');
    setIsPaused(false);
    gameRef.current = {
      player: { 
        x: 80, 
        y: 200, 
        vy: 0, 
        size: 30, 
        color: playerSkin, 
        shape: playerShape,
        shield: upgrades.autoShield, 
        jumps: 0, 
        trail: [] 
      },
      obstacles: [],
      powerups: [],
      coins: [],
      particles: [],
      zones: [],
      buildings: Array.from({ length: 15 }, (_, i) => ({
        x: i * 150,
        y: 150 + Math.random() * 150,
        w: 100 + Math.random() * 80,
        speed: 0.2 + Math.random() * 0.3,
        color: `rgba(${Math.random() * 50}, ${Math.random() * 20}, ${40 + Math.random() * 40}, 0.3)`
      })),
      stars: Array.from({ length: 50 }, () => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2,
        speed: 0.5 + Math.random() * 1.5
      })),
      frame: 0,
      speed: OBSTACLE_SPEED,
      shake: 0,
      flash: null
    };
  };


  const handleAction = () => {
    if (gameState === 'playing' && !isPaused) {
      const p = gameRef.current.player;
      p.vy = JUMP_FORCE;
      p.jumps++;
      playSound('jump');
      const pColor = p.shield ? '#fff' : playerSkin;
      createParticles(p.x, p.y + 15, pColor, 10);
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

  const goToMainMenu = () => {
    setGameState('idle');
    setIsPaused(false);
    speak("Returning to hangar.");
  };

  const updatePlayerName = (name) => {
    setPlayerName(name);
    localStorage.setItem('neon-dash-playername', name);
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
    // Game loop runs in playing OR idle (demo) states
    if (gameState === 'gameOver') return;

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
        ctx.arc(0, 0, p.size * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Main Shape
      ctx.shadowBlur = 25;
      ctx.shadowColor = p.color === 'rainbow' ? '#fff' : p.color;
      
      if (p.color === 'rainbow') {
        const gradient = ctx.createLinearGradient(-p.size/2, 0, p.size/2, 0);
        const t = Date.now() * 0.005;
        gradient.addColorStop(0, `hsl(${t * 50 % 360}, 100%, 50%)`);
        gradient.addColorStop(0.5, `hsl(${(t * 50 + 120) % 360}, 100%, 50%)`);
        gradient.addColorStop(1, `hsl(${(t * 50 + 240) % 360}, 100%, 50%)`);
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = p.color;
      }

      const s = p.size;
      ctx.beginPath();
      switch(p.shape) {
        case 'box':
          ctx.rect(-s/2, -s/2, s, s);
          break;
        case 'diamond':
          ctx.moveTo(0, -s/2); ctx.lineTo(s/2, 0); ctx.lineTo(0, s/2); ctx.lineTo(-s/2, 0);
          break;
        case 'orb':
          ctx.arc(0, 0, s/2, 0, Math.PI * 2);
          break;
        case 'star':
          for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos((18 + i * 72) / 180 * Math.PI) * s/2, -Math.sin((18 + i * 72) / 180 * Math.PI) * s/2);
            ctx.lineTo(Math.cos((54 + i * 72) / 180 * Math.PI) * s/4, -Math.sin((54 + i * 72) / 180 * Math.PI) * s/4);
          }
          break;
        case 'arrow':
        default:
          ctx.moveTo(s/2, 0); ctx.lineTo(-s/2, -s/2); ctx.lineTo(-s/4, 0); ctx.lineTo(-s/2, s/2);
          break;
      }
      ctx.closePath();
      ctx.fill();

      // Inner Detail
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      switch(p.shape) {
        case 'box': ctx.rect(-s/4, -s/4, s/2, s/2); break;
        case 'orb': ctx.arc(0, 0, s/4, 0, Math.PI * 2); break;
        default: 
          ctx.moveTo(s/4, 0); ctx.lineTo(-s/4, -s/4); ctx.lineTo(-s/8, 0); ctx.lineTo(-s/4, s/4);
      }
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

      // AI Bot logic for Demo Mode (Idle)
      if (gameState === 'idle' && !isPaused) {
        const p = g.player;
        const upcomingObs = g.obstacles.find(o => o.x > p.x && o.x < p.x + 200);
        if (upcomingObs) {
          // If obstacle is at bottom, jump
          if (upcomingObs.y > 0 && p.y + p.size > upcomingObs.y - 40) {
            p.vy = JUMP_FORCE;
          }
        }
        // Keep in screen
        if (p.y > CANVAS_HEIGHT - 100) p.vy = JUMP_FORCE;
      }

      if (!isPaused) {
        g.frame++;
        g.player.vy += GRAVITY;
        g.player.y += g.player.vy;

        if (g.player.y + g.player.size > CANVAS_HEIGHT) {
          g.player.y = CANVAS_HEIGHT - g.player.size;
          g.player.vy = 0;
          g.player.jumps = 0; // Reset jumps
        }
        if (g.player.y < 0) {
          g.player.y = 0;
          g.player.vy = 0;
        }

        // Parallax City Background
        g.buildings.forEach(b => {
          b.x -= b.speed + (score * 0.02);
          if (b.x + b.w < 0) {
            b.x = CANVAS_WIDTH + Math.random() * 100;
            b.y = 150 + Math.random() * 150;
          }
        });

        // Parallax Stars
        g.stars.forEach(s => {
          s.x -= s.speed + (score * 0.05); 
          if (s.x < 0) s.x = CANVAS_WIDTH;
        });

        // Speed Zones Spawning - BOOST only
        if (g.frame % 200 === 0) {
          g.zones.push({
            x: CANVAS_WIDTH,
            y: 0,
            w: 700,
            h: CANVAS_HEIGHT,
            type: 'fast',
            color: 'rgba(0, 242, 255, 0.1)'
          });
        }

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
          const isMoving = score > 10 && Math.random() > 0.5;
          g.obstacles.push({
            x: CANVAS_WIDTH,
            y: isTop ? 0 : CANVAS_HEIGHT - height,
            w: 45,
            h: height,
            color: obsColor,
            vy: isMoving ? (Math.random() - 0.5) * 6 : 0
          });
        }

        // Update Zones
        g.zones.forEach((z) => {
          z.x -= currentSpeed;
          if (g.player.x > z.x && g.player.x < z.x + z.w) {
            g.speedMod = z.type === 'fast' ? 2.2 : 0.7;
          } else {
            g.speedMod = 1;
          }
        });

        const effectiveSpeed = currentSpeed * (g.speedMod || 1);

        // Update Player Trail
        g.player.trail.unshift({ x: g.player.x, y: g.player.y });
        if (g.player.trail.length > 15) g.player.trail.pop();

        g.powerups.forEach((pu, index) => {
          pu.x -= effectiveSpeed;
          if (
            g.player.x < pu.x + pu.size &&
            g.player.x + g.player.size > pu.x &&
            g.player.y < pu.y + pu.size &&
            g.player.y + g.player.size > pu.y
          ) {
            g.player.shield = true;
            playSound('powerup');
            speak("Shield synchronized.");
            g.flash = { color: '#fff', alpha: 0.5 };
            g.powerups.splice(index, 1);
            createParticles(pu.x, pu.y, '#fff', 15);
          }
        });

        g.coins.forEach((c, index) => {
          c.x -= effectiveSpeed;
          if (
            !c.collected &&
            g.player.x < c.x + c.size &&
            g.player.x + g.player.size > c.x &&
            g.player.y < c.y + c.size &&
            g.player.y + g.player.size > c.y
          ) {
            c.collected = true;
            setCoins(prev => {
              const next = prev + 1;
              localStorage.setItem('neon-dash-coins', next.toString());
              return next;
            });
            playSound('powerup');
            g.coins.splice(index, 1);
            createParticles(c.x, c.y, '#ffd700', 8);
          }
        });

        g.obstacles.forEach((obs, index) => {
          obs.x -= effectiveSpeed;
          if (obs.vy !== 0) {
            obs.y += obs.vy;
            if (obs.y < 0 || obs.y + obs.h > CANVAS_HEIGHT) obs.vy *= -1;
          }

          // Proximity Combo (Close Call)
          const dist = Math.hypot(g.player.x - obs.x, g.player.y - obs.y);
          if (dist < 60 && !obs.closeCall && !obs.passed) {
            obs.closeCall = true;
            const points = 2;
            setScore(s => s + points);
            setCoins(c => {
              const next = c + points;
              localStorage.setItem('neon-dash-coins', next.toString());
              return next;
            });
            createParticles(g.player.x, g.player.y, '#ffaa00', 5);
          }

          if (
            g.player.x < obs.x + obs.w &&
            g.player.x + g.player.size > obs.x &&
            g.player.y < obs.y + obs.h &&
            g.player.y + g.player.size > obs.y
          ) {
            if (g.player.shield) {
              g.player.shield = false;
              playSound('hit');
              g.flash = { color: '#ff0055', alpha: 0.3 };
              g.obstacles.splice(index, 1);
              g.shake = 10;
              createParticles(obs.x, obs.y, '#fff', 20);
            } else {
              if (gameState === 'idle') {
                // In demo, just bounce or reset instead of Game Over
                g.player.vy = JUMP_FORCE;
                g.flash = { color: '#ff0055', alpha: 0.2 };
              } else {
                setGameState('gameOver');
                playSound('hit');
                speak("Critical failure. System reboot required.");
                g.flash = { color: '#ff0055', alpha: 0.8 };
                g.shake = 15;
              }
            }
          }
          if (obs.x + obs.w < g.player.x && !obs.passed) {
            obs.passed = true;
            if (gameState === 'playing') {
              setScore(s => s + 1);
              setCoins(c => {
                const next = c + 10;
                localStorage.setItem('neon-dash-coins', next.toString());
                return next;
              });
            }
          }
        });

        if (g.flash) {
          g.flash.alpha -= 0.05;
          if (g.flash.alpha <= 0) g.flash = null;
        }

        g.obstacles = g.obstacles.filter(obs => obs.x + obs.w > -100);
        g.powerups = g.powerups.filter(pu => pu.x + pu.size > 0);
        g.zones = g.zones.filter(z => z.x + z.w > 0);

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

      // Draw City Buildings (Parallax Background)
      g.buildings.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, CANVAS_HEIGHT - b.y, b.w, b.y);
        // Neon window lights
        ctx.fillStyle = 'rgba(0, 242, 255, 0.15)';
        for(let i = 0; i < 3; i++) {
          for(let j = 0; j < 6; j++) {
            if((b.x + i + j) % 3 !== 0)
              ctx.fillRect(b.x + 8 + i * 22, CANVAS_HEIGHT - b.y + 10 + j * 28, 12, 14);
          }
        }
      });

      // Draw Speed Zones
      g.zones.forEach(z => {
        const gradient = ctx.createLinearGradient(z.x, 0, z.x + z.w, 0);
        const zColor = z.type === 'fast' ? 'rgba(0, 242, 255, 0.12)' : 'rgba(255, 0, 85, 0.12)';
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, zColor);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(z.x, z.y, z.w, z.h);
        // Zone label
        ctx.save();
        ctx.fillStyle = z.type === 'fast' ? 'rgba(0, 242, 255, 0.6)' : 'rgba(255, 0, 85, 0.6)';
        ctx.font = '10px Orbitron';
        ctx.fillText(z.type === 'fast' ? '▶▶ BOOST' : '◀◀ SLOW', z.x + 20, CANVAS_HEIGHT / 2);
        ctx.restore();
      });

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

      // Draw Player Trail (TRON-style)
      g.player.trail.forEach((pos, i) => {
        const alpha = (g.player.trail.length - i) / (g.player.trail.length * 2);
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = g.player.color === 'rainbow' ? '#fff' : g.player.color;
        
        if (g.player.color === 'rainbow') {
          const t = Date.now() * 0.005 - i * 0.1;
          ctx.fillStyle = `hsl(${t * 50 % 360}, 100%, 50%)`;
        } else {
          ctx.fillStyle = g.player.color;
        }
        ctx.save();
        ctx.translate(pos.x + g.player.size / 2, pos.y + g.player.size / 2);
        const scale = 0.9 - (i * 0.05);
        ctx.scale(Math.max(scale, 0.1), Math.max(scale, 0.1));
        ctx.beginPath();
        ctx.moveTo(g.player.size / 2, 0);
        ctx.lineTo(-g.player.size / 2, -g.player.size / 2);
        ctx.lineTo(-g.player.size / 4, 0);
        ctx.lineTo(-g.player.size / 2, g.player.size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      drawPlayer(ctx, g.player);

      // Screen Flash Effect
      if (g.flash && g.flash.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = g.flash.alpha;
        ctx.fillStyle = g.flash.color;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();
      }

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
    <div className="relative flex flex-col items-center w-screen h-screen overflow-hidden select-none cursor-crosshair bg-[radial-gradient(circle_at_center,#0a0a1a_0%,#000_70%)] font-orbitron" onClick={handleAction}>
      <header className="relative z-50 flex items-center justify-between w-full px-8 py-3 bg-black/40 backdrop-blur-md border-b border-neon-cyan/20 shrink-0">
        <div className="header-left">
          <motion.h1 
            animate={{ textShadow: ["0 0 10px #00f2ff", "0 0 20px #00f2ff", "0 0 10px #00f2ff"] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="m-0 text-xl font-semibold tracking-wider text-neon-cyan drop-shadow-[0_0_12px_rgba(0,242,255,0.5)]"
          >
            Neon Dash
          </motion.h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-white">
              <Zap size={16} className="text-neon-cyan animate-pulse" />
              <span>Score: {score}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-white">
              <Trophy size={16} className="text-neon-gold" />
              <span>Best: {highScore}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 text-sm text-neon-gold bg-neon-gold/10 rounded border border-neon-gold/20">
              <Coins size={16} />
              <span>{coins}</span>
            </div>
            <div className="flex flex-col gap-1 w-24">
              <span className="text-[7px] text-white/30 uppercase tracking-[0.2em]">Difficulty</span>
              <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-neon-cyan shadow-[0_0_10px_#00f2ff]"
                  animate={{ width: `${Math.min(100, (score / 50) * 100)}%` }}
                  transition={{ type: "spring", stiffness: 50 }}
                />
              </div>
            </div>
            {gameState === 'playing' && (
              <button 
                className="p-2 text-white hover:text-neon-cyan hover:bg-white/10 transition-all rounded-full" 
                onClick={togglePause}
              >
                {isPaused ? <PlayCircle size={20} /> : <Pause size={20} />}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex-1 flex justify-center items-center w-full overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-10 opacity-40 mix-blend-overlay bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,3px_100%] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]"></div>
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT}
          style={{ width: dimensions.width, height: dimensions.height }}
          className="object-contain"
        />
        
        <AnimatePresence>
          {gameState === 'idle' && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md gap-8 z-40"
            >
              <div className="flex flex-col items-center gap-2 mb-4">
                <span className="text-[10px] text-neon-cyan tracking-[0.4em] uppercase opacity-50">Welcome Back</span>
                <h2 className="text-4xl font-light tracking-[0.2em] text-white">{playerName}</h2>
              </div>

              <div className="flex flex-col gap-4 w-64">
                <button 
                  className="group relative px-10 py-4 text-sm font-medium tracking-[0.2em] text-white border-2 border-white transition-all hover:bg-white hover:text-black hover:scale-105 active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    startGame();
                  }}
                >
                  <div className="flex items-center justify-center gap-3">
                    <Play size={18} fill="currentColor" />
                    <span>START MISSION</span>
                  </div>
                </button>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShopOpen(true);
                    }} 
                    className="px-4 py-3 text-[10px] font-medium tracking-[0.2em] text-white border-2 border-white transition-all hover:bg-white/10"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingCart size={16} />
                      <span>VAULT</span>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProfile(true);
                    }} 
                    className="px-4 py-3 text-[10px] font-medium tracking-[0.2em] text-white border-2 border-white transition-all hover:bg-white/10"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <User size={16} />
                      <span>PILOT</span>
                    </div>
                  </button>
                </div>
              </div>
              
              <p className="mt-4 text-[10px] text-white/50 tracking-wider">TAP OR SPACE TO JUMP</p>
            </motion.div>
          )}

          {shopOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 50 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-[#05050f]/95 backdrop-blur-2xl p-8 z-[60]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-2xl flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-center border-b border-neon-cyan/20 pb-4 mb-8">
                  <h2 className="text-3xl font-light tracking-[0.2em] text-white">NEON VAULT</h2>
                  <div className="flex items-center gap-6">
                    <div className="flex gap-4">
                      {['skins', 'chassis', 'upgrades'].map(tab => (
                        <button 
                          key={tab}
                          onClick={() => setShopTab(tab)}
                          className={`text-[10px] tracking-[0.2em] uppercase pb-1 border-b-2 transition-all ${shopTab === tab ? 'text-neon-cyan border-neon-cyan' : 'text-white/30 border-transparent hover:text-white'}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-neon-gold font-orbitron text-sm">
                      <Coins size={20} />
                      <span>{coins} NEON SHARDS</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-4 flex flex-col gap-10">
                  {shopTab === 'skins' && (
                    <section>
                      <h3 className="text-[10px] text-white/40 tracking-[0.3em] mb-6 uppercase">SYSTEM SKINS</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {skins.map(skin => (
                          <div 
                            key={skin.name} 
                            className={`
                              group relative p-4 flex flex-col items-center gap-3 cursor-pointer transition-all border
                              ${playerSkin === skin.color ? 'border-neon-cyan shadow-[0_0_15px_rgba(0,242,255,0.2)]' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}
                              ${!unlockedSkins.includes(skin.color) ? 'opacity-80' : ''}
                              ${skin.rarity === 'Divine' ? 'border-transparent !bg-black/80 animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.1)]' : ''}
                            `}
                            style={skin.rarity === 'Divine' ? {
                              borderImage: 'linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000) 1'
                            } : {}}
                            onClick={() => unlockedSkins.includes(skin.color) ? setPlayerSkin(skin.color) : buySkin(skin)}
                          >
                            {skin.color === 'rainbow' ? (
                              <div className="flex items-center justify-center p-2">
                                <RainbowCrystal />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded shadow-[0_0_15px_currentColor]" style={{ backgroundColor: skin.color }}></div>
                            )}
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-white font-medium">{skin.name}</span>
                              <span className={`text-[8px] uppercase tracking-wider ${
                                skin.rarity === 'Common' ? 'text-gray-400' :
                                skin.rarity === 'Uncommon' ? 'text-green-400' :
                                skin.rarity === 'Rare' ? 'text-blue-400' :
                                skin.rarity === 'Epic' ? 'text-purple-400' :
                                skin.rarity === 'Legendary' ? 'text-yellow-400' :
                                skin.rarity === 'Mythic' ? 'text-red-400' :
                                skin.rarity === 'Ultimate' ? 'text-white shadow-[0_0_5px_white]' : 'text-transparent bg-clip-text bg-[linear-gradient(to_right,#ff0000,#ff7300,#fffb00,#48ff00,#00ffd5,#002bff,#7a00ff,#ff00c8)] font-bold'
                              }`}>{skin.rarity}</span>
                            </div>
                            {!unlockedSkins.includes(skin.color) ? (
                              <div className="flex items-center gap-1.5 text-neon-gold text-xs">
                                <Coins size={12} />
                                <span>{skin.price}</span>
                              </div>
                            ) : (
                              <span className="text-[8px] text-white/30">OWNED</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {shopTab === 'chassis' && (
                    <section>
                      <h3 className="text-[10px] text-white/40 tracking-[0.3em] mb-6 uppercase">HULL CHASSIS</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { id: 'arrow', name: 'Interstate', icon: '▲' },
                          { id: 'box', name: 'Brute', icon: '■' },
                          { id: 'diamond', name: 'Prism', icon: '◆' },
                          { id: 'orb', name: 'Zenith', icon: '●' },
                          { id: 'star', name: 'Nova', icon: '★' }
                        ].map(shape => (
                          <div 
                            key={shape.id}
                            onClick={() => {
                              setPlayerShape(shape.id);
                              localStorage.setItem('neon-dash-shape', shape.id);
                            }}
                            className={`p-6 flex flex-col items-center gap-4 border transition-all cursor-pointer ${playerShape === shape.id ? 'border-neon-cyan bg-neon-cyan/5' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`}
                          >
                            <span className="text-3xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{shape.icon}</span>
                            <span className="text-[10px] text-white uppercase tracking-widest">{shape.name}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {shopTab === 'upgrades' && (
                    <section>
                      <h3 className="text-[10px] text-white/40 tracking-[0.3em] mb-6 uppercase">HARDWARE UPGRADES</h3>
                      <div className="flex flex-col gap-4">
                        <div 
                          className={`
                            flex items-center gap-6 p-4 border transition-all cursor-pointer
                            ${upgrades.autoShield ? 'border-green-500 bg-green-500/5' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}
                          `}
                          onClick={() => !upgrades.autoShield && buyUpgrade('autoShield', 1500)}
                        >
                          <ShieldCheck size={24} className="text-neon-cyan" />
                          <div className="flex-1 flex flex-col gap-1">
                            <span className="text-sm text-white font-medium">Auto-Shield</span>
                            <span className="text-xs text-white/40">Start mission with shield active</span>
                          </div>
                          {!upgrades.autoShield ? (
                            <div className="flex items-center gap-1.5 text-neon-gold text-xs">
                              <Coins size={12} />
                              <span>1500</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-green-400 font-bold tracking-widest">INSTALLED</span>
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                <button 
                  className="mt-8 px-10 py-3 text-xs font-medium tracking-[0.1em] text-white border border-white -skew-x-12 transition-all hover:bg-white hover:text-black self-center"
                  onClick={() => setShopOpen(false)}
                >
                  <span className="block skew-x-12">RETURN TO HANGAR</span>
                </button>
              </div>
            </motion.div>
          )}

          {isPaused && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md gap-8 z-40"
            >
              <h2 className="text-5xl font-light tracking-[0.2em] text-white mb-4">PAUSED</h2>
              <div className="flex gap-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePause(e);
                  }}
                  className="px-10 py-3 text-sm font-medium tracking-[0.2em] text-neon-cyan border border-neon-cyan -skew-x-12 transition-all hover:bg-neon-cyan hover:text-black hover:scale-105 active:scale-95"
                >
                  <div className="flex items-center gap-3 skew-x-12">
                    <Play size={16} strokeWidth={1.5} />
                    <span>RESUME</span>
                  </div>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    goToMainMenu();
                  }}
                  className="px-10 py-3 text-sm font-medium tracking-[0.2em] text-white/50 border border-white/20 -skew-x-12 transition-all hover:bg-white/10 hover:text-white hover:border-white"
                >
                  <div className="flex items-center gap-3 skew-x-12">
                    <Home size={16} strokeWidth={1.5} />
                    <span>MENU</span>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'gameOver' && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg gap-6 z-[70]"
            >
              <h2 className="text-4xl font-light tracking-[0.3em] text-neon-pink uppercase mb-4 drop-shadow-[0_0_20px_rgba(255,0,85,0.3)]">Critical Failure</h2>
              
              <div className="flex flex-col items-center gap-2 mb-4">
                <span className="text-[8px] text-white/30 uppercase tracking-[0.2em]">Rank Status</span>
                <span className="text-2xl font-extralight text-neon-cyan tracking-widest">
                  {score < 10 ? 'RECRUIT' : 
                   score < 25 ? 'PILOT' : 
                   score < 50 ? 'VETERAN' : 
                   score < 80 ? 'PHANTOM' : 'NEON GOD'}
                </span>
              </div>
              
              <p className="text-xl font-thin text-white tracking-widest">SCORE: {score}</p>
              
              {history.length > 0 && (
                <div className="flex flex-col items-center gap-3 my-4">
                  <p className="text-[8px] text-white/40 uppercase tracking-widest">Recent Performance</p>
                  <div className="flex gap-4">
                    {history.map((s, i) => (
                      <span key={i} className="text-lg font-extralight text-white/60">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 mt-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    startGame();
                  }} 
                  className="px-10 py-3 text-sm font-medium tracking-[0.2em] text-neon-pink border border-neon-pink -skew-x-12 transition-all hover:bg-neon-pink hover:text-white hover:scale-105 active:scale-95"
                >
                  <div className="flex items-center gap-3 skew-x-12">
                    <RotateCcw size={20} />
                    <span>REBOOT</span>
                  </div>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    goToMainMenu();
                  }} 
                  className="px-10 py-3 text-sm font-medium tracking-[0.2em] text-white/50 border border-white/20 -skew-x-12 transition-all hover:bg-white/10 hover:text-white hover:border-white"
                >
                  <div className="flex items-center gap-3 skew-x-12">
                    <Home size={20} />
                    <span>MENU</span>
                  </div>
                </button>
              </div>
            </motion.div>
          )}
          {showProfile && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl z-[80]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-md p-8 border-2 border-white flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-light tracking-[0.3em] text-white uppercase text-center">Pilot Registry</h2>
                  <p className="text-[10px] text-white/30 text-center uppercase tracking-widest">Identify yourself to the system</p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                    <input 
                      type="text" 
                      value={playerName}
                      onChange={(e) => updatePlayerName(e.target.value)}
                      placeholder="ENTER CALLSIGN"
                      className="w-full bg-white/5 border-2 border-white/20 px-12 py-4 text-white font-orbitron text-sm tracking-widest focus:border-white focus:outline-none transition-all"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4 text-[10px] text-white/50 uppercase tracking-widest bg-white/5 p-4 border border-white/10">
                    <div className="flex flex-col gap-1">
                      <span>Status</span>
                      <span className="text-neon-cyan">ACTIVE</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span>Credits</span>
                      <span className="text-neon-gold">{coins}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowProfile(false)}
                  className="w-full py-4 text-sm font-medium tracking-[0.2em] bg-white text-black hover:bg-neon-cyan transition-all uppercase"
                >
                  Confirm Registry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
        <p className="text-[10px] text-white/40 font-light tracking-[0.2em] border-b border-white/10 pb-1">
          CREATED BY SEBASTIAN VASQUEZ ECHAVARRIA
        </p>
      </footer>
    </div>
  )
}

export default App
