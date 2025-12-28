import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import { calculateStats } from '../utils/calculations';
import { AlertCircle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [needsSetup, setNeedsSetup] = useState(false);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = () => {
        const data = storageService.getData(user.id);
        if (!data || !data.settings.semesterStart || data.settings.subjects.length === 0) {
            setNeedsSetup(true);
            setLoading(false);
            return;
        }

        const calculatedStats = calculateStats(data);
        setStats(calculatedStats);
        setLoading(false);
    };

    if (loading) return <div>Loading dashboard...</div>;

    if (needsSetup) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                    <AlertCircle size={40} className="text-violet-400" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-pink-400">
                        Let's Get Started!
                    </h2>
                    <p className="text-slate-400 mt-2 max-w-md">
                        Please configure your course details, semester dates, and subjects to begin tracking your attendance.
                    </p>
                </div>
                <Link to="/settings" className="btn btn-primary">
                    Setup Now <ArrowRight size={18} />
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">Dashboard</h2>
                    <p className="text-slate-400">Overview of your attendance performance.</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div> Safe
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-sm">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Risk
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {Object.entries(stats).map(([subject, data]) => {
                    const percentage = parseFloat(data.percentage);
                    const isSafe = percentage >= 75;
                    const progressColor = isSafe ? 'bg-green-500' : 'bg-red-500';
                    const progressTrack = isSafe ? 'bg-green-500/20' : 'bg-red-500/20';

                    return (
                        <div key={subject} className="glass-card hover:border-slate-600 transition-colors p-6 flex flex-col gap-4 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity ${isSafe ? 'text-green-500' : 'text-red-500'}`}>
                                {isSafe ? <CheckCircle size={120} /> : <XCircle size={120} />}
                            </div>

                            <div className="flex justify-between items-start z-10">
                                <h3 className="text-xl font-bold text-white truncate pr-4">{subject}</h3>
                                <div className={`text-2xl font-bold ${isSafe ? 'text-green-400' : 'text-red-400'}`}>
                                    {percentage}%
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className={`h-3 w-full rounded-full ${progressTrack} z-10`}>
                                <div
                                    className={`h-full rounded-full ${progressColor} transition-all duration-1000 ease-out`}
                                    style={{ width: `${Math.min(100, percentage)}%` }}
                                ></div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-2 mt-2 z-10">
                                <div className="bg-slate-900/40 rounded-lg p-2 text-center">
                                    <div className="text-xs text-slate-500 uppercase font-semibold">Attended</div>
                                    <div className="text-lg font-bold text-slate-200">{data.present}</div>
                                </div>
                                <div className="bg-slate-900/40 rounded-lg p-2 text-center">
                                    <div className="text-xs text-slate-500 uppercase font-semibold">Absent</div>
                                    <div className="text-lg font-bold text-slate-200">{data.absent}</div>
                                </div>
                                <div className="bg-slate-900/40 rounded-lg p-2 text-center">
                                    <div className="text-xs text-slate-500 uppercase font-semibold">Total</div>
                                    <div className="text-lg font-bold text-slate-200">{data.totalConducted}</div>
                                </div>
                            </div>

                            {/* Advice / Status */}
                            <div className="mt-2 pt-4 border-t border-white/5 z-10">
                                {isSafe ? (
                                    <div className="text-green-400 flex items-start gap-2">
                                        <CheckCircle className="shrink-0 mt-1" size={16} />
                                        <div>
                                            <span className="font-semibold">{data.safeLeaves}</span> Safe Bunks Remaining
                                            <p className="text-xs text-slate-400 mt-1">You can skip {data.safeLeaves} more classes this semester.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-red-400 flex items-start gap-2">
                                        <AlertCircle className="shrink-0 mt-1" size={16} />
                                        <div>
                                            Attend <span className="font-semibold">{data.classesToAttend}</span> more classes
                                            <p className="text-xs text-slate-400 mt-1">To get back to 75% current attendance.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
