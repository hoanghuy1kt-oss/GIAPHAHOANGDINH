import * as XLSX from "xlsx";

// Helper to recursively calculate generations based on parent-child links
export function calculateGenerations(members) {
  const membersMap = new Map(members.map(m => [m.id, { ...m, generation: null }]));
  
  // Find roots (members with no parents in the list)
  const roots = [];
  membersMap.forEach(m => {
    const hasFather = m.fatherId && membersMap.has(m.fatherId);
    const hasMother = m.motherId && membersMap.has(m.motherId);
    if (!hasFather && !hasMother) {
      roots.push(m);
    }
  });

  // Helper to recursively assign generations
  const assignGen = (member, gen) => {
    if (member.generation !== null && member.generation <= gen) return;
    member.generation = gen;
    
    // Set spouse's generation
    if (member.spouseId) {
      const spouseIds = String(member.spouseId).split(',').map(s => s.trim()).filter(Boolean);
      spouseIds.forEach(sid => {
        const spouse = membersMap.get(parseInt(sid) || sid);
        if (spouse && spouse.generation !== gen) {
          assignGen(spouse, gen);
        }
      });
    }

    // Set children's generation
    membersMap.forEach(child => {
      if (child.fatherId === member.id || child.motherId === member.id) {
        assignGen(child, gen + 1);
      }
    });
  };

  // Start assigning from roots, default starting generation is 1
  roots.forEach(root => {
    assignGen(root, 1);
  });

  // Default fallback for any disconnected nodes
  membersMap.forEach(m => {
    if (m.generation === null) {
      m.generation = 1;
    }
  });

  return Array.from(membersMap.values());
}

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
        
        // Map excel columns to member fields (without Generation column)
        const parsedMembers = rawMembers.map((row) => {
          // Read parentId from "ID Cha/Mẹ", or fall back to "ID Cha" or "ID Mẹ" for compatibility
          const parentIdVal = row["ID Cha/Mẹ"] ?? row["ID Cha"] ?? row["ID Mẹ"] ?? null;
          const parentId = parentIdVal ? parseInt(parentIdVal) : null;

          return {
            id: parseInt(row["ID"]) || 0,
            name: String(row["Họ và Tên"] || "").trim(),
            gender: String(row["Giới tính"] || "Nam").trim(),
            birthDate: String(row["Năm sinh"] ?? "").trim(),
            deathDate: String(row["Năm mất"] ?? "").trim(),
            isDeceased: String(row["Đã mất"] || "").trim() === "Đúng" || row["Đã mất"] === true,
            birthPlace: String(row["Nơi sinh"] ?? "").trim(),
            livingPlace: String(row["Nơi sống"] ?? "").trim(),
            deathPlace: String(row["Nơi mất"] ?? "").trim(),
            burialPlace: String(row["Nơi an táng"] ?? "").trim(),
            biography: String(row["Tiểu sử & Sự nghiệp"] ?? "").trim(),
            parentId: parentId, // temporary placeholder
            fatherId: null,
            motherId: null,
            spouseId: row["ID Vợ/Chồng"] ? String(row["ID Vợ/Chồng"]).trim() : "",
            avatar: String(row["Liên kết Ảnh đại diện (URL)"] ?? "").trim(),
            childNo: String(row["Con thứ"] ?? "").trim()
          };
        }).filter(m => m.id > 0 && m.name !== "");

        // Auto-resolve fatherId and motherId based on parentId and spouse connections
        const resolvedParentsMembers = parsedMembers.map((m) => {
          const clean = { ...m };
          const pId = m.parentId;
          if (pId) {
            const parent = parsedMembers.find(p => p.id === pId);
            if (parent) {
              if (parent.gender === "Nam") {
                clean.fatherId = pId;
                if (parent.spouseId) {
                  const spouseIds = String(parent.spouseId).split(',').map(s => s.trim()).filter(Boolean);
                  if (spouseIds.length > 0) {
                    clean.motherId = parseInt(spouseIds[0]) || spouseIds[0];
                  }
                }
              } else {
                clean.motherId = pId;
                if (parent.spouseId) {
                  const spouseIds = String(parent.spouseId).split(',').map(s => s.trim()).filter(Boolean);
                  if (spouseIds.length > 0) {
                    clean.fatherId = parseInt(spouseIds[0]) || spouseIds[0];
                  }
                }
              }
            }
          }
          delete clean.parentId;
          return clean;
        });

        // Auto-calculate generations for all members dynamically
        const members = calculateGenerations(resolvedParentsMembers);

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
  // Map members to Excel structure without "Thế hệ (Đời)" column
  const memberRows = members.map((m) => ({
    "ID": m.id,
    "Họ và Tên": m.name,
    "Giới tính": m.gender,
    "Năm sinh": m.birthDate || "",
    "Năm mất": m.deathDate || "",
    "Đã mất": m.isDeceased ? "Đúng" : "Sai",
    "Nơi sinh": m.birthPlace || "",
    "Nơi sống": m.livingPlace || "",
    "Nơi mất": m.deathPlace || "",
    "Nơi an táng": m.burialPlace || "",
    "Tiểu sử & Sự nghiệp": m.biography || "",
    "ID Cha/Mẹ": m.fatherId || m.motherId || "", // Save whichever parent ID is available
    "Con thứ": m.childNo || "",
    "ID Vợ/Chồng": m.spouseId || "",
    "Liên kết Ảnh đại diện (URL)": m.avatar && m.avatar.startsWith("data:") ? "" : (m.avatar || "")
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
      "Năm sinh": "1820",
      "Năm mất": "1895",
      "Đã mất": "Đúng",
      "Nơi sinh": "Hưng Nguyên, Nghệ An",
      "Nơi sống": "",
      "Nơi mất": "Hưng Nguyên, Nghệ An",
      "Nơi an táng": "Nghĩa trang Dòng họ Hoàng Đình, Hưng Nguyên, Nghệ An",
      "Tiểu sử & Sự nghiệp": "Cụ tổ dòng họ (Thủy Tổ) họ Hoàng Đình Nghệ An. Đỗ Tú tài khoa Quý Mão dưới triều Nguyễn, mở lớp dạy học, bốc thuốc cứu người.",
      "ID Cha/Mẹ": "",
      "Con thứ": "",
      "ID Vợ/Chồng": 2,
      "Liên kết Ảnh đại diện (URL)": ""
    },
    {
      "ID": 2,
      "Họ và Tên": "Nguyễn Thị Lành",
      "Giới tính": "Nữ",
      "Năm sinh": "1825",
      "Năm mất": "1902",
      "Đã mất": "Đúng",
      "Nơi sinh": "Nam Đàn, Nghệ An",
      "Nơi sống": "",
      "Nơi mất": "Hưng Nguyên, Nghệ An",
      "Nơi an táng": "Nghĩa trang Dòng họ Hoàng Đình, Hưng Nguyên, Nghệ An",
      "Tiểu sử & Sự nghiệp": "Thủy Tổ Mẫu họ Hoàng Đình. Cụ bà hiền hậu đức độ, tần tảo chăm lo gia đình dòng họ.",
      "ID Cha/Mẹ": "",
      "Con thứ": "",
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
