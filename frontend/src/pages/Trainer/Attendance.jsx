import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Users,
  CheckCircle2,
  Clock,
  Building,
  ShieldCheck,
} from 'lucide-react';
import trainerService from '../../services/trainerService.js';

export default function Attendance({ onNavigate }) {
  const [data, setData] = useState({ clientAttendance: [], trainerSessions: [], stats: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const res = await trainerService.getAttendance();
        setData(res);
      } catch (err) {
        console.error('Failed to load attendance:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  const { clientAttendance = [], trainerSessions = [], stats = {} } = data;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
          FLOOR RECONCILIATION
        </span>
        <h1
          className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          ATTENDANCE & FLOOR ACTIVITY.
        </h1>
        <p className="text-xs text-[#A3A3A3]">
          Audit coaching sessions delivered and monitor gym facility check-ins for your assigned athletes.
        </p>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#292929] flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">COACHING SESSIONS COMPLETED</span>
            <span
              className="text-3xl font-black text-[#E58A32]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {stats?.completedTrainerSessions || 0}
            </span>
            <span className="text-[10px] text-[#737373]">1-on-1 floor appointments verified</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#E58A32]/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-[#E58A32]" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#141414] border border-[#292929] flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">ATHLETE FACILITY CHECK-INS</span>
            <span
              className="text-3xl font-black text-emerald-400"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {stats?.totalClientCheckIns || 0}
            </span>
            <span className="text-[10px] text-[#737373]">Front desk & turnstile entries</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CalendarCheck className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* ── CLIENT FACILITY ATTENDANCE LOG ── */}
      <div className="p-6 rounded-2xl bg-[#141414] border border-[#292929] flex flex-col gap-4">
        <h2
          className="text-sm font-bold uppercase text-white"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          ASSIGNED ATHLETE GYM CHECK-INS
        </h2>

        {clientAttendance.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#737373]">
            No gym check-in records found for assigned athletes.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {clientAttendance.map((rec) => (
              <div
                key={rec._id}
                className="p-3.5 rounded-xl bg-[#181818] border border-[#292929] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#202020] border border-[#292929] flex items-center justify-center text-[#E58A32] font-bold text-xs">
                    {rec.userId?.name ? rec.userId.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{rec.userId?.name}</span>
                    <span className="text-[11px] text-[#A3A3A3]">{rec.branchId?.name} Branch</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs font-mono font-bold text-[#E58A32]">
                    {new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[10px] text-[#737373]">
                    {new Date(rec.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
