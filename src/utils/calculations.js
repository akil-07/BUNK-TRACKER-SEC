import { eachDayOfInterval, isSunday, isBefore, isAfter, parseISO, format, startOfDay } from 'date-fns';

export const SLOT_TIMES = [
    '8:00 – 10:00',
    '10:00 – 12:00',
    '1:00 – 3:00',
    '3:00 – 5:00'
];

export const calculateStats = (data) => {
    const { settings, holidays, attendance } = data;
    const { semesterStart, lastWorkingDate, subjects } = settings;

    // Initialize stats per subject
    const stats = {};
    subjects.forEach(sub => {
        stats[sub] = {
            present: 0,
            absent: 0,
            totalConducted: 0,
            totalProjected: 0 // For determining max leaves in semester
        };
    });

    if (!semesterStart || !lastWorkingDate) return stats;

    const start = parseISO(semesterStart);
    const end = parseISO(lastWorkingDate);
    const today = startOfDay(new Date());

    // If dates are invalid
    if (isAfter(start, end)) return stats;

    const allDays = eachDayOfInterval({ start, end });

    // 1. Calculate Historical & Known Stats
    // We strictly follow the "Attendance must be calculated using only the days completed so far" rule for current %.

    allDays.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const isFuture = isAfter(day, today);

        // Check global holidays
        if (isSunday(day)) return;
        if (holidays.includes(dayStr)) return;

        // Get slots for this day
        const dayRecord = attendance[dayStr] || {};

        // For each of the 4 slots
        for (let i = 0; i < 4; i++) {
            const slot = dayRecord[i];

            // If it's a known slot
            if (slot) {
                if (slot.status === 'Free' || !slot.status) continue; // Doesn't count if free or unmarked
                if (slot.subject && stats[slot.subject]) {
                    // If it's in the past or today, we count it towards "Conducted"
                    if (!isFuture) {
                        stats[slot.subject].totalConducted++;
                        if (slot.status === 'Present') stats[slot.subject].present++;
                        else if (slot.status === 'Absent') stats[slot.subject].absent++;
                    }

                    // For projected totals, we assume it counts unless Free
                    stats[slot.subject].totalProjected++;
                }
            }
            // If NO slot data exists for a day (untouched by user)
            // AND it's in the past -> We don't know the subject. 
            // We cannot penalize a specific subject if we don't know which one it was.
            // Thus, we strictly rely on USER INPUT for "Subject". 
            // If the user hasn't set a subject for a slot, it doesn't exist in calculations.
            // This avoids the "Default Timetable" complexity.
        }
    });

    // 2. Derive Derived Metrics
    Object.keys(stats).forEach(sub => {
        const s = stats[sub];
        s.percentage = s.totalConducted > 0
            ? ((s.present / s.totalConducted) * 100).toFixed(2)
            : 0;

        // "Maximum leaves allowed in the entire semester" (Based on Projected)
        // Max Leaves = Floor(Total * 0.25)
        // Note: This is an estimate if we don't know future schedule. 
        // If we only know past subjects, "Projected" might equal "Conducted", which makes this metric mostly "Max leaves allowed so far".
        // To be useful, we'd need a Weekly Timetable. 
        // Since we don't have one, we will base "Max Leaves" on "Conducted" (So far) 
        // OR we hide "Semester Max" if we can't predict it?
        // User Update: "For each subject, calculate... Maximum leaves allowed in the entire semester".
        // Without a timetable, we can't know total slots of Math in the semester.
        // **Fallback**: We will show "Max leaves allowed (based on current progress)" or just hide it?
        // Better: We calculate "Safe Leaves" (Bunkable) based on *current* stats.

        // Safe Leaves Calculation (Bunkable now)
        // Formula: how many consecutive absents until < 75%?
        // (P) / (C + x) >= 0.75  =>  x <= (P/0.75) - C
        const safeLeaves = Math.floor((s.present / 0.75) - s.totalConducted);
        s.safeLeaves = safeLeaves > 0 ? safeLeaves : 0;

        // Classes needed to attend (if safe < 0)
        // (P + x) / (C + x) >= 0.75 => P + x >= 0.75C + 0.75x => 0.25x >= 0.75C - P => x >= (0.75C - P) / 0.25
        // Simplify: x >= 3C - 4P
        const classesToAttend = Math.ceil(3 * s.totalConducted - 4 * s.present);
        s.classesToAttend = classesToAttend > 0 ? classesToAttend : 0;
    });

    return stats;
};
