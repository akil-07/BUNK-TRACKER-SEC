import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import { SLOT_TIMES } from '../utils/calculations';
import { format, addDays, subDays, isSunday, isAfter, parseISO, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Save, Check, X, Ban } from 'lucide-react';
import clsx from 'clsx';

export default function CalendarPage() {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [record, setRecord] = useState({
        0: { subject: '', status: '' },
        1: { subject: '', status: '' },
        2: { subject: '', status: '' },
        3: { subject: '', status: '' }
    });
    const [subjects, setSubjects] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [fullData, setFullData] = useState(null);
    const [isHolidayDate, setIsHolidayDate] = useState(false);
    const [isSundayDate, setIsSundayDate] = useState(false);
    const [savedMessage, setSavedMessage] = useState(false);

    useEffect(() => {
        if (user) {
            const data = storageService.getData(user.id);
            if (data) {
                setFullData(data);
                setSubjects(data.settings.subjects);
                setHolidays(data.holidays || []);
            }
        }
    }, [user]);

    useEffect(() => {
        if (fullData) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const dayRecord = fullData.attendance[dateStr] || {};
            const isSun = isSunday(selectedDate);
            const isHol = (fullData.holidays || []).includes(dateStr);

            setIsSundayDate(isSun);
            setIsHolidayDate(isHol);

            // Initialize slots
            // If valid working day AND no record exists yet, try to fill from timetable
            const dayName = format(selectedDate, 'EEEE');
            const defaultSubjects = (!isSun && !isHol && fullData.settings.timetable && fullData.settings.timetable[dayName])
                ? fullData.settings.timetable[dayName]
                : {};

            const isFuture = isAfter(startOfDay(selectedDate), startOfDay(new Date()));

            const newRecord = {};
            for (let i = 0; i < 4; i++) {
                // Existing record > Default Timetable > Empty
                const existingSlot = dayRecord[i];
                if (existingSlot) {
                    newRecord[i] = existingSlot;
                } else {
                    const defaultSubject = defaultSubjects[i] || '';
                    // Default to 'Present' if we have a subject and it's not a future date
                    const defaultStatus = (defaultSubject && defaultSubject !== 'Free' && !isFuture) ? 'Present' : '';

                    newRecord[i] = {
                        subject: defaultSubject,
                        status: defaultStatus
                    };
                }
            }
            setRecord(newRecord);
            setSavedMessage(false);
        }
    }, [selectedDate, fullData]);

    const handleDateChange = (days) => {
        setSelectedDate(d => {
            const newDate = days > 0 ? addDays(d, days) : subDays(d, Math.abs(days));
            return newDate;
        });
    };

    const updateSlot = (index, field, value) => {
        setRecord(prev => ({
            ...prev,
            [index]: { ...prev[index], [field]: value }
        }));
    };

    const saveDay = () => {
        if (!fullData) return;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        // Prune empty slots? No, keep what is set.
        const newAttendance = {
            ...fullData.attendance,
            [dateStr]: record
        };

        const newData = { ...fullData, attendance: newAttendance };
        storageService.saveData(user.id, newData);
        setFullData(newData);
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 2000);
    };

    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const dateLabel = format(selectedDate, 'EEEE, MMMM do, yyyy');

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-20">
            <header className="flex flex-col gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">Daily Routine</h2>
                    <p className="text-slate-400">Mark your attendance for specific time slots.</p>
                </div>

                {/* Date Navigator */}
                <div className="glass p-4 rounded-xl flex items-center justify-between">
                    <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-violet-400">{dateLabel}</h3>
                        {isToday && <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Today</span>}
                    </div>
                    <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                        <ChevronRight size={24} />
                    </button>
                </div>
            </header>

            {/* Holiday Constraints */}
            {(isSundayDate || isHolidayDate) && (
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-8 rounded-2xl flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <CalendarIcon size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">{isSundayDate ? 'Happy Sunday!' : 'Holiday'}</h3>
                        <p className="opacity-80">This day is marked as a holiday. No attendance tracking required.</p>
                    </div>
                </div>
            )}

            {/* Slots */}
            {!isSundayDate && !isHolidayDate && (
                <div className="space-y-4">
                    {SLOT_TIMES.map((time, index) => {
                        const slot = record[index];
                        const isFree = slot.subject === 'Free' || !slot.subject;

                        return (
                            <div key={index} className="glass-card p-4 transition-colors border-l-4 border-l-transparent hover:border-l-violet-500">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    {/* Time */}
                                    <div className="md:w-32 shrink-0">
                                        <span className="font-mono text-slate-400 font-semibold">{time}</span>
                                    </div>

                                    {/* Subject Selector */}
                                    <div className="flex-1">
                                        <select
                                            className="input-base py-2"
                                            value={slot.subject || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                updateSlot(index, 'subject', val);
                                                // Reset status if clearing subject
                                                if (!val) updateSlot(index, 'status', '');
                                                // Default to present if selecting a subject
                                                if (val && val !== 'Free' && !slot.status) updateSlot(index, 'status', 'Present');
                                            }}
                                        >
                                            <option value="">-- Select Subject --</option>
                                            <option value="Free">Free / No Class</option>
                                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>

                                    {/* Status Toggles */}
                                    <div className="flex gap-2">
                                        <button
                                            disabled={isFree}
                                            onClick={() => updateSlot(index, 'status', 'Present')}
                                            className={clsx(
                                                "flex items-center gap-1 px-3 py-2 rounded-lg border transition-all",
                                                slot.status === 'Present'
                                                    ? "bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/20"
                                                    : "border-slate-700 text-slate-400 hover:bg-slate-800",
                                                isFree && "opacity-30 cursor-not-allowed"
                                            )}
                                        >
                                            <Check size={16} /> Present
                                        </button>
                                        <button
                                            disabled={isFree}
                                            onClick={() => updateSlot(index, 'status', 'Absent')}
                                            className={clsx(
                                                "flex items-center gap-1 px-3 py-2 rounded-lg border transition-all",
                                                slot.status === 'Absent'
                                                    ? "bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20"
                                                    : "border-slate-700 text-slate-400 hover:bg-slate-800",
                                                isFree && "opacity-30 cursor-not-allowed"
                                            )}
                                        >
                                            <X size={16} /> Absent
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Save Button */}
                    <div className="sticky bottom-6 flex justify-end">
                        <div className="glass p-2 rounded-xl flex items-center gap-4">
                            {savedMessage && (
                                <span className="text-green-400 text-sm font-medium animate-pulse">Changes Saved</span>
                            )}
                            <button onClick={saveDay} className="btn btn-primary shadow-xl">
                                <Save size={18} /> Save Day
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const CalendarIcon = ({ size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);
