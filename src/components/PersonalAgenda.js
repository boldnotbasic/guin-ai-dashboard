import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../utils/supabaseClient';

const PersonalAgenda = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [destinations, setDestinations] = useState([]);
  const [festivals, setFestivals] = useState([]);
  const [hikes, setHikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);

  const formatLocalDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [dests, fests, hs] = await Promise.all([
          db.destinations.getAll(),
          db.festivals.getAll(),
          db.hikes.getAll()
        ]);
        setDestinations(dests || []);
        setFestivals(fests || []);
        setHikes(hs || []);
      } catch (error) {
        console.error('Error loading agenda data:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const events = useMemo(() => {
    const toDayStringFromTimestamp = (ts) => {
      if (!ts) return null;
      const s = String(ts);
      if (s.includes('T')) return s.split('T')[0];
      return s;
    };

    const destEvents = (destinations || [])
      .filter(d => d.start_date)
      .map(d => ({
        id: `reis-${d.id}`,
        type: 'reis',
        title: d.name,
        subtitle: d.country || null,
        start: d.start_date,
        end: d.end_date || d.start_date,
        color: 'from-blue-500 to-sky-600'
      }));

    const festEvents = (festivals || [])
      .filter(f => f.start_date)
      .map(f => ({
        id: `festival-${f.id}`,
        type: 'festival',
        title: f.name,
        subtitle: f.location || null,
        start: f.start_date,
        end: f.end_date || f.start_date,
        color: 'from-fuchsia-500 to-pink-600'
      }));

    const hikeEvents = (hikes || []).map(h => {
      const day = h.date || h.planned_date || toDayStringFromTimestamp(h.created_at);
      return {
        id: `wandeling-${h.id}`,
        type: 'wandeling',
        title: h.name,
        subtitle: h.location || null,
        start: day,
        end: day,
        color: 'from-emerald-500 to-green-600'
      };
    }).filter(e => e.start);

    return [...destEvents, ...festEvents, ...hikeEvents];
  }, [destinations, festivals, hikes]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return days;
  };

  const isDateInRange = (dateStr, startStr, endStr) => {
    if (!dateStr || !startStr) return false;
    const date = new Date(dateStr);
    const start = new Date(startStr);
    const end = new Date(endStr || startStr);
    if (Number.isNaN(date.getTime()) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return d >= Math.min(s, e) && d <= Math.max(s, e);
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = formatLocalDate(date);
    return events.filter(ev => isDateInRange(dateStr, ev.start, ev.end));
  };

  const openDayModal = (date) => {
    const dayEvents = getEventsForDate(date);
    setSelectedDayEvents(dayEvents);
    setSelectedDate(date);
    setShowDayModal(true);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
  const dayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Calendar className="w-6 h-6 mr-3" />
          Agenda
        </h2>
        <div className="flex items-center space-x-4">
          <button onClick={prevMonth} className="p-2 text-white/80 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-medium min-w-[200px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={nextMonth} className="p-2 text-white/80 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="glass-effect rounded-xl p-6">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {dayNames.map(day => (
            <div key={day} className="text-center text-white/60 font-medium text-sm py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {getDaysInMonth().map((date, index) => {
            const dayEvents = date ? getEventsForDate(date) : [];
            const isToday = date && date.toDateString() === new Date().toDateString();

            return (
              <div
                key={index}
                className={`min-h-24 p-2 rounded-lg border-2 cursor-pointer hover:bg-white/5 transition-colors ${
                  date ? 'bg-white/5 border-white/10' : 'border-transparent'
                } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                onClick={() => {
                  if (!date) return;
                  openDayModal(date);
                }}
              >
                {date && (
                  <>
                    <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-400' : 'text-white/80'}`}>
                      {date.getDate()}
                    </div>

                    {loading ? (
                      <div className="text-xs text-white/40">…</div>
                    ) : dayEvents.length === 0 ? null : (
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(ev => (
                          <div
                            key={ev.id}
                            className={`text-xs px-2 py-1 rounded bg-gradient-to-r ${ev.color} bg-opacity-20 text-white/90 truncate`}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-white/60">+{dayEvents.length - 3} meer</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl font-semibold">
                {selectedDate.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <button onClick={() => setShowDayModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="text-white/60">Geen events.</div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map(ev => (
                  <div key={ev.id} className="glass-effect rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-semibold truncate">{ev.title}</div>
                        <div className="text-white/60 text-sm">
                          {ev.type === 'reis' ? 'Reis' : ev.type === 'festival' ? 'Festival' : 'Wandeling'}
                          {ev.subtitle ? ` • ${ev.subtitle}` : ''}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs text-white bg-gradient-to-r ${ev.color} bg-opacity-20`}>{ev.type}</div>
                    </div>
                    <div className="mt-2 text-white/70 text-sm">
                      {ev.start}{ev.end && ev.end !== ev.start ? ` → ${ev.end}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalAgenda;
