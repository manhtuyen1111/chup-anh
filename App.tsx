
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AppStep, InspectionData, PhotoCapture, CompletedInspection } from './types';
import { analyzeContainerRepair } from './services/geminiService';

// Hệ thống Icon nét đậm chuyên dụng cho Mobile
const Icons = {
  Camera: () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Dashboard: () => <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>,
  Settings: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Wrench: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>,
  Check: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>,
  Trash: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Plus: () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
  Filter: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>,
  Copy: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
};

const TEAMS = [
  { id: 'Tổ 1', label: 'Cơ khí/Hàn', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'Tổ 2', label: 'Cơ khí/Hàn', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'Tổ 3', label: 'Cơ khí/Hàn', color: 'text-teal-600', bg: 'bg-teal-50' },
  { id: 'Tổ 4', label: 'Cơ khí/Hàn', color: 'text-rose-600', bg: 'bg-rose-50' },
];

const SUGGESTED_PREFIXES = ['MSKU', 'MRKU', 'MRSU', 'SUDU', 'PONU', 'CAXU', 'TCNU', 'TGHU', 'HASU', 'UESU', 'MAEU'].sort();

const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var folder = DriveApp.getFolderById("ID_THU_MUC_CUA_BAN");
  var blob = Utilities.newBlob(Utilities.base64Decode(data.pdfBase64), "application/pdf", data.fileName);
  folder.createFile(blob);
  return ContentService.createTextOutput("OK");
}`;

type ReportFilter = 'today' | 'yesterday' | 'month' | 'year' | 'custom';

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.FORM);
  const [formData, setFormData] = useState<InspectionData>({
    containerId: '',
    team: TEAMS[0].id,
    timestamp: new Date().toISOString()
  });
  const [photos, setPhotos] = useState<PhotoCapture[]>([]);
  const [history, setHistory] = useState<CompletedInspection[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFlashing, setIsFlashing] = useState(false);
  const [driveScriptUrl, setDriveScriptUrl] = useState(localStorage.getItem('drive_url') || '');

  // Filtering Logic
  const [filterType, setFilterType] = useState<ReportFilter>('today');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const displayDate = useMemo(() => currentTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }), [currentTime]);
  const displayTime = useMemo(() => currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }), [currentTime]);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    return history.filter(h => {
      const hDate = new Date(h.timestamp);
      if (filterType === 'today') return hDate.toDateString() === now.toDateString();
      if (filterType === 'yesterday') {
        const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
        return hDate.toDateString() === yesterday.toDateString();
      }
      if (filterType === 'month') return hDate.getMonth() === now.getMonth() && hDate.getFullYear() === now.getFullYear();
      if (filterType === 'year') return hDate.getFullYear() === now.getFullYear();
      if (filterType === 'custom') {
        if (!customRange.start || !customRange.end) return true;
        const start = new Date(customRange.start); const end = new Date(customRange.end);
        end.setHours(23, 59, 59); return hDate >= start && hDate <= end;
      }
      return true;
    });
  }, [history, filterType, customRange]);

  const teamStats = useMemo(() => {
    return TEAMS.map(team => ({
      ...team,
      count: filteredHistory.filter(h => h.team === team.id).length
    }));
  }, [filteredHistory]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => { videoRef.current?.play(); setStep(AppStep.CAMERA); };
      }
    } catch (err: any) { alert("Lỗi camera: " + err.message); }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setStep(photos.length > 0 ? AppStep.REVIEW : AppStep.FORM);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        const newPhoto: PhotoCapture = { id: Date.now().toString(), base64, status: 'analyzing' };
        setPhotos(prev => [...prev, newPhoto]);
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 50);
        analyzeContainerRepair(base64).then(res => {
          setPhotos(p => p.map(x => x.id === newPhoto.id ? { ...x, analysis: res, status: 'done' } : x));
        });
      }
    }
  };

  const finalizeReport = async () => {
    setHistory(prev => [{ ...formData, id: Date.now().toString(), photoCount: photos.length, timestamp: new Date().toISOString() }, ...prev]);
    setStep(AppStep.SUCCESS);
  };

  const reset = () => {
    setFormData({ containerId: '', team: TEAMS[0].id, timestamp: new Date().toISOString() });
    setPhotos([]); setStep(AppStep.FORM);
  };

  const saveSettings = () => {
    localStorage.setItem('drive_url', driveScriptUrl);
    setStep(AppStep.FORM);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép mã script!");
  };

  return (
    <div className="h-screen flex flex-col max-w-lg mx-auto bg-white overflow-hidden relative shadow-2xl font-sans">
      
      {/* HEADER CAO CẤP */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
          <div className="bg-[#1e3a8a] w-10 h-10 flex items-center justify-center rounded-xl shadow-lg active:scale-90 transition-transform">
             <div className="text-white scale-75"><Icons.Check /></div>
          </div>
          <div>
            <h1 className="text-xl font-heading font-black tracking-tight text-slate-900 leading-none uppercase">Matran</h1>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1 font-heading italic">MNR Inspector</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="text-right hidden sm:block">
             <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5">{displayDate}</p>
             <p className="text-xl font-heading font-black text-slate-800 leading-none tabular-nums tracking-tighter">{displayTime}</p>
           </div>
           <button 
             onClick={() => setStep(AppStep.SETTINGS)} 
             className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 ${step === AppStep.SETTINGS ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}
           >
             <Icons.Settings />
           </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6 space-y-10 no-scrollbar scroll-smooth">
        
        {step === AppStep.FORM && (
          <div className="space-y-10 animate-fadeIn">
            {/* NHẬP MÃ CONTAINER - SIÊU TO, CÁCH CHỮ */}
            <section className="space-y-4">
              <div className="flex justify-between items-end px-1">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Mã nghiệm thu</label>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 uppercase">Container ID</span>
              </div>
              <div className="relative">
                <input 
                  type="text" placeholder="MSKU 1234567"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-10 px-4 text-6xl font-heading font-black text-slate-900 focus:bg-white focus:border-blue-400 outline-none transition-all uppercase text-center placeholder:text-slate-200 shadow-inner tracking-[0.3em] overflow-hidden"
                  value={formData.containerId}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                    setFormData({...formData, containerId: val.length > 4 ? `${val.slice(0, 4)} ${val.slice(4)}` : val});
                  }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {SUGGESTED_PREFIXES.map(pref => (
                  <button key={pref} onClick={() => setFormData({...formData, containerId: pref})} className={`py-3.5 rounded-xl text-xs font-black border-2 transition-all active:scale-95 ${formData.containerId.startsWith(pref) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}>
                    {pref}
                  </button>
                ))}
              </div>
            </section>

            {/* CHỌN TỔ - GỌN GÀNG HƠN */}
            <section className="space-y-4">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.2em] px-1">Tổ phụ trách</label>
              <div className="grid grid-cols-2 gap-3">
                {TEAMS.map(team => (
                  <button key={team.id} onClick={() => setFormData({...formData, team: team.id})} 
                    className={`p-3.5 rounded-2xl border transition-all text-left relative overflow-hidden group active:scale-95 flex items-center gap-3 ${formData.team === team.id ? 'bg-white border-slate-900 shadow-md ring-4 ring-slate-50' : 'bg-slate-50 border-transparent opacity-60'}`}>
                    <div className={`w-9 h-9 rounded-xl ${team.bg} ${team.color} flex items-center justify-center shrink-0 shadow-sm`}><Icons.Wrench /></div>
                    <div className="min-w-0">
                      <span className={`text-[13px] font-heading font-black block leading-none ${formData.team === team.id ? 'text-slate-900' : 'text-slate-400'}`}>{team.id}</span>
                      <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${formData.team === team.id ? 'text-blue-600' : 'text-slate-300'}`}>MNR Team</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <button disabled={formData.containerId.length < 11} onClick={startCamera} 
              className="w-full bg-[#1e3a8a] text-white font-heading font-black py-8 rounded-[2.5rem] shadow-xl text-2xl uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-30 border-b-8 border-blue-900">
              <Icons.Camera /> CHỤP NGHIỆM THU
            </button>
          </div>
        )}

        {step === AppStep.SETTINGS && (
          <div className="space-y-8 animate-fadeIn pb-20">
             <div className="flex items-center gap-4">
                <button onClick={() => setStep(AppStep.FORM)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl text-slate-500 active:scale-90 transition-all">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-2xl font-heading font-black text-slate-900 uppercase tracking-tighter">Cấu hình đồng bộ</h2>
             </div>

             <section className="bg-slate-50 p-6 rounded-[2.5rem] space-y-6 shadow-inner border border-slate-100">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Web App URL (Google Drive)
                  </label>
                  <input 
                    type="text" 
                    placeholder="https://script.google.com/macros/s/..." 
                    className="w-full bg-white p-5 rounded-2xl border-2 border-transparent focus:border-blue-400 outline-none text-[11px] font-mono shadow-sm"
                    value={driveScriptUrl}
                    onChange={(e) => setDriveScriptUrl(e.target.value)}
                  />
                </div>
             </section>

             {/* PHẦN HƯỚNG DẪN CHI TIẾT */}
             <section className="space-y-6">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 px-1">
                   <Icons.Dashboard /> Các bước cài đặt Drive
                </h3>
                
                <div className="space-y-4">
                   <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm relative overflow-hidden group">
                      <div className="flex gap-4">
                         <div className="w-7 h-7 bg-blue-600 text-white rounded-xl flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                         <p className="text-[12px] font-semibold text-slate-600 leading-relaxed italic">Mở script.google.com, tạo dự án mới và dán đoạn mã dưới đây:</p>
                      </div>
                      
                      {/* CODE SNIPPET BOX */}
                      <div className="mt-4 bg-slate-900 rounded-2xl p-4 relative">
                         <pre className="text-[9px] text-emerald-400 font-mono overflow-x-auto no-scrollbar leading-tight">
                            {APPS_SCRIPT_TEMPLATE}
                         </pre>
                         <button 
                            onClick={() => copyToClipboard(APPS_SCRIPT_TEMPLATE)}
                            className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/60 transition-colors"
                         >
                            <Icons.Copy />
                         </button>
                      </div>
                   </div>

                   {[
                     "Thay 'ID_THU_MUC_CUA_BAN' bằng ID thư mục Google Drive của bạn (lấy từ URL thư mục).",
                     "Nhấn 'Deploy' -> 'New Deployment' -> 'Web App'.",
                     "Phần 'Who has access' chọn 'Anyone'.",
                     "Copy URL nhận được và dán vào ô 'Web App URL' ở trên."
                   ].map((text, i) => (
                     <div key={i} className="flex gap-4 p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                        <div className="w-7 h-7 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black shrink-0">{i + 2}</div>
                        <p className="text-[12px] font-semibold text-slate-600 leading-relaxed">{text}</p>
                     </div>
                   ))}
                </div>
             </section>

             <button onClick={saveSettings} className="w-full bg-slate-900 text-white font-heading font-black py-7 rounded-[2rem] text-xl uppercase tracking-widest shadow-xl active:scale-95 transition-all">HOÀN TẤT & LƯU</button>
          </div>
        )}

        {/* PHẦN BÁO CÁO GIỮ NGUYÊN BỘ LỌC Ở TRÊN */}
        {step === AppStep.REPORTS && (
          <div className="space-y-8 animate-fadeIn pb-32">
            <section className="space-y-4 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner">
               <div className="flex items-center gap-2 px-1 text-slate-800">
                  <Icons.Filter />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Lọc báo cáo</span>
               </div>
               
               <div className="grid grid-cols-3 gap-2">
                 {(['today', 'yesterday', 'month', 'year', 'custom'] as const).map(f => (
                   <button 
                    key={f} 
                    onClick={() => setFilterType(f)} 
                    className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                   >
                     {f === 'today' ? 'Nay' : f === 'yesterday' ? 'Qua' : f === 'month' ? 'Tháng' : f === 'year' ? 'Năm' : 'Lịch'}
                   </button>
                 ))}
               </div>
            </section>

            <section className="space-y-4">
               <div className="flex justify-between items-center px-1">
                 <h2 className="text-2xl font-heading font-black text-slate-900 tracking-tighter uppercase italic">Sản lượng</h2>
                 <div className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-md font-heading">{filteredHistory.length} CONT</div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 {teamStats.map(team => (
                   <div key={team.id} className={`${team.bg} p-6 rounded-[2.5rem] border-2 ${team.border} relative overflow-hidden group shadow-sm transition-transform active:scale-95`}>
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${team.color}`}>{team.id}</span>
                        <div className={`${team.color} opacity-30 scale-75`}><Icons.Wrench /></div>
                      </div>
                      <div className="text-6xl font-heading font-black tabular-nums tracking-tighter text-slate-900 relative z-10 leading-none">{team.count}</div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-3">Công việc xong</p>
                      <div className={`absolute bottom-[-10%] right-[-10%] w-24 h-24 rounded-full opacity-10 ${team.color.replace('text', 'bg')}`}></div>
                   </div>
                 ))}
               </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1 text-slate-400">
                <Icons.Dashboard />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Danh sách chi tiết</span>
              </div>
              {filteredHistory.map(h => (
                <div key={h.id} className="bg-white p-6 rounded-[3rem] border border-slate-100 shadow-lg flex justify-between items-center active:bg-slate-50 transition-all border-l-[10px] border-l-[#1e3a8a] relative overflow-hidden">
                  <div className="flex gap-4 relative z-10">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 shadow-inner"><Icons.Camera /></div>
                    <div className="flex flex-col justify-center">
                      <h4 className="font-heading font-black text-slate-900 text-2xl tracking-[0.1em] leading-none">{h.containerId}</h4>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h.team}</span>
                        <span className="text-blue-600 font-black">•</span>
                        <span className="text-[10px] font-black text-blue-600 uppercase font-heading">{new Date(h.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 text-center min-w-[80px]">
                    <div className="text-2xl font-heading font-black text-slate-900 leading-none">{h.photoCount}</div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 italic">Ảnh QC</p>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {/* CÁC STEP KHÁC (CAMERA, REVIEW, SUCCESS) GIỮ NGUYÊN... */}
        {step === AppStep.CAMERA && (
          <div className="fixed inset-0 bg-black z-[200] flex flex-col overflow-hidden">
            <div className={`relative flex-1 transition-opacity duration-75 ${isFlashing ? 'opacity-30' : 'opacity-100'}`}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute top-10 left-6 right-6 flex justify-between items-start pointer-events-none">
                <div className="bg-black/40 backdrop-blur-2xl border border-white/20 text-white p-7 rounded-[3rem] shadow-2xl">
                  <div className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-2 font-heading">Camera Active</div>
                  <div className="font-heading text-4xl font-black tracking-[0.2em] leading-none">{formData.containerId}</div>
                  <div className="flex gap-3 mt-7">
                    <span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-bold border border-white/10">{formData.team}</span>
                    <span className="text-green-400 text-[10px] font-bold flex items-center gap-2 px-4 py-1.5 bg-green-500/10 rounded-full border border-green-500/20 backdrop-blur-md">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                        {photos.length} Captured
                    </span>
                  </div>
                </div>
                <button onClick={stopCamera} className="w-16 h-16 flex items-center justify-center bg-red-600 text-white rounded-full shadow-2xl border-4 border-white/10 active:scale-90 pointer-events-auto">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="h-64 bg-slate-950 flex items-center justify-around px-10 border-t border-white/5 shrink-0 pb-6">
              <div className="w-16 h-16 rounded-xl border border-white/10 overflow-hidden bg-slate-900 flex items-center justify-center relative shadow-inner">
                {photos.length > 0 ? <img src={photos[photos.length-1].base64} className="w-full h-full object-cover" /> : <div className="text-slate-700 text-[10px] font-black uppercase text-center tracking-widest">Wait</div>}
              </div>
              <button onClick={capturePhoto} className="w-28 h-28 bg-white rounded-full flex items-center justify-center active:scale-90 border-[14px] border-slate-900 shadow-2xl transition-all">
                <div className="w-14 h-14 rounded-full border-4 border-slate-200"></div>
              </button>
              <button onClick={stopCamera} disabled={photos.length === 0}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white active:scale-90 shadow-2xl transition-all ${photos.length > 0 ? 'bg-emerald-500' : 'bg-slate-800 opacity-20'}`}>
                <div className="scale-110"><Icons.Check /></div>
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {step === AppStep.REVIEW && (
          <div className="space-y-10 animate-fadeIn pb-20">
            <div className="bg-slate-950 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden text-center">
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.5em] mb-4 font-heading">Final Verification</p>
                <h2 className="text-5xl font-heading font-black tracking-[0.1em] text-white drop-shadow-2xl">{formData.containerId}</h2>
                <div className="flex justify-center gap-5 mt-8">
                    <span className="bg-white/10 px-5 py-2 rounded-full text-[10px] font-bold border border-white/5 uppercase tracking-widest">{formData.team}</span>
                    <span className="bg-emerald-500/20 px-5 py-2 rounded-full text-[10px] font-bold text-emerald-400 border border-emerald-500/20">{photos.length} HÌNH ẢNH</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {photos.map(p => (
                <div key={p.id} className="aspect-square bg-slate-50 rounded-[2.5rem] overflow-hidden relative shadow-md border-4 border-white active:scale-95 group transition-transform">
                  <img src={p.base64} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <button onClick={() => setPhotos(x => x.filter(a => a.id !== p.id))} className="absolute top-4 right-4 bg-red-600/90 text-white w-9 h-9 flex items-center justify-center rounded-2xl shadow-xl active:scale-90 backdrop-blur-md"><Icons.Trash /></button>
                </div>
              ))}
              <button onClick={startCamera} className="aspect-square border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 bg-slate-50 hover:bg-white active:scale-95 transition-all group">
                <Icons.Plus /><span className="text-[11px] font-black mt-3 uppercase tracking-[0.2em]">Thêm ảnh</span>
              </button>
            </div>
            <button onClick={finalizeReport} className="w-full bg-[#1e3a8a] text-white font-heading font-black py-8 rounded-[3rem] shadow-2xl text-2xl uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95 transition-all border-b-8 border-blue-900">
              LƯU NHẬT KÝ QC
            </button>
          </div>
        )}

        {step === AppStep.SUCCESS && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-16 py-10 px-10 animate-fadeIn">
            <div className="w-48 h-48 bg-emerald-50 text-emerald-500 rounded-[4rem] flex items-center justify-center shadow-2xl border-[8px] border-white ring-[15px] ring-emerald-50/50 animate-bounce">
              <div className="scale-150"><Icons.Check /></div>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-heading font-black text-slate-900 leading-tight">THÀNH CÔNG!</h2>
              <p className="text-slate-400 text-xl font-medium max-w-xs mx-auto leading-relaxed">Đã lưu cho <span className="text-slate-900 font-bold block mt-1 text-2xl tracking-widest uppercase">{formData.containerId}</span></p>
            </div>
            <button onClick={reset} className="w-full bg-slate-900 text-white font-heading font-black py-8 rounded-[2.5rem] text-2xl uppercase tracking-widest shadow-2xl active:scale-95 transition-all">TIẾP TỤC</button>
          </div>
        )}
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/98 backdrop-blur-3xl border-t border-slate-100 h-32 flex justify-around items-center px-10 z-[100] shadow-[0_-20px_50px_rgba(0,0,0,0.04)] pb-8">
         <button onClick={() => setStep(AppStep.FORM)} className={`flex flex-col items-center gap-2 transition-all flex-1 py-2 active:scale-90 ${step !== AppStep.REPORTS && step !== AppStep.SETTINGS ? 'text-slate-900' : 'text-slate-300'}`}>
            <div className={`p-4 rounded-2xl transition-all ${step !== AppStep.REPORTS && step !== AppStep.SETTINGS ? 'bg-slate-900 text-white shadow-xl shadow-slate-300 scale-110' : ''}`}>
                <Icons.Camera />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] leading-none mt-2">Nghiệm thu</span>
         </button>
         
         <div className="flex-1 flex justify-center">
            <div onClick={step === AppStep.FORM ? startCamera : (step === AppStep.REPORTS || step === AppStep.SETTINGS ? reset : (step === AppStep.CAMERA ? stopCamera : finalizeReport))} 
                className={`w-20 h-20 rounded-[2rem] flex items-center justify-center -mt-20 border-[10px] border-white shadow-[0_25px_50px_rgba(30,58,138,0.2)] cursor-pointer active:scale-90 transition-all ${step === AppStep.CAMERA ? 'bg-emerald-500 shadow-emerald-200' : 'bg-[#1e3a8a] shadow-blue-200'}`}>
                <div className="text-white scale-125"><Icons.Plus /></div>
            </div>
         </div>

         <button onClick={() => setStep(AppStep.REPORTS)} className={`flex flex-col items-center gap-2 transition-all flex-1 py-2 active:scale-90 ${step === AppStep.REPORTS ? 'text-slate-900' : 'text-slate-300'}`}>
            <div className={`p-4 rounded-2xl transition-all ${step === AppStep.REPORTS ? 'bg-slate-900 text-white shadow-xl shadow-slate-300 scale-110' : ''}`}>
                <Icons.Dashboard />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] leading-none mt-2">Báo cáo</span>
         </button>
      </nav>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        body { -webkit-tap-highlight-color: transparent; overscroll-behavior: none; position: fixed; width: 100%; height: 100%; }
        input { -webkit-user-select: auto; user-select: auto; border: none !important; }
      `}</style>
    </div>
  );
}
