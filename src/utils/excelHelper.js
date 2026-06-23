import * as XLSX from "xlsx";

export const parseExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        
        // Parse Members
        const memberSheet = workbook.Sheets["Thành viên"];
        if (!memberSheet) {
          reject(new Error("Không tìm thấy trang dữ liệu 'Thành viên' trong file Excel."));
          return;
        }
        const rawMembers = XLSX.utils.sheet_to_json(memberSheet);
        
        // Parse Tributes
        const tributeSheet = workbook.Sheets["Lời tri ân"];
        const rawTributes = tributeSheet ? XLSX.utils.sheet_to_json(tributeSheet) : [];
        
        // Map excel columns to member fields
        const members = rawMembers.map((row) => ({
          id: parseInt(row["ID"]) || 0,
          name: String(row["Họ và Tên"] || "").trim(),
          gender: String(row["Giới tính"] || "Nam").trim(),
          generation: parseInt(row["Thế hệ (Đời)"]) || 1,
          birthDate: String(row["Năm sinh"] ?? "").trim(),
          deathDate: String(row["Năm mất"] ?? "").trim(),
          isDeceased: String(row["Đã mất"] || "").trim() === "Đúng" || row["Đã mất"] === true,
          birthPlace: String(row["Nơi sinh"] ?? "").trim(),
          livingPlace: String(row["Nơi sống"] ?? "").trim(),
          deathPlace: String(row["Nơi mất"] ?? "").trim(),
          burialPlace: String(row["Nơi an táng"] ?? "").trim(),
          biography: String(row["Tiểu sử & Sự nghiệp"] ?? "").trim(),
          fatherId: row["ID Cha"] ? parseInt(row["ID Cha"]) : null,
          motherId: row["ID Mẹ"] ? parseInt(row["ID Mẹ"]) : null,
          spouseId: row["ID Vợ/Chồng"] ? parseInt(row["ID Vợ/Chồng"]) : null,
          avatar: String(row["Liên kết Ảnh đại diện (URL)"] ?? "").trim()
        })).filter(m => m.id > 0 && m.name !== "");

        const tributes = rawTributes.map((row) => ({
          id: row["ID"] || `trib_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          name: String(row["Người gửi"] || "").trim(),
          relation: String(row["Quan hệ"] ?? "").trim(),
          content: String(row["Nội dung"] || "").trim(),
          date: String(row["Ngày gửi"] ?? "").trim(),
          avatar: String(row["Ảnh đại diện"] ?? "").trim()
        })).filter(t => t.name !== "" && t.content !== "");

        resolve({ members, tributes });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const exportToExcel = (members, tributes = []) => {
  // Map members to Excel structure
  const memberRows = members.map((m) => ({
    "ID": m.id,
    "Họ và Tên": m.name,
    "Giới tính": m.gender,
    "Thế hệ (Đời)": m.generation,
    "Năm sinh": m.birthDate || "",
    "Năm mất": m.deathDate || "",
    "Đã mất": m.isDeceased ? "Đúng" : "Sai",
    "Nơi sinh": m.birthPlace || "",
    "Nơi sống": m.livingPlace || "",
    "Nơi mất": m.deathPlace || "",
    "Nơi an táng": m.burialPlace || "",
    "Tiểu sử & Sự nghiệp": m.biography || "",
    "ID Cha": m.fatherId || "",
    "ID Mẹ": m.motherId || "",
    "ID Vợ/Chồng": m.spouseId || "",
    "Liên kết Ảnh đại diện (URL)": m.avatar && m.avatar.startsWith("data:") ? "" : (m.avatar || "") // Skip base64 to avoid Excel character limit crash
  }));

  const tributeRows = tributes.map((t) => ({
    "ID": t.id,
    "Người gửi": t.name,
    "Quan hệ": t.relation || "",
    "Nội dung": t.content,
    "Ngày gửi": t.date || "",
    "Ảnh đại diện": t.avatar || ""
  }));

  const wb = XLSX.utils.book_new();
  const wsMembers = XLSX.utils.json_to_sheet(memberRows);
  const wsTributes = XLSX.utils.json_to_sheet(tributeRows);

  XLSX.utils.book_append_sheet(wb, wsMembers, "Thành viên");
  XLSX.utils.book_append_sheet(wb, wsTributes, "Lời tri ân");

  XLSX.writeFile(wb, `gia_pha_hoang_dinh_sao_luu_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const downloadExcelTemplate = () => {
  const templateRows = [
    {
      "ID": 1,
      "Họ và Tên": "Hoàng Đình Cương",
      "Giới tính": "Nam",
      "Thế hệ (Đời)": 1,
      "Năm sinh": "1820",
      "Năm mất": "1895",
      "Đã mất": "Đúng",
      "Nơi sinh": "Hưng Nguyên, Nghệ An",
      "Nơi sống": "",
      "Nơi mất": "Hưng Nguyên, Nghệ An",
      "Nơi an táng": "Nghĩa trang Dòng họ Hoàng Đình, Hưng Nguyên, Nghệ An",
      "Tiểu sử & Sự nghiệp": "Cụ tổ dòng họ (Thủy Tổ) họ Hoàng Đình Nghệ An. Đỗ Tú tài khoa Quý Mão dưới triều Nguyễn, mở lớp dạy học, bốc thuốc cứu người.",
      "ID Cha": "",
      "ID Mẹ": "",
      "ID Vợ/Chồng": 2,
      "Liên kết Ảnh đại diện (URL)": ""
    },
    {
      "ID": 2,
      "Họ và Tên": "Nguyễn Thị Lành",
      "Giới tính": "Nữ",
      "Thế hệ (Đời)": 1,
      "Năm sinh": "1825",
      "Năm mất": "1902",
      "Đã mất": "Đúng",
      "Nơi sinh": "Nam Đàn, Nghệ An",
      "Nơi sống": "",
      "Nơi mất": "Hưng Nguyên, Nghệ An",
      "Nơi an táng": "Nghĩa trang Dòng họ Hoàng Đình, Hưng Nguyên, Nghệ An",
      "Tiểu sử & Sự nghiệp": "Thủy Tổ Mẫu họ Hoàng Đình. Cụ bà hiền hậu đức độ, tần tảo chăm lo gia đình dòng họ.",
      "ID Cha": "",
      "ID Mẹ": "",
      "ID Vợ/Chồng": 1,
      "Liên kết Ảnh đại diện (URL)": ""
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateRows);
  XLSX.utils.book_append_sheet(wb, ws, "Thành viên");

  // Add mock Lời tri ân sheet
  const wsTributes = XLSX.utils.json_to_sheet([
    {
      "ID": "trib_1",
      "Người gửi": "Nguyễn Văn A",
      "Quan hệ": "Cháu rể",
      "Nội dung": "Con cháu thành kính tri ân đức tổ tiên dòng họ Hoàng Đình.",
      "Ngày gửi": "2026-06-22",
      "Ảnh đại diện": ""
    }
  ]);
  XLSX.utils.book_append_sheet(wb, wsTributes, "Lời tri ân");

  XLSX.writeFile(wb, "mau_nhap_lieu_gia_pha_hoang_dinh.xlsx");
};
