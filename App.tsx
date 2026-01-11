
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AppStep, InspectionData, PhotoCapture, CompletedInspection } from './types';
import { analyzeContainerRepair } from './services/geminiService';

const TEAMS = ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'];
// Danh sách Prefix Maersk/Sealand/Hamburg Sud tiêu chuẩn - Sắp xếp ABC
const MAERSK_PREFIXES = [
  'HASU', 'MAEU', 'MRKU', 'MRSU', 'MSFU', 
  'MSKU', 'PONU', 'SEAU', 'SMLU', 'TCNU', 'TGHU'
].sort();

const APPS_SCRIPT_TEMPLATE = `// Google Apps Script để lưu ảnh vào Google Drive
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var folder = DriveApp.getFolderById("ID_THU_MUC_CUA_BAN");
  
  // Tạo cây thư mục theo cấu hình
  var subFolderName = data.path; // ví dụ: "2024-03-20/MAEU1234567"
  var parts = subFolderName.split('/');
  var currentFolder = folder;
  
  for (var i = 0; i < parts.length; i++) {
    var folders = currentFolder.getFoldersByName(parts[i]);
    if (folders.hasNext()) {
      currentFolder = folders.next();
    } else {
      currentFolder = currentFolder.createFolder(parts[i]);
    }
  }
  
  // Lưu các tệp tin
  data.photos.forEach(function(photo, index) {
    var contentType = photo.base64.split(",")[0].split(":")[1].split(";")[0];
    var bytes = Utilities.base64Decode(photo.base64.split(",")[1]);
    var blob = Utilities.newBlob(bytes, contentType, "photo_" + index + ".jpg");
    currentFolder.createFile(blob);
  });
  
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}`;

const MOCK_HISTORY: CompletedInspection[] = [
  { id: '1', containerId: 'MAEU 1234567', team: 'Tổ 1', timestamp: new Date().toISOString(), photoCount: 4 },
  { id: '2', containerId: 'MSKU 8827331', team: 'Tổ 2', timestamp: new Date(Date.now() - 86400000).toISOString(), photoCount: 3 },
  { id: '3', containerId: 'MAEU 0092112', team: 'Tổ 1', timestamp: new Date(Date.now() - 30 * 86400000).toISOString(), photoCount: 5 },
];

const Header: React.FC<{ onReset: () => void; onSettings: () => void; date: string; time: string }> = ({ onReset, onSettings, date, time }) => (
  <header className="bg-[#1e3a8a] text-white px-4 py-3 flex justify-between items-center shadow-md">
    <div className="flex items-center gap-2 cursor-pointer" onClick={onReset}>
      <div className="bg-white p-1 rounded">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1e3a8a]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16.5c0 .38-.21.71-.53.88l-7.97 4.43c-.16.09-.33.14-.5.14s-.34-.05-.5-.14l-7.97-4.43c-.32-.17-.53-.5-.53-.88v-9c0-.38.21-.71.53-.88l7.97-4.43c.16-.09.33-.14.5-.14s.34.05.5.14l7.97 4.43c.32.17.53.5.53.88v9z" />
        </svg>
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tight leading-none uppercase italic">Matran MNR</h1>
        <p className="text-[10px] opacity-70 font-medium uppercase tracking-wider">Maersk QC Engine</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-right hidden sm:block">
        <p className="text-[10px] font-bold opacity-80">{date}</p>
        <p className="text-[12px] font-mono font-bold text-sky-300">{time}</p>
      </div>
      <button onClick={onSettings} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
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
  const [driveConfig, setDriveConfig] = useState({
    folderName: 'MAERSK_MNR_REPORTS',
    pathFormat: '{DATE}/{CONT_ID}',
    autoArchive: true
  });
  
  const [photos, setPhotos] = useState<PhotoCapture[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [history, setHistory] = useState<CompletedInspection[]>(MOCK_HISTORY);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [filter, setFilter] = useState<'today' | 'yesterday' | 'month' | 'lastMonth' | 'custom'>('today');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatContainerId = (val: string) => {
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    if (raw.length > 4) {
      return `${raw.slice(0, 4)} ${raw.slice(4)}`;
    }
    return raw;
  };

  const handlePrefixClick = (prefix: string) => {
    const currentNumber = formData.containerId.replace(/[^0-9]/g, '').slice(0, 7);
    const newId = formatContainerId(prefix + currentNumber);
    setFormData({ ...formData, containerId: newId });
    
    // Tự động focus lại input và đưa con trỏ về cuối để người dùng gõ tiếp số
    setTimeout(() => {
      if (containerInputRef.current) {
        containerInputRef.current.focus();
        const length = newId.length;
        containerInputRef.current.setSelectionRange(length, length);
      }
    }, 50);
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const itemDate = new Date(item.timestamp);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      
      if (filter === 'today') return itemDate >= today;
      if (filter === 'yesterday') return itemDate >= yesterday && itemDate < today;
      if (filter === 'month') return itemDate >= startOfMonth;
      if (filter === 'lastMonth') return itemDate >= startOfLastMonth && itemDate <= endOfLastMonth;
      if (filter === 'custom') {
        if (!customRange.start || !customRange.end) return true;
        const start = new Date(customRange.start);
        const end = new Date(customRange.end);
        end.setHours(23, 59, 59, 999);
        return itemDate >= start && itemDate <= end;
      }
      return true;
    });
  }, [history, filter, customRange]);

  const teamStats = useMemo(() => {
    return TEAMS.map(team => ({
      name: team,
      count: filteredHistory.filter(h => h.team === team).length
    }));
  }, [filteredHistory]);

  const totalCompleted = useMemo(() => filteredHistory.length, [filteredHistory]);

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
    } catch (err) { alert("Lỗi Camera: Kiểm tra quyền truy cập thiết bị."); }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
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
        analyzeContainerRepair(base64).then(res => {
          setPhotos(p => p.map(x => x.id === newPhoto.id ? { ...x, analysis: res, status: 'done' } : x));
        });
      }
    }
  };

  const simulateUpload = async () => {
    setStep(AppStep.UPLOADING);
    const dateStr = new Date().toISOString().split('T')[0];
    const path = driveConfig.pathFormat
      .replace('{DATE}', dateStr)
      .replace('{CONT_ID}', formData.containerId.replace(' ', ''));
    
    setUploadStatus(`Thư mục: ${driveConfig.folderName}/${path}`);
    await new Promise(r => setTimeout(r, 800));
    
    for (let i = 0; i <= 100; i += 20) {
      setUploadProgress(i);
      if (i === 40) setUploadStatus(`Đang truyền tải ${photos.length} hình ảnh...`);
      if (i === 80) setUploadStatus(`Đang xác nhận dữ liệu Maersk Cloud...`);
      await new Promise(r => setTimeout(r, 150));
    }

    setHistory(prev => [{ ...formData, id: Date.now().toString(), photoCount: photos.length, timestamp: new Date().toISOString() }, ...prev]);
    setStep(AppStep.SUCCESS);
  };

  const reset = () => {
    setFormData({ containerId: '', team: TEAMS[0], timestamp: new Date().toISOString() });
    setPhotos([]);
    setStep(AppStep.FORM);
    setUploadProgress(0);
  };

  const displayDate = currentTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const displayTime = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#f1f5f9] text-slate-800 font-sans shadow-xl border-x border-slate-200 overflow-hidden">
      <Header onReset={reset} onSettings={() => setStep(AppStep.SETTINGS)} date={displayDate} time={displayTime} />

      <main className="flex-1 p-4 overflow-y-auto pb-24">
        
        {step === AppStep.FORM && (
          <div className="space-y-6 animate-fadeIn">
            {/* Maersk Brand Info */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#1e3a8a] animate-pulse"></span>
                Terminal: Matran MNR Engine
              </div>
              <div className="text-blue-800">Maersk QC Standard</div>
            </div>

            {/* Container ID Input with Maersk Prefixes */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Số Container (VD: MAEU 1234567)</label>
                <input 
                  ref={containerInputRef}
                  type="text" 
                  placeholder="MAEU 1234567"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-4 px-4 text-3xl font-mono font-bold text-slate-900 focus:border-[#1e3a8a] focus:bg-white outline-none transition-all uppercase text-center"
                  value={formData.containerId}
                  onChange={(e) => setFormData({...formData, containerId: formatContainerId(e.target.value)})}
                  autoFocus
                />
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Gợi ý Prefix Maersk (Sắp xếp ABC):</p>
                <div className="grid grid-cols-4 gap-2">
                  {MAERSK_PREFIXES.map(pref => (
                    <button 
                      key={pref} 
                      onClick={() => handlePrefixClick(pref)}
                      className={`px-2 py-2.5 rounded-md text-[11px] font-bold border transition-all active:scale-90 ${
                        formData.containerId.startsWith(pref) 
                        ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 shadow-sm'
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Team Selection */}
            <div className="space-y-3">
              <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider">Tổ đội nghiệm thu</label>
              <div className="grid grid-cols-2 gap-3">
                {TEAMS.map(team => (
                  <button
                    key={team}
                    onClick={() => setFormData({...formData, team})}
                    className={`relative py-5 px-4 rounded-xl border-2 font-bold text-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                      formData.team === team 
                      ? 'bg-[#1e3a8a] border-[#1e3a8a] text-white shadow-md' 
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {team}
                    {formData.team === team && (
                      <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button 
              disabled={formData.containerId.length < 11}
              onClick={startCamera}
              className="w-full bg-[#1e3a8a] text-white font-bold py-5 rounded-xl shadow-lg shadow-blue-900/20 text-xl uppercase tracking-wider flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-40 mt-4"
            >
              Tiếp tục chụp ảnh
            </button>
          </div>
        )}

        {step === AppStep.SETTINGS && (
          <div className="space-y-6 animate-fadeIn pb-10">
            <div className="flex items-center gap-3 mb-4">
               <button onClick={() => setStep(AppStep.FORM)} className="p-2 bg-slate-200 rounded-lg active:scale-90">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1.001 1.001 0 01-1.414 0l-6-6a1.001 1.001 0 010-1.414l6-6a1.001 1.001 0 111.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1.001 1.001 0 010 1.414z" clipRule="evenodd" />
                  </svg>
               </button>
               <h2 className="text-xl font-black text-[#1e3a8a] uppercase italic">Cấu hình hệ thống</h2>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 p-4 font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 1h-7A2.5 2.5 0 0 0 2 3.5v17A2.5 2.5 0 0 0 4.5 23h15a2.5 2.5 0 0 0 2.5-2.5v-12L16.5 1h-5zM15 3l5 5h-5V3z" /></svg>
                 Thông tin lưu trữ
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Tên thư mục đích (Root)</label>
                   <input 
                      type="text" 
                      className="w-full p-2.5 border border-slate-200 rounded bg-slate-50 font-mono text-sm focus:bg-white transition-all outline-none focus:border-blue-300"
                      value={driveConfig.folderName}
                      onChange={e => setDriveConfig({...driveConfig, folderName: e.target.value})}
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Cấu trúc đường dẫn (Path)</label>
                   <input 
                      type="text" 
                      className="w-full p-2.5 border border-slate-200 rounded bg-slate-50 font-mono text-sm focus:bg-white transition-all outline-none focus:border-blue-300"
                      value={driveConfig.pathFormat}
                      onChange={e => setDriveConfig({...driveConfig, pathFormat: e.target.value})}
                   />
                </div>
              </div>
            </div>

            {/* HƯỚNG DẪN CẤU HÌNH DRIVE */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-[#1e3a8a] text-white p-4 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
                <span>Hướng dẫn cấu hình Drive</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
              </div>
              <div className="p-5 space-y-4 text-[13px] leading-relaxed">
                <p>Ứng dụng sử dụng <b>Google Apps Script</b> để làm trung gian tải ảnh lên Drive:</p>
                <ol className="list-decimal pl-4 space-y-2 font-medium text-slate-600">
                  <li>Truy cập <a href="https://script.google.com" target="_blank" className="text-blue-600 underline">script.google.com</a>.</li>
                  <li>Tạo "Dự án mới" và dán mã bên dưới vào tệp <code>Code.gs</code>.</li>
                  <li>Lấy ID thư mục Drive của bạn và thay vào mã script.</li>
                  <li>Nhấn "Triển khai" -> "Tùy chọn triển khai mới" -> "Ứng dụng web".</li>
                  <li>Chọn "Ai có quyền truy cập": <b>Bất kỳ ai (Anyone)</b>.</li>
                </ol>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Mã nguồn Scripts (Copy):</label>
                  <div className="relative group">
                    <pre className="bg-slate-900 text-sky-400 p-4 rounded-lg text-[10px] overflow-x-auto border border-black max-h-60 overflow-y-auto font-mono scrollbar-thin">
                      {APPS_SCRIPT_TEMPLATE}
                    </pre>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
                        alert("Đã copy mã Script!");
                      }}
                      className="absolute top-2 right-2 bg-white/10 hover:bg-white/30 text-white px-3 py-1.5 rounded text-[9px] uppercase font-bold backdrop-blur-md transition-all active:scale-95"
                    >
                      Copy Script
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setStep(AppStep.FORM)} className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-xl shadow-lg uppercase tracking-widest text-sm">Quay lại Tác nghiệp</button>
          </div>
        )}

        {step === AppStep.CAMERA && (
          <div className="fixed inset-0 bg-black z-[100] flex flex-col">
            <div className="relative flex-1 bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
              <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
                <div className="bg-black/60 border border-white/20 text-white p-3 rounded-lg backdrop-blur-md">
                  <div className="text-[10px] font-bold opacity-70 uppercase mb-0.5">Mã số Container</div>
                  <div className="font-mono text-2xl font-bold tracking-widest">{formData.containerId}</div>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[11px] font-bold bg-[#1e3a8a] px-2 py-0.5 rounded">{formData.team}</span>
                    <span className="text-[11px] font-mono opacity-80">{displayTime}</span>
                  </div>
                </div>
                <button onClick={stopCamera} className="bg-red-600 text-white p-3 rounded-lg pointer-events-auto active:scale-90 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="h-40 bg-slate-900 flex items-center justify-around px-8">
              <div className="w-16 h-16 rounded-lg border-2 border-white/20 overflow-hidden bg-black/40 shadow-inner">
                {photos.length > 0 && <img src={photos[photos.length-1].base64} className="w-full h-full object-cover" />}
              </div>
              <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full flex items-center justify-center active:scale-95 border-[6px] border-slate-700 shadow-2xl transition-transform">
                <div className="w-14 h-14 rounded-full border-2 border-slate-200"></div>
              </button>
              <button onClick={stopCamera} className="w-16 h-16 bg-[#1e3a8a] rounded-xl flex items-center justify-center text-white active:scale-90 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {step === AppStep.REVIEW && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-5 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Xác nhận nghiệm thu</label>
                <h2 className="text-3xl font-mono font-bold text-slate-900">{formData.containerId}</h2>
                <div className="flex gap-3 mt-2">
                   <span className="text-[12px] font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded uppercase">Tổ: {formData.team}</span>
                </div>
              </div>
              <button onClick={() => setStep(AppStep.FORM)} className="text-blue-700 text-[11px] font-bold uppercase border-b border-blue-700 active:opacity-60 transition-opacity">Thay đổi</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photos.map(p => (
                <div key={p.id} className="bg-white rounded-lg overflow-hidden border border-slate-200 relative aspect-square shadow-sm">
                  <img src={p.base64} className="w-full h-full object-cover" />
                  <button onClick={() => setPhotos(x => x.filter(a => a.id !== p.id))} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-md shadow-lg active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              <button onClick={startCamera} className="aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-white transition-colors active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="text-[10px] font-bold uppercase">Chụp thêm</span>
              </button>
            </div>
            <button onClick={simulateUpload} className="w-full bg-green-600 text-white font-bold py-5 rounded-xl shadow-lg text-lg uppercase tracking-wider flex items-center justify-center gap-3 active:scale-[0.98] transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Gửi lên Google Drive
            </button>
          </div>
        )}

        {step === AppStep.UPLOADING && (
          <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fadeIn text-center py-10">
            <div className="w-48 h-48 border-[12px] border-slate-100 border-t-[#1e3a8a] rounded-full animate-spin transition-all shadow-inner" />
            <div className="space-y-4 max-w-xs w-full px-6">
              <h2 className="text-2xl font-bold text-slate-900 uppercase">Đang đồng bộ...</h2>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner">
                <div className="bg-[#1e3a8a] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p className="text-xs font-bold text-slate-500 font-mono leading-relaxed bg-white/50 p-3 rounded-lg border border-slate-100">{uploadStatus}</p>
            </div>
          </div>
        )}

        {step === AppStep.SUCCESS && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-10 py-10 px-4 animate-fadeIn">
            <div className="w-28 h-28 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner border-4 border-white animate-bounce-short">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 uppercase italic">Gửi Maersk Thành Công</h2>
              <p className="text-slate-500 text-sm">Toàn bộ hình ảnh đã được lưu vào Matran MNR Cloud.</p>
            </div>
            <button onClick={reset} className="w-full bg-[#1e3a8a] text-white font-bold py-5 rounded-xl text-lg uppercase shadow-lg active:scale-[0.98] transition-all">Lượt nghiệm thu mới</button>
          </div>
        )}

        {step === AppStep.REPORTS && (
          <div className="space-y-6 animate-fadeIn pb-10">
            <h2 className="text-2xl font-black text-[#1e3a8a] uppercase text-center flex flex-col gap-1 items-center italic">
              Trung tâm báo cáo
              <span className="w-12 h-1 bg-[#1e3a8a] rounded-full"></span>
            </h2>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                {['today', 'yesterday', 'month', 'lastMonth'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`py-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border active:scale-95 ${
                      filter === f ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 shadow-sm'
                    }`}
                  >
                    {f === 'today' ? 'Hôm nay' : f === 'yesterday' ? 'Hôm qua' : f === 'month' ? 'Tháng này' : 'Tháng trước'}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setFilter('custom')}
                className={`w-full py-3 rounded-lg text-[11px] font-bold uppercase border transition-all active:scale-95 ${filter === 'custom' ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 shadow-sm'}`}
              >
                Lọc theo khoảng ngày
              </button>

              {filter === 'custom' && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Từ ngày</label>
                      <input 
                        type="date" 
                        className="w-full p-2 border border-slate-200 rounded text-sm font-bold bg-white outline-none focus:border-[#1e3a8a]"
                        value={customRange.start}
                        onChange={e => setCustomRange({...customRange, start: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Đến ngày</label>
                      <input 
                        type="date" 
                        className="w-full p-2 border border-slate-200 rounded text-sm font-bold bg-white outline-none focus:border-[#1e3a8a]"
                        value={customRange.end}
                        onChange={e => setCustomRange({...customRange, end: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#1e3a8a] p-8 rounded-2xl text-white shadow-xl flex items-center justify-between border-4 border-white/10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
               <div className="space-y-1 relative z-10">
                  <p className="text-[12px] font-bold opacity-70 uppercase tracking-[0.2em]">Sản lượng kì này</p>
                  <h3 className="text-6xl font-black tabular-nums">{totalCompleted}</h3>
               </div>
               <div className="text-right relative z-10">
                  <p className="text-[12px] font-bold opacity-70 uppercase tracking-[0.2em]">Container</p>
               </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-10">
              <div className="bg-slate-50 border-b border-slate-200 p-4 font-bold text-xs uppercase tracking-wider text-slate-500">Hiệu suất theo tổ đội</div>
              <div className="divide-y divide-slate-100">
                {teamStats.map(team => (
                  <div key={team.name} className="p-5 flex flex-col gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-slate-800">{team.name}</span>
                      <span className="text-3xl font-mono font-bold text-[#1e3a8a] tabular-nums">{team.count}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-[#1e3a8a] transition-all duration-1000 ease-out rounded-full shadow-sm" style={{ width: `${totalCompleted > 0 ? (team.count / totalCompleted) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white flex justify-around items-center border-t border-slate-200 h-16 shadow-[0_-10px_25px_rgba(0,0,0,0.06)] z-50">
         <button onClick={reset} className={`flex flex-col items-center gap-1 transition-all flex-1 py-2 active:scale-90 ${step === AppStep.FORM ? 'text-[#1e3a8a]' : 'text-slate-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            <span className="text-[10px] font-bold uppercase tracking-tighter">Tác nghiệp</span>
         </button>
         
         <div className="flex-1 flex justify-center">
            <div onClick={step === AppStep.FORM ? startCamera : (step === AppStep.REPORTS || step === AppStep.SETTINGS ? reset : simulateUpload)} className="w-16 h-16 bg-[#1e3a8a] text-white rounded-full flex items-center justify-center -mt-10 border-8 border-[#f1f5f9] shadow-2xl cursor-pointer active:scale-90 transition-transform ring-4 ring-white/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={step === AppStep.REPORTS || step === AppStep.SETTINGS ? "M12 4v16m8-8H4" : (step === AppStep.FORM ? "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" : "M5 13l4 4L19 7")} />
                </svg>
            </div>
         </div>

         <button onClick={() => setStep(AppStep.REPORTS)} className={`flex flex-col items-center gap-1 transition-all flex-1 py-2 active:scale-90 ${step === AppStep.REPORTS ? 'text-[#1e3a8a]' : 'text-slate-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
            <span className="text-[10px] font-bold uppercase tracking-tighter">Báo cáo</span>
         </button>
      </nav>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceShort { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-bounce-short { animation: bounceShort 1s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        body { -webkit-tap-highlight-color: transparent; background-color: #f8fafc; overflow-x: hidden; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
      `}</style>
    </div>
  );
}
