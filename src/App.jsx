import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route, NavLink, useNavigate, useLocation } from "react-router-dom";
import Intro from "./components/Intro";
import FamilyTree from "./components/FamilyTree";
import Memorial from "./components/Memorial";
import Admin from "./components/Admin";
import MemberModal from "./components/MemberModal";
import SoundPlayer from "./components/SoundPlayer";

import { User, Menu, X } from "lucide-react";
import { exportToExcel } from "./utils/excelHelper";
import { 
  dbGetMembers, 
  dbGetTributes, 
  dbSaveMember, 
  dbDeleteMember, 
  dbSaveTribute, 
  dbImportData 
} from "./firebase";

// ─── Inner app that has access to router hooks ───────────────────────────────
function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();

  const [members, setMembers] = useState([]);
  const [tributes, setTributes] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const logoUrl = "/logo.webp";

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Clean up Zalo tracking query parameter (gidzl) from URL
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has("gidzl")) {
        urlParams.delete("gidzl");
        const newSearch = urlParams.toString();
        const cleanSearch = newSearch ? `?${newSearch}` : "";
        const cleanUrl = window.location.pathname + cleanSearch + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.error("Error cleaning URL:", e);
    }
  }, []);

  // 1. Load Data from Firestore
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const dbMembers = await dbGetMembers();
        const dbTributes = await dbGetTributes();
        
        // Sort members by ID for consistency
        setMembers(dbMembers.sort((a, b) => a.id - b.id));
        setTributes(dbTributes);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu từ Firestore:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // 2. CRUD Operations with Firestore
  const addMember = async (payload) => {
    try {
      const newId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
      const newMember = { ...payload, id: newId };
      
      // Save new member
      await dbSaveMember(newMember);
      
      let updated = [...members, newMember];
      
      // Handle spouse link update on Firestore if spouseId is provided
      if (payload.spouseId) {
        const spouseIdx = updated.findIndex(m => m.id === payload.spouseId);
        if (spouseIdx !== -1) {
          const updatedSpouse = { ...updated[spouseIdx], spouseId: newId };
          updated[spouseIdx] = updatedSpouse;
          await dbSaveMember(updatedSpouse);
        }
      }
      
      setMembers(updated);
    } catch (err) {
      console.error("Lỗi khi thêm thành viên:", err);
      alert("Đã xảy ra lỗi khi thêm thành viên lên Firestore:\nChi tiết: " + (err.message || err.toString()));
    }
  };

  const updateMember = async (id, payload) => {
    try {
      const oldMember = members.find(m => m.id === id);
      if (!oldMember) return;

      const updatedMember = { ...oldMember, ...payload };
      await dbSaveMember(updatedMember);

      let updated = members.map(m => (m.id === id ? updatedMember : m));
      const oldSpouseId = oldMember.spouseId;
      const newSpouseId = payload.spouseId;

      if (oldSpouseId !== newSpouseId) {
        if (oldSpouseId) {
          const oldSpouseIdx = updated.findIndex(m => m.id === oldSpouseId);
          if (oldSpouseIdx !== -1) {
            const updatedOldSpouse = { ...updated[oldSpouseIdx], spouseId: null };
            updated[oldSpouseIdx] = updatedOldSpouse;
            await dbSaveMember(updatedOldSpouse);
          }
        }
        if (newSpouseId) {
          const newSpouseIdx = updated.findIndex(m => m.id === newSpouseId);
          if (newSpouseIdx !== -1) {
            const updatedNewSpouse = { ...updated[newSpouseIdx], spouseId: id };
            updated[newSpouseIdx] = updatedNewSpouse;
            await dbSaveMember(updatedNewSpouse);
          }
        }
      }

      setMembers(updated);
      if (selectedMember && selectedMember.id === id) {
        setSelectedMember({ ...selectedMember, ...payload });
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật thông tin thành viên:", err);
      alert("Đã xảy ra lỗi khi cập nhật thông tin thành viên lên Firestore:\nChi tiết: " + (err.message || err.toString()));
    }
  };

  const deleteMember = async (id) => {
    try {
      await dbDeleteMember(id);

      let updated = members.filter(m => m.id !== id);
      const affectedDocs = [];

      updated = updated.map(m => {
        let clean = { ...m };
        let modified = false;
        if (clean.fatherId === id) {
          clean.fatherId = null;
          modified = true;
        }
        if (clean.motherId === id) {
          clean.motherId = null;
          modified = true;
        }
        if (clean.spouseId === id) {
          clean.spouseId = null;
          modified = true;
        }
        if (modified) {
          affectedDocs.push(clean);
        }
        return clean;
      });

      // Update all affected relationships on Firestore
      for (const doc of affectedDocs) {
        await dbSaveMember(doc);
      }

      setMembers(updated);
      if (selectedMember && selectedMember.id === id) {
        setSelectedMember(null);
      }
    } catch (err) {
      console.error("Lỗi khi xóa thành viên:", err);
      alert("Đã xảy ra lỗi khi xóa thành viên khỏi Firestore:\nChi tiết: " + (err.message || err.toString()));
    }
  };

  // 3. Tributes
  const addTribute = async (newTribute) => {
    try {
      await dbSaveTribute(newTribute);
      setTributes([newTribute, ...tributes]);
    } catch (err) {
      console.error("Lỗi khi thêm lời tri ân:", err);
      alert("Đã xảy ra lỗi khi lưu lời tri ân lên Firestore:\nChi tiết: " + (err.message || err.toString()));
    }
  };

  const resetToDefault = async () => {
    try {
      if (window.confirm("Bạn có chắc chắn muốn XÓA HOÀN TOÀN toàn bộ dữ liệu trên hệ thống Firestore?")) {
        await dbImportData([], []);
        setMembers([]);
        setTributes([]);
        alert("Đã xóa sạch toàn bộ dữ liệu trên Firestore.");
      }
    } catch (err) {
      console.error("Lỗi khi reset/xóa dữ liệu:", err);
      alert("Đã xảy ra lỗi khi xóa dữ liệu trên Firestore:\nChi tiết: " + (err.message || err.toString()));
    }
  };

  const exportData = () => {
    exportToExcel(members, tributes);
  };

  const importData = async (data) => {
    try {
      let importedMembers = [];
      let importedTributes = [];

      if (data && Array.isArray(data.members)) {
        importedMembers = data.members;
        if (Array.isArray(data.tributes)) {
          importedTributes = data.tributes;
        }
      } else if (Array.isArray(data)) {
        importedMembers = data;
      } else {
        return false;
      }

      // Sync imported data to Firestore (which wipes old documents in these collections first)
      await dbImportData(importedMembers, importedTributes);

      setMembers(importedMembers);
      setTributes(importedTributes);
      return true;
    } catch (err) {
      console.error("Lỗi khi nhập dữ liệu Excel:", err);
      alert("Đã xảy ra lỗi khi lưu dữ liệu nhập Excel lên Firestore:\nChi tiết: " + (err.message || err.toString()));
      return false;
    }
  };

  const isTreeRoute = location.pathname === "/tree";
  const showFooter = !isTreeRoute;

  // Shared nav link style helper
  const navLinkClass = ({ isActive }) =>
    `transition-colors py-1 hover:text-gold-accent ${
      isActive ? "text-gold-accent font-semibold border-b-2 border-gold-accent" : ""
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `text-left py-2 text-sm ${isActive ? "text-gold-accent font-semibold" : ""}`;

  return (
    <div className="min-h-screen bg-paper-base text-charcoal antialiased flex flex-col justify-between">

      {/* PERSISTENT HEADER */}
      <header className="bg-wood-dark text-paper-base border-b border-gold-accent/30 py-4 px-6 md:px-12 flex items-center justify-between shadow-md z-30 select-none font-sans sticky top-0">

        {/* Left: Branding */}
        <div onClick={() => navigate("/")} className="flex items-center gap-3 cursor-pointer">
          <span className="font-display font-bold text-lg md:text-2xl text-gold-accent tracking-wide">
            Hoàng Đình Gia Phả
          </span>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-sans text-paper-dark">
          <NavLink to="/" end className={navLinkClass}>Trang Chủ</NavLink>
          <NavLink to="/tree" className={navLinkClass}>Cây Gia Phả</NavLink>
          <NavLink to="/memorial" className={navLinkClass}>Điện Thờ</NavLink>
          <NavLink to="/admin" className={navLinkClass}>Quản Trị</NavLink>
        </nav>

        {/* Right: profile icon & hamburger */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="w-8 h-8 rounded-full border border-gold-accent/40 bg-wood-medium/45 flex items-center justify-center cursor-pointer hover:border-gold-accent text-gold-accent transition-all"
            title="Quản trị"
          >
            <User className="w-4 h-4" />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 rounded text-paper-base hover:bg-wood-medium transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </header>

      {/* MOBILE DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-[65px] left-0 w-full bg-wood-dark border-b border-gold-accent/30 z-35 font-sans px-6 py-4 flex flex-col gap-4 text-paper-base shadow-lg animate-fadeIn">
          <NavLink to="/" end className={mobileNavLinkClass}>Trang Chủ</NavLink>
          <NavLink to="/tree" className={mobileNavLinkClass}>Cây Gia Phả</NavLink>
          <NavLink to="/memorial" className={mobileNavLinkClass}>Điện Thờ</NavLink>
          <NavLink to="/admin" className={mobileNavLinkClass}>Quản Trị</NavLink>
        </div>
      )}

      {/* MAIN VIEW CONTENT */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Intro setView={(v) => navigate(`/${v === "intro" ? "" : v}`)} logoUrl={logoUrl} />} />
          <Route path="/tree" element={
            <FamilyTree
              members={members}
              setView={(v) => navigate(`/${v === "intro" ? "" : v}`)}
              onSelectMember={setSelectedMember}
              exportData={exportData}
              importData={importData}
              resetToDefault={resetToDefault}
            />
          } />
          <Route path="/memorial" element={
            <Memorial
              members={members}
              onSelectMember={setSelectedMember}
              tributes={tributes}
              addTribute={addTribute}
              logoUrl={logoUrl}
            />
          } />
          <Route path="/admin" element={
            <Admin
              members={members}
              setView={(v) => navigate(`/${v === "intro" ? "" : v}`)}
              addMember={addMember}
              updateMember={updateMember}
              deleteMember={deleteMember}
              resetToDefault={resetToDefault}
              exportData={exportData}
              importData={importData}
            />
          } />
          {/* Catch-all → home */}
          <Route path="*" element={<Intro setView={(v) => navigate(`/${v === "intro" ? "" : v}`)} logoUrl={logoUrl} />} />
        </Routes>
      </main>

      {/* PERSISTENT FOOTER */}
      {showFooter && (
        <footer className="w-full bg-[#2D2926] text-paper-dark border-t border-gold-accent/20 py-8 px-6 md:px-12 font-sans select-text mt-auto">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

            <div className="space-y-3">
              <h4 className="font-display font-bold text-lg text-gold-accent tracking-wide">Hoàng Đình Tộc</h4>
              <p className="text-xs text-paper-dark/70 leading-relaxed">
                Giữ gìn cội nguồn, phát huy truyền thống, gắn kết muôn đời con cháu Hoàng Đình.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-display font-bold text-base text-gold-accent tracking-wide">Thông Tin Liên Hệ</h4>
              <p className="text-xs text-paper-dark/80 leading-relaxed">
                Hoàng Đình Huy - <a href="tel:0966780188" className="hover:text-gold-accent transition-colors">0966780188</a>
              </p>
              <p className="text-xs text-paper-dark/70">
                <a href="https://zalo.me/0966780188" target="_blank" rel="noopener noreferrer" className="hover:text-gold-accent transition-colors underline decoration-gold-accent/30 underline-offset-2">
                  Nhắn tin qua Zalo
                </a>
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-display font-bold text-base text-gold-accent tracking-wide">Bản Quyền</h4>
              <p className="text-xs text-paper-dark/60 leading-normal">
                © 2024 Hoàng Đình Tộc. All rights reserved. Phát triển bởi Ban Thông tin Truyền thông họ Hoàng Đình.
              </p>
            </div>

          </div>
        </footer>
      )}

      {/* Profile detail modal */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          allMembers={members}
          onClose={() => setSelectedMember(null)}
          onSelectMember={(m) => {
            const found = members.find(item => item.id === m.id);
            setSelectedMember(found || m);
          }}
        />
      )}


    </div>
  );
}

// ─── Root export wrapped with HashRouter ─────────────────────────────────────
export default function App() {
  return (
    <HashRouter>
      <AppInner />
    </HashRouter>
  );
}
