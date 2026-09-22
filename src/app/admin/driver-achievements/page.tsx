'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/context';

interface AchievementDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  targetValue: number;
  icon: string;
  rewardType: string | null;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  _count?: {
    unlocks: number;
  };
}

export default function AdminDriverAchievementsPage() {
  const { t } = useTranslation();
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [summary, setSummary] = useState<{ totalUnlocks: number; activeStreaks: number } | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AchievementDefinition | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: 'TRIPS',
    targetValue: 10,
    icon: '🏆',
    rewardType: '',
    active: true,
  });

  const fetchAdminData = async () => {
    try {
      const res = await fetch('/api/admin/driver-achievements');
      if (res.ok) {
        const data = await res.json();
        setDefinitions(data.data.definitions ?? []);
        setSummary({
          totalUnlocks: data.data.totalUnlocks ?? 0,
          activeStreaks: data.data.activeStreaks ?? 0,
        });
      } else {
        setError('Failed to fetch admin achievement data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await fetch('/api/admin/driver-achievements');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setDefinitions(data.data.definitions ?? []);
            setSummary({
              totalUnlocks: data.data.totalUnlocks ?? 0,
              activeStreaks: data.data.activeStreaks ?? 0,
            });
          }
        } else {
          if (isMounted) setError('Failed to fetch admin achievement data');
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Error loading admin data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      category: 'TRIPS',
      targetValue: 10,
      icon: '🏆',
      rewardType: '',
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: AchievementDefinition) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description,
      category: item.category,
      targetValue: item.targetValue,
      icon: item.icon,
      rewardType: item.rewardType || '',
      active: item.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/driver-achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        await fetchAdminData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to save achievement definition');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving achievement');
    }
  };

  const filteredDefinitions = definitions.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col w-full px-6 py-6 gap-6">
      {/* Header */}
      <section className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl text-emerald-400">🛡️</span>
            <h1 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              {t('driverEngagement.admin.title')}
            </h1>
          </div>
          <p className="text-sm text-[#87948b] mt-1">{t('driverEngagement.admin.subtitle')}</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#68dba9] hover:bg-[#52c896] text-[#003822] text-xs font-bold rounded-lg transition-colors shrink-0"
        >
          + {t('driverEngagement.admin.newAchievement')}
        </button>
      </section>

      {error && (
        <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="text-xl">🏅</span>
          </div>
          <div>
            <span className="text-xs text-[#87948b] block">
              {t('driverEngagement.admin.totalUnlocks')}
            </span>
            <span className="text-xl font-black text-white">{summary?.totalUnlocks ?? 0}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center gap-3">
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <span className="text-xl">🔥</span>
          </div>
          <div>
            <span className="text-xs text-[#87948b] block">
              {t('driverEngagement.admin.activeStreaks')}
            </span>
            <span className="text-xl font-black text-white">{summary?.activeStreaks ?? 0}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center gap-3">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <span className="text-xl">🏆</span>
          </div>
          <div>
            <span className="text-xs text-[#87948b] block">
              {t('driverEngagement.admin.catalogDefinitions')}
            </span>
            <span className="text-xl font-black text-white">{definitions.length}</span>
          </div>
        </div>
      </div>

      {/* Catalog Table Header & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search code, name, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#181c24] border border-[#262a33] focus:border-[#68dba9] rounded-lg px-3 py-2 text-xs text-[#dfe2ee] outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-[#87948b] text-sm">Loading catalog...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#262a33] bg-[#181c24]">
          <table className="w-full text-left text-xs text-[#dfe2ee]">
            <thead className="bg-[#12151c] text-[#87948b] uppercase text-[10px] tracking-wider border-b border-[#262a33]">
              <tr>
                <th className="px-4 py-3">Badge</th>
                <th className="px-4 py-3">Code / Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Unlocks</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262a33]">
              {filteredDefinitions.map((def) => (
                <tr key={def.id} className="hover:bg-[#1f242d] transition-colors">
                  <td className="px-4 py-3 text-xl">{def.icon}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-emerald-400 font-bold block">{def.code}</span>
                    <span className="text-[#dfe2ee] font-medium">{def.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {def.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{def.targetValue}</td>
                  <td className="px-4 py-3 font-mono text-amber-400">{def._count?.unlocks ?? 0}</td>
                  <td className="px-4 py-3">
                    {def.active ? (
                      <span className="text-emerald-400 font-bold text-[10px]">ACTIVE</span>
                    ) : (
                      <span className="text-slate-500 font-bold text-[10px]">INACTIVE</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenEditModal(def)}
                      className="px-2.5 py-1 rounded bg-[#262a33] text-[#87948b] hover:text-[#dfe2ee]"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#181c24] border border-[#262a33] rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#dfe2ee]">
              {editingItem
                ? t('driverEngagement.admin.editAchievement')
                : t('driverEngagement.admin.newAchievement')}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[#87948b] block mb-1">
                  {t('driverEngagement.admin.codeLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full bg-[#12151c] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] font-mono outline-none focus:border-[#68dba9]"
                />
              </div>

              <div>
                <label className="text-[#87948b] block mb-1">
                  {t('driverEngagement.admin.nameLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#12151c] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] outline-none focus:border-[#68dba9]"
                />
              </div>

              <div>
                <label className="text-[#87948b] block mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#12151c] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] outline-none focus:border-[#68dba9]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#87948b] block mb-1">
                    {t('driverEngagement.admin.categoryLabel')}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#12151c] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] outline-none focus:border-[#68dba9]"
                  >
                    <option value="TRIPS">TRIPS</option>
                    <option value="STREAK">STREAK</option>
                    <option value="RATING">RATING</option>
                    <option value="EARNINGS">EARNINGS</option>
                    <option value="SCHEDULE">SCHEDULE</option>
                    <option value="COMPLIANCE">COMPLIANCE</option>
                    <option value="GOAL">GOAL</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#87948b] block mb-1">
                    {t('driverEngagement.admin.targetLabel')}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.targetValue}
                    onChange={(e) =>
                      setFormData({ ...formData, targetValue: Number(e.target.value) })
                    }
                    className="w-full bg-[#12151c] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] font-mono outline-none focus:border-[#68dba9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#87948b] block mb-1">
                    {t('driverEngagement.admin.iconLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full bg-[#12151c] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] outline-none focus:border-[#68dba9]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="active-toggle"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 accent-[#68dba9]"
                  />
                  <label
                    htmlFor="active-toggle"
                    className="text-[#dfe2ee] font-semibold cursor-pointer"
                  >
                    Active Definition
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#262a33]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#262a33] text-[#dfe2ee] hover:bg-[#353942]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#68dba9] text-[#003822] font-bold hover:bg-[#52c896]"
                >
                  {t('driverEngagement.admin.saveDefinition')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
