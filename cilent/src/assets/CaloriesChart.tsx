import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
    CartesianGrid,
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

const CaloriesChart = () => {

    const { allActivityLogs, allFoodLogs } = useAppContext();
    const { theme } = useTheme();

    const getData = () => {
        const data = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

            const dailyFood = allFoodLogs.filter(log => log.createdAt?.split('T')[0] === dateString);
            const dailyActivity = allActivityLogs.filter(log => log.createdAt?.split('T')[0] === dateString);

            const intake = dailyFood.reduce((sum, item) => sum + item.calories, 0);
            const burn = dailyActivity.reduce((sum, item) => sum + (item.calories || 0), 0);

            data.push({
                name: dayName,
                Intake: intake,
                Burn: burn,
                date: dateString
            });
        }
        return data;
    };

    const data = getData();
    const isLight = theme === 'light';

    return (
        <div className="mt-4 min-w-0">
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={isLight ? '#e2e8f0' : '#1e293b'}
                    />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{
                            backgroundColor: isLight ? '#ffffff' : '#0f172a',
                            borderRadius: '14px',
                            border: isLight
                                ? '1px solid rgba(226, 232, 240, 1)'
                                : '1px solid rgba(148, 163, 184, 0.12)',
                            boxShadow: isLight
                                ? '0 16px 40px rgba(15, 23, 42, 0.12)'
                                : '0 16px 40px rgba(2, 6, 23, 0.45)',
                            color: isLight ? '#0f172a' : '#f8fafc',
                        }}
                        labelStyle={{ color: isLight ? '#475569' : '#cbd5e1' }}
                    />
                    <Legend
                        iconType="circle"
                        wrapperStyle={{
                            paddingTop: '10px',
                            color: isLight ? '#64748b' : '#94a3b8',
                        }}
                    />
                    <Bar dataKey="Intake" fill="#34d399" radius={[4, 4, 0, 0]} barSize={12} name="Intake" />
                    <Bar dataKey="Burn" fill="#fb923c" radius={[4, 4, 0, 0]} barSize={12} name="Burn" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CaloriesChart;
