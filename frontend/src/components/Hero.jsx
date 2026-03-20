import React from 'react';
import { Play, Info, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const Hero = ({ movie, onOpenModal }) => {
  if (!movie) return null;

  return (
    <section className="hero-section">
      <div className="absolute inset-0 overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src={movie.backdrop || movie.image} 
          className="w-full h-full object-cover"
          alt={movie.title}
        />
        <div className="hero-overlay" />
      </div>

      <div className="relative z-10 w-full max-w-[900px]">
        <motion.div 
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <span className="badge badge-primary">Trending Now</span>
            <div className="flex items-center gap-1.5 text-yellow-500 font-black">
              <Star className="w-5 h-5 fill-current" />
              <span className="text-lg">{movie.rating}</span>
            </div>
            <span className="text-text-muted font-bold tracking-widest">{movie.year} • {movie.label || '4K ULTRA HD'}</span>
          </div>
          
          <h1 style={{ fontSize: 'clamp(3rem, 10vw, 6.5rem)', fontWeight: 900, marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '-4px', lineHeight: '0.85' }}>
            {movie.title}
          </h1>
          
          <p className="text-text-muted text-xl leading-relaxed mb-10 max-w-[650px] font-medium opacity-80">
            {movie.description?.length > 200 ? movie.description.slice(0, 200) + '...' : movie.description}
          </p>

          <div className="flex items-center gap-5">
            <button className="btn-primary" onClick={onOpenModal}>
              <Play className="w-6 h-6 fill-current" />
              WATCH NOW
            </button>

            <button className="btn-glass flex items-center gap-2" onClick={onOpenModal}>
              <Info className="w-6 h-6" />
              VIEW DETAILS
            </button>
          </div>
        </motion.div>
      </div>
      
      {/* Floating Quality Indicator */}
      <div className="absolute bottom-32 right-[6%] flex gap-4 hidden xl:flex">
          <div className="glass p-5 rounded-2xl flex flex-col items-center">
              <span className="text-primary font-black text-2xl">4K</span>
              <span className="text-[10px] text-text-muted font-bold tracking-widest">RES</span>
          </div>
          <div className="glass p-5 rounded-2xl flex flex-col items-center">
              <span className="text-white font-black text-2xl">HDR</span>
              <span className="text-[10px] text-text-muted font-bold tracking-widest">COLOR</span>
          </div>
      </div>
    </section>
  );
};

export default Hero;

