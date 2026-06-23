import React from "react";
import { GitFork, HeartHandshake, ShieldAlert } from "lucide-react";

export default function Intro({ setView, logoUrl }) {
  return (
    <div className="min-h-screen bg-paper-base bronze-drum-bg flex flex-col items-center justify-center px-4 py-12 md:py-20 font-sans">
      
      {/* Container holding the scroll and logo */}
      <div className="w-full max-w-4xl bg-paper-light border-2 border-gold-accent/40 rounded-lg p-6 md:p-12 shadow-xl relative overflow-hidden flex flex-col items-center">
        
        {/* Decorative corner borders */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold-accent"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gold-accent"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gold-accent"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold-accent"></div>

        {/* Family Logo */}
        <div className="w-36 h-36 md:w-44 md:h-44 mb-6 rounded-full border border-gold-accent/30 p-2 bg-paper-base shadow-md flex items-center justify-center">
          <img
            src={logoUrl || "/assets/logo.png"}
            alt="Logo họ Hoàng Đình"
            className="w-full h-full object-contain rounded-full"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=200&auto=format&fit=crop"; // Fallback beautiful art
            }}
          />
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-wood-dark tracking-wide leading-tight">
            Gia Phả Họ Hoàng Đình
          </h1>
          <div className="flex items-center justify-center gap-2 my-3">
            <span className="w-12 h-[1px] bg-gold-accent"></span>
            <span className="text-xs md:text-sm font-display text-gold-accent italic tracking-widest font-semibold uppercase">
              Uống Nước Nhớ Nguồn · Mộc Bản Gia Phong
            </span>
            <span className="w-12 h-[1px] bg-gold-accent"></span>
          </div>
        </div>

        {/* Editorial Scroll Info */}
        <div className="w-full max-w-2xl bg-paper-base border border-gold-accent/15 rounded-lg p-5 md:p-8 shadow-xs text-charcoal/90 text-sm md:text-base leading-relaxed text-justify mb-10">
          <h3 className="font-display font-bold text-center text-lg md:text-xl text-wood-dark mb-4 border-b border-gold-accent/20 pb-2">
            Lời Tựa & Lịch Sử Dòng Họ
          </h3>
          <p className="mb-4">
            Dòng họ Hoàng Đình vốn có nguồn gốc sâu xa từ vùng đất học Nghệ An – Hà Tĩnh, nơi sinh dưỡng nhiều bậc khoa bảng trung thần. Trải qua bao biến thiên lịch sử, từ triều Nguyễn cho đến các cuộc kháng chiến giữ nước vĩ đại, con cháu họ Hoàng Đình luôn nêu cao tinh thần hiếu học, cần cù lao động và kiên cường bảo vệ tổ quốc.
          </p>
          <p>
            Quyển gia phả số hóa này được xây dựng nhằm ghi chép chưa đầy đủ phả hệ dòng họ, tôn vinh những đóng góp của tổ tiên và là nhịp cầu kết nối tình đoàn kết, tương trợ lẫn nhau giữa các thành viên. Kính mong các cụ, các bác, các cô chú cùng toàn thể anh chị em trong họ tiếp tục đóng góp tư liệu để trang gia phả dòng họ ngày càng hoàn thiện, lưu truyền vạn thế.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          
          {/* Card 1: Family Tree */}
          <button
            onClick={() => setView("tree")}
            className="flex flex-col items-center text-center p-5 bg-paper-base border border-gold-accent/30 rounded-lg hover:border-gold-accent hover:bg-wood-dark hover:text-paper-light transition-all duration-300 shadow-xs hover:shadow-lg group"
          >
            <div className="w-10 h-10 rounded-full bg-gold-accent/10 flex items-center justify-center mb-3 group-hover:bg-gold-accent/20 transition-all">
              <GitFork className="w-5 h-5 text-gold-accent" />
            </div>
            <h4 className="font-display font-semibold text-lg mb-1">Cây Gia Phả</h4>
            <p className="text-xs text-charcoal/60 group-hover:text-paper-dark">
              Xem sơ đồ trực hệ các đời, tìm kiếm thông tin và tiểu sử từng thành viên.
            </p>
          </button>

          {/* Card 2: Virtual Altar */}
          <button
            onClick={() => setView("memorial")}
            className="flex flex-col items-center text-center p-5 bg-paper-base border border-gold-accent/30 rounded-lg hover:border-gold-accent hover:bg-wood-dark hover:text-paper-light transition-all duration-300 shadow-xs hover:shadow-lg group"
          >
            <div className="w-10 h-10 rounded-full bg-gold-accent/10 flex items-center justify-center mb-3 group-hover:bg-gold-accent/20 transition-all">
              <HeartHandshake className="w-5 h-5 text-gold-accent" />
            </div>
            <h4 className="font-display font-semibold text-lg mb-1">Thắp Nhang Online</h4>
            <p className="text-xs text-charcoal/60 group-hover:text-paper-dark">
              Tưởng niệm tổ tiên, thắp nhang dâng quả, ghi lại những lời tri ân thành kính.
            </p>
          </button>

          {/* Card 3: Admin Management */}
          <button
            onClick={() => setView("admin")}
            className="flex flex-col items-center text-center p-5 bg-paper-base border border-gold-accent/30 rounded-lg hover:border-gold-accent hover:bg-wood-dark hover:text-paper-light transition-all duration-300 shadow-xs hover:shadow-lg group"
          >
            <div className="w-10 h-10 rounded-full bg-gold-accent/10 flex items-center justify-center mb-3 group-hover:bg-gold-accent/20 transition-all">
              <ShieldAlert className="w-5 h-5 text-gold-accent" />
            </div>
            <h4 className="font-display font-semibold text-lg mb-1">Quản Trị Gia Phả</h4>
            <p className="text-xs text-charcoal/60 group-hover:text-paper-dark">
              Thêm mới thành viên, sửa dữ liệu đời trước và sao lưu/khôi phục tệp gia phả.
            </p>
          </button>

        </div>

      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-charcoal/40 text-xs">
        <p>© 2026 Dòng họ Hoàng Đình Việt Nam · Thiết kế số hóa tôn nghiêm</p>
      </div>

    </div>
  );
}
