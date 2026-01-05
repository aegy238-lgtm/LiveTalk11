
import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { User, GiftDisplaySize } from '../../types';

interface GiftEvent {
  id: string;
  giftId: string;
  giftName: string;
  giftIcon: string;
  giftAnimation: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  recipientIds: string[];
  quantity: number;
  duration?: number;
  displaySize?: GiftDisplaySize;
  timestamp: any;
}

interface GiftAnimationLayerProps {
  roomId: string;
  speakers: User[];
  currentUserId: string;
}

export const GiftAnimationLayer = forwardRef((props: GiftAnimationLayerProps, ref) => {
  const { roomId, currentUserId } = props;
  const [activeAnimations, setActiveAnimations] = useState<GiftEvent[]>([]);
  const playedIds = useRef(new Set<string>());

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov|m4v)$/i) || url.includes('video');
  };

  const triggerAnimation = (event: GiftEvent) => {
    if (playedIds.current.has(event.id)) return;
    playedIds.current.add(event.id);

    setActiveAnimations(prev => [...prev, event]);
    
    const displayDuration = (event.duration || 5) * 1000;
    
    setTimeout(() => {
      setActiveAnimations(prev => prev.filter(a => a.id !== event.id));
      setTimeout(() => playedIds.current.delete(event.id), 5000);
    }, displayDuration);
  };

  useImperativeHandle(ref, () => ({
    trigger: (event: GiftEvent) => triggerAnimation(event)
  }));

  useEffect(() => {
    const q = query(
      collection(db, 'rooms', roomId, 'gift_events'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const newEvent = { id: change.doc.id, ...data } as GiftEvent;
          if (newEvent.senderId === currentUserId) return;
          const now = Date.now();
          const eventTime = data.timestamp?.toMillis ? data.timestamp.toMillis() : now;
          if (now - eventTime < 10000) {
            triggerAnimation(newEvent);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [roomId, currentUserId]);

  const getSizeClass = (size?: GiftDisplaySize) => {
    switch (size) {
      case 'small': return 'w-32 h-32';
      case 'medium': return 'w-64 h-64';
      case 'large': return 'w-[85vw] h-[85vw]';
      case 'full': return 'w-screen h-screen fixed inset-0';
      case 'max': return 'w-screen h-screen fixed inset-0'; // المقاس الفائق يملأ الإطار بالكامل
      default: return 'w-64 h-64';
    }
  };

  const renderGiftContent = (icon: string, displaySize: GiftDisplaySize = 'medium') => {
    if (!icon) return null;
    
    const isFull = displaySize === 'full' || displaySize === 'max';
    // في المقاس الفائق نستخدم object-cover لملء الشاشة تماماً
    const objectFit = displaySize === 'max' ? 'object-cover' : 'object-contain';

    if (isVideoUrl(icon)) {
      return (
        <video 
          src={icon} 
          autoPlay 
          playsInline 
          // تم إزالة muted لضمان خروج الصوت
          className={`w-full h-full ${objectFit}`}
        />
      );
    }

    const isImage = icon.includes('http') || icon.includes('data:image') || icon.includes('base64');
    if (isImage) {
      return (
        <img 
          src={icon} 
          className={`w-full h-full ${objectFit} ${isFull ? '' : 'drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]'}`} 
          alt="" 
        />
      );
    }
    return <span className={`${isFull ? 'text-[200px]' : 'text-8xl'} drop-shadow-2xl`}>{icon}</span>;
  };

  return (
    <div className="absolute inset-0 z-[800] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {activeAnimations.map((event) => {
          const isNone = event.giftAnimation === 'none';
          const isVideo = isVideoUrl(event.giftIcon);
          const displaySize = event.displaySize || 'medium';
          const isFull = displaySize === 'full' || displaySize === 'max' || event.giftAnimation === 'full-screen';
          
          const sizeClass = getSizeClass(displaySize);
          const duration = event.duration || 5;
          
          return (
            <motion.div 
              key={event.id}
              initial={{ opacity: 0, scale: (isNone || isVideo || isFull) ? 1 : 0.8, y: (isNone || isVideo || isFull) ? 0 : 100 }}
              animate={(isNone || isVideo || isFull) ? {
                opacity: [0, 1, 1, 0],
                scale: 1,
                y: 0
              } : {
                opacity: [0, 1, 1, 0],
                scale: [0.8, 1.2, 1.2, 1.4],
                y: [50, 0, 0, -50]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration, ease: "linear" }}
              className={`absolute inset-0 flex flex-col items-center justify-center ${isFull ? 'z-[1000]' : 'z-[800]'}`}
            >
              <div className={`relative ${sizeClass} flex items-center justify-center overflow-hidden`}>
                 <div className="relative z-10 w-full h-full flex items-center justify-center">
                    {renderGiftContent(event.giftIcon, displaySize)}
                 </div>
                 
                 {!isFull && !isVideo && !isNone && event.quantity > 1 && (
                    <motion.div 
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="absolute -right-4 top-1/4 bg-gradient-to-b from-yellow-400 to-orange-600 text-white font-black text-4xl px-3 py-1 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border-2 border-white/20 italic z-20"
                    >
                       X{event.quantity}
                    </motion.div>
                 )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

export default GiftAnimationLayer;
