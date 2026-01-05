
import { db } from './firebase';
import { doc, updateDoc, increment, writeBatch, arrayUnion } from 'firebase/firestore';

/**
 * محرك الاقتصاد الموحد - بوبو لايف (V4 - المحسن لتقليل ضغط الشبكة)
 * تم تعديله ليعتمد على Optimistic UI وتحديثات Debounced لمنع أخطاء Resource Exhausted
 */

export const EconomyEngine = {
  
  // 1. صرف كوينز (هدايا، ألعاب، متجر)
  spendCoins: (userId: string, currentCoins: number, currentWealth: number, amount: number, currentOwnedItems: string[], itemId: string | null, updateLocalState: (data: any) => void) => {
    if (amount <= 0 || currentCoins < amount) return false;
    
    // حساب فوري للقيم الجديدة
    const newCoins = Number(currentCoins) - Number(amount);
    const newWealth = Number(currentWealth || 0) + Number(amount);
    
    const updateData: any = {
      coins: newCoins,
      wealth: newWealth
    };

    if (itemId) {
      updateData.ownedItems = [...(currentOwnedItems || []), itemId];
    }

    // تحديث الواجهة فوراً عبر دالة handleUpdateUser التي تستخدم Debouncing داخلياً
    updateLocalState(updateData);

    return true;
  },

  // 2. استقبال هدايا (يتم استدعاؤها للمرسل إليه)
  receiveGift: (recipientId: string, currentDiamonds: number, currentCharm: number, amount: number, updateLocalState: (data: any) => void) => {
    const newDiamonds = Number(currentDiamonds || 0) + Number(amount);
    const newCharm = Number(currentCharm || 0) + Number(amount);

    updateLocalState({
      diamonds: newDiamonds,
      charm: newCharm
    });
    // ملاحظة: updateLocalState هنا يجب أن تكون مرتبطة بـ handleUpdateUser للطرف الآخر أو تحديث Firestore المباشر
    // في حالة استقبال الهدية عبر طرف ثالث، يفضل استخدام Firestore increment مباشرة لضمان الدقة
    (async () => {
      try {
        await updateDoc(doc(db, 'users', recipientId), {
          charm: increment(amount),
          diamonds: increment(amount)
        });
      } catch (e) {}
    })();
  },

  // 3. استبدال الألماس بكوينز
  exchangeDiamonds: (userId: string, currentCoins: number, currentDiamonds: number, amount: number, updateLocalState: (data: any) => void) => {
    if (currentDiamonds < amount) return false;
    
    const coinsGained = Math.floor(amount * 0.5);
    const newCoins = Number(currentCoins) + Number(coinsGained);
    const newDiamonds = Number(currentDiamonds) - Number(amount);
    
    updateLocalState({
      coins: newCoins,
      diamonds: newDiamonds
    });

    return true;
  },

  // 4. شحن وكالة
  agencyTransfer: (agentId: string, currentAgentBalance: number, targetId: string, currentTargetCoins: number, currentTargetPoints: number, amount: number, updateLocalState: (agentData: any, targetData: any) => void) => {
    const newAgentBalance = Number(currentAgentBalance) - Number(amount);
    const newTargetCoins = Number(currentTargetCoins) + Number(amount);
    const newTargetPoints = Number(currentTargetPoints) + Number(amount);

    updateLocalState(
      { agencyBalance: newAgentBalance },
      { coins: newTargetCoins, rechargePoints: newTargetPoints }
    );

    // عمليات الوكالة نتركها بـ Batch واحد لأنها غير متكررة وبحاجة لدقة عالية
    (async () => {
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', agentId), { agencyBalance: increment(-amount) });
        batch.update(doc(db, 'users', targetId), { 
          coins: increment(amount), 
          rechargePoints: increment(amount) 
        });
        await batch.commit();
      } catch (e) {}
    })();

    return true;
  }
};
