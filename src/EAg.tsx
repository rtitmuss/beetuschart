import React from "react";
import {
    Typography,
} from "@mui/material";
import {convertUnit, useSettings} from './SettingsContext.tsx';

interface eAGType {
    a1c: number,
    averageCgm: number,
    numberReadings: number,
}

export function calculateEAG(logEntries): eAGType {
    const cgmReadings = logEntries.filter(entry => entry.cgm);
    const averageMmolL = (cgmReadings.length > 0) ? cgmReadings.reduce((acc, entry) => acc + entry.cgm, 0) / cgmReadings.length : 0;
    const averageMgDl = averageMmolL * 18.0182
    const a1c = (averageMgDl + 46.7) / 28.7

    return {
        a1c: a1c,
        averageCgm: averageMmolL,
        numberReadings: cgmReadings.length,
    }
}
