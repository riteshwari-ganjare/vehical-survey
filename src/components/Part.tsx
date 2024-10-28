"use client";
import React, { lazy, Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import {
    Container,
    Grid,
    Paper,
    Typography,
    FormControl,
    CircularProgress,
    Snackbar,
    TextField,
    Card,
    CardContent,
    AppBar,
    Toolbar,
} from '@mui/material';
import { Autocomplete } from '@mui/lab';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { Chart, registerables } from 'chart.js';
import { EVData } from '../../type';

Chart.register(...registerables);

const DataGridLazy = lazy(() => import('@mui/x-data-grid').then(module => ({ default: module.DataGrid })));
const BarChart = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Bar })));
const PieChart = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Pie })));

const Alert = React.forwardRef<HTMLDivElement, AlertProps>((props, ref) => (
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
));

const Dashboard: React.FC = () => {
    const [data, setData] = useState<EVData[]>([]);
    const [loading, setLoading] = useState(true);
    const [makeFilter, setMakeFilter] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch('/Electric_Vehicle_Population_Data.csv');
            if (!response.ok) throw new Error('Failed to fetch data');

            const text = await response.text();
            Papa.parse<EVData>(text, {
                header: true,
                complete: ({ data }) => {
                    setData(data);
                    setLoading(false);
                },
            });
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCloseSnackbar = () => setError(null);

    const filteredData = useMemo(() => {
        return makeFilter ? data.filter(item => item.Make === makeFilter) : data;
    }, [data, makeFilter]);

    const vehicleCounts = useMemo(() => {
        return filteredData.reduce((acc: Record<string, number>, item: EVData) => {
            const type = item["Electric Vehicle Type"] || 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
    }, [filteredData]);

    const totalVehicles = filteredData.length;

    const columns = useMemo(() => [
        { field: 'id', headerName: 'ID', width: 100 },
        { field: 'Model', headerName: 'Model', width: 150 },
        { field: 'Model Year', headerName: 'Model Year', width: 120 },
        { field: 'City', headerName: 'City', width: 120 },
        { field: 'County', headerName: 'County', width: 120 },
        { field: 'State', headerName: 'State', width: 100 },
        { field: 'ElectricRange', headerName: 'Electric Range (miles)', width: 180 },
        { field: 'CAFVEligibility', headerName: 'CAFV Eligibility', width: 250 },
    ], []);

    const rows = useMemo(() => {
        return filteredData.map((item, index) => ({
            id: index,
            Model: `${item.Make} - ${item.Model || 'N/A'}`,
            ModelYear: item["Model Year"] || 'N/A',
            City: item.City || 'N/A',
            County: item.County || 'N/A',
            State: item.State || 'N/A',
            ElectricRange: item["Electric Range"] || 'N/A',
            CAFVEligibility: item["Clean Alternative Fuel Vehicle (CAFV) Eligibility"] || 'N/A',
        }));
    }, [filteredData]);

    const makes = useMemo(() => {
        return Array.from(new Set(data.map(item => item.Make))).map(make => ({ label: make }));
    }, [data]);

    const chartData = useMemo(() => ({
        labels: filteredData.map(item => `${item.Make} ${item.Model}`),
        datasets: [{
            label: 'Electric Range (miles)',
            data: filteredData.map(item => item["Electric Range"] || 0),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
        }],
    }), [filteredData]);

    return (
        <>
            <AppBar position="fixed" sx={{ background: "rgb(30,30,30)" }}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Electric Vehicle (EV) Population
                    </Typography>
                </Toolbar>
            </AppBar>
            <Container sx={{ marginTop: "80px",marginBottom:"20px" }}>
                <FormControl variant="outlined" fullWidth>
                    <Autocomplete
                        options={makes}
                        getOptionLabel={(option) => option.label}
                        value={makeFilter ? { label: makeFilter } : null}
                        onChange={(event, newValue) => setMakeFilter(newValue ? newValue.label : null)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                variant="outlined"
                                sx={{ backgroundColor: '#1e1e1e', border: "1px solid white", color: "#fff", mb: 2 }}
                                placeholder='Select Vehicle Brand here'
                                InputProps={{
                                    ...params.InputProps,
                                    sx: { color: '#fff' },
                                }}
                                InputLabelProps={{ sx: { color: '#fff' } }}
                            />
                        )}
                    />
                </FormControl>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ backgroundColor: '#1e1e1e', height: '100px', border: "1px solid white" }}>
                            <CardContent>
                                <Typography sx={{ color: '#ffffff', fontSize: "16px" }}>Total Vehicles</Typography>
                                <Typography sx={{ color: '#4CAF50', fontSize: "14px" }}>{totalVehicles}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    {Object.entries(vehicleCounts).map(([type, count]) => (
                        <Grid item xs={12} md={3} key={type}>
                            <Card sx={{ backgroundColor: '#1e1e1e', height: '100px', border: "1px solid white" }}>
                                <CardContent>
                                    <Typography sx={{ color: '#ffffff', fontSize: "16px" }}>{type}</Typography>
                                    <Typography sx={{ color: '#4CAF50', fontSize: "14px" }}>{count}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Paper elevation={6} sx={{ p: 2, borderRadius: '12px', backgroundColor: '#1e1e1e', border: "1px solid white" }}>
                            <Typography variant="h5" sx={{ color: '#ffffff', fontSize: "18px" }}>Electric Range Distribution</Typography>
                            <div style={{ height: '250px' }}>
                                <Suspense fallback={<CircularProgress />}>
                                    <BarChart data={chartData} options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                            y: { beginAtZero: true, grid: { color: '#424242' }, ticks: { color: '#ffffff' }},
                                            x: { ticks: { color: '#ffffff', font: { size: 10 } }},
                                        },
                                        plugins: { legend: { position: 'top', labels: { color: '#ffffff' }}},
                                    }} />
                                </Suspense>
                            </div>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper elevation={6} sx={{ p: 2, borderRadius: '12px', backgroundColor: '#1e1e1e', border: "1px solid white" }}>
                            <Typography variant="h5" sx={{ color: '#ffffff', fontSize: "18px" }}>CAFV Eligibility</Typography>
                            <div style={{ height: '250px' }}>
                                <Suspense fallback={<CircularProgress />}>
                                    <PieChart data={{
                                        labels: ['Eligible', 'Not Eligible'],
                                        datasets: [{
                                            data: [
                                                filteredData.filter(item => item["Clean Alternative Fuel Vehicle (CAFV) Eligibility"]?.includes('Eligible')).length,
                                                filteredData.length - filteredData.filter(item => item["Clean Alternative Fuel Vehicle (CAFV) Eligibility"]?.includes('Eligible')).length,
                                            ],
                                            backgroundColor: ['#4CAF50', '#F44336'],
                                        }],
                                    }} options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'top', labels: { color: '#ffffff' }}},
                                    }} />
                                </Suspense>
                            </div>
                        </Paper>
                    </Grid>
                </Grid>

                <Snackbar open={Boolean(error)} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                    <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
                        {error}
                    </Alert>
                </Snackbar>

                <Suspense fallback={<CircularProgress />}>
                    <DataGridLazy
                        rows={rows}
                        columns={columns}
                        pagination
                        disableRowSelectionOnClick
                        sx={{
                            height: 400,
                            backgroundColor: 'rgb(30,30,30)',
                            color: '#ffffff',
                            mt: 2,
                            border: "1px solid white",
                            '& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader': { color: '#ffffff', backgroundColor: '#1e1e1e' },
                            '& .MuiDataGrid-selectedCell': { backgroundColor: '#333333' },
                            '& .MuiDataGrid-row': { backgroundColor: 'rgb(30,30,30)' },
                            '& .MuiTablePagination-toolbar': { color: '#ffffff' },
                        }}
                    />
                </Suspense>
            </Container>
        </>
    );
};

export default React.memo(Dashboard);
