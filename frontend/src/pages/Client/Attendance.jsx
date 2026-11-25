import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Flame,
  Award,
  AlertCircle,
} from 'lucide-react';
import clientService from '../../services/clientService.js';

export default function Attendance() {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const res = await clientService.getAttendance();
        if (isMounted) setAttendanceData(res);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load attendance records');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAttendance();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-[#181818] rounded-xl w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-28 bg-[#181818] rounded-2xl" />
          <div className="h-28 bg-[#181818] rounded-2xl" />
          <div className="h-28 bg-[#181818] rounded-2xl" />
        </div>
        <div className="h-64 bg-[#181818] rounded-2xl" />
      </div>
    );
  }

  const { totalThisMonth = 0, totalThisYear = 0, records = [] } = attendanceData || {};

  // Build calendar days for the current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Set of attended day numbers
  const attendedDays = new Set(
    records
      .filter((r) => {
        const d = new Date(r.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((r) => new Date(r.date).getDate())
  );

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
          CONSISTENCY METRICS
        </span>
        <h1
          className="uppercase font-bold tracking-tight text-[#F5F5F5]"
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
          }}
        >
          GYM ATTENDANCE LOG.
        </h1>
        <p className="text-xs sm:text-sm text-[#B8B8B8]">
          Official check-in records verified at Kovilpatti, Karur, and Sivakasi facilities.
        </p>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">THIS MONTH</span>
          <div className="flex items-baseline gap-2 my-2">
            <span className="text-3xl font-bold text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {totalThisMonth}
            </span>
            <span className="text-xs text-[#B8B8B8]">sessions</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">Active Gym Attendance</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">YEAR TO DATE</span>
          <div className="flex items-baseline gap-2 my-2">
            <span className="text-3xl font-bold text-[#EB3E2E]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {totalThisYear}
            </span>
            <span className="text-xs text-[#B8B8B8]">total visits</span>
          </div>
          <span className="text-[10px] text-[#B8B8B8]">Cumulative in {year}</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">CONSISTENCY STATUS</span>
          <div className="flex items-center gap-2 my-2">
            <Flame className="w-6 h-6 text-[#EB3E2E]" />
            <span className="text-xl font-bold text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {totalThisMonth >= 12 ? 'DEDICATED' : totalThisMonth >= 4 ? 'CONSISTENT' : 'ON TRACK'}
            </span>
          </div>
          <span className="text-[10px] text-[#B8B8B8]">Official Check-in System</span>
        </div>
      </div>

      {/* ── CALENDAR VIEW ── */}
      <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#303030] pb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-[#EB3E2E] uppercase font-bold">MONTHLY VISUAL</span>
            <h3 className="text-base font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {monthNames[month]} {year}
            </h3>
          </div>
          <span className="text-xs text-[#B8B8B8]">{attendedDays.size} days attended this month</span>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-[#B8B8B8] font-bold py-2">
          <span>SUN</span>
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Empty offset days */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10 sm:h-12 rounded-xl bg-transparent" />
          ))}

          {/* Actual days in month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isAttended = attendedDays.has(dayNum);
            const isToday = dayNum === now.getDate();

            return (
              <div
                key={`day-${dayNum}`}
                className={`h-10 sm:h-12 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  isAttended
                    ? 'bg-[#EB3E2E] border-[#EB3E2E] text-white font-bold shadow-[0_0_12px_rgba(235,62,46,0.30)]'
                    : isToday
                    ? 'bg-[#202020] border-[#EB3E2E] text-[#F5F5F5]'
                    : 'bg-[#202020] border-[#303030] text-[#B8B8B8]'
                }`}
              >
                <span className="text-xs">{dayNum}</span>
                {isAttended && <span className="text-[8px] uppercase tracking-tighter">Attended</span>}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 pt-3 border-t border-[#303030] text-xs text-[#B8B8B8]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#EB3E2E]" />
            <span>Attended</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border border-[#EB3E2E] bg-[#202020]" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border border-[#303030] bg-[#202020]" />
            <span>Neutral / Rest</span>
          </div>
        </div>
      </div>

      {/* ── ATTENDANCE LOG TABLE ── */}
      <div className="p-6 rounded-2xl bg-[#181818] border border-[#303030] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#303030] pb-3">
          <h3 className="text-base font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            CHECK-IN RECORD HISTORY
          </h3>
          <span className="text-xs font-mono text-[#B8B8B8]">Staff &amp; QR Verified</span>
        </div>

        {records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#303030] text-[10px] font-mono text-[#B8B8B8] uppercase">
                  <th className="py-2.5 px-3">DATE</th>
                  <th className="py-2.5 px-3">CHECK-IN TIME</th>
                  <th className="py-2.5 px-3">BRANCH</th>
                  <th className="py-2.5 px-3">VERIFICATION METHOD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303030]">
                {records.map((rec) => (
                  <tr key={rec._id} className="hover:bg-[#202020] transition-colors">
                    <td className="py-3 px-3 font-bold text-[#F5F5F5]">
                      {new Date(rec.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#B8B8B8]">
                      {rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                    </td>
                    <td className="py-3 px-3 text-[#F5F5F5]">
                      {rec.branchId?.city || 'Home'} Branch
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#EB3E2E]/10 text-[#EB3E2E] border border-[#EB3E2E]/30">
                        {rec.method || 'STAFF_CHECKIN'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#B8B8B8]">
            No attendance check-ins recorded yet. Check in with reception at your branch.
          </div>
        )}
      </div>
    </div>
  );
}
