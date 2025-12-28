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
            totalSemesterSlots: 0
        };
    });

    if (!semesterStart || !lastWorkingDate) return stats;

    const start = parseISO(semesterStart);
    const end = parseISO(lastWorkingDate);
    const today = startOfDay(new Date());

    if (isAfter(start, end)) return stats;

    const allDays = eachDayOfInterval({ start, end });

    allDays.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayName = format(day, 'EEEE');
        const isFuture = isAfter(day, today);

        // Check global holidays
        if (isSunday(day)) return;
        if (holidays.includes(dayStr)) return;

        // Get slots: Mixed User Data & Default Timetable
        const userRecord = attendance[dayStr] || {};
        const defaultRecord = settings.timetable?.[dayName] || {};

        for (let i = 0; i < 4; i++) {
            // Determine Subject: User Override > Default Timetable
            // Note: If user set subject to 'Free' explicitly, it overrides default.
            let subject = userRecord[i]?.subject;

            // If user hasn't touched this slot, fallback to default
            if (subject === undefined) {
                subject = defaultRecord[i];
            }

            // If no subject or explicitly Free, skip
            if (!subject || subject === 'Free' || !stats[subject]) continue;

            // 1. Semester Projection
            stats[subject].totalSemesterSlots++;

            // 2. Current Progress (Past & Today only)
            if (!isFuture) {
                stats[subject].totalConducted++;

                // Status Logic:
                // User marked 'Absent' -> Absent
                // User marked 'Present' -> Present
                // User marked NOTHING -> Present (Default Rule)
                const status = userRecord[i]?.status;

                if (status === 'Absent') {
                    stats[subject].absent++;
                } else {
                    // Counts as Present if 'Present' OR Empty (and not future)
                    stats[subject].present++;
                }
            }
        }
    });

    // Derive Metrics
    Object.keys(stats).forEach(sub => {
        const s = stats[sub];

        // Current Percentage
        s.percentage = s.totalConducted > 0
            ? ((s.present / s.totalConducted) * 100).toFixed(2)
            : 0;

        // Total Bunks Allowed in the WHOLE Semester (75% rule)
        // Max Absents = 25% of Total Slots
        const maxAbsentsAllowed = Math.floor(s.totalSemesterSlots * 0.25);

        // Remaining Bunks = Max Allowed - Already Taken
        const remainingBunks = maxAbsentsAllowed - s.absent;
        s.safeLeaves = remainingBunks > 0 ? remainingBunks : 0;

        // Classes to Attend (Recover 75%) - Only relevant if current % < 75
        // (Present + x) / (Conducted + x) >= 0.75
        const classesToAttend = Math.ceil(3 * s.totalConducted - 4 * s.present);
        s.classesToAttend = classesToAttend > 0 ? classesToAttend : 0;
    });

    return stats;
};
