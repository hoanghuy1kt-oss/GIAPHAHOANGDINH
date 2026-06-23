import React, { useState, useEffect } from "react";
import { Flame, Calendar } from "lucide-react";
import { LunarDate, SolarDate } from "lunar-date-vn";

const getSolarDateOfLunar = (lunarYear, lunarMonth, lunarDay) => {
  try {
    const lunar = new LunarDate({ day: 1, month: 1, year: lunarYear });
    lunar.setDate({ day: lunarDay, month: lunarMonth, year: lunarYear });
    const solar = lunar.toSolarDate();
    if (solar) {
      return solar.toDate();
    }
  } catch (e) {
    console.error("Error converting Lunar to Solar in Memorial:", e);
  }
  return new Date(lunarYear, lunarMonth - 1, lunarDay);
};

const TOTAL_BURN_TIME = 20 * 60 * 1000; // 20 minutes in milliseconds

const getAshPath = (x, y, g, side) => {
  if (g < 0.05) return "";
  const X = x;
  const Y = y;
  if (side === 'left') {
    const x1 = X - 4 * g;
    const y1 = Y - 5 * g;
    const x2 = X - 8 * g;
    const y2 = Y - 10 * g;
    const x3 = X - 4 * g;
    const y3 = Y - 14 * g;
    const x4 = X + 1 * g;
    const y4 = Y - 18 * g;
    const x5 = X - 1 * g;
    const y5 = Y - 7 * g;
    const x6 = X;
    const y6 = Y - 7 * g;
    return `M ${X},${Y} C ${x1},${y1} ${x2},${y2} ${x3},${y3} C ${x4},${y4} ${x5},${y5} ${x6},${y6}`;
  } else if (side === 'right') {
    const x1 = X + 4 * g;
    const y1 = Y - 5 * g;
    const x2 = X + 8 * g;
    const y2 = Y - 10 * g;
    const x3 = X + 4 * g;
    const y3 = Y - 14 * g;
    const x4 = X - 1 * g;
    const y4 = Y - 18 * g;
    const x5 = X + 1 * g;
    const y5 = Y - 7 * g;
    const x6 = X;
    const y6 = Y - 7 * g;
    return `M ${X},${Y} C ${x1},${y1} ${x2},${y2} ${x3},${y3} C ${x4},${y4} ${x5},${y5} ${x6},${y6}`;
  } else {
    const x1 = X - 4 * g;
    const y1 = Y - 6 * g;
    const x2 = X - 6 * g;
    const y2 = Y - 12 * g;
    const x3 = X + 2 * g;
    const y3 = Y - 18 * g;
    const x4 = X + 7 * g;
    const y4 = Y - 22 * g;
    const x5 = X + 4 * g;
    const y5 = Y - 8 * g;
    const x6 = X;
    const y6 = Y - 8 * g;
    return `M ${X},${Y} C ${x1},${y1} ${x2},${y2} ${x3},${y3} C ${x4},${y4} ${x5},${y5} ${x6},${y6}`;
  }
};

export default function Memorial({
  members,
  onSelectMember
}) {
  // Altar states (driven by timestamps for real-time progression)
  const [activeSticks, setActiveSticks] = useState([]);
  const [selectedIncenseCount, setSelectedIncenseCount] = useState(3);

  // Refs for Canvas smoke & ash simulation
  const canvasRef = React.useRef(null);
  const particlesRef = React.useRef([]);
  const activeSticksRef = React.useRef([]);
  const lastCycleRef = React.useRef({});

  const isIncenseLit = activeSticks.length > 0;
  const stickBaseHeight = 70; // Max height of stick in px

  // Sync active sticks to ref for the canvas animation loop
  useEffect(() => {
    activeSticksRef.current = activeSticks;
  }, [activeSticks]);

  // 1. Canvas particle animation loop (smoke + falling ash)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const now = Date.now();
      const sticks = activeSticksRef.current || [];

      // 1. Spawn particles if incense is lit
      if (sticks.length > 0) {
        sticks.forEach((stick) => {
          const elapsed = now - stick.startTime;
          if (elapsed >= TOTAL_BURN_TIME) return;

          const percent = 100 - (elapsed / TOTAL_BURN_TIME) * 100;
          const currentH = Math.max(8, stickBaseHeight * (percent / 100));

          const baseX = 60 + stick.xOffset;
          const baseY = 110 + stick.yOffset;
          const rad = (stick.angle * Math.PI) / 180;

          const tipX = baseX + currentH * Math.sin(rad);
          const tipY = baseY - currentH * Math.cos(rad);

          // SVG coordinates mapped to Canvas coordinates:
          // Since the aspect ratio is constant (3:2), the image scales by scale = H / 1024.
          // SVG bottom is H * 0.775. SVG width is 120 * scale.
          const scale = H / 1024;
          const canvasTipX = W * 0.4967 + (tipX - 60) * scale;
          const canvasTipY = H * 0.5615 - (120 - tipY) * scale;

          // Spawn elegant, moderately visible smoke particles
          if (Math.random() < 0.22) {
            particlesRef.current.push({
              x: canvasTipX + (Math.random() - 0.5) * 1.2 * scale,
              y: canvasTipY - 1 * scale,
              vx: (Math.sin(rad) * 0.05 + (Math.random() - 0.5) * 0.12) * scale,
              vy: (-Math.cos(rad) * 0.35 - 0.35 - Math.random() * 0.35) * scale,
              alpha: 0.12 + Math.random() * 0.08,
              startAlpha: 0.12 + Math.random() * 0.08,
              size: (1.1 + Math.random() * 0.7) * scale,
              maxLife: 135 + Math.random() * 60,
              life: 0,
              type: "smoke",
              swaySpeed: 0.01 + Math.random() * 0.012,
              swayAmp: (0.13 + Math.random() * 0.13) * scale,
              swayOffset: Math.random() * Math.PI * 2
            });
          }

          // Ash fall check: cycle is 90 seconds
          const stickElapsed = elapsed + (stick.ashOffset || 0);
          const cycleDuration = 90000;
          const cycleIndex = Math.floor(stickElapsed / cycleDuration);

          if (lastCycleRef.current[stick.id] === undefined) {
            lastCycleRef.current[stick.id] = cycleIndex;
          } else if (cycleIndex > lastCycleRef.current[stick.id]) {
            // Spawn falling ash flake
            particlesRef.current.push({
              x: canvasTipX,
              y: canvasTipY,
              vx: (Math.sin(rad) * 0.15 + (Math.random() - 0.5) * 0.25) * scale,
              vy: (0.2 + Math.random() * 0.25) * scale,
              ay: 0.07 * scale, // gravity
              alpha: 0.85,
              size: (1.3 + Math.random() * 1.1) * scale,
              maxLife: 100,
              life: 0,
              type: "ash"
            });
            lastCycleRef.current[stick.id] = cycleIndex;
          }
        });
      }

      // 2. Update and draw particles
      const globalWind = Math.sin(now * 0.0006) * 0.12;
      const scale = H / 1024;
      particlesRef.current.forEach((p) => {
        p.life++;
        if (p.type === "smoke") {
          // Rise and sway
          p.x += p.vx + globalWind * scale + Math.sin(p.life * p.swaySpeed + p.swayOffset) * p.swayAmp;
          p.y += p.vy;
          p.size += 0.10 * scale; // smoke expands and diffuses naturally
          p.alpha = p.startAlpha * (1 - p.life / p.maxLife);

          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grad.addColorStop(0, `rgba(225, 225, 225, ${p.alpha})`);
          grad.addColorStop(0.35, `rgba(215, 215, 215, ${p.alpha * 0.35})`);
          grad.addColorStop(1, `rgba(190, 190, 190, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === "ash") {
          // Fall down with gravity
          p.vy += p.ay;
          p.x += p.vx;
          p.y += p.vy;

          const burnerRim = H * 0.5615;
          if (p.y >= burnerRim) {
            // Land on burner rim/mouth
            p.vy = 0;
            p.vx = 0;
            p.y = burnerRim;
            p.alpha -= 0.035; // fade out on ground
          } else {
            p.alpha = 0.85 * (1 - p.life / p.maxLife);
          }

          ctx.fillStyle = `rgba(130, 133, 137, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Filter out dead particles
      particlesRef.current = particlesRef.current.filter(
        (p) => p.life < p.maxLife && p.alpha > 0 && p.y > 0 && p.y < H
      );

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 2. Core Real-time Simulation Loop (Timer decay)
  useEffect(() => {
    const updateSimulation = () => {
      const now = Date.now();

      // Incense list check (handles multiple burning sticks)
      const incenseListStr = localStorage.getItem("hoang_dinh_incense_list");
      if (incenseListStr) {
        try {
          const list = JSON.parse(incenseListStr);
          const valid = list.filter((s) => now - s.startTime < TOTAL_BURN_TIME);
          if (valid.length !== list.length) {
            if (valid.length > 0) {
              localStorage.setItem("hoang_dinh_incense_list", JSON.stringify(valid));
            } else {
              localStorage.removeItem("hoang_dinh_incense_list");
            }
          }
          setActiveSticks(valid);
        } catch (e) {
          localStorage.removeItem("hoang_dinh_incense_list");
          setActiveSticks([]);
        }
      } else {
        // Fallback/migrate old single incense state
        const oldIncense = localStorage.getItem("hoang_dinh_incense_start");
        if (oldIncense) {
          const startTime = parseInt(oldIncense);
          if (now - startTime < TOTAL_BURN_TIME) {
            const migrated = [
              { id: 1, startTime, xOffset: -2.5, yOffset: -1, angle: -5, ashOffset: 0 },
              { id: 2, startTime, xOffset: 0, yOffset: 1, angle: 0, ashOffset: 30000 },
              { id: 3, startTime, xOffset: 2.5, yOffset: -0.5, angle: 5, ashOffset: 60000 }
            ];
            localStorage.setItem("hoang_dinh_incense_list", JSON.stringify(migrated));
            setActiveSticks(migrated);
          }
          localStorage.removeItem("hoang_dinh_incense_start");
        } else {
          setActiveSticks([]);
        }
      }
    };

    updateSimulation(); // Run immediately on mount
    const interval = setInterval(updateSimulation, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  // 4. User Interaction Handlers
  const handleToggleIncense = () => {
    // Adds selectedIncenseCount sticks to the burner!
    const now = Date.now();
    const numSticks = selectedIncenseCount;
    const newSticks = [];

    for (let i = 0; i < numSticks; i++) {
      // Clustered position (chụm lại) inside the burner mouth
      let xOffset = 0;
      if (numSticks > 1) {
        const range = 5; // narrow range of 5 SVG units (pixels)
        const step = range / (numSticks - 1);
        xOffset = -range/2 + i * step + (Math.random() - 0.5) * 0.8;
      } else {
        xOffset = (Math.random() - 0.5) * 1.0;
      }
      const yOffset = (Math.random() - 0.5) * 2;
      
      // Calculate fanned out angle based on index
      let angle = 0;
      if (numSticks > 1) {
        const maxAngle = 5; // max tilt of 5 degrees
        const angleStep = (maxAngle * 2) / (numSticks - 1);
        angle = -maxAngle + i * angleStep + (Math.random() - 0.5) * 1.5;
      } else {
        angle = (Math.random() - 0.5) * 2;
      }
      const ashOffset = Math.random() * 90000;

      newSticks.push({
        id: Math.random() + now + i,
        startTime: now,
        xOffset,
        yOffset,
        angle,
        ashOffset
      });
    }

    const currentList = JSON.parse(localStorage.getItem("hoang_dinh_incense_list") || "[]");
    const validCurrent = currentList.filter((s) => now - s.startTime < TOTAL_BURN_TIME);
    const updated = [...validCurrent, ...newSticks];

    localStorage.setItem("hoang_dinh_incense_list", JSON.stringify(updated));
    setActiveSticks(updated);
  };

  const handleExtinguishIncense = () => {
    localStorage.removeItem("hoang_dinh_incense_list");
    setActiveSticks([]);
  };

  const handleAddToCalendar = (name, lunarMonth, lunarDay, desc) => {
    const currentYear = new Date().getFullYear();
    const target = getSolarDateOfLunar(currentYear, lunarMonth, lunarDay);
    
    const formattedYear = target.getFullYear();
    const formattedMonth = String(target.getMonth() + 1).padStart(2, '0');
    const formattedDay = String(target.getDate()).padStart(2, '0');
    
    const targetNext = new Date(target);
    targetNext.setDate(targetNext.getDate() + 1);
    const formattedNextYear = targetNext.getFullYear();
    const formattedNextMonth = String(targetNext.getMonth() + 1).padStart(2, '0');
    const formattedNextDay = String(targetNext.getDate()).padStart(2, '0');
    
    const startDate = `${formattedYear}${formattedMonth}${formattedDay}`;
    const endDate = `${formattedNextYear}${formattedNextMonth}${formattedNextDay}`;
    
    const title = encodeURIComponent(`Ngày Giỗ ${name}`);
    const details = encodeURIComponent(`Ngày giỗ (Âm lịch: ${lunarDay}/${lunarMonth}) ${name} (${desc}). Tưởng nhớ tổ tiên Gia tộc Hoàng Đình.`);
    const dates = `${startDate}/${endDate}`;
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  const findMemberByName = (name) => {
    return members.find((m) => m.name.includes(name));
  };


  const getAnniversaryDate = (m) => {
    if (!m.isDeceased) return null;
    const dateParts = m.deathDate ? m.deathDate.split(/[\/\-]/) : [];
    if (dateParts.length >= 2) {
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      if (!isNaN(day) && !isNaN(month) && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return { day, month };
      }
    }
    return null;
  };

  const getUpcomingSolarDateStr = (e) => {
    const { day, month } = e.annDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let solarYear = today.getFullYear();
    let target = getSolarDateOfLunar(solarYear, month, day);
    const targetZero = new Date(target);
    targetZero.setHours(0, 0, 0, 0);
    if (targetZero < today) {
      target = getSolarDateOfLunar(solarYear + 1, month, day);
    }
    const dStr = String(target.getDate()).padStart(2, '0');
    const mStr = String(target.getMonth() + 1).padStart(2, '0');
    return `${dStr}/${mStr}/${target.getFullYear()}`;
  };

  const getDaysRemaining = (e) => {
    const { day, month } = e.annDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let solarYear = today.getFullYear();
    let target = getSolarDateOfLunar(solarYear, month, day);
    const targetZero = new Date(target);
    targetZero.setHours(0, 0, 0, 0);
    if (targetZero < today) {
      target = getSolarDateOfLunar(solarYear + 1, month, day);
    }
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const individualEvents = members.filter(m => m.isDeceased).map(m => {
    const annDate = getAnniversaryDate(m);
    if (!annDate) return null;
    const relationDesc = m.spouseId ? "Phu nhân" : (m.gender === "Nam" ? "Nam" : "Nữ");
    const cardDesc = m.generation === 1 ? (m.gender === "Nam" ? "Thủy Tổ" : "Thủy Tổ Mẫu") : `Đời thứ ${m.generation} · ${relationDesc}`;
    return {
      id: `indiv-${m.id}`,
      name: m.name,
      annDate,
      desc: cardDesc,
      isHopKy: false,
      member: m
    };
  }).filter(Boolean);

  const hopKyMembers = members.filter(m => m.isDeceased && getAnniversaryDate(m) === null);

  const hopKyEvent = hopKyMembers.length > 0 ? [{
    id: "hopky",
    name: "Giỗ Hợp Kỵ (Giỗ chung)",
    annDate: { day: 18, month: 9 },
    desc: `Giỗ tập thể cho các tiên tổ không rõ ngày mất`,
    isHopKy: true,
    members: hopKyMembers
  }] : [];

  const allEvents = [...individualEvents, ...hopKyEvent].map(e => ({
    ...e,
    daysRemaining: getDaysRemaining(e)
  })).sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <div
      className="w-full min-h-screen flex flex-col font-sans select-text pb-12 fade-in bg-cover bg-center bg-fixed bg-no-repeat"
      style={{ backgroundImage: "url('/assets/background.webp')" }}
    >

      {/* 1. Header titles */}
      <div className="text-center py-8 relative flex flex-col items-center select-none">
        {/* Subtle traditional incense-smoke glow behind the title */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-20 bg-gold-accent/8 rounded-full blur-3xl pointer-events-none"></div>

        {/* Golden calligraphic flourishes framing the main title */}
        <div className="flex items-center gap-4 md:gap-8 relative">
          {/* Left Decorative Line with gold dots */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-10 h-[1.5px] bg-gradient-to-r from-transparent to-gold-accent/80"></span>
            <span className="w-1.5 h-1.5 rotate-45 bg-gold-accent/60"></span>
          </div>

          <h2 
            className="font-display text-3xl md:text-5.5xl tracking-widest font-extrabold select-text filter drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.18)]"
            style={{
              background: 'linear-gradient(to bottom, #4A1715 0%, #855325 55%, #300E0D 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Điện Thờ Online
          </h2>

          {/* Right Decorative Line with gold dots */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rotate-45 bg-gold-accent/60"></span>
            <span className="w-10 h-[1.5px] bg-gradient-to-l from-transparent to-gold-accent/80"></span>
          </div>
        </div>

        {/* Elegant calligraphic divider line */}
        <div className="flex items-center gap-2 mt-3 mb-2.5">
          <div className="w-20 h-[1px] bg-gradient-to-r from-transparent to-gold-accent/50"></div>
          <div className="w-3 h-3 rotate-45 border border-gold-accent/60 bg-gold-accent/15 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rotate-45 bg-gold-accent"></div>
          </div>
          <div className="w-20 h-[1px] bg-gradient-to-l from-transparent to-gold-accent/50"></div>
        </div>

        {/* Subtitle */}
        <p className="text-xs md:text-sm font-display text-wood-medium/90 tracking-wide font-medium italic select-text">
          “Tưởng nhớ tổ tiên, kết nối nguồn cội Gia Tộc Hoàng Đình”
        </p>
      </div>

      {/* 2. The Majestic Large Altar Photo Banner */}
      <div className="w-full max-w-5xl mx-auto px-4 mb-10 relative">
        {/*
          Padding-top trick: height = width × (1024/1535) = 66.71%
          This computes synchronously unlike CSS aspect-ratio, so lights
          are always at the correct position from the very first paint.
        */}
        <div className="w-full relative" style={{ paddingTop: "66.71%" }}>
          {/* Altar image box — absolutely fills the padding-top wrapper */}
          <div
            className="absolute inset-0 rounded-lg border-2 border-gold-accent/40 shadow-2xl overflow-hidden bg-cover bg-center"
            style={{ backgroundImage: `url('/assets/altar_bg.webp?v=2')` }}
          >
            {/* Subtle dark overlay for depth */}
            <div className="absolute inset-0 bg-black/45 pointer-events-none"></div>

            {/* Natural Smoke Canvas overlay */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 12 }} />

            {/* Animated Altar Glows — positions calibrated by user */}
            {/* Left lantern */}
            <div className="absolute w-[9.38%] aspect-square rounded-full lantern-glow pointer-events-none z-10"
              style={{ left:"12.50%", top:"7.81%", animation:"lightFlicker 3.5s infinite ease-in-out" }}/>
            {/* Right lantern */}
            <div className="absolute w-[9.38%] aspect-square rounded-full lantern-glow pointer-events-none z-10"
              style={{ left:"78.43%", top:"7.36%", animation:"lightFlicker 3.5s infinite ease-in-out", animationDelay:"-1.2s" }}/>
            {/* Left oil lamp */}
            <div className="absolute w-[4.69%] aspect-square rounded-full lamp-glow pointer-events-none z-10"
              style={{ left:"7.80%", top:"60.59%", animation:"lightFlicker 2.5s infinite ease-in-out", animationDelay:"-0.5s" }}/>
            {/* Right oil lamp */}
            <div className="absolute w-[4.69%] aspect-square rounded-full lamp-glow pointer-events-none z-10"
              style={{ left:"87.33%", top:"60.74%", animation:"lightFlicker 2.5s infinite ease-in-out", animationDelay:"-1.3s" }}/>
            {/* Left candle */}
            <div className="absolute w-[3.5%] aspect-square rounded-full lamp-glow pointer-events-none z-10"
              style={{ left:"26.84%", top:"47.74%", animation:"lightFlicker 2s infinite ease-in-out", animationDelay:"-0.7s" }}/>
            {/* Right candle */}
            <div className="absolute w-[3.5%] aspect-square rounded-full lamp-glow pointer-events-none z-10"
              style={{ left:"69.28%", top:"47.74%", animation:"lightFlicker 2s infinite ease-in-out", animationDelay:"-1.4s" }}/>

          {/* THẮP NHANG: Incense sticks in center bowl (burning down in real-time) */}
          {isIncenseLit && (
            <div 
              className="absolute -translate-x-1/2 flex items-end justify-center w-[7.82%] h-[11.72%] pointer-events-none z-10 overflow-visible"
              style={{ left: "49.67%", bottom: "43.85%" }}
            >
              <svg viewBox="0 0 120 120" width="100%" height="100%" className="overflow-visible">
                {activeSticks.map((stick) => {
                  const elapsed = Date.now() - stick.startTime;
                  const percent = Math.max(0, 100 - (elapsed / TOTAL_BURN_TIME) * 100);
                  const currentH = Math.max(8, stickBaseHeight * (percent / 100));

                  const baseX = 60 + stick.xOffset;
                  const baseY = 110 + stick.yOffset;
                  const rad = (stick.angle * Math.PI) / 180;

                  const tipX = baseX + currentH * Math.sin(rad);
                  const tipY = baseY - currentH * Math.cos(rad);

                  const stickElapsed = elapsed + (stick.ashOffset || 0);
                  const cycleDuration = 90000;
                  const g = (stickElapsed % cycleDuration) / cycleDuration;

                  const ashSide = stick.angle < -1.5 ? "left" : stick.angle > 1.5 ? "right" : "center";
                  const ashPath = getAshPath(tipX, tipY, g, ashSide);

                  return (
                    <g key={stick.id}>
                      {/* Unburnt stick */}
                      <line
                        x1={baseX}
                        y1={baseY}
                        x2={tipX}
                        y2={tipY}
                        stroke="#d97706"
                        strokeWidth="1.5"
                      />
                      {/* Glowing ember */}
                      <circle cx={tipX} cy={tipY} r="1.8" fill="#ef4444" className="animate-pulse" />
                      <circle cx={tipX} cy={tipY} r="1.0" fill="#fdba74" />

                      {/* Curled ash (Tàn nhang uốn cong) */}
                      {percent < 98 && ashPath && (
                        <g transform={`rotate(${stick.angle}, ${tipX}, ${tipY})`}>
                          <path
                            d={getAshPath(tipX, tipY, g, ashSide)}
                            stroke="#9ca3af"
                            strokeWidth="1.1"
                            fill="none"
                            strokeLinecap="round"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

            {/* Centered, compact incense lighting control box */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 select-none bg-[#1a1512]/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-gold-accent/35 shadow-lg">
            {/* Quick selectors for count */}
            <div className="flex gap-0.5 bg-black/40 p-0.5 rounded-full border border-gold-accent/15">
              {[1, 3, 5, 9].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIncenseCount(n);
                  }}
                  className={`w-5 h-5 flex items-center justify-center text-[10px] rounded-full transition-all font-sans font-semibold cursor-pointer ${
                    selectedIncenseCount === n
                      ? "bg-gold-accent text-wood-dark font-bold"
                      : "text-gold-light/60 hover:text-gold-light hover:bg-white/5"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Vertically thin divider */}
            <div className="w-[1px] h-4 bg-gold-accent/20"></div>

            {/* Main Action Button */}
            <button
              onClick={handleToggleIncense}
              className={`px-3 py-1 flex items-center gap-1.5 rounded-full border transition-all cursor-pointer text-[11px] uppercase tracking-wider font-semibold ${
                isIncenseLit
                  ? "bg-gold-accent/90 border-gold-accent text-wood-dark hover:bg-gold-accent"
                  : "bg-black/40 border-gold-accent/30 text-gold-accent hover:border-gold-accent hover:bg-black/60"
              }`}
            >
              <Flame className="w-3 h-3 animate-pulse" />
              <span>{isIncenseLit ? "Thêm" : "Thắp Nhang"}</span>
            </button>

            {isIncenseLit && (
              <>
                <div className="w-[1px] h-4 bg-gold-accent/20"></div>
                <button
                  onClick={handleExtinguishIncense}
                  className="text-[10px] text-red-400 hover:text-red-300 transition-colors font-semibold pr-1.5 cursor-pointer"
                >
                  Rút
                </button>
              </>
            )}
          </div>
          </div>{/* end altar-box */}
        </div>{/* end padding-top wrapper */}

      </div>


      {/* 3. Information Columns (Ngày Giỗ List) */}
      <div className="w-full max-w-5xl mx-auto px-4 space-y-4">
        
        <div className="flex justify-between items-baseline border-b border-gold-accent/20 pb-2 mb-4">
          <h3 className="font-display font-bold text-lg md:text-xl text-wood-dark">
            Danh sách Ngày Giỗ Hằng Năm
          </h3>
          <span className="text-xs font-bold text-gold-accent flex items-center gap-1 uppercase tracking-wider">
            📅 Hằng Năm
          </span>
        </div>

        {allEvents.length === 0 ? (
          <p className="text-xs text-charcoal/45 italic text-center py-8">Không có dữ liệu ngày giỗ.</p>
        ) : (
          allEvents.map(e => {
            const formattedDay = e.annDate.day.toString().padStart(2, '0');
            const formattedMonth = e.annDate.month.toString().padStart(2, '0');
            const solarDateStr = getUpcomingSolarDateStr(e);

            return (
              <div key={e.id} className="bg-paper-light border-l-4 border-gold-accent rounded shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all hover:shadow-md">
                <div className="flex items-center gap-4 flex-grow">
                  <div className="text-center bg-paper-base border border-gold-accent/20 rounded px-2.5 py-1.5 min-w-[70px] self-start sm:self-center">
                    <span className="block font-bold text-lg text-wood-medium leading-none">{formattedDay}</span>
                    <span className="text-[9px] text-charcoal/50 uppercase font-semibold">T. {formattedMonth} (Âm)</span>
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-display font-semibold text-sm text-wood-dark">{e.name}</h4>
                    <p className="text-[10px] text-wood-medium/80 mt-0.5 font-medium">Dương lịch tiếp theo: {solarDateStr}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAddToCalendar(e.name, e.annDate.month, e.annDate.day, e.desc)}
                  className="text-xs text-gold-accent hover:text-gold-light transition-colors font-semibold flex items-center gap-1.5 cursor-pointer self-end sm:self-center"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Add lịch</span>
                </button>
              </div>
            );
          })
        )}

      </div>
    </div>
  );
}
