
import React, { useState, useRef, useMemo } from 'react';
import { AppStep, InspectionData, PhotoCapture, CompletedInspection } from './types';
import { analyzeContainerRepair } from './services/geminiService';

const TEAMS = ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'];

// Tạo danh sách năm từ 2023 đến nay
const YEARS = Array.from({ length: new Date().getFullYear() - 2022 }, (_, i) => (2023 + i).toString());

const MOCK_HISTORY: CompletedInspection[] = [
  { id: '1', containerId: 'MAEU1234567', team: 'Tổ 1', timestamp: new Date().toISOString(), photoCount: 4 },
  { id: '2', containerId: 'COSU8827331', team: 'Tổ 2', timestamp: new Date(Date.now() - 86400000).toISOString(), photoCount: 3 },
  { id: '3', containerId: 'MSCU0092112', team: 'Tổ 1', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), photoCount: 5 },
  { id: '4', containerId: 'ONEU6652110', team: 'Tổ 3', timestamp: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15).toISOString(), photoCount: 2 },
  { id: '5', containerId: 'TEXU9928115', team: 'Tổ 4', timestamp: new Date().toISOString(), photoCount: 6 },
  { id: '6', containerId: 'WHSU5512330', team: 'Tổ 2', timestamp: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 5).toISOString(), photoCount: 4 },
];

const MatranLogo: React.FC<{ size?: string }> = ({ size = "h-8" }) => (
  <div className={`flex items-center gap-2 font-black italic tracking-tighter ${size === "h-8" ? "text-xl" : "text-3xl"}`}>
    <span className="text-[#0369a1]">MATRAN</span>
    <span className="text-slate-900">MNR</span>
  </div>
);

const Header: React.FC<{ onHome: () => void }> = ({ onHome }) => (
  <header className="bg-white text-slate-900 p-5 sticky top-0 z-50 shadow-md border-b-2 border-slate-100">
    <div className="flex items-center justify-between max-w-lg mx-auto">
      <div className="flex items-center gap-3 cursor-pointer" onClick={onHome}>
        <div className="w-12 h-12 bg-[#0369a1] rounded-2xl flex items-center justify-center shadow-lg shadow-sky-900/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16.5c0 .38-.21.71-.53.88l-7.97 4.43c-.16.09-.33.14-.5.14s-.34-.05-.5-.14l-7.97-4.43c-.32-.17-.53-.5-.53-.88v-9c0-.38.21-.71.53-.88l7.97-4.43c.16-.09.33-.14.5-.14s.34.05.5.14l7.97 4.43c.32.17.53.5.53.88v9z" />
          </svg>
        </div>
        <div>
          <MatranLogo />
          <p className="text-[10px] text-[#0369a1] font-black uppercase tracking-[0.2em]">Quality Control System</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trạng thái</div>
        <div className="text-[10px] text-green-600 font-black flex items-center justify-end gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          ONLINE
        </div>
      </div>
    </div>
  </header>
);

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.FORM);
  const [formData, setFormData] = useState<InspectionData>({
    containerId: '',
    team: TEAMS[0],
    timestamp: new Date().toISOString()
  });
  const [photos, setPhotos] = useState<PhotoCapture[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [history, setHistory] = useState<CompletedInspection[]>(MOCK_HISTORY);
  
  // States cho bộ lọc Report
  const [filter, setFilter] = useState<'today' | 'yesterday' | 'month' | 'lastMonth' | 'year' | 'custom'>('today');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const validateContainerId = (id: string) => {
    const clean = id.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return clean.slice(0, 11);
  };

  const filteredHistory = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    return history.filter(item => {
      const itemDate = new Date(item.timestamp);
      if (filter === 'today') return itemDate >= startOfToday;
      if (filter === 'yesterday') return itemDate >= startOfYesterday && itemDate < startOfToday;
      if (filter === 'month') return itemDate >= startOfThisMonth;
      if (filter === 'lastMonth') return itemDate >= startOfLastMonth && itemDate <= endOfLastMonth;
      if (filter === 'year') return itemDate.getFullYear().toString() === selectedYear;
      if (filter === 'custom' && customRange.start && customRange.end) {
        return itemDate >= new Date(customRange.start) && itemDate <= new Date(customRange.end + 'T23:59:59');
      }
      return filter === 'custom' ? true : false;
    });
  }, [history, filter, selectedYear, customRange]);

  const teamStats = useMemo(() => {
    return TEAMS.map(team => ({
      name: team,
      count: filteredHistory.filter(h => h.team === team).length
    }));
  }, [filteredHistory]);

  const totalCompleted = filteredHistory.length;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStep(AppStep.CAMERA);
      }
    } catch (err) {
      alert("Không thể khởi động Camera.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStep(photos.length > 0 ? AppStep.REVIEW : AppStep.FORM);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        const newPhoto: PhotoCapture = { id: Date.now().toString(), base64, status: 'analyzing' };
        setPhotos(prev => [...prev, newPhoto]);
        analyzeContainerRepair(base64).then(result => {
          setPhotos(prev => prev.map(p => p.id === newPhoto.id ? { ...p, analysis: result, status: 'done' } : p));
        });
      }
    }
  };

  const simulateUpload = async () => {
    setStep(AppStep.UPLOADING);
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(r => setTimeout(r, 100));
    }
    const finalReport: CompletedInspection = {
      ...formData,
      id: Date.now().toString(),
      photoCount: photos.length
    };
    setHistory(prev => [finalReport, ...prev]);
    setStep(AppStep.SUCCESS);
  };

  const reset = () => {
    setFormData({ containerId: '', team: TEAMS[0], timestamp: new Date().toISOString() });
    setPhotos([]);
    setStep(AppStep.FORM);
    setUploadProgress(0);
  };

  const formattedDate = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white shadow-2xl relative overflow-hidden font-sans select-none">
      <Header onHome={reset} />

      <main className="flex-1 p-6 overflow-y-auto pb-32 bg-slate-50">
        
        {/* --- STEP: FORM --- */}
        {step === AppStep.FORM && (
          <section className="space-y-10 animate-fadeIn">
            <div className="text-center py-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Mời Nhập Liệu</h2>
              <p className="text-[#0369a1] font-black text-[12px] tracking-widest uppercase mt-3">Ngày: {formattedDate} | MATRAN MNR QC</p>
            </div>

            <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-sky-900/5 border-2 border-slate-100 relative group">
              <label className="block text-sm font-black text-[#0369a1] uppercase tracking-[0.4em] mb-6 text-center">SỐ CONTAINER</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="ABCU1234567"
                  className="w-full text-5xl font-mono font-black py-12 bg-slate-50 border-b-[10px] border-[#0369a1] rounded-3xl text-center outline-none focus:bg-white focus:text-[#0369a1] transition-all uppercase placeholder:text-slate-200"
                  value={formData.containerId}
                  onChange={(e) => setFormData({...formData, containerId: validateContainerId(e.target.value)})}
                  autoFocus
                />
              </div>
              <div className="mt-8 flex justify-center items-center gap-3">
                 {[...Array(11)].map((_, i) => (
                   <div key={i} className={`h-5 w-5 rounded-full border-2 border-sky-100 ${i < formData.containerId.length ? 'bg-[#0369a1] border-[#0369a1]' : 'bg-transparent'}`}></div>
                 ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">CHỌN TỔ SỬA CHỮA</label>
              <div className="grid grid-cols-2 gap-4">
                {TEAMS.map(team => (
                  <button
                    key={team}
                    onClick={() => setFormData({...formData, team})}
                    className={`py-10 rounded-[2.5rem] text-3xl font-black transition-all border-4 flex flex-col items-center justify-center gap-1 ${
                      formData.team === team 
                      ? 'bg-[#0369a1] border-[#0369a1] text-white shadow-xl shadow-sky-900/20 scale-105' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-sky-300'
                    }`}
                  >
                    {team}
                    <span className={`text-[10px] font-black uppercase tracking-widest ${formData.team === team ? 'text-sky-200' : 'text-slate-200'}`}>MATRAN MNR</span>
                  </button>
                ))}
              </div>
            </div>

            <button 
              disabled={formData.containerId.length < 4}
              onClick={startCamera}
              className="w-full bg-[#0369a1] text-white font-black py-8 rounded-[3rem] shadow-2xl shadow-sky-900/30 text-2xl uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-30 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              MỞ CAMERA
            </button>
          </section>
        )}

        {/* --- STEP: CAMERA --- */}
        {step === AppStep.CAMERA && (
          <section className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden">
            <div className="relative flex-1">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute top-10 left-10 right-10 flex justify-between items-start pointer-events-none">
                <div className="bg-white/95 text-slate-900 p-6 rounded-[2rem] shadow-2xl border border-white/40 backdrop-blur-sm">
                  <div className="text-[10px] font-black uppercase text-[#0369a1] mb-2 tracking-widest">ĐANG NGHIỆM THU - {formattedDate}</div>
                  <div className="font-mono text-4xl font-black tracking-widest leading-none">{formData.containerId}</div>
                  <div className="text-xs font-black text-slate-500 mt-2 uppercase">BỘ PHẬN: {formData.team}</div>
                </div>
                <button onClick={stopCamera} className="bg-red-600 text-white p-6 rounded-[2rem] pointer-events-auto active:scale-90 transition-transform shadow-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="h-60 bg-neutral-950 flex flex-col items-center justify-center border-t-2 border-white/10">
               <div className="flex items-center justify-between w-full px-12">
                  <div className="w-24 h-24 rounded-3xl border-2 border-white/20 overflow-hidden bg-neutral-900 shadow-inner">
                    {photos.length > 0 && <img src={photos[photos.length-1].base64} className="w-full h-full object-cover" />}
                  </div>
                  <button onClick={capturePhoto} className="w-28 h-28 bg-white rounded-full border-[12px] border-neutral-800 shadow-2xl active:scale-90 transition-all flex items-center justify-center">
                     <div className="w-16 h-16 rounded-full border-4 border-slate-200"></div>
                  </button>
                  <button onClick={stopCamera} className="w-24 h-24 bg-[#0369a1] rounded-[2rem] flex items-center justify-center text-white shadow-2xl active:scale-90 transition-all border border-sky-400/30">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                     </svg>
                  </button>
               </div>
               <p className="text-white/20 text-[10px] font-black tracking-[0.6em] uppercase mt-8 italic">Matran MNR Intelligence Capture</p>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </section>
        )}

        {/* --- STEP: REVIEW --- */}
        {step === AppStep.REVIEW && (
          <section className="space-y-8 animate-fadeIn">
            <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border-2 border-slate-100 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">KIỂM DUYỆT</h2>
                <div className="mt-4 flex flex-col gap-2">
                   <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-3xl bg-[#0369a1] text-white px-5 py-2 rounded-2xl tracking-widest shadow-lg shadow-sky-900/20">{formData.containerId}</span>
                      <span className="text-xs font-black text-slate-500 uppercase">{formData.team}</span>
                   </div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NGÀY NGHIỆM THU: {formattedDate}</p>
                </div>
              </div>
              <button onClick={() => setStep(AppStep.FORM)} className="bg-slate-100 text-slate-700 font-black px-5 py-3 rounded-2xl text-[11px] uppercase hover:bg-slate-200 transition-colors">ĐỔI MÃ</button>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {photos.map(photo => (
                <div key={photo.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border-2 border-slate-50 group relative">
                  <img src={photo.base64} className="w-full aspect-square object-cover" />
                  <button 
                    onClick={() => setPhotos(prev => prev.filter(p => p.id !== photo.id))}
                    className="absolute top-4 right-4 bg-red-600 text-white p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-all shadow-2xl scale-75 group-hover:scale-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button onClick={startCamera} className="aspect-square border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 gap-5 hover:bg-white hover:text-[#0369a1] hover:border-[#0369a1] transition-all bg-slate-50/50">
                <div className="w-16 h-16 rounded-3xl bg-white shadow-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Chụp thêm</span>
              </button>
            </div>

            <button 
              onClick={simulateUpload}
              className="w-full bg-[#0369a1] text-white font-black py-10 rounded-[3.5rem] shadow-2xl shadow-sky-900/40 text-3xl uppercase tracking-widest flex items-center justify-center gap-5 active:scale-95 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              HOÀN TẤT GỬI
            </button>
          </section>
        )}

        {/* --- STEP: REPORTS --- */}
        {step === AppStep.REPORTS && (
          <section className="space-y-12 animate-fadeIn pb-10">
            <div className="flex flex-col items-center text-center gap-2">
              <MatranLogo size="h-12" />
              <div className="h-1.5 w-32 bg-[#0369a1] rounded-full mt-2"></div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mt-4">TRUNG TÂM BÁO CÁO</h2>
            </div>

            {/* BỘ LỌC THỜI GIAN CHUYÊN NGHIỆP */}
            <div className="bg-white p-6 rounded-[3rem] shadow-xl border-2 border-slate-100 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {id: 'today', label: 'Hôm nay'},
                  {id: 'yesterday', label: 'Hôm qua'},
                  {id: 'month', label: 'Tháng này'},
                  {id: 'lastMonth', label: 'Tháng trước'},
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id as any)}
                    className={`px-5 py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all ${
                      filter === f.id 
                      ? 'bg-[#0369a1] text-white shadow-xl shadow-sky-900/20' 
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-2">
                    <button 
                      onClick={() => setFilter('year')}
                      className={`w-full px-5 py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        filter === 'year' 
                        ? 'bg-[#0369a1] text-white' 
                        : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      Bộ Lọc Năm
                    </button>
                    {filter === 'year' && (
                      <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full bg-white border-2 border-sky-100 rounded-2xl p-3 text-lg font-black text-[#0369a1] outline-none"
                      >
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    )}
                 </div>
                 <div className="space-y-2">
                    <button 
                      onClick={() => setFilter('custom')}
                      className={`w-full px-5 py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        filter === 'custom' 
                        ? 'bg-[#0369a1] text-white' 
                        : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      Tùy Chọn Ngày
                    </button>
                    {filter === 'custom' && (
                      <div className="space-y-2 animate-fadeIn">
                        <input 
                          type="date" 
                          className="w-full bg-white border-2 border-sky-100 rounded-xl p-2 text-sm font-bold text-slate-700" 
                          onChange={(e) => setCustomRange({...customRange, start: e.target.value})}
                        />
                        <input 
                          type="date" 
                          className="w-full bg-white border-2 border-sky-100 rounded-xl p-2 text-sm font-bold text-slate-700" 
                          onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
                        />
                      </div>
                    )}
                 </div>
              </div>
            </div>

            {/* TỔNG SẢN LƯỢNG */}
            <div className="bg-[#0369a1] p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
               <div className="relative z-10 text-center">
                 <p className="text-[12px] font-black text-sky-200 uppercase tracking-[0.5em] mb-6">Tổng sản lượng đơn vị</p>
                 <div className="flex flex-col items-center">
                    <span className="text-9xl font-black text-white tracking-tighter leading-none shadow-sm">{totalCompleted}</span>
                    <span className="text-xl font-black text-sky-100 uppercase tracking-[0.3em] mt-4 italic">Container</span>
                 </div>
               </div>
            </div>

            {/* CHI TIẾT THEO TỔ */}
            <div className="bg-white rounded-[4rem] p-12 shadow-2xl border-2 border-slate-50 space-y-12">
               <div className="flex items-center justify-between border-b-2 border-slate-50 pb-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.4em]">Phân tích theo tổ</h3>
                  <div className="bg-sky-50 text-[#0369a1] text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest">MNR Quality</div>
               </div>
               
               <div className="space-y-12">
                  {teamStats.map(team => (
                    <div key={team.name} className="space-y-5">
                       <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Mã Bộ Phận</span>
                            <span className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{team.name}</span>
                          </div>
                          <div className="text-right">
                             <span className="text-5xl font-black text-[#0369a1] block leading-none">{team.count}</span>
                             <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1 inline-block">Sản lượng</span>
                          </div>
                       </div>
                       <div className="h-6 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-50 p-1">
                          <div 
                            className="h-full bg-gradient-to-r from-[#0369a1] to-sky-400 rounded-full transition-all duration-1000 shadow-lg shadow-sky-900/10"
                            style={{ width: `${totalCompleted > 0 ? (team.count / totalCompleted) * 100 : 0}%` }}
                          />
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="text-center pt-10 border-t-2 border-slate-100 opacity-40 grayscale pointer-events-none">
              <MatranLogo size="h-6" />
              <p className="text-[9px] font-black tracking-[0.6em] mt-4 text-slate-600">CERTIFIED QUALITY CONTROL LOGS</p>
            </div>
          </section>
        )}

        {/* --- STEP: UPLOADING --- */}
        {step === AppStep.UPLOADING && (
          <section className="flex flex-col items-center justify-center h-full space-y-12 py-20 animate-fadeIn">
            <div className="relative">
              <div className="w-72 h-72 border-[16px] border-slate-100 rounded-full shadow-inner" />
              <div 
                className="absolute inset-0 border-[16px] border-transparent border-t-[#0369a1] rounded-full animate-spin transition-all" 
                style={{ transform: `rotate(${uploadProgress * 3.6}deg)` }} 
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-7xl font-black text-[#0369a1] tracking-tighter leading-none">{uploadProgress}%</span>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] mt-3">Encrypting...</span>
              </div>
            </div>
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic leading-none">ĐANG ĐỒNG BỘ DỮ LIỆU</h2>
              <MatranLogo size="h-8" />
            </div>
          </section>
        )}

        {/* --- STEP: SUCCESS --- */}
        {step === AppStep.SUCCESS && (
          <section className="flex flex-col items-center justify-center h-full text-center space-y-12 py-10 px-6 animate-fadeIn">
            <div className="w-56 h-56 bg-green-500 text-white rounded-[4.5rem] flex items-center justify-center shadow-[0_30px_60px_rgba(34,197,94,0.3)] rotate-6 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-28 w-28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-6">
              <MatranLogo size="h-12" />
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">HOÀN TẤT!</h2>
              <p className="text-slate-500 font-bold px-10 text-lg leading-relaxed">Báo cáo nghiệm thu container <strong>{formData.containerId}</strong> đã được lưu trữ an toàn trên Google Drive.</p>
            </div>
            <button 
              onClick={reset}
              className="w-full bg-[#0369a1] text-white font-black py-10 rounded-[3.5rem] shadow-2xl text-3xl uppercase tracking-widest active:scale-95 transition-all"
            >
              LƯỢT KIỂM MỚI
            </button>
          </section>
        )}
      </main>

      {/* --- NAVIGATION BAR --- */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white p-6 pb-12 flex justify-around items-center z-40 rounded-t-[5rem] shadow-[0_-30px_60px_rgba(0,0,0,0.1)] border-t-2 border-slate-50">
         <button onClick={reset} className={`flex flex-col items-center gap-3 transition-all ${step === AppStep.FORM ? 'text-[#0369a1] scale-110' : 'text-slate-300'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Home</span>
         </button>
         
         <div 
           className="w-28 h-28 bg-[#0369a1] text-white rounded-[3.5rem] flex items-center justify-center -mt-28 border-[15px] border-white shadow-2xl active:scale-90 transition-all cursor-pointer shadow-sky-900/40 relative group"
           onClick={step === AppStep.FORM ? startCamera : (step === AppStep.REPORTS ? reset : simulateUpload)}
         >
            <div className="absolute inset-0 rounded-[3rem] bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d={step === AppStep.REPORTS ? "M12 4v16m8-8H4" : "M5 13l4 4L19 7"} />
            </svg>
         </div>
         
         <button onClick={() => setStep(AppStep.REPORTS)} className={`flex flex-col items-center gap-3 transition-all ${step === AppStep.REPORTS ? 'text-[#0369a1] scale-110' : 'text-slate-300'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Báo cáo</span>
         </button>
      </nav>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.7s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }
        input:focus {
          transform: scale(1.03);
          box-shadow: 0 50px 100px -20px rgba(3, 105, 161, 0.25);
        }
        select:focus {
          border-color: #0369a1;
        }
        ::-webkit-scrollbar { width: 0px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        body { -webkit-tap-highlight-color: transparent; background-color: #f8fafc; }
        input { caret-color: #0369a1; }
        input[type="date"] {
          font-family: inherit;
          appearance: none;
          outline: none;
        }
      `}</style>
    </div>
  );
}
