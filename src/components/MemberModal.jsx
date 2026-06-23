import React, { useState, useEffect } from "react";
import { X, Heart, Calendar, MapPin, User, ChevronRight, Flower, Edit3, Send, CheckCircle, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { dbSaveRequest } from "../firebase";
import { resizeImage } from "../utils/imageHelper";

export default function MemberModal({ member, allMembers, onClose, onSelectMember }) {
  if (!member) return null;

  const findMember = (id) => allMembers.find(m => m.id === id);

  const father  = member.fatherId  ? findMember(member.fatherId)  : null;
  const mother  = member.motherId  ? findMember(member.motherId)  : null;
  const spouse  = member.spouseId  ? findMember(member.spouseId)  : null;
  const children = allMembers.filter(m => m.fatherId === member.id || m.motherId === member.id);

  // ── Update-request states ──────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [submitterName, setSubmitterName] = useState("");
  const [updateNote, setUpdateNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [updateFields, setUpdateFields] = useState({
    name: member.name || "",
    gender: member.gender || "Nam",
    birthDate: member.birthDate || "",
    deathDate: member.deathDate || "",
    isDeceased: member.isDeceased || false,
    birthPlace: member.birthPlace || "",
    livingPlace: member.livingPlace || "",
    deathPlace: member.deathPlace || "",
    burialPlace: member.burialPlace || "",
    biography: member.biography || "",
    avatar: member.avatar || ""
  });

  // Reset/sync form state whenever the selected member changes
  useEffect(() => {
    setUpdateFields({
      name: member.name || "",
      birthDate: member.birthDate || "",
      deathDate: member.deathDate || "",
      isDeceased: member.isDeceased || false,
      birthPlace: member.birthPlace || "",
      livingPlace: member.livingPlace || "",
      deathPlace: member.deathPlace || "",
      burialPlace: member.burialPlace || "",
      biography: member.biography || "",
      avatar: member.avatar || "",
    });
    setSubmitted(false);
    setIsEditing(false);
    setUpdateNote("");
  }, [member.id]);

  const handleFieldChange = (key, value) => {
    setUpdateFields(prev => ({ ...prev, [key]: value }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const resizedBase64 = await resizeImage(file, 300, 0.7);
      handleFieldChange("avatar", resizedBase64);
    } catch (err) {
      console.error("Lỗi xử lý ảnh:", err);
      alert("Có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại.");
    }
  };

  const handleSubmitRequest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!submitterName.trim()) {
      alert("Vui lòng nhập tên người yêu cầu.");
      return;
    }

    const editKeys = ["name", "birthDate", "deathDate", "isDeceased", "birthPlace", "livingPlace", "deathPlace", "burialPlace", "biography", "avatar"];
    const changes = {};
    const original = {};

    // Normalize field values based on isDeceased state before comparing
    const normalizedFields = { ...updateFields };
    if (!normalizedFields.isDeceased) {
      normalizedFields.deathDate = "";
      normalizedFields.deathPlace = "";
      normalizedFields.burialPlace = "";
    } else {
      normalizedFields.livingPlace = "";
    }

    editKeys.forEach(key => {
      const newVal = normalizedFields[key] ?? "";
      const oldVal = member[key] ?? "";

      if (key === "isDeceased") {
        if (Boolean(newVal) !== Boolean(oldVal)) {
          changes[key] = newVal;
          original[key] = oldVal;
        }
      } else {
        if (String(newVal).trim() !== String(oldVal).trim()) {
          changes[key] = newVal;
          original[key] = oldVal;
        }
      }
    });

    if (Object.keys(changes).length === 0) {
      alert("Bạn chưa thay đổi thông tin nào so với dữ liệu hiện tại.");
      return;
    }

    const request = {
      id: `req_${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      submittedBy: submitterName.trim(),
      submittedAt: new Date().toISOString(),
      changes,
      original,
      note: updateNote.trim(),
      status: "pending",
    };

    try {
      await dbSaveRequest(request);
      setSubmitted(true);
    } catch (err) {
      console.error("Lỗi khi gửi yêu cầu sửa đổi:", err);
      alert("Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại sau.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm font-sans fade-in">
      <div className="flex-grow" onClick={onClose}></div>

      {/* Drawer Panel */}
      <div className="w-full max-w-lg h-full bg-paper-base border-l-2 border-gold-accent/40 shadow-2xl flex flex-col overflow-y-auto relative">

        {/* Sticky header */}
        <div className="sticky top-0 bg-paper-base/95 backdrop-blur-sm border-b border-gold-accent/20 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 w-full mr-4">
            {isEditing ? (
              updateFields.avatar ? (
                <div className="w-12 h-12 rounded-full border-2 border-gold-accent shadow overflow-hidden bg-paper-light shrink-0">
                  <img src={updateFields.avatar} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full border border-gold-accent/40 bg-paper-light flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-charcoal/30" />
                </div>
              )
            ) : (
              member.avatar ? (
                <div className="w-12 h-12 rounded-full border-2 border-gold-accent shadow overflow-hidden bg-paper-light shrink-0">
                  <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full border border-gold-accent/40 bg-paper-light flex items-center justify-center shrink-0">
                  <Flower className={`w-5 h-5 ${member.isDeceased ? 'text-gold-accent animate-pulse' : 'text-wood-medium/60'}`} />
                </div>
              )
            )}

            <div className="flex-grow">
              {isEditing ? (
                <div className="w-full">
                  <label className="text-[10px] font-semibold text-gold-accent uppercase tracking-wider block mb-0.5">Đang chỉnh sửa Họ &amp; Tên</label>
                  <input
                    type="text"
                    value={updateFields.name}
                    onChange={e => handleFieldChange("name", e.target.value)}
                    placeholder="Nhập họ tên..."
                    className="w-full text-base font-semibold text-wood-dark border border-gold-accent/30 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:border-gold-accent focus:ring-1 focus:ring-gold-accent/30"
                  />
                </div>
              ) : (
                <>
                  <h2 className="font-display text-xl font-semibold text-wood-dark leading-tight">{member.name}</h2>
                  <p className="text-xs text-gold-accent font-semibold uppercase tracking-wider">
                    Thế hệ thứ {member.generation} · {member.gender}
                  </p>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-wood-medium hover:text-wood-dark hover:bg-gold-accent/10 rounded-full transition-all shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">

          {/* Deceased badge */}
          {(!isEditing && member.isDeceased) && (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-wood-dark text-gold-accent border border-gold-accent/30">
                <Flower className="w-3.5 h-3.5" /> Đã khuất
              </span>
            </div>
          )}

          {/* Basic Info Block (Switches layout in Edit Mode) */}
          <div className="bg-paper-light rounded-xl border border-gold-accent/15 overflow-hidden">
            {isEditing ? (
              <div className="p-5 space-y-4">
                <h3 className="font-display font-semibold text-wood-dark text-base flex items-center gap-2 border-b border-gold-accent/10 pb-2">
                  <span className="w-1 h-5 bg-gold-accent rounded-full inline-block"></span>
                  Thông tin cá nhân
                </h3>

                {/* Avatar / Portrait Uploader */}
                <div>
                  <label className="text-xs font-semibold text-wood-dark block mb-1">Ảnh chân dung / Đại diện</label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border border-gold-accent/30 overflow-hidden bg-paper-base shrink-0 flex items-center justify-center">
                      {updateFields.avatar ? (
                        <img src={updateFields.avatar} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-charcoal/30" />
                      )}
                    </div>
                    <div className="flex-grow flex gap-2">
                      <label className="flex-grow flex items-center justify-center gap-1.5 px-3 py-1.5 bg-paper-base border border-gold-accent/30 rounded-lg text-xs text-wood-medium hover:border-gold-accent transition-colors font-semibold cursor-pointer text-center">
                        <Upload className="w-3.5 h-3.5 text-gold-accent" /> Tải ảnh lên...
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                      </label>
                      {updateFields.avatar && (
                        <button
                          type="button"
                          onClick={() => handleFieldChange("avatar", "")}
                          className="px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                        >
                          Xóa ảnh
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <input
                      type="text"
                      value={updateFields.avatar && !updateFields.avatar.startsWith("data:") ? updateFields.avatar : ""}
                      onChange={e => handleFieldChange("avatar", e.target.value)}
                      placeholder="Hoặc dán Link ảnh URL vào đây..."
                      className="w-full text-xs border border-gold-accent/25 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-gold-accent focus:ring-1 focus:ring-gold-accent/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-gold-accent/10 pt-3">
                  <div>
                    <label className="text-xs font-semibold text-wood-dark block mb-1">Năm sinh</label>
                    <input
                      type="text"
                      value={updateFields.birthDate}
                      onChange={e => handleFieldChange("birthDate", e.target.value)}
                      placeholder="VD: 1852"
                      className="w-full text-sm border border-gold-accent/30 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-gold-accent focus:ring-1 focus:ring-gold-accent/30"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-wood-dark block">Năm mất</label>
                      <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={updateFields.isDeceased}
                          onChange={e => handleFieldChange("isDeceased", e.target.checked)}
                          className="rounded border-gold-accent/35 text-gold-accent focus:ring-gold-accent/30 w-3.5 h-3.5"
                        />
                        <span className="text-[11px] text-charcoal/65 font-medium">Đã mất</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={updateFields.deathDate}
                      onChange={e => handleFieldChange("deathDate", e.target.value)}
                      disabled={!updateFields.isDeceased}
                      placeholder={updateFields.isDeceased ? "VD: 1930" : "Còn sống..."}
                      className="w-full text-sm border border-gold-accent/30 rounded-lg px-2.5 py-1.5 bg-white disabled:bg-black/5 disabled:text-charcoal/40 focus:outline-none focus:border-gold-accent focus:ring-1 focus:ring-gold-accent/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-wood-dark block mb-1">Nơi sinh</label>
                  <input
                    type="text"
                    value={updateFields.birthPlace}
                    onChange={e => handleFieldChange("birthPlace", e.target.value)}
                    placeholder="VD: Hưng Nguyên, Nghệ An"
                    className="w-full text-sm border border-gold-accent/30 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-gold-accent focus:ring-1 focus:ring-gold-accent/30"
                  />
                </div>

                {!updateFields.isDeceased ? (
                  <div>
                    <label className="text-xs font-semibold text-wood-dark block mb-1">Nơi sống hiện tại</label>
                    <input
                      type="text"
                      value={updateFields.livingPlace}
                      onChange={e => handleFieldChange("livingPlace", e.target.value)}
                      placeholder="VD: Hà Nội"
                      className="w-full text-sm border border-gold-accent/30 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-gold-accent focus:ring-1 focus:ring-gold-accent/30"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-wood-dark block mb-1">Nơi mất</label>
                      <input
                        type="text"
                        value={updateFields.deathPlace}
                        onChange={e => handleFieldChange("deathPlace", e.target.value)}
                        placeholder="VD: Nghệ An"
                        className="w-full text-sm border border-gold-accent/30 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-gold-accent focus:ring-1 focus:ring-gold-accent/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-wood-dark block mb-1">Nơi an táng</label>
                      <input
                        type="text"
                        value={updateFields.burialPlace}
                        onChange={e => handleFieldChange("burialPlace", e.target.value)}
                        placeholder="VD: Nghĩa trang quê nhà"
                        className="w-full text-sm border border-gold-accent/30 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-gold-accent focus:ring-1 focus:ring-gold-accent/30"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gold-accent/10">
                <InfoRow icon={<Calendar />} label="Năm sinh – Năm mất"
                  value={`${member.birthDate || "???"} – ${member.isDeceased ? (member.deathDate || "???") : "Nay"}`} />
                <InfoRow icon={<MapPin />} label="Nơi sinh" value={member.birthPlace || "Chưa cập nhật"} />
                {member.livingPlace && <InfoRow icon={<MapPin />} label="Nơi sống" value={member.livingPlace} />}
                {member.isDeceased && member.deathPlace && <InfoRow icon={<MapPin className="text-red-700/60" />} label="Nơi mất" value={member.deathPlace} />}
                {member.isDeceased && member.burialPlace && <InfoRow icon={<MapPin className="text-red-700/60" />} label="Nơi an táng" value={member.burialPlace} italic />}
              </div>
            )}
          </div>

          {/* Biography Block */}
          <div className="bg-paper-light border border-gold-accent/15 rounded-xl p-5">
            <h3 className="font-display font-semibold text-wood-dark text-base mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-gold-accent rounded-full inline-block"></span>
              Tiểu sử &amp; Sự nghiệp
            </h3>
            {isEditing ? (
              <textarea
                rows={6}
                value={updateFields.biography}
                onChange={e => handleFieldChange("biography", e.target.value)}
                placeholder="Mô tả cuộc đời, sự nghiệp, đóng góp của cụ..."
                className="w-full text-sm border border-gold-accent/25 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-gold-accent focus:ring-1 focus:ring-gold-accent/30 resize-none font-sans"
              />
            ) : (
              <p className="text-[15px] text-charcoal/90 leading-[1.85] text-justify whitespace-pre-line font-sans">
                {member.biography || "Chưa có thông tin tiểu sử. Dòng họ rất mong được con cháu cung cấp tư liệu về cuộc đời cụ."}
              </p>
            )}
          </div>

          {/* Family Relationships (Read Only) */}
          <div>
            <h3 className="font-display font-semibold text-wood-dark text-base mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-gold-accent rounded-full inline-block"></span>
              Mối Quan Hệ Gia Đình
            </h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <RelativeCard label="Cha" person={father} onSelect={onSelectMember} />
                <RelativeCard label="Mẹ" person={mother} onSelect={onSelectMember} />
              </div>
              <RelativeCard
                label={member.gender === "Nam" ? "Vợ / Phối ngẫu" : "Chồng / Phối ngẫu"}
                person={spouse} onSelect={onSelectMember} full
                icon={<Heart className="w-3.5 h-3.5 fill-gold-accent/20 text-gold-accent shrink-0" />}
              />
              <div className="p-3 rounded-lg bg-paper-light border border-gold-accent/15">
                <span className="text-[11px] text-charcoal/45 block mb-2">Hậu duệ / Con cái ({children.length})</span>
                {children.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto divide-y divide-gold-accent/10 -mx-1">
                    {children.map(child => (
                      <button key={child.id} onClick={() => onSelectMember(child)}
                        className="w-full text-left px-1 py-2 text-sm text-charcoal hover:text-gold-accent hover:bg-gold-accent/5 transition-colors flex items-center justify-between rounded">
                        <span className="font-medium">{child.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gold-accent shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-charcoal/35 italic">Không có dữ liệu hậu duệ trực hệ</span>
                )}
              </div>
            </div>
          </div>

          {/* ── SUBMISSION / ACTION CONTROLS ── */}
          <div className="border-t border-gold-accent/20 pt-5 pb-8">
            {isEditing ? (
              <div className="bg-paper-light border border-gold-accent/20 rounded-xl p-5 space-y-4">
                {submitted ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 animate-bounce" />
                    <h4 className="font-display font-semibold text-wood-dark text-lg">Đã gửi yêu cầu!</h4>
                    <p className="text-sm text-charcoal/70 leading-relaxed">
                      Yêu cầu thay đổi đã được ghi nhận. Admin sẽ kiểm tra và phê duyệt sớm nhất.
                    </p>
                    <button
                      onClick={() => { setSubmitted(false); setIsEditing(false); }}
                      className="mt-2 px-5 py-2 text-sm rounded-lg bg-wood-dark text-gold-accent hover:bg-wood-medium transition-colors font-semibold"
                    >
                      Quay lại thông tin
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-b border-gold-accent/15 pb-2">
                      <h4 className="font-display font-semibold text-wood-dark text-sm">Xác nhận gửi yêu cầu</h4>
                      <p className="text-xs text-charcoal/60 leading-relaxed mt-1">
                        Vui lòng cung cấp tên của bạn để Admin lưu lại nhật ký chỉnh sửa gia phả.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-wood-dark mb-1">
                        Tên của bạn <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={submitterName}
                        onChange={e => setSubmitterName(e.target.value)}
                        placeholder="VD: Hoàng Đình Anh (con trai cụ Dũng)"
                        required
                        className="w-full text-sm border border-gold-accent/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-gold-accent focus:ring-1 focus:ring-gold-accent/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-charcoal/60 mb-1">Ghi chú thêm (tuỳ chọn)</label>
                      <textarea
                        rows={2}
                        value={updateNote}
                        onChange={e => setUpdateNote(e.target.value)}
                        placeholder="Lý do cập nhật, nguồn gốc tài liệu..."
                        className="w-full text-sm border border-gold-accent/25 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-gold-accent resize-none font-sans"
                      />
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex-1 py-2.5 rounded-xl border border-gold-accent/35 text-wood-medium text-sm hover:bg-gold-accent/5 font-semibold transition-colors"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitRequest}
                        className="flex-1 py-2.5 rounded-xl bg-wood-dark text-gold-accent text-sm hover:bg-wood-medium font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-4 h-4" /> Gửi yêu cầu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setSubmitted(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-wood-dark/5 border border-gold-accent/20 hover:border-gold-accent/50 hover:bg-gold-accent/5 transition-all text-sm font-semibold text-wood-dark"
              >
                <Edit3 className="w-4 h-4 text-gold-accent" />
                Cập nhật thông tin trực tiếp trên đây
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Small helper components ────────────────────────────────────────────────────
function InfoRow({ icon, label, value, italic }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="w-4 h-4 text-gold-accent mt-0.5 shrink-0">{icon}</span>
      <div>
        <span className="text-xs text-charcoal/50 block mb-0.5">{label}</span>
        <span className={`text-sm text-charcoal font-medium ${italic ? "italic" : ""}`}>{value}</span>
      </div>
    </div>
  );
}

function RelativeCard({ label, person, onSelect, full, icon }) {
  return (
    <div className={`p-3 rounded-lg bg-paper-light border border-gold-accent/15 ${full ? "w-full" : ""}`}>
      <span className="text-[11px] text-charcoal/45 block mb-1">{label}</span>
      {person ? (
        <button onClick={() => onSelect(person)}
          className="text-sm text-wood-medium font-semibold hover:text-gold-accent transition-colors flex items-center gap-1 text-left">
          {icon || <User className="w-3.5 h-3.5 shrink-0" />} {person.name}
        </button>
      ) : (
        <span className="text-sm text-charcoal/35 italic">Chưa cập nhật</span>
      )}
    </div>
  );
}
