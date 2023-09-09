import React, {createContext, useContext, useEffect, useState} from "react";
import {
    Button,
    Container,
    Drawer,
    Grid,
    Paper,
    Typography,
    IconButton,
    Stack,
    Switch,
} from "@mui/material";

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SettingsIcon from '@mui/icons-material/Settings';

interface SettingsType {
    unit: string,
    unitMultiplier: number,
    rangeMin: number,
    rangeMax: number,
}

const DEFAULT_SETTINGS: SettingsType = {
    unit: "mmol/L",
    unitMultiplier: 1,
    rangeMin: 4.0,
    rangeMax: 8.5,
};

const SettingsContext = createContext<{ settings: SettingsType; setSettings: React.Dispatch<React.SetStateAction<SettingsType>> } | undefined>(undefined);

export function convertUnit(mmol: number, settings: SettingsType): number {
    if (settings.unit === "mg/dL") {
        return Math.round(mmol * 18.0182);
    } else {
        return mmol;
//        return parseFloat(mmol.toFixed(1));
    }
}

export const useSettings = () => {
    return useContext(SettingsContext);
};

export const SettingsProvider = ({children}) => {
    const [settings, setSettings] = useState<SettingsType>(() => {
        const settingsJson = localStorage.getItem('settings');
        return settingsJson ? JSON.parse(settingsJson) : DEFAULT_SETTINGS;
    });

    useEffect(() => {
        localStorage.setItem('settings', JSON.stringify(settings));
    }, [settings]);

    return (
        <SettingsContext.Provider value={{settings, setSettings}}>
            {children}
        </SettingsContext.Provider>
    );
};

export function SettingsButton() {
    const {settings, setSettings} = useSettings();
    const [settingsOpen, setSettingsOpen] = useState(false);

    const toggleSettings = (open) => (event) => {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }
        setSettingsOpen(open);
    };

    const changeUnit = (event) => {
        if (event.target.checked) {
            setSettings({...settings, unit: "mg/dL", unitMultiplier: 18.0182});
        } else {
            setSettings({...settings, unit: "mmol/L", unitMultiplier: 1});
        }
    };

    const changeMin = (event) => {
        let inputValue = parseFloat(event.target.value).toFixed(1);
        setSettings({...settings, rangeMin: inputValue});
    };

    const changeMax = (event) => {
        let inputValue = parseFloat(event.target.value).toFixed(1);
        setSettings({...settings, rangeMax: inputValue});
    };

    return (
        <div>
            <Button color="inherit" onClick={toggleSettings(true)}>
                <SettingsIcon/>
            </Button>
            <Drawer anchor="right" open={settingsOpen} onClose={toggleSettings(false)}>
                <Container>
                    <Grid item xs={2} spacing={3}>
                        <Stack spacing={3} direction="column" alignItems="flex-start">
                            <IconButton onClick={toggleSettings(false)}>
                                <ChevronRightIcon/>
                            </IconButton>
                            <Paper>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography>mmol/L</Typography>
                                    <Switch checked={settings.unit === "mg/dL"} onChange={changeUnit}/>
                                    <Typography>mg/dL</Typography>
                                </Stack>
                            </Paper>
                            <Paper>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography>Range max:</Typography>
                                    <input type="number" value={settings.rangeMax} onChange={changeMax} min={0} max={14}
                                           step={0.1}/>
                                </Stack>
                            </Paper>
                            <Paper>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography>Range min:</Typography>
                                    <input type="number" value={settings.rangeMin} onChange={changeMin} min={0} max={14}
                                           step={0.1}/>
                                </Stack>
                            </Paper>
                        </Stack>
                    </Grid>
                </Container>
            </Drawer>
        </div>
    )
}
