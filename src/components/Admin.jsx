import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Plus, Edit2, Trash2, ShieldAlert, LogOut, RefreshCw, Download, Upload, Bell, CheckCircle, XCircle, ChevronDown, ChevronUp, User, Eye, EyeOff } from "lucide-react";
import { parseExcel, downloadExcelTemplate } from "../utils/excelHelper";
import { dbGetRequests, dbDeleteRequest } from "../firebase";

export default function Admin({
  members,
  setView,
  addMember,
  updateMember,
  deleteMember,
  resetToDefault,
  exportData,
  importData
}) {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Custom modal dialog popup state
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null
  });

  const showAlert = (message, title = "Thông báo", type = "info") => {
    return new Promise((resolve) => {
      setModalConfig({
        isOpen: true,
        type,
        title,
        message,
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: null
      });
    });
  };

  const showConfirm = (message, title = "Xác nhận") => {
    return new Promise((resolve) => {
      setModalConfig({
        isOpen: true,
        type: "confirm",
        title,
        message,
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  // Pending update requests
  const [updateRequests, setUpdateRequests] = useState([]);
  const [expandedReq, setExpandedReq] = useState(null);

  useEffect(() => {
    if (isAuthorized) {
      const loadRequests = async () => {
        try {
          const reqs = await dbGetRequests();
          setUpdateRequests(reqs.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)));
        } catch (err) {
          console.error("Lỗi khi tải yêu cầu từ Firestore:", err);
        }
      };
      loadRequests();
    }
  }, [isAuthorized]);

  const approveRequest = async (req) => {
    const member = members.find(m => m.id === req.memberId);
    if (!member) {
      await showAlert("Không tìm thấy thành viên tương ứng.", "Lỗi", "error");
      return;
    }
    try {
      await updateMember(req.memberId, req.changes);
      await dbDeleteRequest(req.id);
      setUpdateRequests(prev => prev.filter(r => r.id !== req.id));
      await showAlert(`Đã duyệt và cập nhật thông tin thành công cho: ${req.memberName}`, "Thành công", "success");
    } catch (err) {
      console.error("Lỗi khi duyệt yêu cầu sửa đổi:", err);
      await showAlert("Có lỗi xảy ra khi cập nhật thông tin lên Firestore.", "Lỗi", "error");
    }
  };

  const rejectRequest = async (reqId) => {
    const confirmed = await showConfirm("Bạn có chắc chắn muốn từ chối và xóa yêu cầu này?", "Xác nhận từ chối");
    if (confirmed) {
      try {
        await dbDeleteRequest(reqId);
        setUpdateRequests(prev => prev.filter(r => r.id !== reqId));
        await showAlert("Đã từ chối và xóa yêu cầu thay đổi thành công.", "Từ chối thành công", "info");
      } catch (err) {
        console.error("Lỗi khi từ chối yêu cầu:", err);
        await showAlert("Có lỗi xảy ra khi xóa yêu cầu khỏi Firestore.", "Lỗi", "error");
      }
    }
  };

  const FIELD_LABELS = {
    name: "Họ và Tên",
    birthDate: "Năm sinh",
    deathDate: "Năm mất",
    isDeceased: "Trạng thái sống/mất",
    birthPlace: "Nơi sinh",
    livingPlace: "Nơi sống",
    deathPlace: "Nơi mất",
    burialPlace: "Nơi an táng",
    biography: "Tiểu sử & Sự nghiệp",
    avatar: "Ảnh đại diện"
  };

  const pendingCount = updateRequests.filter(r => r.status === "pending").length;

  // CRUD Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    gender: "Nam",
    generation: 1,
    birthDate: "",
    deathDate: "",
    isDeceased: false,
    birthPlace: "",
    burialPlace: "",
    fatherId: "",
    motherId: "",
    spouseId: "",
    biography: "",
    avatar: "",
    livingPlace: "",
    deathPlace: ""
  });

  const [searchQuery, setSearchQuery] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "hoangdinh@123") {
      setIsAuthorized(true);
      setLoginError("");
    } else {
      setLoginError("Mật khẩu không chính xác. Vui lòng thử lại.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const nextData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value
      };

      // Auto-calculate generation and link other parent if parent or spouse is selected
      if (name === "fatherId" && value) {
        const parent = members.find(m => m.id === parseInt(value));
        if (parent) {
          nextData.generation = parent.generation + 1;
          // Auto-fill Mother if Father has spouse
          if (parent.spouseId) {
            nextData.motherId = parent.spouseId.toString();
          }
        }
      } else if (name === "motherId" && value) {
        const parent = members.find(m => m.id === parseInt(value));
        if (parent) {
          nextData.generation = parent.generation + 1;
          // Auto-fill Father if Mother has spouse
          if (parent.spouseId) {
            nextData.fatherId = parent.spouseId.toString();
          }
        }
      } else if (name === "spouseId" && value) {
        const spouse = members.find(m => m.id === parseInt(value));
        if (spouse) {
          nextData.generation = spouse.generation;
        }
      }

      return nextData;
    });
  };

  const startAddMember = () => {
    setIsEditing(true);
    setEditId(null);
    setFormData({
      name: "",
      gender: "Nam",
      generation: 1,
      birthDate: "",
      deathDate: "",
      isDeceased: false,
      birthPlace: "",
      burialPlace: "",
      fatherId: "",
      motherId: "",
      spouseId: "",
      biography: "",
      avatar: "",
      livingPlace: "",
      deathPlace: ""
    });
  };

  const startEditMember = (member) => {
    setIsEditing(true);
    setEditId(member.id);
    setFormData({
      name: member.name || "",
      gender: member.gender || "Nam",
      generation: member.generation || 1,
      birthDate: member.birthDate || "",
      deathDate: member.deathDate || "",
      isDeceased: member.isDeceased || false,
      birthPlace: member.birthPlace || "",
      burialPlace: member.burialPlace || "",
      fatherId: member.fatherId || "",
      motherId: member.motherId || "",
      spouseId: member.spouseId || "",
      biography: member.biography || "",
      avatar: member.avatar || "",
      livingPlace: member.livingPlace || "",
      deathPlace: member.deathPlace || ""
    });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      await showAlert("Tên thành viên không được để trống.", "Lỗi nhập liệu", "error");
      return;
    }

    const payload = {
      ...formData,
      generation: parseInt(formData.generation) || 1,
      fatherId: formData.fatherId ? parseInt(formData.fatherId) : null,
      motherId: formData.motherId ? parseInt(formData.motherId) : null,
      spouseId: formData.spouseId ? parseInt(formData.spouseId) : null
    };

    if (editId) {
      updateMember(editId, payload);
    } else {
      addMember(payload);
    }

    setIsEditing(false);
  };

  const handleDelete = async (id, name) => {
    const confirmed = await showConfirm(`Bạn có chắc chắn muốn xóa thành viên "${name}" khỏi gia phả? Hành động này sẽ xóa vĩnh viễn dữ liệu.`, "Xác nhận xóa");
    if (confirmed) {
      deleteMember(id);
      await showAlert("Đã xóa thành viên khỏi gia phả thành công.", "Thành công", "success");
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const parsed = await parseExcel(file);
        if (importData(parsed)) {
          await showAlert("Nhập dữ liệu gia phả từ tệp Excel thành công!", "Thành công", "success");
        } else {
          await showAlert("Định dạng dữ liệu tệp Excel không hợp lệ.", "Lỗi", "error");
        }
      } catch (err) {
        await showAlert(err.message || "Lỗi đọc tệp Excel.", "Lỗi", "error");
      }
      e.target.value = "";
    }
  };

  // Filter members list by query
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Authentication screen
  if (!isAuthorized) {
    return (
      <div className="w-screen min-h-screen bg-paper-base flex items-center justify-center px-4 font-sans bronze-drum-bg">
        <div className="w-full max-w-md bg-paper-light border-2 border-gold-accent/40 rounded-lg p-8 shadow-xl relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-gold-accent"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gold-accent"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-gold-accent"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-gold-accent"></div>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 bg-gold-accent/10 rounded-full flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6 text-gold-accent" />
            </div>
            <h2 className="font-display font-bold text-2xl text-wood-dark tracking-wide">Quản Trị Gia Phả</h2>
            <p className="text-xs text-charcoal/60 mt-1">Yêu cầu quyền truy cập để chỉnh sửa dữ liệu dòng họ</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Mật khẩu Quản trị</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full bg-paper-base border border-gold-accent/20 rounded pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-gold-accent transition-colors"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-charcoal/45 hover:text-wood-medium transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {loginError && <p className="text-red-600 text-xs mt-1.5">{loginError}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setView("intro")}
                className="w-1/2 py-2 text-xs border border-gold-accent text-gold-accent hover:bg-gold-accent/10 rounded transition-colors"
              >
                Quay lại
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 text-xs bg-wood-medium hover:bg-wood-dark text-gold-accent rounded transition-colors font-semibold"
              >
                Xác thực
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-paper-base flex flex-col font-sans select-text">
      
      {/* Header */}
      <div className="w-full bg-wood-medium text-paper-base border-b border-gold-accent/30 px-4 py-3 flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("intro")}
            className="p-1.5 rounded bg-wood-dark hover:bg-gold-accent hover:text-wood-dark transition-all"
            title="Quay lại Trang chủ"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-display font-bold text-lg md:text-xl tracking-wide">Quản Trị Hệ Thống</h2>
            <p className="text-[10px] text-paper-dark/70 font-sans">Chỉnh sửa phả hệ Dòng họ Hoàng Đình</p>
          </div>
        </div>

        <button
          onClick={() => setIsAuthorized(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-900/40 border border-red-700/50 rounded hover:bg-red-900/60 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 text-red-300" /> Đăng xuất
        </button>
      </div>

      <div className="flex-grow w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* MAIN PANEL (Table index or CRUD Form) (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-paper-light border border-gold-accent/20 rounded-lg p-5 shadow-md">
          
          {isEditing ? (
            /* CRUD Form view */
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <h3 className="font-display font-bold text-wood-dark text-lg border-b border-gold-accent/20 pb-2 mb-4 flex items-center gap-2">
                {editId ? <Edit2 className="w-4 h-4 text-gold-accent" /> : <Plus className="w-4 h-4 text-gold-accent" />}
                {editId ? "Sửa thông tin thành viên" : "Thêm thành viên mới"}
              </h3>

              {/* Image upload section */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-paper-base/30 border border-gold-accent/15 rounded-lg p-3.5 mb-2">
                <div className="shrink-0">
                  {formData.avatar ? (
                    <div className="w-16 h-16 rounded-full border-2 border-gold-accent overflow-hidden bg-paper-light shadow-sm">
                      <img src={formData.avatar} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full border border-gold-accent/20 bg-paper-light flex items-center justify-center shadow-sm">
                      <User className="w-8 h-8 text-charcoal/20" />
                    </div>
                  )}
                </div>
                <div className="flex-grow w-full space-y-1.5">
                  <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block">Hình ảnh đại diện</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      name="avatar"
                      value={formData.avatar || ""}
                      onChange={handleInputChange}
                      placeholder="Nhập liên kết ảnh URL hoặc chọn file..."
                      className="flex-grow bg-paper-base border border-gold-accent/20 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gold-accent"
                    />
                    <label className="px-3 py-1.5 bg-paper-base border border-gold-accent/30 rounded text-xs text-wood-medium font-semibold hover:border-gold-accent cursor-pointer transition-all text-center">
                      Chọn file ảnh
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setFormData(prev => ({
                                ...prev,
                                avatar: event.target.result
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    {formData.avatar && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, avatar: "" }))}
                        className="px-3 py-1.5 border border-red-700/30 text-red-700 rounded text-xs font-semibold hover:bg-red-50 transition-colors"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Họ và Tên</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="VD: Hoàng Đình A"
                    required
                    className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Giới tính</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Đời thứ / Thế hệ</label>
                  <input
                    type="number"
                    name="generation"
                    min="1"
                    max="20"
                    value={formData.generation}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Năm sinh</label>
                  <input
                    type="text"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    placeholder="VD: 1912"
                    className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Trạng thái sống</label>
                  <div className="flex items-center h-8 gap-2">
                    <input
                      type="checkbox"
                      id="isDeceased"
                      name="isDeceased"
                      checked={formData.isDeceased}
                      onChange={handleInputChange}
                      className="w-4 h-4 accent-gold-accent"
                    />
                    <label htmlFor="isDeceased" className="text-xs text-charcoal select-none">Đã mất (Tiên tổ)</label>
                  </div>
                </div>
                <div>
                  {formData.isDeceased && (
                    <>
                      <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Năm mất</label>
                      <input
                        type="text"
                        name="deathDate"
                        value={formData.deathDate}
                        onChange={handleInputChange}
                        placeholder="VD: 1985"
                        className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Nơi sinh</label>
                  <input
                    type="text"
                    name="birthPlace"
                    value={formData.birthPlace}
                    onChange={handleInputChange}
                    placeholder="VD: Hưng Nguyên, Nghệ An"
                    className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Nơi sống</label>
                  <input
                    type="text"
                    name="livingPlace"
                    value={formData.livingPlace || ""}
                    onChange={handleInputChange}
                    placeholder="VD: TP Vinh, Nghệ An"
                    className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
                  />
                </div>
                <div>
                  {formData.isDeceased && (
                    <>
                      <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Nơi mất</label>
                      <input
                        type="text"
                        name="deathPlace"
                        value={formData.deathPlace || ""}
                        onChange={handleInputChange}
                        placeholder="Nơi tạ thế..."
                        className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
                      />
                    </>
                  )}
                </div>
              </div>

              {formData.isDeceased && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Nơi an táng (Mộ phần)</label>
                    <input
                      type="text"
                      name="burialPlace"
                      value={formData.burialPlace}
                      onChange={handleInputChange}
                      placeholder="Nghĩa trang, Địa phương..."
                      className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
                    />
                  </div>
                </div>
              )}

              {/* Lineage selectors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gold-accent/10 pt-3">
                <div>
                  <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Cha</label>
                  <select
                    name="fatherId"
                    value={formData.fatherId}
                    onChange={handleInputChange}
                    className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
                  >
                    <option value="">-- Không có dữ liệu cha --</option>
                    {members
                      .filter(m => m.gender === "Nam" && m.id !== editId)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} (Đời {m.generation})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Mẹ</label>
                  <select
                    name="motherId"
                    value={formData.motherId}
                    onChange={handleInputChange}
                    className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
                  >
                    <option value="">-- Không có dữ liệu mẹ --</option>
                    {members
                      .filter(m => m.gender === "Nữ" && m.id !== editId)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} (Đời {m.generation})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Vợ/Chồng</label>
                  <select
                    name="spouseId"
                    value={formData.spouseId}
                    onChange={handleInputChange}
                    className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
                  >
                    <option value="">-- Độc thân / Chưa cập nhật --</option>
                    {members
                      .filter(m => m.id !== editId)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} (Đời {m.generation} - {m.gender})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-wood-medium uppercase tracking-wider block mb-1">Tiểu sử & Đóng góp</label>
                <textarea
                  name="biography"
                  value={formData.biography}
                  onChange={handleInputChange}
                  rows="5"
                  placeholder="Ghi nhận tiểu sử cuộc đời, danh hiệu, thành tựu xã hội hoặc huân chương..."
                  className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent resize-y"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gold-accent/40 hover:bg-gold-accent/10 rounded text-xs text-wood-medium transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-wood-medium hover:bg-wood-dark text-gold-accent rounded text-xs font-semibold transition-colors flex items-center gap-1.5 shadow"
                >
                  <Save className="w-4 h-4" /> Lưu thông tin
                </button>
              </div>
            </form>
          ) : (
            /* Table Index view */
            <div className="space-y-4">
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gold-accent/20 pb-3">
                <h3 className="font-display font-bold text-wood-dark text-lg flex items-center gap-2">
                  Danh sách gia phả dòng họ ({members.length})
                </h3>
                <button
                  onClick={startAddMember}
                  className="flex items-center gap-1 px-3 py-2 bg-wood-medium hover:bg-wood-dark text-gold-accent rounded text-xs font-semibold transition-colors shadow"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm thành viên
                </button>
              </div>

              {/* Quick Search bar */}
              <input
                type="text"
                placeholder="Tìm kiếm thành viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-paper-base border border-gold-accent/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-gold-accent"
              />

              {/* Table List */}
              <div className="overflow-x-auto border border-gold-accent/15 rounded">
                <table className="w-full text-left text-xs border-collapse divide-y divide-gold-accent/10">
                  <thead className="bg-paper-base font-bold text-wood-medium uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Đời</th>
                      <th className="px-4 py-2.5">Họ và Tên</th>
                      <th className="px-4 py-2.5">Giới tính</th>
                      <th className="px-4 py-2.5">Năm sinh-mất</th>
                      <th className="px-4 py-2.5 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold-accent/10">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map(m => (
                        <tr key={m.id} className="hover:bg-gold-accent/5 transition-colors">
                          <td className="px-4 py-2 text-gold-accent font-semibold">{m.generation}</td>
                          <td className="px-4 py-2 font-semibold text-wood-medium">
                            {m.name} {m.isDeceased && <span className="text-[9px] text-gold-accent">🕯️</span>}
                          </td>
                          <td className="px-4 py-2 text-charcoal/80">{m.gender}</td>
                          <td className="px-4 py-2 text-charcoal/70">
                            {m.birthDate || "???"} - {m.isDeceased ? (m.deathDate || "???") : "Nay"}
                          </td>
                          <td className="px-4 py-2 text-right flex justify-end gap-1.5">
                            <button
                              onClick={() => startEditMember(m)}
                              className="p-1 rounded text-wood-medium hover:bg-gold-accent/10 transition-colors"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id, m.name)}
                              className="p-1 rounded text-red-600 hover:bg-red-500/10 transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-charcoal/40 italic">
                          Không tìm thấy thành viên nào khớp với tìm kiếm.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT PANEL: Maintenance Controls + Update Requests */}
        <div className="lg:col-span-4 flex flex-col gap-4">

          {/* ── Pending Update Requests ── */}
          <div className="bg-paper-light border border-gold-accent/20 rounded-lg p-5 shadow-md">
            <h3 className="font-display font-bold text-wood-dark text-base border-b border-gold-accent/20 pb-2 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-gold-accent" />
              Yêu cầu cập nhật
              {pendingCount > 0 && (
                <span className="ml-auto bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </h3>

            {updateRequests.length === 0 ? (
              <p className="text-xs text-charcoal/45 italic text-center py-4">Không có yêu cầu nào đang chờ duyệt.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {updateRequests.map(req => (
                  <div key={req.id} className="border border-gold-accent/20 rounded-lg overflow-hidden bg-paper-base">
                    {/* Request header */}
                    <button
                      onClick={() => setExpandedReq(expandedReq === req.id ? null : req.id)}
                      className="w-full px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-gold-accent/5 transition-colors"
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold text-wood-dark">{req.memberName}</p>
                        <p className="text-[11px] text-charcoal/50">
                          Gửi bởi: <span className="font-medium text-charcoal/70">{req.submittedBy}</span>
                        </p>
                        <p className="text-[10px] text-charcoal/40">
                          {new Date(req.submittedAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                      {expandedReq === req.id
                        ? <ChevronUp className="w-4 h-4 text-charcoal/40 shrink-0 mt-1" />
                        : <ChevronDown className="w-4 h-4 text-charcoal/40 shrink-0 mt-1" />}
                    </button>

                    {/* Expanded details */}
                    {expandedReq === req.id && (
                      <div className="border-t border-gold-accent/15 px-3 py-3 space-y-3">
                        {/* Changes diff */}
                        <div className="space-y-2">
                          {Object.entries(req.changes).map(([key, newVal]) => {
                            const formatVal = (val) => {
                              if (val === true || val === "true") return "Đã mất";
                              if (val === false || val === "false") return "Đang sống";
                              return val;
                            };

                            if (key === "avatar") {
                              return (
                                <div key={key} className="text-xs">
                                  <p className="font-semibold text-wood-dark mb-0.5">{FIELD_LABELS[key] || key}</p>
                                  <div className="flex items-center gap-3 mt-1 bg-paper-light p-2 rounded border border-gold-accent/15 w-fit">
                                    {req.original[key] && (
                                      <div className="text-center shrink-0">
                                        <p className="text-[9px] text-red-600 line-through mb-1">Ảnh cũ</p>
                                        <img src={req.original[key]} className="w-10 h-10 rounded-full object-cover border border-red-200 grayscale" />
                                      </div>
                                    )}
                                    {newVal && (
                                      <div className="text-center shrink-0">
                                        <p className="text-[9px] text-green-700 mb-1">Ảnh mới</p>
                                        <img src={newVal} className="w-10 h-10 rounded-full object-cover border border-green-200" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={key} className="text-xs">
                                <p className="font-semibold text-wood-dark mb-0.5">{FIELD_LABELS[key] || key}</p>
                                {(req.original[key] !== undefined && req.original[key] !== null && req.original[key] !== "") && (
                                  <p className="text-red-600/70 line-through bg-red-50 px-2 py-1 rounded mb-1 whitespace-pre-wrap">
                                    {formatVal(req.original[key])}
                                  </p>
                                )}
                                <p className="text-green-700 bg-green-50 px-2 py-1 rounded whitespace-pre-wrap">
                                  {formatVal(newVal)}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Note */}
                        {req.note && (
                          <div className="text-xs bg-gold-accent/5 border border-gold-accent/20 rounded px-2 py-2">
                            <span className="font-semibold text-charcoal/60">Ghi chú: </span>
                            <span className="text-charcoal/80">{req.note}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => approveRequest(req)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Duyệt
                          </button>
                          <button
                            onClick={() => rejectRequest(req.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-700/80 text-white text-xs font-semibold hover:bg-red-800 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Từ chối
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Hệ Thống Tiện Ích ── */}
          <div className="bg-paper-light border border-gold-accent/20 rounded-lg p-5 shadow-md flex flex-col gap-4">
            <h3 className="font-display font-bold text-wood-dark text-base border-b border-gold-accent/20 pb-2 mb-1 flex items-center gap-2">
              Hệ Thống Tiện Ích (Excel)
            </h3>
            <p className="text-xs text-charcoal/60 leading-relaxed">
              Quản lý dữ liệu phả hệ qua tệp Excel (.xlsx). Nhập thông tin theo mẫu rồi tải lên để cập nhật cực nhanh.
            </p>

            <div className="space-y-3.5 pt-2">
              <button
                onClick={exportData}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-paper-base border border-gold-accent/30 rounded text-xs text-wood-medium hover:border-gold-accent transition-colors font-semibold shadow-xs"
              >
                <Download className="w-4 h-4 text-gold-accent" />
                Xuất toàn bộ data (excel)
              </button>

              <label className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-paper-base border border-gold-accent/30 rounded text-xs text-wood-medium hover:border-gold-accent transition-colors font-semibold cursor-pointer shadow-xs">
                <Upload className="w-4 h-4 text-gold-accent" />
                Nhập data (excel)
                <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
              </label>

              <button
                onClick={downloadExcelTemplate}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-paper-base border border-gold-accent/30 rounded text-xs text-wood-medium hover:border-gold-accent transition-colors font-semibold shadow-xs"
              >
                <Download className="w-4 h-4 text-gold-accent" />
                Mẫu nhập data (excel)
              </button>
            </div>

            <div className="bg-paper-base border border-gold-accent/15 rounded p-3 text-[11px] text-charcoal/50 leading-normal mt-2">
              🔒 Dữ liệu được lưu an toàn tại trình duyệt. Vui lòng xuất dữ liệu ra Excel thường xuyên để sao lưu dự phòng.
            </div>
          </div>

        </div>

      </div>

      {/* Custom Alert/Confirm Modal Popup */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm bg-paper-light border-2 border-gold-accent rounded-lg shadow-2xl relative overflow-hidden p-6 text-charcoal animate-fadeIn">
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gold-accent"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gold-accent"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gold-accent"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gold-accent"></div>

            <div className="flex items-center gap-3 mb-4">
              {modalConfig.type === "success" && <CheckCircle className="w-6 h-6 text-green-700 shrink-0" />}
              {modalConfig.type === "error" && <XCircle className="w-6 h-6 text-red-700 shrink-0" />}
              {modalConfig.type === "confirm" && <ShieldAlert className="w-6 h-6 text-gold-accent shrink-0" />}
              {modalConfig.type === "info" && <Bell className="w-6 h-6 text-wood-medium shrink-0" />}
              <h4 className="font-display font-bold text-base text-wood-dark">{modalConfig.title}</h4>
            </div>
            
            <p className="text-xs text-charcoal/80 leading-relaxed mb-6 whitespace-pre-wrap">{modalConfig.message}</p>

            <div className="flex justify-end gap-2.5">
              {modalConfig.onCancel && (
                <button
                  type="button"
                  onClick={modalConfig.onCancel}
                  className="px-4 py-1.5 border border-gold-accent text-gold-accent hover:bg-gold-accent/5 rounded text-xs font-semibold cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
              )}
              <button
                type="button"
                onClick={modalConfig.onConfirm}
                className={`px-4 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  modalConfig.type === "confirm"
                    ? "bg-gold-accent text-wood-dark hover:bg-gold-light"
                    : modalConfig.type === "error"
                    ? "bg-red-700 hover:bg-red-800 text-white"
                    : modalConfig.type === "success"
                    ? "bg-green-700 hover:bg-green-800 text-white"
                    : "bg-wood-medium text-gold-accent hover:bg-wood-dark"
                }`}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
