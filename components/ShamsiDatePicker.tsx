import React, { useState, useEffect } from 'react';
import { gregorianToJalali, jalaliToGregorian } from '../utils/dateConverter';

interface ShamsiDatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (value: string) => void;
    label: string;
}

const ShamsiDatePicker: React.FC<ShamsiDatePickerProps> = ({ value, onChange, label }) => {
    const [shamsi, setShamsi] = useState({ y: '', m: '', d: '' });

    useEffect(() => {
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [gy, gm, gd] = value.split('-').map(Number);
            if (!isNaN(gy) && !isNaN(gm) && !isNaN(gd)) {
                const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
                setShamsi({ y: String(jy), m: String(jm), d: String(jd) });
            }
        } else {
            // If the value is cleared, clear the shamsi inputs as well
             const today = new Date();
             const [jy, jm, jd] = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
             setShamsi({ y: String(jy), m: String(jm), d: String(jd) });
        }
    }, [value]);

    const handleInputChange = (part: 'y' | 'm' | 'd', val: string) => {
        const newShamsi = { ...shamsi, [part]: val };
        setShamsi(newShamsi);

        const jy = parseInt(newShamsi.y, 10);
        const jm = parseInt(newShamsi.m, 10);
        const jd = parseInt(newShamsi.d, 10);

        if (!isNaN(jy) && !isNaN(jm) && !isNaN(jd) && jy > 1000 && jm > 0 && jm < 13 && jd > 0 && jd < 32) {
            try {
                const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
                const gDateString = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
                onChange(gDateString);
            } catch (e) {
                // Invalid date combo (e.g., 1403/01/32), do nothing and wait for user to correct
            }
        }
    };

    return (
        <div>
            <label className="text-sm text-slate-400">{label}</label>
            <div className="flex items-center gap-1">
                <input
                    type="text"
                    placeholder="سال"
                    value={shamsi.y}
                    onChange={e => handleInputChange('y', e.target.value)}
                    className="w-2/5 text-lg px-2 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100"
                />
                <span className="text-slate-500">/</span>
                <input
                    type="text"
                    placeholder="ماه"
                    value={shamsi.m}
                    maxLength={2}
                    onChange={e => handleInputChange('m', e.target.value)}
                    className="w-1/4 text-lg px-2 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100"
                />
                 <span className="text-slate-500">/</span>
                <input
                    type="text"
                    placeholder="روز"
                    value={shamsi.d}
                     maxLength={2}
                    onChange={e => handleInputChange('d', e.target.value)}
                    className="w-1/4 text-lg px-2 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100"
                />
            </div>
        </div>
    );
};

export default ShamsiDatePicker;