import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  getAdminRewards,
  createAdminReward,
  updateAdminReward,
  deleteAdminReward,
} from '../api/adminGamifyApi';
import type { RewardRecord } from '../api/gamifyApi';
import { emitToast } from '../notifications/events';
import { getErrorMessage } from '../lib/errors';

interface AdminRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminRewardsModal({ isOpen, onClose }: AdminRewardsModalProps) {
  const { t } = useTranslation();
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardRecord | null>(null);
  
  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState(50);
  const [benefitType, setBenefitType] = useState<'loan_limit' | 'loan_duration' | 'fine_waiver'>('loan_limit');
  const [benefitValue, setBenefitValue] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadRewards = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminRewards();
      setRewards(res);
    } catch (err) {
      emitToast({
        tone: 'error',
        title: t('adminRewards.toastDeleteError', 'Thất bại'),
        message: getErrorMessage(err, t('adminRewards.loadError', 'Không thể tải danh sách phần thưởng.')),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadRewards();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCode('');
    setName('');
    setDescription('');
    setPointsCost(50);
    setBenefitType('loan_limit');
    setBenefitValue(1);
    setIsActive(true);
    setIsEditing(false);
    setEditingReward(null);
  };

  const handleEditClick = (reward: RewardRecord) => {
    setIsEditing(true);
    setEditingReward(reward);
    setCode(reward.code);
    setName(reward.name);
    setDescription(reward.description);
    setPointsCost(reward.points_cost);
    setBenefitType(reward.benefit_type as 'loan_limit' | 'loan_duration' | 'fine_waiver');
    setBenefitValue(reward.benefit_value);
    setIsActive(reward.is_active);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !description.trim()) {
      emitToast({
        tone: 'error',
        title: t('adminRewards.toastMissingInfo', 'Thiếu thông tin'),
        message: t('adminRewards.toastMissingInfoMsg', 'Vui lòng nhập đầy đủ các trường bắt buộc.'),
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        points_cost: Number(pointsCost),
        benefit_type: benefitType,
        benefit_value: Number(benefitValue),
        is_active: isActive,
      };

      if (isEditing && editingReward) {
        await updateAdminReward(editingReward.id, payload);
        emitToast({
          tone: 'success',
          title: t('adminRewards.toastUpdateSuccess', 'Thành công'),
          message: t('adminRewards.toastUpdateSuccessMsg', 'Đã cập nhật thông tin quà tặng.'),
        });
      } else {
        await createAdminReward(payload);
        emitToast({
          tone: 'success',
          title: t('adminRewards.toastAddSuccess', 'Thành công'),
          message: t('adminRewards.toastAddSuccessMsg', 'Đã thêm quà tặng mới vào kho.'),
        });
      }
      resetForm();
      await loadRewards();
    } catch (err) {
      emitToast({
        tone: 'error',
        title: t('adminRewards.toastSaveError', 'Thao tác thất bại'),
        message: getErrorMessage(err, t('adminRewards.toastSaveErrorMsg', 'Lưu quà tặng không thành công.')),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (rewardId: number) => {
    if (!confirm(t('adminRewards.confirmDelete', 'Bạn có chắc chắn muốn xóa phần thưởng này khỏi hệ thống?'))) return;
    try {
      await deleteAdminReward(rewardId);
      emitToast({
        tone: 'success',
        title: t('adminRewards.toastDeleteSuccess', 'Thành công'),
        message: t('adminRewards.toastDeleteSuccessMsg', 'Đã xóa phần thưởng khỏi hệ thống.'),
      });
      await loadRewards();
      if (editingReward?.id === rewardId) {
        resetForm();
      }
    } catch (err) {
      emitToast({
        tone: 'error',
        title: t('adminRewards.toastDeleteError', 'Thất bại'),
        message: getErrorMessage(err, t('adminRewards.toastDeleteErrorMsg', 'Không thể xóa phần thưởng.')),
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500">storefront</span>
                  {t('adminRewards.title', 'Quản lý Kho Quà tặng Gamify')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('adminRewards.subtitle', 'Thiết lập và quản lý các phần quà học viên có thể dùng điểm đổi được.')}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body - Split screen */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Side: Form */}
              <div className="w-full md:w-5/12 border-r border-slate-100 p-6 overflow-y-auto bg-slate-50/20">
                <h4 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-1.5 border-b pb-2">
                  <span className="material-symbols-outlined text-indigo-500 text-sm">
                    {isEditing ? 'edit_note' : 'add_circle'}
                  </span>
                  {isEditing ? t('adminRewards.formTitleEdit', 'Chỉnh sửa Quà tặng') : t('adminRewards.formTitleAdd', 'Thêm Quà tặng mới')}
                </h4>
                
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{t('adminRewards.labelCode', 'Mã code định danh *')}</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\s+/g, '_').toLowerCase())}
                      placeholder="e.g. loan_limit_boost"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      disabled={isEditing}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{t('adminRewards.labelName', 'Tên quà tặng *')}</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('adminRewards.placeholderName', 'Ví dụ: Tăng hạn mức mượn sách (+2)')}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{t('adminRewards.labelDesc', 'Mô tả chi tiết *')}</label>
                    <textarea
                      required
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('adminRewards.placeholderDesc', 'Mô tả quyền lợi nhận được khi đổi quà...')}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{t('adminRewards.labelPoints', 'Xu đổi quà (🪙) *')}</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={pointsCost}
                        onChange={(e) => setPointsCost(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{t('adminRewards.labelValue', 'Giá trị kích hoạt *')}</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={benefitValue}
                        onChange={(e) => setBenefitValue(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{t('adminRewards.labelType', 'Loại đặc quyền *')}</label>
                    <select
                      value={benefitType}
                      onChange={(e) => setBenefitType(e.target.value as any)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="loan_limit">{t('adminRewards.optionLoanLimit', 'Tăng giới hạn sách mượn cùng lúc (cuốn)')}</option>
                      <option value="loan_duration">{t('adminRewards.optionLoanDuration', 'Tăng thời hạn mượn sách (ngày)')}</option>
                      <option value="fine_waiver">{t('adminRewards.optionFineWaiver', 'Phiếu miễn giảm tiền phạt (VND)')}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="is_active_reward"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="is_active_reward" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      {t('adminRewards.labelIsActive', 'Kích hoạt cho phép đổi thưởng')}
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {isEditing && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        {t('adminRewards.btnCancel', 'Hủy chỉnh sửa')}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? t('adminRewards.btnSaveSaving', 'Đang lưu...') : isEditing ? t('adminRewards.btnSaveEdit', 'Lưu thay đổi') : t('adminRewards.btnSaveAdd', 'Tạo mới')}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Side: List */}
              <div className="w-full md:w-7/12 p-6 flex flex-col overflow-hidden">
                <h4 className="font-bold text-sm text-slate-800 mb-4 flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-indigo-500 text-sm">list_alt</span>
                    {t('adminRewards.listTitle', 'Danh sách quà tặng hiện có')}
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-2xs font-semibold">
                    {t('adminRewards.listCount', '{{count}} quà tặng', { count: rewards.length })}
                  </span>
                </h4>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {isLoading ? (
                    <div className="text-center py-8 text-xs text-slate-400">{t('adminRewards.loading', 'Đang tải dữ liệu...')}</div>
                  ) : rewards.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400">
                      {t('adminRewards.emptyState', 'Chưa có phần thưởng nào trong kho. Hãy tạo mới ở biểu mẫu bên trái!')}
                    </div>
                  ) : (
                    rewards.map((reward) => (
                      <div
                        key={reward.id}
                        className={`border rounded-xl p-4 transition-all hover:shadow-md flex items-start justify-between gap-4 ${
                          reward.is_active ? 'border-slate-100 bg-white' : 'border-slate-200 bg-slate-50/70 opacity-60'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{reward.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                              reward.benefit_type === 'loan_limit'
                                ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                : reward.benefit_type === 'loan_duration'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {reward.benefit_type === 'loan_limit'
                                ? t('adminRewards.badgeLimit', 'Hạn mức')
                                : reward.benefit_type === 'loan_duration'
                                ? t('adminRewards.badgeDuration', 'Gia hạn')
                                : t('adminRewards.badgeWaiver', 'Phạt')}
                            </span>
                            {!reward.is_active && (
                              <span className="bg-red-50 text-red-600 border border-red-100 text-[10px] px-1.5 py-0.5 rounded-md font-semibold">
                                {t('adminRewards.statusOff', 'Tắt')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">{reward.description}</p>
                          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 pt-1">
                            <span className="text-amber-600 flex items-center gap-0.5">
                              🪙 {reward.points_cost} xu
                            </span>
                            <span className="text-slate-400">|</span>
                            <span>{t('adminRewards.labelCodeShort', 'Mã:')} <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600 text-[10px]">{reward.code}</code></span>
                            <span className="text-slate-400">|</span>
                            <span>{t('adminRewards.labelValueShort', 'Trị giá:')} <strong className="text-indigo-600 font-bold">+{reward.benefit_value}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditClick(reward)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title={t('adminRewards.tooltipEdit', 'Sửa')}
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(reward.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('adminRewards.tooltipDelete', 'Xóa')}
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
