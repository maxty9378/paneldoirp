import React, { useEffect, useRef } from 'react';

interface NeuralNetworkBackgroundProps {
  className?: string;
}

export function NeuralNetworkBackground({ className = '' }: NeuralNetworkBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Настройка canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Узлы нейросети
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      connections: number[];
    }> = [];

    // Создаем узлы
    const createNodes = () => {
      nodes.length = 0;
      const nodeCount = 50;
      
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          connections: []
        });
      }
    };

    // Обновление узлов
    const updateNodes = () => {
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        // Отскок от краев
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Ограничиваем позицию
        node.x = Math.max(0, Math.min(canvas.width, node.x));
        node.y = Math.max(0, Math.min(canvas.height, node.y));
      });
    };

    // Рисование соединений
    const drawConnections = () => {
      nodes.forEach((node, i) => {
        node.connections = [];
        
        nodes.forEach((otherNode, j) => {
          if (i !== j) {
            const dx = node.x - otherNode.x;
            const dy = node.y - otherNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 150) {
              const opacity = (150 - distance) / 150;
              const alpha = opacity * 0.4;
              
              ctx.strokeStyle = `rgba(6, 164, 120, ${alpha})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(otherNode.x, otherNode.y);
              ctx.stroke();
              
              node.connections.push(j);
            }
          }
        });
      });
    };

    // Рисование узлов
    const drawNodes = () => {
      nodes.forEach(node => {
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, 8
        );
        gradient.addColorStop(0, 'rgba(6, 164, 120, 0.9)');
        gradient.addColorStop(1, 'rgba(6, 164, 120, 0.2)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    // Анимация
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      updateNodes();
      drawConnections();
      drawNodes();
      
      animationRef.current = requestAnimationFrame(animate);
    };

    createNodes();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 ${className}`}
      style={{ background: 'transparent' }}
    />
  );
}
