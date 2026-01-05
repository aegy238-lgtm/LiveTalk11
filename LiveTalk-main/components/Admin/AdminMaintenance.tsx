import React, { useState } from 'react';
import { Eraser, AlertTriangle, Layout, Users, ShieldAlert, RotateCcw, ShieldX, UserMinus, Zap, RefreshCw } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

interface AdminMaintenanceProps {
  currentUser: any;
}

const AdminMaintenance: React.FC<AdminMaintenanceProps> = ({ currentUser }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // الوظيفة الكبرى: تطهير شامل وإعادة تنشيط
  const handleDeepSystemReset = async () => {
    const confirmMsg = '⚠️ تحذير نهائي: سيتم حذف كافة الغرف، الرسائل، الهدايا، الحسابات، والنشاطات من السيرفر تماماً لتسريع النظام. لن يتبقى سوى حسابك الحالي. هل أنت متأكد؟';
    
    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      
      // 1. حذف جميع المستخدمين باستثناء الأدمن الحالي
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(d => {
        if (d.id !== currentUser.id) batch.delete(d.ref);
      });

      // 2. تصفية كافة المجموعات الأخرى
      const collectionsToWipe = [
        'rooms',
        'private_chats',
        'lucky_bags',
        'global_announcements',
        'host_agencies',
        'gifts_events' // سجلات الأنميشن القديمة
      ];

      for (const colName of collectionsToWipe) {
        const snap = await getDocs(collection(db, colName));
        snap.forEach(d => batch.delete(d.ref));
      }

      // تنفيذ العملية
      await batch.commit();
      
      alert('✅ تمت عملية التطهير بنجاح! سيتم الآن إعادة تنشيط السيرفر وتحديث واجهتك.');
      
      // إعادة تحميل الصفحة لتنظيف الـ Cache والبدء من جديد
      window.location.href = '/'; 
    } catch (e) {
      console.error(e);
      alert('❌ فشل في عملية التطهير، تأكد من صلاحيات الإدارة.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSecurityPurge = async () => {
    if (!confirm('هل تريد حذف رتبة "مدير" من كافة الحسابات المسجلة الآن؟ ستصبح أنت المدير الوحيد للنظام.')) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const usersSnap = await getDocs(collection(db, 'users'));
      let count = 0;
      usersSnap.forEach(uDoc => {
        if (uDoc.id !== currentUser.id && uDoc.data().isAdmin === true) {
          batch.update(uDoc.ref, { isAdmin: false });
          count++;
        }
      });
      await batch.commit();
      alert(`تم سحب صلاحيات الإدارة من ${count} حساب بنجاح ✅`);
    } catch (e) {
      alert('فشل عملية التطهير الأمني');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetDailyPoints = async () => {
    if(!confirm('هل تريد تصفير الكاريزما والثروة لجميع الأعضاء (التصفير اليومي)؟')) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(uDoc => {
        batch.update(uDoc.ref, { charm: 0, wealth: 0 });
      });
      await batch.commit();
      alert('تم التصفير اليومي لجميع الأعضاء بنجاح ✅');
    } catch (e) {
      alert('فشلت عملية التصفير');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 text-right font-cairo" dir="rtl">
      {/* قسم التطهير العظيم - الجديد */}
      <div className="bg-red-600/10 border-2 border-red-600/30 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-right">
            <h3 className="text-2xl font-black text-white flex items-center justify-center md:justify-start gap-3">
              <Zap className="text-yellow-500 fill-yellow-500" /> تطهير السيرفر وإزالة التعليق
            </h3>
            <p className="text-slate-400 text-sm font-bold mt-2">
              هذا الزر يقوم بحذف كافة البيانات المتراكمة (رسائل، غرف، هدايا) التي تسبب ثقل في السيرفر. 
              <br />
              <span className="text-red-400 text-xs mt-1 block">ملاحظة: سيتم حذف كل شيء باستثناء حسابك أنت كمدير.</span>
            </p>
          </div>
          <button 
            onClick={handleDeepSystemReset}
            disabled={isProcessing}
            className="group relative px-10 py-5 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all active:scale-95 disabled:opacity-50 overflow-hidden"
          >
            <div className="flex items-center gap-3 relative z-10">
              {isProcessing ? <RefreshCw className="animate-spin" /> : <RefreshCw />}
              تطهير وتنشيط السيرفر 100%
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-6 border-t border-white/5">
        <div className="p-3 bg-indigo-600/20 rounded-2xl">
          <Eraser className="text-indigo-500" size={28} />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">أدوات الصيانة الجزئية</h3>
          <p className="text-slate-500 text-xs font-bold mt-1">تعديلات سريعة دون مسح البيانات الشامل</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* تطهير أمني */}
        <div className="bg-indigo-600/5 border border-indigo-600/20 p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-4 shadow-xl hover:bg-indigo-600/10 transition-all">
          <ShieldX size={32} className="text-indigo-500" />
          <h4 className="text-white font-black text-sm">التطهير الأمني للأدمن</h4>
          <p className="text-[10px] text-slate-500 leading-relaxed">سحب رتبة الإدارة من جميع الحسابات (إبقاء حسابك فقط).</p>
          <button 
            onClick={handleSecurityPurge} 
            disabled={isProcessing} 
            className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl text-xs shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
          >
            تطهير الآن
          </button>
        </div>

        {/* تصفير يومي */}
        <div className="bg-amber-600/5 border border-amber-600/20 p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-4 shadow-xl hover:bg-amber-600/10 transition-all">
          <RotateCcw size={32} className="text-amber-500" />
          <h4 className="text-white font-black text-sm">التصفير اليومي</h4>
          <p className="text-[10px] text-slate-500 leading-relaxed">تصفير نقاط الكاريزما والثروة لجميع الأعضاء فوراً.</p>
          <button 
            onClick={handleResetDailyPoints} 
            disabled={isProcessing} 
            className="w-full py-3 bg-amber-600 text-black font-black rounded-xl text-xs shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
          >
            تصفير الآن
          </button>
        </div>

      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-start gap-4">
        <ShieldAlert className="text-amber-500 shrink-0" size={20} />
        <div className="text-right">
          <h5 className="text-amber-500 font-black text-xs mb-1">تنبيه أمني هام</h5>
          <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
            عند تنفيذ "التطهير الشامل"، سيفقد جميع المستخدمين حساباتهم وسيتم طردهم، وسيبقى حسابك أنت فقط. استخدم هذا الخيار فقط في حالات الطوارئ أو عند رغبتك في "تصفير" التطبيق بالكامل.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminMaintenance;