import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import {
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box
            sx={{
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              p: 1,
              borderRadius: 1,
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  // TODO: Firestoreから実際のデータを取得
  const stats = {
    customers: 13673,
    deals: 1250,
    revenue: '¥1,450,509,375',
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        ダッシュボード
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="顧客数"
            value={stats.customers.toLocaleString()}
            icon={<PeopleIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="商談数"
            value={stats.deals.toLocaleString()}
            icon={<AssignmentIcon />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="総申込額"
            value={stats.revenue}
            icon={<TrendingUpIcon />}
            color="success"
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          システム情報
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              CRM V12 - Firebase Hosting + Firestore + Algolia
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              V9からの移行版 - 高速検索・完全URL制御対応
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
